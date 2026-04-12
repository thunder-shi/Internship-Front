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
      <!-- 批量模式：学生汇总 -->
      <el-alert
        v-if="isBatch"
        :title="`已选 ${batchRows.length} 位学生，其中 ${batchEligibleCount} 位处于待审核状态，批阅操作将仅对待审核记录生效`"
        type="info"
        :closable="false"
        class="mb-16"
      />

      <!-- 单行模式：学生信息 -->
      <template v-else>
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
        </el-descriptions>

        <!-- 日志内容 -->
        <el-form-item label="日志内容" label-width="90px">
          <el-input
            :model-value="student?.diary?.content || '（无内容）'"
            type="textarea"
            :rows="5"
            readonly
            disabled
          />
        </el-form-item>

        <!-- 附件 -->
        <el-form-item v-if="ossEnabled" label="附件" label-width="90px">
          <div v-if="files.length === 0" class="empty-files">暂无附件</div>
          <div v-else class="file-list">
            <div v-for="file in files" :key="file.id" class="file-item">
              <el-icon class="file-icon"><Document /></el-icon>
              <span class="file-name" :title="file.name">{{ file.name }}</span>
              <el-button type="primary" link size="small" @click="triggerDownload(file)">下载</el-button>
            </div>
          </div>
        </el-form-item>

        <el-divider />

        <el-alert
          v-if="isAlreadyPassed"
          title="该日志已审核通过，仅可退回修改"
          type="warning"
          :closable="false"
          class="mb-16"
        />
      </template>

      <!-- 审核表单（单行/批量共用） -->
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
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import fileAPI from '@/api/file'
import listAPI from '@/api/list'
import internshipProcessAPI from '@/api/internshipProcess'
import CONSTANT from '@/utils/constant'
import { getAuditStatusText, getAuditTagType } from '@/utils/verify'

defineOptions({ name: 'DlgReviewDiary' })

const ossEnabled = true

const emit = defineEmits(['success'])

const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})

const AUDIT_STATUS = CONSTANT.AUDIT_STATUS

// ── 状态 ────────────────────────────────────────────────────
const visible = ref(false)
const loading = ref(false)
const submitting = ref(false)
const student = ref(null)

// ── 批量模式 ─────────────────────────────────────────────────
const batchRows = ref(null)
const isBatch = computed(() => Array.isArray(batchRows.value) && batchRows.value.length > 1)
const batchEligibleCount = computed(() =>
  isBatch.value
    ? batchRows.value.filter(r => r?.diary?.isAudit === AUDIT_STATUS.SUBMIT).length
    : 0
)

const isAlreadyPassed = computed(() => !isBatch.value && student.value?.diary?.isAllVerified === true)

// ── 附件 ────────────────────────────────────────────────────
const files = ref([])

// ── 审核表单 ─────────────────────────────────────────────────
const formRef = ref(null)
const form = reactive({ isAudit: null, reason: '' })
const formRules = {
  isAudit: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
}

// ── 动态 label / placeholder ─────────────────────────────────
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

// ── 对外暴露：open ──────────────────────────────────────────
/**
 * @param {Object|Object[]} rowOrRows - 单行数据或行数组（批量模式）
 */
function open(rowOrRows) {
  const arr = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows]
  form.isAudit = null
  form.reason = ''
  files.value = []

  if (arr.length > 1) {
    // 批量模式
    student.value = null
    batchRows.value = arr
  } else {
    // 单行模式
    student.value = arr[0]
    batchRows.value = null
    if (arr[0]?.diary?.relationId) {
      loadFiles(arr[0].diary.relationId)
    }
  }
  visible.value = true
}

function onClosed() {
  formRef.value?.clearValidate()
  student.value = null
  batchRows.value = null
  files.value = []
}

// ── 加载附件 ─────────────────────────────────────────────────
async function loadFiles(diaryId) {
  try {
    loading.value = true
    const res = await listAPI.getSomeRecords({
      keyWords: 'SysOssFile',
      searchKey: { relationIds: diaryId, tableName: 'main_diary' },
      reg: { relationIds: '=', tableName: '=' },
    })
    const raw = res?.data?.content || res?.data || []
    files.value = raw.map(f => ({
      id: f.id,
      name: f.fileName || '未知文件',
      size: Number(f.fileSize) || 0,
    }))
  } catch {
    files.value = []
  } finally {
    loading.value = false
  }
}

// ── 下载附件 ─────────────────────────────────────────────────
async function triggerDownload(file) {
  try {
    await fileAPI.downloadFile(file.id)
  } catch {
    ElMessage.error('文件下载失败')
  }
}

// ── 提交审核 ─────────────────────────────────────────────────
async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }

  try {
    submitting.value = true

    if (isBatch.value) {
      // 批量模式：只处理待审核状态的记录
      const eligible = batchRows.value.filter(r => r?.diary?.isAudit === AUDIT_STATUS.SUBMIT)
      if (!eligible.length) {
        ElMessage.warning('选中的记录中没有待审核状态的日志')
        return
      }
      let successCount = 0
      for (const row of eligible) {
        const processId = row.diary?.id
        if (!processId) continue
        try {
          await internshipProcessAPI.auditProcess({ id: processId, isAudit: form.isAudit, reason: form.reason })
          successCount++
        } catch {}
      }
      ElMessage.success(`批量操作完成，成功 ${successCount} 条`)
      visible.value = false
      emit('success')
      return
    }

    // 单行模式
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

    const res = await internshipProcessAPI.auditProcess({
      id: processId,
      isAudit: form.isAudit,
      reason: form.reason,
    })
    if (res?.message !== 'successful') {
      ElMessage.error(res?.message || '审核失败')
      return
    }

    const resultText = getAuditStatusText(form.isAudit)
    ElMessage.success(`审核完成：${resultText}`)
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
