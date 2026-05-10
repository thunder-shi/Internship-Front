<template>
  <el-dialog
    v-model="visible"
    title="自主实习申请详情"
    width="680px"
    :close-on-click-modal="false"
    append-to-body
    @closed="onClosed"
  >
    <div v-loading="loading">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="学号">{{ record?.studentAccount || '--' }}</el-descriptions-item>
        <el-descriptions-item label="学生姓名">{{ record?.studentName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="所属院系">{{ record?.departmentName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实习项目">{{ record?.internshipName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实习单位">{{ record?.selfCompanyName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实习岗位">{{ record?.selfPostName || '--' }}</el-descriptions-item>
        <el-descriptions-item label="实习地址">{{ record?.selfAddress || '--' }}</el-descriptions-item>
        <el-descriptions-item label="备注说明">{{ record?.selfRemarks || '--' }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="auditTagType">{{ auditText }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="record?.reason" label="审核意见">{{ record.reason }}</el-descriptions-item>
      </el-descriptions>

      <div class="files-section">
        <div class="files-title">证明材料</div>
        <div v-if="!existingFiles.length" class="files-empty">无附件</div>
        <div v-else class="file-grid">
          <el-tooltip
            v-for="file in existingFiles"
            :key="file.id"
            :content="file.name"
            placement="top"
            :show-after="400"
          >
            <div class="file-card">
              <div
                class="file-badge"
                :style="{ background: fileBadge(file.name).bg, fontSize: badgeFontSize(fileBadge(file.name).text) }"
              >{{ fileBadge(file.name).text }}</div>
              <span class="file-card-name">{{ file.name }}</span>
              <div class="file-card-actions">
                <el-icon class="action-icon" title="预览" @click.stop="triggerPreview(file)"><View /></el-icon>
                <el-icon class="action-icon" title="下载" @click.stop="triggerDownload(file)"><Download /></el-icon>
              </div>
            </div>
          </el-tooltip>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { Download, View } from '@element-plus/icons-vue'
import { useDiaryFiles } from '@/utils/useDiaryFiles'
import { getAuditStatusText, getAuditTagType } from '@/utils/verify'

defineOptions({ name: 'DlgSelfDeclarationView' })

const REL_TABLE_NAME = 'RelStuInternshipPost'

// 附件样式与申请弹窗保持一致
const FILE_BADGES = {
  doc: { text: 'W', bg: '#2b579a' }, docx: { text: 'W', bg: '#2b579a' },
  xls: { text: 'X', bg: '#217346' }, xlsx: { text: 'X', bg: '#217346' },
  ppt: { text: 'P', bg: '#d24726' }, pptx: { text: 'P', bg: '#d24726' },
  pdf: { text: 'PDF', bg: '#f40f02' },
  jpg: { text: 'IMG', bg: '#0e9c75' }, jpeg: { text: 'IMG', bg: '#0e9c75' },
  png: { text: 'PNG', bg: '#0e9c75' }, gif: { text: 'GIF', bg: '#0e9c75' },
  bmp: { text: 'IMG', bg: '#0e9c75' }, webp: { text: 'IMG', bg: '#0e9c75' },
  zip: { text: 'ZIP', bg: '#7d3c98' }, rar: { text: 'RAR', bg: '#7d3c98' },
  '7z': { text: '7Z', bg: '#7d3c98' },
}
function fileBadge(name) {
  const ext = name?.split('.').pop()?.toLowerCase() || ''
  return FILE_BADGES[ext] || { text: ext.slice(0, 4).toUpperCase() || '?', bg: '#909399' }
}
function badgeFontSize(text) {
  if (text.length <= 1) return '20px'
  if (text.length <= 3) return '13px'
  return '10px'
}

const visible = ref(false)
const loading = ref(false)
const record = ref(null)

const {
  files: existingFiles,
  loadFiles,
  triggerDownload,
  triggerPreview,
  reset: resetFiles,
} = useDiaryFiles(REL_TABLE_NAME)

const auditText = computed(() => getAuditStatusText(record.value?.isAudit))
const auditTagType = computed(() => getAuditTagType(record.value?.isAudit))

/**
 * @param {Object} row - 来自 ViewVerifyProcessRelStuInternshipPostMerge 的行
 *   需包含 relationId（= RelStuInternshipPost.id）及 self* 字段
 */
async function open(row) {
  record.value = row ? { ...row } : null
  resetFiles()
  visible.value = true
  await nextTick()
  const relId = row?.relationId
  if (relId) {
    loading.value = true
    try {
      await loadFiles(relId)
    } finally {
      loading.value = false
    }
  }
}

function onClosed() {
  if (visible.value) return
  record.value = null
  resetFiles()
}

defineExpose({ open })
</script>

<style scoped>
.files-section {
  margin-top: 16px;
}

.files-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
  padding-left: 2px;
}

.files-empty {
  font-size: 12px;
  color: #909399;
  padding-left: 2px;
}

.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  width: 100%;
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
