<template>
  <el-dialog
    v-model="dialogVisible"
    title="终止实习详情"
    width="760px"
    destroy-on-close
    append-to-body
  >
    <div v-loading="loading" class="termination-detail">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="学生姓名">{{ display(info.studentName) }}</el-descriptions-item>
        <el-descriptions-item label="学号">{{ display(info.studentAccount) }}</el-descriptions-item>
        <el-descriptions-item label="实习项目">{{ display(info.internshipName) }}</el-descriptions-item>
        <el-descriptions-item label="实习类型">{{ modeText(info.internshipMode) }}</el-descriptions-item>
        <el-descriptions-item label="岗位/题目" :span="2">
          {{ display(info.postName || info.internshipPostName || info.titleName || info.name) }}
        </el-descriptions-item>
        <el-descriptions-item label="导师">{{ display(info.teacherName || info.tutorName) }}</el-descriptions-item>
        <el-descriptions-item label="发起人">{{ applicantName }}</el-descriptions-item>
        <el-descriptions-item label="终止日期">{{ displayDate(info.terminateDate) }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="terminationStatusTag(info.status ?? info.isAudit)">
            {{ terminationStatusText(info.status ?? info.isAudit) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="原因类型">{{ display(info.reasonType) }}</el-descriptions-item>
        <el-descriptions-item label="发起时间">{{ displayDateTime(info.createTime || info.applyTime) }}</el-descriptions-item>
        <el-descriptions-item label="详细原因" :span="2">
          <div class="detail-reason">{{ display(info.reason) }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="附件材料" :span="2">
          <div v-if="attachments.length" class="attachment-list">
            <el-button
              v-for="file in attachments"
              :key="file.id"
              link
              type="primary"
              @click="downloadAttachment(file)"
            >
              {{ file.name || `附件 ${file.id}` }}
            </el-button>
          </div>
          <span v-else>--</span>
        </el-descriptions-item>
      </el-descriptions>

      <div class="flow-title">审核流转记录</div>
      <el-timeline v-if="auditRecords.length" class="flow-timeline">
        <el-timeline-item
          v-for="record in auditRecords"
          :key="record.id || `${record.isAudit}-${record.createTime}`"
          :type="auditTagType(record.isAudit)"
          :timestamp="displayDateTime(record.updateTime || record.createTime)"
          placement="top"
        >
          <div class="flow-record">
            <div class="flow-record-header">
              <span>{{ display(record.verifyUserName || record.createUserName || record.currentRoleName) }}</span>
              <el-tag :type="auditTagType(record.isAudit)" size="small">
                {{ auditStatusText(record.isAudit) }}
              </el-tag>
            </div>
            <div v-if="record.reason" class="flow-record-reason">{{ record.reason }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-else description="暂无审核流转记录" :image-size="80" />
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed } from 'vue';
import { ElMessage } from 'element-plus';
import fileAPI from '@/api/file';
import { formatDate, formatDateTime } from '@/utils/common';
import { getAuditStatusText, getAuditTagType } from '@/utils/verify';
import CONSTANT from '@/utils/constant';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  detail: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue']);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const info = computed(() => props.detail?.termination || props.detail?.node || props.detail || {});

const applicantName = computed(() => display(
  info.value.applyUserName ||
    info.value.createUserName ||
    info.value.applyUserAccount ||
    info.value.studentName ||
    info.value.studentAccount
));

const auditRecords = computed(() => {
  const detail = props.detail || {};
  return (
    detail.auditRecords ||
    detail.verifyRecords ||
    detail.flowRecords ||
    detail.records ||
    info.value._allRecords ||
    []
  );
});

const attachments = computed(() => {
  const detail = props.detail || {};
  const rawList =
    detail.attachments ||
    detail.attachmentList ||
    detail.fileList ||
    info.value.attachments ||
    info.value.attachmentList ||
    [];

  if (Array.isArray(rawList) && rawList.length) {
    return rawList
      .map((item) => {
        if (typeof item === 'number' || typeof item === 'string') {
          return { id: item, name: `附件 ${item}` };
        }
        return {
          id: item.id ?? item.ossFileId ?? item.fileId,
          name: item.name ?? item.fileName ?? item.originalName,
        };
      })
      .filter((item) => item.id != null && item.id !== '');
  }

  const ids = String(info.value.attachmentIds || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return ids.map((id) => ({ id, name: `附件 ${id}` }));
});

function display(value) {
  return value === null || value === undefined || value === '' ? '--' : value;
}

function displayDate(value) {
  return value ? formatDate(value) : '--';
}

function displayDateTime(value) {
  return value ? formatDateTime(value) : '--';
}

function modeText(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'INTERNAL') return '校内实习';
  if (normalized === 'EXTERNAL') return '校外实习';
  return display(value);
}

function terminationStatusText(value) {
  const status = Number(value);
  const map = {
    0: '待审核',
    1: '已通过',
    2: '不通过',
    3: '已退回',
    4: '已取消',
  };
  return map[status] || display(value);
}

function terminationStatusTag(value) {
  const status = Number(value);
  const map = {
    0: 'warning',
    1: 'success',
    2: 'danger',
    3: 'info',
    4: 'info',
  };
  return map[status] || 'info';
}

function auditStatusText(value) {
  return getAuditStatusText(value);
}

function auditTagType(value) {
  if (Number(value) === CONSTANT.AUDIT_STATUS.BACK) return 'info';
  return getAuditTagType(value);
}

async function downloadAttachment(file) {
  if (!file?.id) {
    ElMessage.warning('附件编号缺失，无法下载');
    return;
  }
  try {
    await fileAPI.downloadFile(file.id);
  } catch {
    ElMessage.error('打开附件失败');
  }
}
</script>

<style scoped>
.termination-detail {
  min-height: 220px;
}

.detail-reason {
  min-height: 64px;
  line-height: 22px;
  white-space: pre-wrap;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.flow-title {
  margin: 18px 0 12px;
  font-weight: 600;
  color: #303133;
}

.flow-timeline {
  padding: 0 4px;
}

.flow-record {
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-fill-color-blank);
}

.flow-record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.flow-record-reason {
  margin-top: 8px;
  color: #606266;
  line-height: 20px;
  white-space: pre-wrap;
}
</style>
