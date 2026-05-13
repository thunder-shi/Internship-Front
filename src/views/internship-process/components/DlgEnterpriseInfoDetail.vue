<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" @close-dialog="handleCloseDialog">
    <template #mainForm>
      <div v-loading="loading" class="enterprise-detail-dialog">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="企业名称">{{ detailRecord.name || '--' }}</el-descriptions-item>
              <el-descriptions-item label="统一社会信用代码">{{ detailRecord.code || '--' }}</el-descriptions-item>
              <el-descriptions-item label="联系人">{{ detailRecord.contactName || '--' }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">{{ detailRecord.contactPhone || '--' }}</el-descriptions-item>
              <el-descriptions-item label="联系邮箱">{{ detailRecord.contactEmail || '--' }}</el-descriptions-item>
              <el-descriptions-item label="法人">{{ detailRecord.legalPerson || '--' }}</el-descriptions-item>
              <el-descriptions-item label="行业">{{ detailRecord.industry || '--' }}</el-descriptions-item>
              <el-descriptions-item label="企业规模">{{ detailRecord.companyScale || '--' }}</el-descriptions-item>
              <el-descriptions-item label="当前状态">
                <el-tag :type="getAuditTagType(resolveAuditStatus(detailRecord))">
                  {{ getAuditStatusText(resolveAuditStatus(detailRecord)) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="审核意见">{{ detailRecord.reason || '--' }}</el-descriptions-item>
              <el-descriptions-item label="企业地址" :span="2">{{ detailRecord.address || '--' }}</el-descriptions-item>
              <el-descriptions-item label="经营范围" :span="2">
                <div class="pre-wrap">{{ detailRecord.businessScope || '--' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="企业简介" :span="2">
                <div class="pre-wrap">{{ detailRecord.introduction || '--' }}</div>
              </el-descriptions-item>
              <el-descriptions-item label="备注" :span="2">
                <div class="pre-wrap">{{ detailRecord.remarks || '--' }}</div>
              </el-descriptions-item>
            </el-descriptions>
          </el-tab-pane>

          <el-tab-pane label="附件材料" name="files">
            <div v-if="!detailFiles.length" class="empty-text">暂无附件</div>
            <div v-else class="file-grid">
              <el-tooltip
                v-for="file in detailFiles"
                :key="file.id"
                :content="file.name"
                placement="top"
                :show-after="400"
              >
                <div class="file-card">
                  <div
                    class="file-badge"
                    :style="{ background: fileBadge(file.name).bg, fontSize: badgeFontSize(fileBadge(file.name).text) }"
                  >
                    {{ fileBadge(file.name).text }}
                  </div>
                  <span class="file-card-name">{{ file.name }}</span>
                  <div class="file-card-actions">
                    <el-icon class="action-icon" title="预览" @click.stop="triggerPreview(file)"><View /></el-icon>
                    <el-icon class="action-icon" title="下载" @click.stop="triggerDownload(file)"><Download /></el-icon>
                  </div>
                </div>
              </el-tooltip>
            </div>
          </el-tab-pane>

          <el-tab-pane label="审核历史" name="history">
            <el-timeline v-if="detailHistory.length">
              <el-timeline-item
                v-for="item in detailHistory"
                :key="item.id || `${item.updateTime || ''}_${item.reason || ''}`"
                :timestamp="formatDateTime(item.updateTime || item.createTime)"
                placement="top"
                :type="timelineType(resolveAuditStatus(item))"
              >
                <el-card shadow="never">
                  <div class="timeline-header">
                    <span>{{ item.verifyUserName || item.createUserName || '系统' }}</span>
                    <el-tag :type="getAuditTagType(resolveAuditStatus(item))" size="small">
                      {{ getAuditStatusText(resolveAuditStatus(item)) }}
                    </el-tag>
                  </div>
                  <div class="timeline-reason">{{ item.reason || '--' }}</div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
            <div v-else class="empty-text">暂无审核历史</div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </DlgBasic>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { Download, View } from '@element-plus/icons-vue';
import DlgBasic from '@/components/DlgBasic.vue';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import { formatDateTime } from '@/utils/common';
import { getAuditStatusText, getAuditTagType } from '@/utils/verify';
import { useDiaryFiles } from '@/utils/useDiaryFiles';
import {
  ENTERPRISE_TABLE_NAME,
  badgeFontSize,
  fileBadge,
  normalizeDetailPayload,
  normalizeHistoryList,
  resolveAuditStatus,
  resolveEnterpriseInfoId,
} from '@/utils/enterpriseInfoView';

defineOptions({
  name: 'DlgEnterpriseInfoDetail',
});

const props = defineProps({
  dlgTitle: {
    type: String,
    default: '企业信息详情',
  },
  detailApi: {
    type: Function,
    default: enterpriseInfoAPI.detail,
  },
});

const emit = defineEmits(['close-dialog']);

const dlgBasicRef = ref(null);
const loading = ref(false);
const activeTab = ref('basic');
const detailRecord = ref({});
const detailHistory = ref([]);
const currentRow = ref({});

const defaultProps = reactive({
  dlgTitle: props.dlgTitle,
  width: '72%',
  footButtons: {
    cancel: { show: false },
    confirm: { show: false },
    submit: { show: false },
    repeatAdd: { show: false },
    close: { show: true, name: '关 闭', type: 'primary' },
  },
  someFlags: {
    needValidate: false,
    needVerifyUpdate: false,
    autoMax: false,
    needMaxBtn: true,
  },
});

const {
  files: detailFiles,
  loadFiles: loadDetailFiles,
  triggerDownload,
  triggerPreview,
  reset: resetDetailFiles,
} = useDiaryFiles(ENTERPRISE_TABLE_NAME);

function timelineType(status) {
  if (status === 1) return 'success';
  if (status === 2) return 'danger';
  if (status === 3) return 'warning';
  if (status === 0) return 'primary';
  return 'info';
}

async function showDialog(val, row = {}) {
  currentRow.value = row || {};
  detailRecord.value = normalizeDetailPayload({}, row);
  detailHistory.value = [];
  resetDetailFiles();
  activeTab.value = 'basic';
  defaultProps.dlgTitle = props.dlgTitle;
  dlgBasicRef.value?.showDialog(val, detailRecord.value, 'view');
  if (!val) {
    return;
  }

  const enterpriseInfoId = resolveEnterpriseInfoId(row);
  if (!enterpriseInfoId) {
    return;
  }

  loading.value = true;
  try {
    const res = await props.detailApi({ enterpriseInfoId });
    detailRecord.value = normalizeDetailPayload(res?.data || {}, row);
    detailHistory.value = normalizeHistoryList(res?.data || {});
    if (detailRecord.value.enterpriseInfoId) {
      await loadDetailFiles(detailRecord.value.enterpriseInfoId);
    }
  } finally {
    loading.value = false;
  }
}

function handleCloseDialog() {
  emit('close-dialog');
}

defineExpose({
  showDialog,
});
</script>

<style scoped>
.enterprise-detail-dialog {
  min-height: 420px;
}

.pre-wrap,
.timeline-reason {
  white-space: pre-wrap;
  line-height: 22px;
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.empty-text {
  color: #909399;
  font-size: 13px;
}

.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 90px;
  padding: 10px 8px 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.file-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.file-badge {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
  flex-shrink: 0;
  user-select: none;
}

.file-card-name {
  font-size: 11px;
  color: #606266;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.file-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.file-card:hover .file-card-actions {
  opacity: 1;
}

.action-icon {
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}

.action-icon:hover {
  color: #409eff;
  background: #ecf5ff;
}
</style>
