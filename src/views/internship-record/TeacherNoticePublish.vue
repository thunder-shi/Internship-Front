<template>
  <div class="teacher-notice-publish">
    <el-card class="selector-card" shadow="never" v-loading="optionsLoading">
      <el-row :gutter="16" align="middle">
        <el-col :span="12">
          <el-form-item label="实习项目" label-width="80px" class="mb-0">
            <el-select
              v-model="selectedInternshipId"
              placeholder="请选择实习项目"
              style="width: 100%"
              filterable
              @change="onInternshipChange"
            >
              <el-option
                v-for="item in internshipOptions"
                :key="item.internshipId"
                :label="item.internshipName"
                :value="item.internshipId"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12" class="actions">
          <el-button type="primary" :disabled="!selectedInternshipId" @click="openPublishDialog">
            发布通知
          </el-button>
          <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-wrap">
        <el-table v-loading="listLoading" :data="tableData" border stripe style="width: 100%">
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
          <el-table-column prop="internshipName" label="实习项目" min-width="140" show-overflow-tooltip />
          <el-table-column prop="publishTime" label="发布时间" width="180" />
          <el-table-column label="已读/接收" width="110" align="center">
            <template #default="{ row }">
              {{ Number(row.readCount || 0) }}/{{ Number(row.receiverCount || 0) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" class="action-link" @click="openDetail(row)">详情</el-button>
                <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pager">
        <v-page
          :current-page="page"
          :page-size="size"
          :total="total"
          :page-sizes="[10, 25, 50, 100]"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="publishVisible"
      title="发布通知"
      width="640px"
      destroy-on-close
      @closed="resetPublishForm"
    >
      <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="100px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="publishForm.title" maxlength="200" show-word-limit placeholder="请输入通知标题" />
        </el-form-item>
        <el-form-item label="正文" prop="content">
          <el-input
            v-model="publishForm.content"
            type="textarea"
            :rows="6"
            maxlength="5000"
            show-word-limit
            placeholder="请输入通知正文"
          />
        </el-form-item>
        <el-form-item label="接收范围">
          <el-radio-group v-model="publishForm.scope" @change="onScopeChange">
            <el-radio value="all">全部绑定学生</el-radio>
            <el-radio value="partial">指定学生</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="publishForm.scope === 'partial'" label="选择学生" prop="studentIds">
          <el-select
            v-model="publishForm.studentIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="请选择学生"
            style="width: 100%"
            :loading="studentsLoading"
          >
            <el-option
              v-for="student in boundStudents"
              :key="student.studentId"
              :label="formatStudentLabel(student)"
              :value="student.studentId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="附件">
          <input ref="fileInputRef" type="file" multiple @change="onFilesSelected" />
          <div v-if="pendingFiles.length" class="pending-files">
            <div v-for="(file, idx) in pendingFiles" :key="`${file.name}-${idx}`" class="pending-file-row">
              <span>{{ file.name }}</span>
              <el-button link type="danger" @click="removePendingFile(idx)">移除</el-button>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="publishVisible = false">取消</el-button>
        <el-button type="primary" :loading="publishing" @click="submitPublish">发布</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="通知详情" width="640px" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="标题">{{ detail.title }}</el-descriptions-item>
          <el-descriptions-item label="实习项目">{{ detail.internshipName }}</el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ detail.publishTime }}</el-descriptions-item>
          <el-descriptions-item label="已读/接收">
            {{ Number(detail.readCount || 0) }}/{{ Number(detail.receiverCount || 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="正文">
            <div class="notice-content">{{ detail.content }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <div class="files-block" v-loading="filesLoading">
          <div class="files-title">附件</div>
          <el-empty v-if="!files.length" description="暂无附件" :image-size="60" />
          <ul v-else class="file-list">
            <li v-for="file in files" :key="file.id">
              <span>{{ file.name }}</span>
              <span>
                <el-button link type="primary" @click="triggerPreview(file)">预览</el-button>
                <el-button link type="primary" @click="triggerDownload(file)">下载</el-button>
              </span>
            </li>
          </ul>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import noticeAPI from '@/api/notice'
import fileAPI from '@/api/file'
import { useDiaryFiles } from '@/utils/useDiaryFiles'
import VPage from '@/components/Pagination.vue'

defineOptions({ name: 'TeacherNoticePublish' })

const NOTICE_TABLE_NAME = 'MainNotice'
const { files, filesLoading, loadFiles, triggerDownload, triggerPreview } = useDiaryFiles(NOTICE_TABLE_NAME)

const optionsLoading = ref(false)
const listLoading = ref(false)
const internshipOptions = ref([])
const selectedInternshipId = ref(null)
const tableData = ref([])
const page = ref(1)
const size = ref(10)
const total = ref(0)

const publishVisible = ref(false)
const publishing = ref(false)
const publishFormRef = ref(null)
const fileInputRef = ref(null)
const studentsLoading = ref(false)
const boundStudents = ref([])
const pendingFiles = ref([])

const publishForm = reactive({
  title: '',
  content: '',
  scope: 'all',
  studentIds: [],
})

const publishRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入正文', trigger: 'blur' }],
  studentIds: [
    {
      validator: (_rule, _value, callback) => {
        if (publishForm.scope === 'partial' && !publishForm.studentIds.length) {
          callback(new Error('请至少选择一名学生'))
          return
        }
        callback()
      },
      trigger: 'change',
    },
  ],
}

const detailVisible = ref(false)
const detail = ref(null)

function formatStudentLabel(student) {
  const name = student.studentName || ''
  const account = student.studentAccount || ''
  return account ? `${name}（${account}）` : name || `学生#${student.studentId}`
}

async function loadInternships() {
  optionsLoading.value = true
  try {
    const res = await noticeAPI.getMyInternships()
    internshipOptions.value = Array.isArray(res?.data) ? res.data : []
    if (!selectedInternshipId.value && internshipOptions.value.length) {
      selectedInternshipId.value = internshipOptions.value[0].internshipId
    }
  } catch {
    internshipOptions.value = []
    ElMessage.error('加载实习项目失败')
  } finally {
    optionsLoading.value = false
  }
}

async function loadList() {
  listLoading.value = true
  try {
    const node = { page: page.value, size: size.value }
    if (selectedInternshipId.value) {
      node.internshipId = selectedInternshipId.value
    }
    const res = await noticeAPI.getMyPublished(node)
    tableData.value = res?.data?.content || []
    total.value = Number(res?.data?.page?.totalElements ?? res?.data?.totalElements ?? 0)
  } catch {
    tableData.value = []
    total.value = 0
    ElMessage.error('加载已发布通知失败')
  } finally {
    listLoading.value = false
  }
}

function onInternshipChange() {
  page.value = 1
  loadList()
}

function onSizeChange(val) {
  size.value = val
  page.value = 1
  loadList()
}

function onCurrentChange(val) {
  page.value = val
  loadList()
}

async function refreshAll() {
  await loadInternships()
  await loadList()
}

function openPublishDialog() {
  if (!selectedInternshipId.value) {
    ElMessage.warning('请先选择实习项目')
    return
  }
  publishVisible.value = true
}

function resetPublishForm() {
  publishForm.title = ''
  publishForm.content = ''
  publishForm.scope = 'all'
  publishForm.studentIds = []
  pendingFiles.value = []
  boundStudents.value = []
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function onScopeChange(val) {
  if (val === 'partial') {
    await loadBoundStudents()
  }
}

async function loadBoundStudents() {
  if (!selectedInternshipId.value) return
  studentsLoading.value = true
  try {
    const res = await noticeAPI.getBoundStudents(selectedInternshipId.value)
    boundStudents.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    boundStudents.value = []
    ElMessage.error('加载绑定学生失败')
  } finally {
    studentsLoading.value = false
  }
}

function onFilesSelected(event) {
  const list = Array.from(event?.target?.files || [])
  pendingFiles.value = [...pendingFiles.value, ...list]
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function removePendingFile(idx) {
  pendingFiles.value.splice(idx, 1)
}

async function submitPublish() {
  if (!publishFormRef.value) return
  await publishFormRef.value.validate(async (valid) => {
    if (!valid) return
    publishing.value = true
    try {
      const node = {
        internshipId: selectedInternshipId.value,
        title: publishForm.title.trim(),
        content: publishForm.content.trim(),
      }
      if (publishForm.scope === 'partial') {
        node.studentIds = [...publishForm.studentIds]
      }
      const res = await noticeAPI.publishNotice(node)
      const noticeId = res?.data?.noticeId
      if (noticeId && pendingFiles.value.length) {
        await fileAPI.upload({
          files: pendingFiles.value,
          relationIds: noticeId,
          tableName: NOTICE_TABLE_NAME,
        })
      }
      ElMessage.success('发布成功')
      publishVisible.value = false
      page.value = 1
      await loadList()
    } catch (e) {
      ElMessage.error(e?.message || '发布失败')
    } finally {
      publishing.value = false
    }
  })
}

async function openDetail(row) {
  try {
    const res = await noticeAPI.getNoticeDetail(row.id || row.noticeId)
    detail.value = res?.data || null
    detailVisible.value = true
    await loadFiles(detail.value?.id)
  } catch {
    ElMessage.error('加载详情失败')
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('删除后学生将无法查看该通知，确定删除吗？', '提示', { type: 'warning' })
    await noticeAPI.deleteNotice(row.id)
    ElMessage.success('已删除')
    await loadList()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e?.message || '删除失败')
    }
  }
}

onMounted(async () => {
  await loadInternships()
  await loadList()
})
</script>

<style scoped>
.teacher-notice-publish {
  padding: 12px;
  min-height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.selector-card {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.mb-0 {
  margin-bottom: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.table-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 360px;
}

.table-card :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.table-wrap {
  flex: 1;
  min-height: 0;
}

.table-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.action-link {
  padding: 0;
  min-height: auto;
  font-weight: 500;
}

.pager {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: auto;
  padding: 10px 0 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.pending-files {
  margin-top: 8px;
  width: 100%;
}

.pending-file-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  line-height: 28px;
}

.notice-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.files-block {
  margin-top: 16px;
}

.files-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.file-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.file-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
</style>
