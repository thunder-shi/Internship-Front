<template>
  <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px" :close-on-click-modal="false" @close="handleClose">
    <div v-loading="loading" class="verify-progress-container">
      <!-- 当前状态概览 -->
      <div class="status-overview">
        <div class="status-info">
          <span class="creator-label">创建者: {{ internshipCreatorName }}</span>
        </div>
        <el-tag :type="currentStatusType" size="large">
          {{ currentStatusText }}
        </el-tag>
      </div>

      <!-- 审核时间线 -->
      <el-timeline v-if="verifyRecords.length > 0" class="verify-timeline">
        <el-timeline-item v-for="(record, index) in verifyRecords" :key="record.id" :type="getTimelineItemType(record)" :hollow="record.isAudit === 0 || record.isAudit === -1" :timestamp="formatTime(record.createTime)" placement="top">
          <el-card shadow="never" class="timeline-card">
            <template #header>
              <div class="card-header">
                <span class="step-title">
                  第 {{ index + 1 }} 步 - {{ getStepRoleName(index + 1) }}
                </span>
                <el-tag :type="getStatusTagType(record.isAudit)" size="small">
                  {{ getStatusText(record.isAudit) }}
                </el-tag>
              </div>
            </template>

            <div class="card-content">
              <!-- 待审核状态：不显示待审核人信息 -->
              <div v-if="record.isAudit === 0 || record.isAudit === -1" class="info-row">
                <span class="label">状态:</span>
                <span class="value pending-text">等待审核中...</span>
              </div>

              <!-- 已审核状态：显示审核人和审核信息 -->
              <template v-else>
                <div class="info-row">
                  <span class="label">审核人:</span>
                  <span class="value">{{ record.verifyUserName || '系统自动' }}</span>
                </div>

                <!-- 审核理由 -->
                <div v-if="record.reason" class="info-row">
                  <span class="label">审核意见:</span>
                  <span class="value reason-text">{{ record.reason }}</span>
                </div>

                <!-- 审核时间 -->
                <div class="info-row">
                  <span class="label">审核时间:</span>
                  <span class="value">{{ formatTime(record.updateTime) }}</span>
                </div>
              </template>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 空状态 -->
      <el-empty v-else description="暂无审核记录" />
    </div>

    <template #footer>
      <el-button @click="handleClose">关 闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { ElMessage } from 'element-plus';
import listAPI from '@/api/list';
import moment from 'moment';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  // 关联ID（MainInternship 的 ID）
  mainInternshipId: {
    type: [Number, String],
    default: null
  },
  // 流程信息，包含审核角色配置
  processInfo: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:modelValue']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const loading = ref(false);
const verifyRecords = ref([]);

// 对话框标题，包含角色信息
const dialogTitle = computed(() => {
  const auditStatus = props.processInfo?.isAudit;
  const roleName = props.processInfo?._currentRoleName || getCurrentRoleName();

  if (auditStatus === 0 && roleName) {
    return `审核进度 - ${roleName}审核中`;
  }
  return '审核进度';
});

// 获取当前审核角色名称
function getCurrentRoleName() {
  // 优先从 props 获取
  if (props.processInfo?._currentRoleName) {
    return props.processInfo._currentRoleName;
  }

  // 从审核记录计算
  if (verifyRecords.value.length === 0) {
    return '';
  }

  const firstRecord = verifyRecords.value[0];
  const passed = verifyRecords.value.filter(r => r.isAudit === 1).length;
  const levels = [
    firstRecord.verifyFirstRoleName,
    firstRecord.verifySecondRoleName,
    firstRecord.verifyThirdRoleName,
    firstRecord.verifyFourthRoleName,
    firstRecord.verifyFifthRoleName
  ].filter(name => name);

  if (levels[passed]) {
    return levels[passed];
  }
  return '';
}

// 实习项目创建者名称（从第一条记录获取）
const internshipCreatorName = computed(() => {
  if (verifyRecords.value.length > 0) {
    return verifyRecords.value[0].createUserName || '--';
  }
  return '--';
});

// 统计已通过的审核数
const passedCount = computed(() => {
  return verifyRecords.value.filter(r => r.isAudit === 1).length;
});

// 获取审核级数（从记录中获取，优先级高于 props）
const actualVerifyTypeId = computed(() => {
  // 优先从审核记录中获取
  if (verifyRecords.value.length > 0 && verifyRecords.value[0].verifyTypeId) {
    return verifyRecords.value[0].verifyTypeId;
  }
  // 其次从 props 获取
  if (props.processInfo?.verifyTypeId) {
    return props.processInfo.verifyTypeId;
  }
  // 默认1级审核
  return 1;
});

// 当前状态文本（直接使用 processInfo 中传入的 isAudit，与 datalist 保持一致）
// isAudit: -1 保存未提交, 0 提交待审核, 1 审核通过, 2 审核不通过, 3 审核退回
const currentStatusText = computed(() => {
  // 优先使用 props 传入的 isAudit（来自 datalist 的 ViewMainInternship）
  const auditStatus = props.processInfo?.isAudit;
  if (auditStatus !== undefined && auditStatus !== null) {
    // 对于待审核状态，显示角色名称
    if (auditStatus === 0) {
      const roleName = props.processInfo?._currentRoleName || getCurrentRoleName();
      return roleName ? `${roleName}审核中` : '待审核';
    }
    const statusMap = {
      '-1': '待提交',
      '1': '审核通过',
      '2': '审核不通过',
      '3': '审核退回'
    };
    return statusMap[String(auditStatus)] || '未知状态';
  }

  // 兜底逻辑：如果没有传入 isAudit，则使用审核记录计算
  if (verifyRecords.value.length === 0) {
    return '暂无审核记录';
  }

  if (passedCount.value >= actualVerifyTypeId.value) {
    return '审核通过';
  }

  const lastRecord = verifyRecords.value[verifyRecords.value.length - 1];
  if (lastRecord.isAudit === 0 || lastRecord.isAudit === -1) {
    const currentStep = passedCount.value + 1;
    const roleName = getStepRoleName(currentStep);
    return `${roleName}审核中`;
  } else if (lastRecord.isAudit === 1) {
    const nextStep = passedCount.value + 1;
    return `${getStepRoleName(nextStep)}审核中`;
  } else if (lastRecord.isAudit === 2) {
    return '审核不通过';
  } else if (lastRecord.isAudit === 3) {
    return '审核退回';
  }
  return '未知状态';
});

// 当前状态类型（直接使用 processInfo 中传入的 isAudit，与 datalist 保持一致）
const currentStatusType = computed(() => {
  // 优先使用 props 传入的 isAudit（来自 datalist 的 ViewMainInternship）
  const auditStatus = props.processInfo?.isAudit;
  if (auditStatus !== undefined && auditStatus !== null) {
    const typeMap = {
      '-1': 'info',
      '0': 'warning',
      '1': 'success',
      '2': 'danger',
      '3': 'info'  // 审核退回显示灰色
    };
    return typeMap[String(auditStatus)] || 'info';
  }

  // 兜底逻辑：如果没有传入 isAudit，则使用审核记录计算
  if (verifyRecords.value.length === 0) {
    return 'info';
  }

  if (passedCount.value >= actualVerifyTypeId.value) {
    return 'success';
  }

  const lastRecord = verifyRecords.value[verifyRecords.value.length - 1];
  if (lastRecord.isAudit === 0 || lastRecord.isAudit === -1) {
    return 'warning';
  } else if (lastRecord.isAudit === 1) {
    return 'warning';
  } else if (lastRecord.isAudit === 2) {
    return 'danger';
  } else if (lastRecord.isAudit === 3) {
    return '';
  }
  return 'info';
});

// 获取步骤对应的角色名称
function getStepRoleName(stepNumber) {
  // 优先从审核记录中获取角色名称
  const firstRecord = verifyRecords.value[0];
  const recordRoleMap = firstRecord ? {
    1: firstRecord.verifyFirstRoleName,
    2: firstRecord.verifySecondRoleName,
    3: firstRecord.verifyThirdRoleName,
    4: firstRecord.verifyFourthRoleName,
    5: firstRecord.verifyFifthRoleName
  } : {};

  // 其次从 props 获取
  const propsRoleMap = {
    1: props.processInfo?.verifyFirstRole,
    2: props.processInfo?.verifySecondRole,
    3: props.processInfo?.verifyThirdRole,
    4: props.processInfo?.verifyFourthRole,
    5: props.processInfo?.verifyFifthRole
  };

  const roleName = recordRoleMap[stepNumber] || propsRoleMap[stepNumber];
  // 过滤掉无效的角色名称（空、'--' 等默认占位值）
  if (!roleName || roleName === '--' || roleName.trim() === '') {
    return `第${stepNumber}级审核`;
  }
  return roleName;
}

// 获取时间线节点类型
function getTimelineItemType(record) {
  if (record.isAudit === 1) return 'success';
  if (record.isAudit === 2) return 'danger';  // 审核不通过
  if (record.isAudit === 3) return 'info';    // 审核退回
  if (record.isAudit === 0) return 'warning'; // 待审核
  return 'info';
}

// 获取状态标签类型
function getStatusTagType(isAudit) {
  const typeMap = {
    '-1': 'info',
    '0': 'warning',
    '1': 'success',
    '2': 'danger',
    '3': 'info'  // 审核退回显示灰色
  };
  return typeMap[String(isAudit)] || 'info';
}

// 获取状态文本
// -1: 待提交, 0: 提交待审核, 1: 审核通过, 2: 审核不通过, 3: 审核退回
function getStatusText(isAudit) {
  const textMap = {
    '-1': '待提交',
    '0': '待审核',
    '1': '已通过',
    '2': '不通过',
    '3': '已退回'
  };
  return textMap[String(isAudit)] || '未知';
}

// 格式化时间（使用北京时间 UTC+8）
function formatTime(time) {
  if (!time) return '--';
  // 如果后端返回的是 UTC 时间，转换为北京时间（UTC+8）
  return moment.utc(time).utcOffset(8).format('YYYY-MM-DD HH:mm:ss');
}

// 加载审核进度数据
async function loadVerifyProgress() {
  // 如果 props 中已经传入了所有记录，直接使用
  if (props.processInfo?._allRecords && props.processInfo._allRecords.length > 0) {
    let records = [...props.processInfo._allRecords].sort((a, b) => (a.id || 0) - (b.id || 0));
    verifyRecords.value = records;
    return;
  }

  if (!props.mainInternshipId) {
    verifyRecords.value = [];
    return;
  }

  loading.value = true;
  try {
    // 使用 ViewVerifyInternshipPlanProcess 视图查询审核记录
    // 优先使用 relationId 查询，因为同一个流程的多个审核级别共享同一个 relationId
    const searchKey = props.processInfo?.relationId
      ? { relationId: props.processInfo.relationId }
      : { internshipId: props.mainInternshipId };

    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyInternshipPlanProcess',
      pageInfo: { page: 1, size: 100 },
      searchKey,
      sort: { properties: 'id', direction: 'ASC' }
    });
    if (res && res.data && res.data.content) {
      // 按 id 升序排列
      let records = res.data.content.sort((a, b) => a.id - b.id);

      // 获取审核级数
      const verifyTypeId = records.length > 0 ? (records[0].verifyTypeId || 1) : 1;

      // 统计已通过的审核数
      const passedNum = records.filter(r => r.isAudit === 1).length;

      // 如果已通过数 >= 审核级数，过滤掉多余的待审核记录（历史错误数据）
      if (passedNum >= verifyTypeId) {
        records = records.filter(r => r.isAudit === 1).slice(0, verifyTypeId);
      }

      verifyRecords.value = records;
    } else {
      verifyRecords.value = [];
    }
  } catch (error) {
    console.error('获取审核进度失败:', error);
    ElMessage.error('获取审核进度失败');
    verifyRecords.value = [];
  } finally {
    loading.value = false;
  }
}

// 关闭弹窗
function handleClose() {
  dialogVisible.value = false;
  verifyRecords.value = [];
}

// 监听弹窗显示状态，自动加载数据
watch(
  () => props.modelValue,
  (val) => {
    if (val && props.mainInternshipId) {
      loadVerifyProgress();
    }
  }
);

// 暴露方法
defineExpose({
  loadVerifyProgress
});
</script>

<style lang="scss" scoped>
.verify-progress-container {
  min-height: 200px;
}

.status-overview {
  text-align: center;
  margin-bottom: 20px;
  padding: 12px 0;

  .status-info {
    margin-bottom: 10px;

    .creator-label {
      color: #606266;
      font-size: 14px;
    }
  }
}

.verify-timeline {
  padding: 10px 0;
}

.timeline-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .step-title {
      font-weight: bold;
      font-size: 14px;
    }
  }

  .card-content {
    .info-row {
      display: flex;
      margin-bottom: 8px;
      font-size: 13px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: #909399;
        width: 70px;
        flex-shrink: 0;
      }

      .value {
        color: #303133;
        flex: 1;

        &.pending-text {
          color: #e6a23c;
          font-style: italic;
        }

        &.reason-text {
          color: #606266;
          border-left: 3px solid #409eff;
          padding-left: 8px;
          white-space: pre-wrap;
        }
      }
    }
  }
}
</style>
