<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="680px"
    :close-on-click-modal="false"
    append-to-body
    @closed="onClosed"
  >
    <div v-loading="loading">
      <el-alert
        v-if="backReason"
        :title="`退回意见：${backReason}`"
        type="warning"
        :closable="false"
        class="mb-12"
      />
      <el-alert
        v-if="notPassReason"
        :title="`上次审核未通过：${notPassReason}`"
        type="error"
        :closable="false"
        class="mb-12"
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="readonly ? {} : formRules"
        label-width="110px"
      >
        <el-form-item label="实习项目">
          <span class="static-text">{{ internshipName || '--' }}</span>
        </el-form-item>
        <el-form-item label="实习单位" prop="selfCompanyName">
          <el-input
            v-model="form.selfCompanyName"
            :maxlength="200"
            show-word-limit
            :readonly="readonly"
            :disabled="readonly"
            placeholder="请输入实习单位名称"
          />
        </el-form-item>
        <el-form-item label="实习岗位" prop="selfPostName">
          <el-input
            v-model="form.selfPostName"
            :maxlength="200"
            show-word-limit
            :readonly="readonly"
            :disabled="readonly"
            placeholder="请输入岗位名称"
          />
        </el-form-item>
        <el-form-item label="实习地址" prop="selfAddress">
          <el-input
            v-model="form.selfAddress"
            :maxlength="500"
            show-word-limit
            :readonly="readonly"
            :disabled="readonly"
            placeholder="请输入实习地址"
          />
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="form.selfRemarks"
            type="textarea"
            :rows="3"
            :maxlength="1000"
            show-word-limit
            :readonly="readonly"
            :disabled="readonly"
            placeholder="可填写联系人、内推来源、实习时段等"
          />
        </el-form-item>

        <el-form-item label="证明材料">
          <div v-if="!readonly" class="upload-row">
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
              :disabled="totalFileCount >= MAX_FILE_COUNT"
              @click="fileInputRef.click()"
            >
              <el-icon style="margin-right:4px"><Upload /></el-icon>
              选择文件
            </el-button>
            <span class="upload-hint">
              最多 {{ MAX_FILE_COUNT }} 个，单个 ≤ {{ MAX_SINGLE_MB }}MB，总计 ≤ {{ MAX_TOTAL_MB }}MB
              <span :class="totalSizeWarning ? 'size-warn' : 'size-normal'">
                {{ totalSizeText }}
              </span>
            </span>
          </div>
          <div v-else-if="totalFileCount === 0" class="upload-empty">无附件</div>

          <div v-if="totalFileCount > 0" class="file-grid">
            <el-tooltip
              v-for="file in existingFiles"
              :key="'e_' + file.id"
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
                <span
                  v-if="!readonly"
                  class="file-card-remove"
                  @click.stop="deleteExistingFile(file)"
                ><el-icon><Close /></el-icon></span>
              </div>
            </el-tooltip>

            <el-tooltip
              v-for="(file, idx) in newFileList"
              :key="'n_' + idx"
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
                <div class="file-card-actions"></div>
                <span class="file-card-remove" @click.stop="removeNewFile(idx)">
                  <el-icon><Close /></el-icon>
                </span>
              </div>
            </el-tooltip>
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
        @click="handleSubmit"
      >提 交</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Upload, Download, View } from '@element-plus/icons-vue'
import listAPI from '@/api/list'
import fileAPI from '@/api/file'
import internshipProcessAPI from '@/api/internshipProcess'
import CONSTANT from '@/utils/constant'
import { useDiaryFiles } from '@/utils/useDiaryFiles'

defineOptions({ name: 'DlgSelfDeclaration' })

const REL_TABLE_NAME = 'RelStuInternshipPost'
const MAX_FILE_COUNT = 5
const MAX_SINGLE_MB = 20
const MAX_TOTAL_MB = 50
const MAX_SINGLE = MAX_SINGLE_MB * 1024 * 1024
const MAX_TOTAL = MAX_TOTAL_MB * 1024 * 1024

const ALLOWED_EXTS = [
  'pdf',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'zip', 'rar', '7z',
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
]
const acceptStr = ALLOWED_EXTS.map(e => '.' + e).join(',')

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

const emit = defineEmits(['success'])

const visible = ref(false)
const readonly = ref(false)
const loading = ref(false)
const submitting = ref(false)

const mode = ref('create')
const currentRecord = ref(null)
const internshipId = ref(null)
const internshipName = ref('')
const backReason = ref('')
const notPassReason = ref('')

const formRef = ref(null)
const fileInputRef = ref(null)

const form = reactive({
  selfCompanyName: '',
  selfPostName: '',
  selfAddress: '',
  selfRemarks: '',
})

const formRules = {
  selfCompanyName: [
    { required: true, message: '请输入实习单位', trigger: 'blur' },
    { max: 200, message: '不超过 200 字', trigger: 'blur' },
  ],
  selfPostName: [
    { required: true, message: '请输入岗位名称', trigger: 'blur' },
    { max: 200, message: '不超过 200 字', trigger: 'blur' },
  ],
  selfAddress: [
    { required: true, message: '请输入实习地址', trigger: 'blur' },
    { max: 500, message: '不超过 500 字', trigger: 'blur' },
  ],
}

const {
  files: existingFiles,
  loadFiles: loadExistingFiles,
  triggerDownload,
  triggerPreview,
  deleteFile: deleteExistingFile,
} = useDiaryFiles(REL_TABLE_NAME)
const newFileList = ref([])

const totalFileCount = computed(() => existingFiles.value.length + newFileList.value.length)
const totalFileSize = computed(() => {
  const existing = existingFiles.value.reduce((s, f) => s + (f.size || 0), 0)
  const added = newFileList.value.reduce((s, f) => s + (f.size || 0), 0)
  return existing + added
})

function formatSize(bytes) {
  if (bytes === 0) return '0 MB'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

const totalSizeText = computed(() => `${formatSize(totalFileSize.value)} / ${MAX_TOTAL_MB} MB`)
const totalSizeWarning = computed(() => totalFileSize.value > MAX_TOTAL * 0.8)

const dialogTitle = computed(() => {
  if (readonly.value) return '自主实习申请（查看）'
  if (mode.value === 'resubmit') return '重新提交自主实习申请'
  if (mode.value === 'back') return '修改并重新提交自主实习申请'
  return '提交自主实习申请'
})

/**
 * 打开对话框
 * @param {Object} opts
 * @param {Number} opts.internshipId - 当前项目 id
 * @param {String} opts.internshipName - 项目名（显示用）
 * @param {Object} [opts.record] - 已存在的申请记录（来自 Merge 视图）
 *   - record.isAudit 决定 mode：undefined/null=create、NOTPASS=resubmit、BACK=back、其他=readonly
 *   - record.relationId = RelStuInternshipPost.id
 */
async function open(opts) {
  internshipId.value = opts.internshipId ?? null
  internshipName.value = opts.internshipName ?? ''
  currentRecord.value = opts.record ?? null

  const isAudit = currentRecord.value?.isAudit
  const relId = currentRecord.value?.relationId

  backReason.value = ''
  notPassReason.value = ''
  existingFiles.value = []
  newFileList.value = []
  resetForm()

  if (!currentRecord.value) {
    mode.value = 'create'
    readonly.value = false
  } else if (isAudit === CONSTANT.AUDIT_STATUS.NOTPASS) {
    mode.value = 'resubmit'
    readonly.value = false
    notPassReason.value = currentRecord.value?.reason || ''
    preloadFromRecord(currentRecord.value)
    // NOTPASS 重投时后端会清空旧附件，不再加载
  } else if (isAudit === CONSTANT.AUDIT_STATUS.BACK) {
    mode.value = 'back'
    readonly.value = false
    backReason.value = currentRecord.value?.reason || ''
    preloadFromRecord(currentRecord.value)
    if (relId) loadExistingFiles(relId)
  } else {
    // SAVE/SUBMIT/PASS → 只读
    mode.value = 'readonly'
    readonly.value = true
    preloadFromRecord(currentRecord.value)
    if (relId) loadExistingFiles(relId)
  }

  visible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function preloadFromRecord(record) {
  form.selfCompanyName = record?.selfCompanyName || ''
  form.selfPostName = record?.selfPostName || ''
  form.selfAddress = record?.selfAddress || ''
  form.selfRemarks = record?.selfRemarks || ''
}

function resetForm() {
  form.selfCompanyName = ''
  form.selfPostName = ''
  form.selfAddress = ''
  form.selfRemarks = ''
}

function onClosed() {
  if (visible.value) return
  formRef.value?.resetFields()
  resetForm()
  existingFiles.value = []
  newFileList.value = []
  currentRecord.value = null
  backReason.value = ''
  notPassReason.value = ''
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function onNativeFileChange(e) {
  const files = Array.from(e.target.files || [])
  files.forEach(addFile)
  e.target.value = ''
}

function addFile(file) {
  const ext = (file.name || '').split('.').pop().toLowerCase()
  if (!ALLOWED_EXTS.includes(ext)) {
    ElMessage.warning(`不支持 .${ext} 格式`)
    return
  }
  if (file.size > MAX_SINGLE) {
    ElMessage.warning(`「${file.name}」超过 ${MAX_SINGLE_MB}MB 限制`)
    return
  }
  if (totalFileCount.value >= MAX_FILE_COUNT) {
    ElMessage.warning(`最多 ${MAX_FILE_COUNT} 个文件`)
    return
  }
  if (totalFileSize.value + file.size > MAX_TOTAL) {
    ElMessage.warning(`所有文件总大小不超过 ${MAX_TOTAL_MB}MB`)
    return
  }
  const dupInExisting = existingFiles.value.some(f => f.name === file.name)
  const dupInNew = newFileList.value.some(f => f.name === file.name && f.size === file.size)
  if (dupInExisting || dupInNew) {
    ElMessage.warning(`「${file.name}」已存在`)
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

/**
 * 上传新增附件（relId 下统一批量 upload）。
 * 后端 /common/minio/upload 对每次调用同名文件拒重，因此同批内已在前端去重。
 */
async function uploadNewFiles(relId) {
  if (!newFileList.value.length) return
  const files = newFileList.value.map(f => f.raw).filter(Boolean)
  if (!files.length) return
  await fileAPI.upload({
    files,
    relationIds: relId,
    tableName: REL_TABLE_NAME,
  })
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    if (mode.value === 'back') {
      await doBackResubmit()
    } else {
      await doApplyOrResubmit()
    }
    ElMessage.success('提交成功')
    emit('success')
    visible.value = false
  } catch (e) {
    if (e?.message) ElMessage.error(e.message)
    else console.error('自主实习申请提交失败:', e)
  } finally {
    submitting.value = false
  }
}

/** 首次提交 / NOTPASS 重投：走 applySelfInternship */
async function doApplyOrResubmit() {
  if (!internshipId.value) throw new Error('实习项目未指定')
  const res = await internshipProcessAPI.applySelfInternship({
    internshipId: internshipId.value,
    selfCompanyName: form.selfCompanyName,
    selfPostName: form.selfPostName,
    selfAddress: form.selfAddress,
    selfRemarks: form.selfRemarks,
  })
  if (!res || (res.status && res.status !== 200) || res.message === 'failed') {
    throw new Error(res?.message || '提交失败')
  }
  const relId = res?.data?.relStuInternshipPostId
  if (!relId) throw new Error('后端未返回申请记录 id，附件无法关联')
  await uploadNewFiles(relId)
}

/**
 * BACK 重投：前端直接编辑 + 重置审核状态为 SUBMIT
 * 与项目内 BACK 重提模式一致（见 BuildInternshipPlan.handleSubmitClick）
 */
async function doBackResubmit() {
  const relId = currentRecord.value?.relationId
  const mainVerifyProcessId = currentRecord.value?.id
  if (!relId) throw new Error('缺少 relationId')
  if (!mainVerifyProcessId) throw new Error('缺少审核流程 id')

  const editRes = await listAPI.editOneNode('RelStuInternshipPost', {
    id: relId,
    selfCompanyName: form.selfCompanyName,
    selfPostName: form.selfPostName,
    selfAddress: form.selfAddress,
    selfRemarks: form.selfRemarks,
  })
  if (!editRes || editRes.message !== 'successful') {
    throw new Error(editRes?.message || '保存修改失败')
  }
  await uploadNewFiles(relId)
  const submitRes = await listAPI.editOneNode('MainVerifyProcess', {
    id: mainVerifyProcessId,
    isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
    reason: null,
  })
  if (!submitRes || submitRes.message !== 'successful') {
    throw new Error(submitRes?.message || '提交审核失败')
  }
}

defineExpose({ open })
</script>

<style scoped>
.mb-12 { margin-bottom: 12px; }

.static-text {
  color: #303133;
}

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

.upload-empty {
  font-size: 12px;
  color: #909399;
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
