<template>
  <el-dialog
    v-model="visible"
    title="批阅实习日志"
    width="640px"
    :close-on-click-modal="false"
    append-to-body
    @closed="onClosed"
  >
    <div v-loading="loading">
      <!-- 学生信息 -->
      <el-descriptions :column="2" border size="small" class="mb-16">
        <el-descriptions-item label="学生姓名">{{ student?.studentName }}</el-descriptions-item>
        <el-descriptions-item label="岗位/题目">
          {{ student?.internshipPostName || student?.titleName || '——' }}
        </el-descriptions-item>
        <el-descriptions-item label="第几期">第 {{ student?.diary?.periodIndex }} 期</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getAuditTagType(student?.diary?.isAudit)">
            {{ getAuditStatusText(student?.diary?.isAudit) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item v-if="student?.diary?.title" label="日志标题" :span="2">
          {{ student.diary.title }}
        </el-descriptions-item>
        <el-descriptions-item v-if="student?.diary?.content" label="日志内容" :span="2">
          <div class="diary-content">{{ student.diary.content }}</div>
        </el-descriptions-item>
      </el-descriptions>

      <!-- 附件 -->
      <el-form-item label="附件" label-width="70px" class="mb-16">
        <div v-if="files.length === 0" class="empty-files">暂无附件</div>
        <div v-else class="file-list">
          <div v-for="file in files" :key="file.id" class="file-item">
            <el-icon class="file-icon"><Document /></el-icon>
            <span class="file-name" :title="file.name">{{ file.name }}</span>
            <el-button type="primary" link size="small" @click="triggerDownload(file)">下载</el-button>
          </div>
        </div>
      </el-form-item>

      <el-alert
        v-if="isAlreadyPassed"
        title="该日志已审核通过，仅可退回修改"
        type="warning"
        :closable="false"
        class="mb-16"
      />

      <el-divider />

      <!-- 审核表单 -->
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <el-form-item label="审核结果" prop="isAudit">
          <el-radio-group v-model="form.isAudit">
            <el-radio v-if="!isAlreadyPassed" :label="AUDIT_STATUS.PASS">审核通过</el-radio>
            <el-radio :label="AUDIT_STATUS.BACK">退回修改</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item :label="reasonLabel" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="3"
            :maxlength="500"
            show-word-limit
            :placeholder="reasonPlaceholder"
          />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认审核</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import internshipProcessAPI from '@/api/internshipProcess'
import CONSTANT from '@/utils/constant'
import { getAuditStatusText, getAuditTagType } from '@/utils/verify'
import { useDiaryFiles } from './useDiaryFiles'

defineOptions({ name: 'DlgReviewDiary' })

const emit = defineEmits(['success'])

const AUDIT_STATUS = CONSTANT.AUDIT_STATUS

const visible = ref(false)
const submitting = ref(false)
const student = ref(null)

const { files, filesLoading: loading, loadFiles, triggerDownload, reset: resetFiles } = useDiaryFiles()

const isAlreadyPassed = computed(() => student.value?.diary?.isAllVerified === true)

const formRef = ref(null)
const form = reactive({ isAudit: null, reason: '' })
const formRules = {
  isAudit: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
}

const reasonLabel = computed(() => {
  if (form.isAudit === AUDIT_STATUS.PASS) return '批阅意见'
  if (form.isAudit === AUDIT_STATUS.BACK) return '退回原因'
  return '意见'
})

const reasonPlaceholder = computed(() => {
  if (form.isAudit === AUDIT_STATUS.PASS) return '选填，填写后学生可查看'
  if (form.isAudit === AUDIT_STATUS.BACK) return '请说明退回原因，学生可重新提交'
  return ''
})

function open(row) {
  student.value = row
  form.isAudit = null
  form.reason = ''
  resetFiles()
  visible.value = true

  if (row?.diary?.relationId) {
    loadFiles(row.diary.relationId)
  }
}

function onClosed() {
  formRef.value?.clearValidate()
  student.value = null
  resetFiles()
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  // 已通过时二次确认
  if (isAlreadyPassed.value) {
    try {
      await ElMessageBox.confirm(
        '当前日志已审核通过，确认要退回修改吗？',
        '提示',
        { confirmButtonText: '确认退回', cancelButtonText: '取消', type: 'warning' }
      )
    } catch { return }
  }

  const processId = student.value?.diary?.id
  if (!processId) {
    ElMessage.error('缺少审核记录 ID，无法提交')
    return
  }

  try {
    submitting.value = true
    const res = await internshipProcessAPI.auditProcess({
      id: processId,
      isAudit: form.isAudit,
      reason: form.reason,
    })
    if (res?.message !== 'successful') {
      ElMessage.error(res?.message || '审核失败')
      return
    }
    ElMessage.success(`审核完成：${getAuditStatusText(form.isAudit)}`)
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error('审核提交失败：' + (e?.message || ''))
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }

.diary-content {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
}

.empty-files {
  color: #909399;
  font-size: 13px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.file-icon { color: #409eff; flex-shrink: 0; }

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
</style>
