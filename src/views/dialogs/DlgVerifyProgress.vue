<template>
  <el-dialog
    v-model="dialogVisible"
    title="审核进度"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div v-loading="loading" class="verify-progress-container">
      <!-- 当前状态概览 -->
      <div class="status-overview">
        <el-tag :type="currentStatusType" size="large">
          {{ currentStatusText }}
        </el-tag>
      </div>

      <!-- 审核时间线 -->
      <el-timeline v-if="verifyRecords.length > 0" class="verify-timeline">
        <el-timeline-item
          v-for="(record, index) in verifyRecords"
          :key="record.id"
          :type="getTimelineItemType(record)"
          :hollow="record.isAudit === 0 || record.isAudit === -1"
          :timestamp="formatTime(record.createTime)"
          placement="top"
        >
          <el-card shadow="hover" class="timeline-card">
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
              <!-- 创建人信息 -->
              <div v-if="record.createUserName" class="info-row">
                <span class="label">提交人:</span>
                <span class="value">{{ record.createUserName }}</span>
              </div>

              <!-- 待审核状态 -->
              <div v-if="record.isAudit === 0 || record.isAudit === -1" class="info-row">
                <span class="label">待审核人:</span>
                <span class="value">{{ record.verifyUserNames || '未指定' }}</span>
              </div>

              <!-- 已审核状态 -->
              <div v-else class="info-row">
                <span class="label">审核人:</span>
                <span class="value">{{ record.verifyUserName || '系统自动' }}</span>
              </div>

              <!-- 审核理由 -->
              <div v-if="record.remarks" class="info-row remarks">
                <span class="label">审核意见:</span>
                <span class="value">{{ record.remarks }}</span>
              </div>

              <!-- 审核时间 -->
              <div v-if="record.isAudit === 1 || record.isAudit === 2" class="info-row">
                <span class="label">审核时间:</span>
                <span class="value">{{ formatTime(record.updateTime) }}</span>
              </div>
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

// 当前状态文本
// isAudit: -1 保存未提交, 0 提交待审核, 1 审核通过, 2 审核不通过, 3 审核退回
const currentStatusText = computed(() => {
  if (verifyRecords.value.length === 0) {
    return '暂无审核记录';
  }
  const lastRecord = verifyRecords.value[verifyRecords.value.length - 1];
  if (lastRecord.isAudit === 0 || lastRecord.isAudit === -1) {
    const stepNum = verifyRecords.value.length;
    const roleName = getStepRoleName(stepNum);
    return `${roleName}审核中`;
  } else if (lastRecord.isAudit === 1) {
    // 检查是否还有下一级审核
    const stepNum = verifyRecords.value.length;
    const verifyTypeId = props.processInfo?.verifyTypeId || 1;
    if (stepNum >= verifyTypeId - 1) {
      return '审核通过';
    } else {
      return `${getStepRoleName(stepNum + 1)}审核中`;
    }
  } else if (lastRecord.isAudit === 2) {
    return '审核不通过';
  } else if (lastRecord.isAudit === 3) {
    return '审核退回';
  }
  return '未知状态';
});

// 当前状态类型
const currentStatusType = computed(() => {
  if (verifyRecords.value.length === 0) {
    return 'info';
  }
  const lastRecord = verifyRecords.value[verifyRecords.value.length - 1];
  if (lastRecord.isAudit === 0 || lastRecord.isAudit === -1) {
    return 'warning';
  } else if (lastRecord.isAudit === 1) {
    const stepNum = verifyRecords.value.length;
    const verifyTypeId = props.processInfo?.verifyTypeId || 1;
    if (stepNum >= verifyTypeId - 1) {
      return 'success';
    }
    return 'warning';
  } else if (lastRecord.isAudit === 2) {
    return 'danger';
  } else if (lastRecord.isAudit === 3) {
    return '';  // 默认样式
  }
  return 'info';
});

// 获取步骤对应的角色名称
function getStepRoleName(stepNumber) {
  const roleMap = {
    1: props.processInfo?.verifyFirstRole,
    2: props.processInfo?.verifySecondRole,
    3: props.processInfo?.verifyThirdRole,
    4: props.processInfo?.verifyFourthRole,
    5: props.processInfo?.verifyFifthRole
  };
  return roleMap[stepNumber] || `第${stepNumber}级审核`;
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
    '3': ''  // 默认样式
  };
  return typeMap[String(isAudit)] || 'info';
}

// 获取状态文本
// -1: 保存未提交, 0: 提交待审核, 1: 审核通过, 2: 审核不通过, 3: 审核退回
function getStatusText(isAudit) {
  const textMap = {
    '-1': '保存未提交',
    '0': '待审核',
    '1': '已通过',
    '2': '不通过',
    '3': '已退回'
  };
  return textMap[String(isAudit)] || '未知';
}

// 格式化时间
function formatTime(time) {
  if (!time) return '--';
  return moment(time).format('YYYY-MM-DD HH:mm:ss');
}

// 加载审核进度数据
async function loadVerifyProgress() {
  if (!props.mainInternshipId) {
    verifyRecords.value = [];
    return;
  }

  loading.value = true;
  try {
    // 使用传统的 getSomeRecords 接口查询审核记录
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewMainVerifyProcess',
      pageInfo: { page: 1, size: 100 },
      searchKey: { mainInternshipId: props.mainInternshipId },
      sort: { properties: 'id', direction: 'ASC' }
    });
    if (res && res.data && res.data.content) {
      // 按 id 升序排列（创建顺序）
      verifyRecords.value = res.data.content.sort((a, b) => a.id - b.id);
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
  max-height: 500px;
  overflow-y: auto;
}

.status-overview {
  text-align: center;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
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
      }

      &.remarks {
        .value {
          color: #606266;
          background-color: #f5f7fa;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: pre-wrap;
        }
      }
    }
  }
}
</style>
