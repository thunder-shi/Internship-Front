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
                  <template v-if="isAfterReturn(index)">待重新提交</template>
                  <template v-else>{{ getStepRoleName(getRecordLevel(index)) }}</template>
                </span>
                <el-tag :type="getAuditTagType(record.isAudit)" size="small">
                  {{ getAuditStatusText(record.isAudit) }}
                </el-tag>
              </div>
            </template>

            <div class="card-content">
              <!-- 退回后待重新提交（通过历史记录中是否有 isAudit=3 判断） -->
              <div v-if="isAfterReturn(index)" class="info-row">
                <span class="label">状态:</span>
                <span class="value pending-text">等待重新提交...</span>
              </div>
              <!-- 待审核 / 初始保存未提交 -->
              <div v-else-if="record.isAudit === 0 || record.isAudit === -1" class="info-row">
                <span class="label">状态:</span>
                <span class="value pending-text">{{ record.isAudit === 0 ? '等待审核中...' : '保存未提交' }}</span>
              </div>

              <!-- 已审核状态：显示审核人和审核信息 -->
              <template v-else>
                <div class="info-row">
                  <span class="label">审核人:</span>
                  <span class="value">{{ record.verifyUserName }}</span>
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
import { normalizeFormForDisplay, formatDateTime } from '@/utils/common';
import CONSTANT from '@/utils/constant';
import { getAuditStatusText, getAuditTagType } from '@/utils/verify';

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
  },
  // 查询使用的视图名称
  keyWords: {
    type: String,
    default: 'ViewVerifyProcessInternship' // 默认值，保持向后兼容
  }
});

const emit = defineEmits(['update:modelValue']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const loading = ref(false);
const verifyRecords = ref([]);

// 流程配置（从 ViewRelProcessInternship 加载，包含审核角色 ID）
const processConfig = ref(null);

// 角色名称缓存（roleId → roleName），从 SysRole 表加载
const roleNameMap = ref(new Map());

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

  // 从审核记录计算：基于当前轮次已通过的级别数确定当前级别
  if (verifyRecords.value.length === 0) {
    return '';
  }

  // 使用当前轮次的 passedCount（而非全局累计）
  const name = getStepRoleName(passedCount.value + 1);
  // 如果结果是 "第X级审核" 的回退格式，返回空字符串让上层处理
  if (name.startsWith('第') && name.endsWith('级审核')) {
    return '';
  }
  return name;
}

// 实习项目创建者名称（从第一条记录获取）
const internshipCreatorName = computed(() => {
  if (verifyRecords.value.length > 0) {
    return verifyRecords.value[0].createUserName;
  }
  return '-';
});

// 统计已通过的审核数（全局累计，因为退回后重新提交是回到退回级别，低级别审核仍有效）
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
      return roleName ? `${roleName}审核中` : CONSTANT.AUDIT_STATUS.SUBMITNAME;
    }
    // isAudit=-1 时，检查历史记录中是否有退回记录来区分"保存未提交"和"退回后待重新提交"
    if (auditStatus === -1) {
      const allRecords = props.processInfo?._allRecords || verifyRecords.value;
      const hasReturn = allRecords.some(r => r.isAudit === 3);
      return hasReturn ? '审核退回，待重新提交' : CONSTANT.AUDIT_STATUS.SAVENAME;
    }
    const statusMap = {
      '1': CONSTANT.AUDIT_STATUS.PASSNAME,
      '2': CONSTANT.AUDIT_STATUS.NOTPASSNAME,
      '3': CONSTANT.AUDIT_STATUS.BACKNAME
    };
    return statusMap[String(auditStatus)] || '未知状态';
  }

  // 兜底逻辑：如果没有传入 isAudit，则使用审核记录计算
  if (verifyRecords.value.length === 0) {
    return '暂无审核记录';
  }

  if (passedCount.value >= actualVerifyTypeId.value) {
    return CONSTANT.AUDIT_STATUS.PASSNAME;
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
    return CONSTANT.AUDIT_STATUS.NOTPASSNAME;
  } else if (lastRecord.isAudit === 3) {
    return CONSTANT.AUDIT_STATUS.BACKNAME;
  }
  return '未知状态';
});

// 当前状态类型（直接使用 processInfo 中传入的 isAudit，与 datalist 保持一致）
const currentStatusType = computed(() => {
  // 优先使用 props 传入的 isAudit（来自 datalist 的 ViewMainInternship）
  const auditStatus = props.processInfo?.isAudit;
  if (auditStatus !== undefined && auditStatus !== null) {
    // isAudit=-1 时，退回后待重新提交使用 warning 色，初始保存未提交使用 info 色
    if (auditStatus === -1) {
      const allRecords = props.processInfo?._allRecords || verifyRecords.value;
      const hasReturn = allRecords.some(r => r.isAudit === 3);
      return hasReturn ? 'warning' : 'info';
    }
    const typeMap = {
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

// 获取记录的实际审核等级（全局累计已通过数+1）
// 退回后重新提交直接回到退回级别，低级别审核仍有效，所以用全局计数
// 例：A(1通过) B(3退回) C(0待审) → C的level = 1(A已通过)+1 = 2，与B同级
function getRecordLevel(index) {
  const passCount = verifyRecords.value.slice(0, index).filter(r => r.isAudit === 1).length;
  return passCount + 1;
}

// 判断 isAudit=-1 的记录是否是退回后的待重新提交（而非初始保存未提交）
// 通过检查历史记录中是否存在 isAudit=3（退回）来区分
function isAfterReturn(index) {
  const record = verifyRecords.value[index];
  if (record?.isAudit !== -1) return false;
  return verifyRecords.value.some(r => r.isAudit === 3);
}

// 加载角色名称（SysRole 表）
async function loadRoleNames() {
  if (roleNameMap.value.size > 0) return;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'SysRole',
      pageInfo: { page: 1, size: 100 },
    });
    if (res?.data?.content) {
      res.data.content.forEach(role => {
        roleNameMap.value.set(role.id, role.name);
      });
    }
  } catch (error) {
    console.error('加载角色名称失败:', error);
  }
}

// 加载流程配置（包含审核角色 ID）
async function loadProcessConfig(processId) {
  if (!processId) return;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: processId },
    });
    if (res?.data?.content?.length > 0) {
      processConfig.value = res.data.content[0];
    }
  } catch (error) {
    console.error('加载流程配置失败:', error);
  }
}

// 获取步骤对应的角色名称（从流程配置中查找）
function getStepRoleName(stepNumber) {
  const roleNameFields = {
    1: 'verifyFirstRoleName', 2: 'verifySecondRoleName', 3: 'verifyThirdRoleName',
    4: 'verifyFourthRoleName', 5: 'verifyFifthRoleName'
  };
  const roleIdFields = {
    1: 'verifyFirstRoleId', 2: 'verifySecondRoleId', 3: 'verifyThirdRoleId',
    4: 'verifyFourthRoleId', 5: 'verifyFifthRoleId'
  };

  // 优先从流程配置中获取角色名称
  if (processConfig.value) {
    const roleName = processConfig.value[roleNameFields[stepNumber]];
    if (roleName && roleName !== '--' && roleName.trim() !== '') {
      return roleName;
    }

    // 回退：通过 SysRole 解析角色 ID
    const roleId = processConfig.value[roleIdFields[stepNumber]];
    if (roleId && roleNameMap.value.has(roleId)) {
      return roleNameMap.value.get(roleId);
    }
  }

  return `第${stepNumber}级审核`;
}

// 获取时间线节点类型
function getTimelineItemType(record) {
  if (record.isAudit === 1) return 'success';
  if (record.isAudit === 2) return 'danger';  // 审核不通过
  if (record.isAudit === 3) return 'info';    // 审核退回
  if (record.isAudit === 0) return 'warning'; // 待审核
  return 'info';
}

// 使用统一的时间格式化函数
const formatTime = formatDateTime;

// 从基表 MainVerifyProcess 补充查询退回记录（isAudit=3）和待重新提交记录（isAudit=-1）
// 数据库视图可能不包含这些状态的记录，需要从基表补充以完整展示退回流程
async function supplementReturnRecords(records) {
  if (records.length === 0) return records;
  // 如果已经有退回记录，无需补充
  if (records.some(r => r.isAudit === 3)) return records;

  const relationId = records[0]?.relationId || props.processInfo?.relationId;
  if (!relationId) return records;

  // 必须加 tableName 过滤，否则不同业务表恰好存在相同 relationId 时会跨表污染
  const tableName = records[0]?.tableName || props.processInfo?.tableName;
  if (!tableName) {
    console.warn('supplementReturnRecords: 无法确定 tableName，跳过补充查询以避免跨表污染');
    return records;
  }

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      pageInfo: { page: 1, size: 100 },
      searchKey: { relationId: relationId, tableName: tableName },
      sort: { properties: 'id', direction: 'ASC' }
    });
    if (res?.data?.content?.length > 0) {
      const existingIds = new Set(records.map((r) => (r.id == null ? '' : String(r.id))));
      const newRecords = res.data.content.filter((r) => !existingIds.has(r.id == null ? '' : String(r.id)));
      if (newRecords.length > 0) {
        records.push(...newRecords);
        records.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      }
    }
  } catch (error) {
    console.error('从基表补充退回记录失败:', error);
  }
  return records;
}

// 过滤掉初始保存未提交的记录（isAudit=-1），只保留退回后产生的 -1 记录
// 未提交时不应在时间线中显示卡片
function filterInitialSaveRecords(records) {
  const hasReturn = records.some(r => r.isAudit === 3);
  if (hasReturn) return records; // 有退回记录，保留所有（包括退回后的 -1）
  return records.filter(r => r.isAudit !== -1);
}

// 分情况过滤：当主记录为「待提交」且流程不是「无需审核」时，不展示「系统自动通过」的审核记录
// （一级/多级审核下未提交却出现系统自动通过为异常；无需审核流程保持原样）
function filterAutoPassWhenNotSubmitted(records) {
  const mainAudit = props.processInfo?.isAudit;
  if (mainAudit !== -1 && mainAudit !== '-1' && mainAudit != null) return records;
  const verifyTypeId = props.processInfo?.verifyTypeId ?? records[0]?.verifyTypeId;
  if (verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY) return records;
  return records.filter((r) => {
    if (r.isAudit === 1 && r.reason && String(r.reason).includes('系统自动通过')) return false;
    return true;
  });
}

// 加载审核进度数据
async function loadVerifyProgress() {
  // 预加载角色名称和流程配置（用于将角色 ID 解析为名称）
  const processId = props.processInfo?.processId;
  await Promise.all([loadRoleNames(), loadProcessConfig(processId)]);

  // 如果 props 中已经传入了所有记录，直接使用
  if (props.processInfo?._allRecords && props.processInfo._allRecords.length > 0) {
    let records = [...props.processInfo._allRecords].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    const seenIds = new Set();
    records = records.filter((r) => {
      const id = r.id == null ? '' : String(r.id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });
    // 从基表补充视图中缺失的退回记录
    await supplementReturnRecords(records);
    // 过滤掉初始保存未提交的记录（未提交时不显示卡片）
    records = filterInitialSaveRecords(records);
    // 主记录为待提交时，不展示「系统自动通过」的审核记录，避免与状态矛盾
    records = filterAutoPassWhenNotSubmitted(records);
    await fillVerifyUserNames(records);
    // 规范化显示字段：将字符串类型的空值替换为 '-'
    // verifyUserName 如果为空或系统自动通过，替换为 '系统'
    verifyRecords.value = records.map(record => {
      const normalized = normalizeFormForDisplay(record, {
        excludeFields: ['id', 'relationId', 'isAudit', 'verifyUserId', 'updateTime', 'createTime']
      });
      // 特殊处理：系统自动通过的记录，审核人显示 '系统'
      if (normalized.reason && normalized.reason.includes('系统自动通过')) {
        normalized.verifyUserName = '系统';
      } else if (!normalized.verifyUserName || normalized.verifyUserName === '-') {
        normalized.verifyUserName = '系统';
      }
      return normalized;
    });
    return;
  }

  // 有 relationId（如老师申报题目）或 mainInternshipId（如实习计划）时才请求
  const hasRelationId = props.processInfo?.relationId != null;
  const hasMainId = props.mainInternshipId != null;
  if (!hasRelationId && !hasMainId) {
    verifyRecords.value = [];
    return;
  }

  loading.value = true;
  try {
    // 使用传入的 keyWords 视图查询审核记录
    // 优先使用 relationId 查询，因为同一个流程的多个审核级别共享同一个 relationId（与实习计划制定一致）
    const searchKey = hasRelationId
      ? { relationId: props.processInfo.relationId }
      : { internshipId: props.mainInternshipId };

    const res = await listAPI.getSomeRecords({
      keyWords: props.keyWords,
      pageInfo: { page: 1, size: 100 },
      searchKey,
      sort: { properties: 'id', direction: 'ASC' }
    });
    if (res && res.data && res.data.content) {
      // 按 id 升序排列，并按 id 去重（统一转字符串比较，避免 123 与 "123" 被当成两条）
      let records = res.data.content.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      const seenIds = new Set();
      records = records.filter((r) => {
        const id = r.id == null ? '' : String(r.id);
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });

      // 从基表补充视图中缺失的退回记录
      await supplementReturnRecords(records);
      // 过滤掉初始保存未提交的记录（未提交时不显示卡片）
      records = filterInitialSaveRecords(records);
      // 主记录为待提交时，不展示「系统自动通过」的审核记录，避免与状态矛盾
      records = filterAutoPassWhenNotSubmitted(records);

      // 保留所有历史记录（含退回、再提交等多轮），不再按“已通过数”截断
      // 为每条记录补充审核人姓名（verifyUserId 是 string，BaseUser.id 是 int）
      await fillVerifyUserNames(records);

      // 规范化显示字段：将字符串类型的空值替换为 '-'
      // verifyUserName 如果为空或系统自动通过，替换为 '系统'
      verifyRecords.value = records.map(record => {
        const normalized = normalizeFormForDisplay(record, {
          excludeFields: ['id', 'relationId', 'isAudit', 'verifyUserId', 'updateTime', 'createTime']
        });
        // 特殊处理：系统自动通过的记录，审核人显示 '系统'
        if (normalized.reason && normalized.reason.includes('系统自动通过')) {
          normalized.verifyUserName = '系统';
        } else if (!normalized.verifyUserName || normalized.verifyUserName === '-') {
          normalized.verifyUserName = '系统';
        }
        return normalized;
      });
    } else {
      verifyRecords.value = [];
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('获取审核进度失败:', error);
    verifyRecords.value = [];
  } finally {
    loading.value = false;
  }
}

// 根据 verifyUserId 查询 BaseUser 获取审核人姓名
async function fillVerifyUserNames(records) {
  // 收集所有需要查询的 userId（去重），跳过已有姓名的记录
  const userIdSet = new Set();
  records.forEach(r => {
    if (r.verifyUserId && !r.verifyUserName) {
      userIdSet.add(String(r.verifyUserId));
    }
  });

  if (userIdSet.size === 0) return;

  // 将 string 类型的 userId 转为 int 进行查询
  const userIds = Array.from(userIdSet).map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  if (userIds.length === 0) return;

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'BaseUser',
      pageInfo: { page: 1, size: userIds.length },
      searchKey: { id: userIds.join(',') },
      reg: { id: '()' },
      sort: { properties: 'id', direction: 'ASC' }
    });

    if (res && res.data && res.data.content) {
      // 构建 id -> name 映射
      const userMap = {};
      res.data.content.forEach(user => {
        userMap[String(user.id)] = user.name;
      });

      // 回填到记录中
      records.forEach(r => {
        if (r.verifyUserId && !r.verifyUserName) {
          r.verifyUserName = userMap[String(r.verifyUserId)] || null;
        }
      });
    }
  } catch (error) {
    console.error('查询审核人姓名失败:', error);
  }
}

// 关闭弹窗
function handleClose() {
  dialogVisible.value = false;
  verifyRecords.value = [];
}

// 监听弹窗显示状态，自动加载数据（有 relationId 或 mainInternshipId 即加载，与实习计划/老师申报题目一致）
watch(
  () => props.modelValue,
  (val) => {
    if (val && (props.mainInternshipId != null || props.processInfo?.relationId != null)) {
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
