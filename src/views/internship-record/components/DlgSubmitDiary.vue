<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="640px"
    :close-on-click-modal="false"
    append-to-body
    @closed="onClosed"
  >
    <div v-loading="filesLoading">
      <el-alert
        v-if="readonly && currentDiary?.remark"
        :title="`老师批阅意见：${currentDiary.remark}`"
        type="success"
        :closable="false"
        class="mb-16"
      />

      <el-form ref="formRef" :model="form" :rules="readonly ? {} : formRules" label-width="90px">
        <!-- 日志内容 -->
        <el-form-item label="日志内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            :maxlength="2000"
            show-word-limit
            :readonly="readonly"
            :disabled="readonly"
            placeholder="请填写本期实习日志内容..."
          />
        </el-form-item>

        <!-- 附件 -->
        <el-form-item label="附件">
          <!-- 上传按钮（编辑模式） -->
          <div v-if="!readonly" class="upload-row">
            <!-- 原生 input，隐藏 -->
            <input
              ref="fileInputRef"
              type="file"
              multiple
              :accept="acceptStr"
              style="display:none"
              @change="onNativeFileChange"
            />
            <el-button
              type="primary"
              :disabled="totalFileCount >= 5"
              @click="fileInputRef.click()"
            >
              <el-icon style="margin-right:4px"><Upload /></el-icon>
              选择文件
            </el-button>
            <span class="upload-hint">
              支持 Office/WPS/PDF/图片/视频/压缩包，单个 ≤20MB，最多 5 个
              <span :class="totalSizeWarning ? 'size-warn' : 'size-normal'">
                {{ totalSizeText }}
              </span>
            </span>
          </div>

          <!-- 文件列表 -->
          <div v-if="totalFileCount > 0" class="file-grid">
            <div
              v-for="file in existingFiles"
              :key="'e_' + file.id"
              class="file-card"
              :title="file.name"
              @click="downloadExistingFile(file)"
            >
              <el-icon class="file-card-icon" :style="{ color: fileColor(file.name) }"><Document /></el-icon>
              <span class="file-card-name">{{ file.name }}</span>
              <span
                v-if="!readonly"
                class="file-card-remove"
                @click.stop="deleteExistingFile(file)"
              ><el-icon><Close /></el-icon></span>
            </div>

            <div
              v-for="(file, idx) in newFileList"
              :key="'n_' + idx"
              class="file-card file-card-new"
              :title="file.name"
            >
              <el-icon class="file-card-icon" :style="{ color: fileColor(file.name) }"><Document /></el-icon>
              <span class="file-card-name">{{ file.name }}</span>
              <span class="file-card-remove" @click.stop="removeNewFile(idx)">
                <el-icon><Close /></el-icon>
              </span>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="visible = false">{{ readonly ? '关闭' : '取消' }}</el-button>
      <el-button
        v-if="!readonly"
        type="primary"
        :loading="submitting"
        :disabled="totalFileCount === 0"
        :title="totalFileCount === 0 ? '请至少上传一个附件' : ''"
        @click="handleSubmit"
      >提交</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Close, Upload } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import fileAPI from '@/api/file'
import listAPI from '@/api/list'
import { submitDiary } from '@/api/diary'
import CONSTANT from '@/utils/constant'

defineOptions({ name: 'DlgSubmitDiary' })

const ALLOWED_EXTS = [
  'pdf',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'wps', 'et', 'dps', 'wpt', 'ett', 'dpt',
  'zip', 'rar', '7z', 'tar', 'gz',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif',
  'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'rmvb', 'm4v', 'webm',
]

const acceptStr = ALLOWED_EXTS.map(e => '.' + e).join(',')

const FILE_COLORS = {
  pdf: '#e74c3c',
  doc: '#2980b9', docx: '#2980b9',
  xls: '#27ae60', xlsx: '#27ae60',
  ppt: '#e67e22', pptx: '#e67e22',
  wps: '#2980b9', et: '#27ae60', dps: '#e67e22',
  wpt: '#2980b9', ett: '#27ae60', dpt: '#e67e22',
  zip: '#8e44ad', rar: '#8e44ad', '7z': '#8e44ad', tar: '#8e44ad', gz: '#8e44ad',
  jpg: '#16a085', jpeg: '#16a085', png: '#16a085', gif: '#16a085',
  bmp: '#16a085', webp: '#16a085', tiff: '#16a085', tif: '#16a085',
  mp4: '#c0392b', avi: '#c0392b', mov: '#c0392b', mkv: '#c0392b',
  wmv: '#c0392b', flv: '#c0392b', rmvb: '#c0392b', m4v: '#c0392b', webm: '#c0392b',
}

function fileColor(name) {
  const ext = name?.split('.').pop()?.toLowerCase()
  return FILE_COLORS[ext] || '#409eff'
}

const emit = defineEmits(['success'])
const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})

const visible = ref(false)
const filesLoading = ref(false)
const submitting = ref(false)
const readonly = ref(false)

const stuInternshipPostId = ref(null)
const relTitleStudentId = ref(null)
const periodIndex = ref(null)
const currentDiary = ref(null)

const formRef = ref(null)
const fileInputRef = ref(null)
const form = reactive({ content: '' })
const formRules = {
  content: [{ required: true, message: '日志内容不能为空', trigger: 'blur' }],
}

const existingFiles = ref([])
const newFileList = ref([])

const totalFileCount = computed(() => existingFiles.value.length + newFileList.value.length)

const totalFileSize = computed(() => {
  const existing = existingFiles.value.reduce((s, f) => s + (f.size || 0), 0)
  const added = newFileList.value.reduce((s, f) => s + (f.size || 0), 0)
  return existing + added
})

const MAX_TOTAL = 50 * 1024 * 1024

function formatSize(bytes) {
  if (bytes === 0) return '0 MB'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const totalSizeText = computed(() => `${formatSize(totalFileSize.value)} / 50 MB`)
const totalSizeWarning = computed(() => totalFileSize.value > MAX_TOTAL * 0.8)

const dialogTitle = computed(() => {
  if (readonly.value) return `第 ${periodIndex.value} 期实习日志（查看）`
  if (currentDiary.value?.isAudit === CONSTANT.AUDIT_STATUS.SAVE) {
    return `重新提交 — 第 ${periodIndex.value} 期实习日志`
  }
  return `提交 — 第 ${periodIndex.value} 期实习日志`
})

function open(opts) {
  stuInternshipPostId.value = opts.stuInternshipPostId ?? null
  relTitleStudentId.value = opts.relTitleStudentId ?? null
  periodIndex.value = opts.periodIndex
  currentDiary.value = opts.diary ?? null
  readonly.value = opts.readonly ?? false

  form.content = opts.diary?.content ?? ''
  existingFiles.value = []
  newFileList.value = []

  visible.value = true

  if (opts.diary?.relationId) {
    loadExistingFiles(opts.diary.relationId)
  }
}

function onClosed() {
  formRef.value?.resetFields()
  existingFiles.value = []
  newFileList.value = []
  currentDiary.value = null
  // 重置原生 input，避免下次打开选同一文件无反应
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// ── 文件选择（原生 input） ──────────────────────────────────
function onNativeFileChange(e) {
  const files = Array.from(e.target.files || [])
  files.forEach(addFile)
  // 清空 input 值，允许重复选择同一文件
  e.target.value = ''
}

function addFile(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    ElMessage.warning(`不支持 .${ext} 格式`)
    return
  }
  if (file.size > 20 * 1024 * 1024) {
    ElMessage.warning(`「${file.name}」超过 20MB 限制`)
    return
  }
  if (totalFileCount.value >= 5) {
    ElMessage.warning('最多同时上传 5 个文件')
    return
  }
  if (totalFileSize.value + file.size > MAX_TOTAL) {
    ElMessage.warning('所有文件总大小不超过 50MB')
    return
  }
  if (newFileList.value.some(f => f.name === file.name && f.size === file.size)) {
    ElMessage.warning(`「${file.name}」已添加`)
    return
  }
  newFileList.value.push({ name: file.name, size: file.size, raw: file })
}

function removeNewFile(idx) {
  ElMessageBox.confirm('删除后不可恢复，确定删除该文件吗？', '提示', {
    confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
  }).then(() => {
    newFileList.value.splice(idx, 1)
  }).catch(() => {})
}

// ── 加载已有文件 ────────────────────────────────────────────
async function loadExistingFiles(diaryId) {
  try {
    filesLoading.value = true
    const res = await listAPI.getSomeRecords({
      keyWords: 'SysOssFile',
      searchKey: { relationIds: diaryId, tableName: 'MainDiary' },
      reg: { relationIds: '=', tableName: '=' },
    })
    const raw = res?.data?.content || res?.data || []
    existingFiles.value = raw.map(f => ({
      id: f.id,
      name: f.fileName || '未知文件',
      size: Number(f.fileSize) || 0,
    }))
  } catch {
    existingFiles.value = []
  } finally {
    filesLoading.value = false
  }
}

// ── 下载已有文件 ────────────────────────────────────────────
async function downloadExistingFile(file) {
  try {
    const content = await fileAPI.downloadFile(file.id)
    const blob = new Blob([content])
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    ElMessage.error('文件下载失败')
  }
}

// ── 删除已有文件 ────────────────────────────────────────────
async function deleteExistingFile(file) {
  try {
    await ElMessageBox.confirm('删除后不可恢复，确定删除该文件吗？', '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning',
    })
  } catch { return }
  try {
    await fileAPI.deleteFile([file.id])
    existingFiles.value = existingFiles.value.filter(f => f.id !== file.id)
    ElMessage.success('删除成功')
  } catch {
    ElMessage.error('删除失败')
  }
}

// ── 提交 ────────────────────────────────────────────────────
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch { return }

  try {
    submitting.value = true

    const node = { periodIndex: periodIndex.value, content: form.content }
    if (stuInternshipPostId.value) node.stuInternshipPostId = stuInternshipPostId.value
    if (relTitleStudentId.value) node.relTitleStudentId = relTitleStudentId.value

    const res = await submitDiary(node)
    if (res?.message !== 'successful') {
      ElMessage.error(res?.message || '提交失败')
      return
    }
    const diaryId = res.data

    const rawFiles = newFileList.value.filter(f => f.raw).map(f => f.raw)
    if (rawFiles.length > 0 && diaryId) {
      await fileAPI.upload({ files: rawFiles, relationIds: diaryId, tableName: 'MainDiary' })
    }

    ElMessage.success('提交成功')
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error('提交失败：' + (e?.message || ''))
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }

.upload-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.upload-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.8;
}

.size-normal {
  font-size: 12px;
  color: #67c23a;
  font-weight: 500;
}

.size-warn {
  font-size: 12px;
  color: #e6a23c;
  font-weight: 500;
}

.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
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

.file-card-new {
  cursor: default;
}

.file-card-icon {
  font-size: 28px;
  margin-bottom: 6px;
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

.file-card-remove {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  cursor: pointer;
  color: #fff;
  font-size: 11px;
}

.file-card:hover .file-card-remove {
  opacity: 1;
  background: rgba(245, 108, 108, 0.85);
}
</style>
