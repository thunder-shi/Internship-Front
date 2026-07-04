<template>
  <el-dialog
    v-model="visible"
    title="批量批阅实习日志"
    width="480px"
    :close-on-click-modal="false"
    append-to-body
    @closed="onClosed"
  >
    <el-alert
      :title="`已选 ${batchRows.length} 位学生，其中 ${eligibleCount} 位处于待审核状态，操作将仅对待审核记录生效`"
      type="info"
      :closable="false"
      class="mb-16"
    />

    <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px">
      <el-form-item label="审核结果" prop="isAudit">
        <el-radio-group v-model="form.isAudit">
          <el-radio :label="AUDIT_STATUS.PASS">审核通过</el-radio>
          <el-radio :label="AUDIT_STATUS.BACK">退回修改</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item
        v-if="form.isAudit === AUDIT_STATUS.PASS"
        label="评分"
        prop="score"
      >
        <el-input-number
          v-model="form.score"
          :min="0"
          :max="100"
          :precision="2"
          controls-position="right"
        />
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

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确认审核</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import internshipProcessAPI from '@/api/internshipProcess'
import CONSTANT from '@/utils/constant'
import { getAuditStatusText, canReviewDiary } from '@/utils/verify'

defineOptions({ name: 'DlgBatchReviewDiary' })

const emit = defineEmits(['success'])

const AUDIT_STATUS = CONSTANT.AUDIT_STATUS

const visible = ref(false)
const submitting = ref(false)
const batchRows = ref([])

const eligibleCount = computed(() =>
  batchRows.value.filter(r => canReviewDiary(r?.diary)).length
)

const formRef = ref(null)
const form = reactive({ isAudit: null, reason: '', score: null })
const formRules = {
  isAudit: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
  score: [
    {
      validator: (_rule, val, cb) => {
        if (form.isAudit !== AUDIT_STATUS.PASS) return cb()
        const n = Number(val)
        if (val === null || val === '' || !Number.isFinite(n)) {
          cb(new Error('请填写评分'))
        } else if (n < 0 || n > 100) {
          cb(new Error('评分应在 0-100 之间'))
        } else cb()
      },
      trigger: 'blur',
    },
  ],
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

function getVerifyProcessId(diary) {
  return diary?.verifyProcessId ?? diary?.id ?? null
}

function open(rows, options = {}) {
  batchRows.value = Array.isArray(rows) ? rows : [rows]
  form.isAudit = null
  form.reason = ''
  form.score = null
  visible.value = true
}

function onClosed() {
  formRef.value?.clearValidate()
  batchRows.value = []
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const eligible = batchRows.value.filter(r => canReviewDiary(r?.diary))
  if (!eligible.length) {
    ElMessage.warning('选中的记录中没有待审核状态的日志')
    return
  }

  try {
    submitting.value = true
    let successCount = 0
    const failedNames = []
    for (const row of eligible) {
      const processId = getVerifyProcessId(row.diary)
      if (!processId) continue
      const payload = { id: processId, isAudit: form.isAudit, reason: form.reason }
      if (form.isAudit === AUDIT_STATUS.PASS) {
        payload.score = Number(form.score)
      }
      try {
        await internshipProcessAPI.auditProcess(payload)
        successCount++
      } catch {
        failedNames.push(row.studentName || `ID:${processId}`)
      }
    }
    if (failedNames.length === 0) {
      ElMessage.success(`批量操作完成（${getAuditStatusText(form.isAudit)}），共 ${successCount} 条`)
    } else {
      ElMessage.warning(`操作完成：${successCount} 条成功，${failedNames.length} 条失败（${failedNames.join('、')}）`)
    }
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error('批量审核失败：' + (e?.message || ''))
  } finally {
    submitting.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.mb-16 { margin-bottom: 16px; }
</style>
