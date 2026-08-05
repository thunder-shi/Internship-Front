 <template>
  <div class="student-notice-inbox">
    <el-card class="toolbar-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="8">
          <el-form-item label="阅读状态" label-width="80px" class="mb-0">
            <el-select v-model="readFilter" clearable placeholder="全部" style="width: 100%" @change="onFilterChange">
              <el-option label="未读" :value="false" />
              <el-option label="已读" :value="true" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="16" class="actions">
          <el-badge :value="unreadCount" :hidden="!unreadCount" :max="99">
            <el-tag type="warning" effect="plain">未读 {{ unreadCount }}</el-tag>
          </el-badge>
          <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        </el-col>
      </el-row>
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="table-wrap">
        <el-table v-loading="listLoading" :data="tableData" border stripe style="width: 100%" @row-click="openDetail">
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-badge is-dot :hidden="row.isRead === true || row.isRead === 1">
                <el-tag :type="isUnread(row) ? 'danger' : 'info'" size="small">
                  {{ isUnread(row) ? '未读' : '已读' }}
                </el-tag>
              </el-badge>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span :class="{ 'unread-title': isUnread(row) }">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="publisherName" label="发布老师" width="120" show-overflow-tooltip />
          <el-table-column prop="internshipName" label="实习项目" min-width="140" show-overflow-tooltip />
          <el-table-column prop="publishTime" label="发布时间" width="180" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click.stop="openDetail(row)">查看</el-button>
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

    <el-dialog v-model="detailVisible" title="通知详情" width="640px" destroy-on-close>
      <template v-if="detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="标题">{{ detail.title }}</el-descriptions-item>
          <el-descriptions-item label="发布老师">{{ detail.publisherName }}</el-descriptions-item>
          <el-descriptions-item label="实习项目">{{ detail.internshipName }}</el-descriptions-item>
          <el-descriptions-item label="发布时间">{{ detail.publishTime }}</el-descriptions-item>
          <el-descriptions-item label="正文">
            <div class="notice-content">{{ detail.content }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <div class="files-block" v-loading="filesLoading">
          <div class="files-title">附件</div>
          <el-empty v-if="!files.length" description="无附件" :image-size="60" />
          <ul v-else class="file-list">
            <li v-for="f in files" :key="f.id">
              <span>{{ f.name }}</span>
              <span>
                <el-button link type="primary" @click="triggerPreview(f)">预览</el-button>
                <el-button link type="primary" @click="triggerDownload(f)">下载</el-button>
              </span>
            </li>
          </ul>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import noticeAPI from '@/api/notice'
import { useDiaryFiles } from '@/utils/useDiaryFiles'
import VPage from '@/components/Pagination.vue'

defineOptions({ name: 'StudentNoticeInbox' })

const NOTICE_TABLE_NAME = 'MainNotice'
const { files, filesLoading, loadFiles, triggerDownload, triggerPreview } = useDiaryFiles(NOTICE_TABLE_NAME)

const listLoading = ref(false)
const tableData = ref([])
const page = ref(1)
const size = ref(10)
const total = ref(0)
const readFilter = ref(null)
const unreadCount = ref(0)

const detailVisible = ref(false)
const detail = ref(null)

function isUnread(row) {
  return !(row?.isRead === true || row?.isRead === 1)
}

async function loadUnreadCount() {
  try {
    const res = await noticeAPI.getUnreadCount()
    unreadCount.value = Number(res?.data?.count || 0)
  } catch {
    unreadCount.value = 0
  }
}

async function loadList() {
  listLoading.value = true
  try {
    const node = { page: page.value, size: size.value }
    if (readFilter.value === true || readFilter.value === false) {
      node.isRead = readFilter.value
    }
    const res = await noticeAPI.getMyInbox(node)
    tableData.value = res?.data?.content || []
    total.value = Number(res?.data?.page?.totalElements ?? res?.data?.totalElements ?? 0)
  } catch {
    tableData.value = []
    total.value = 0
    ElMessage.error('加载收件箱失败')
  } finally {
    listLoading.value = false
  }
}

function onFilterChange() {
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
  await Promise.all([loadList(), loadUnreadCount()])
}

async function openDetail(row) {
  const noticeId = row.noticeId || row.id
  try {
    const res = await noticeAPI.getNoticeDetail(noticeId)
    detail.value = res?.data || null
    detailVisible.value = true
    await loadFiles(detail.value?.id || noticeId)
    if (isUnread(row) || isUnread(detail.value)) {
      await noticeAPI.markRead({ noticeId })
      row.isRead = true
      if (detail.value) detail.value.isRead = true
      await loadUnreadCount()
    }
  } catch {
    ElMessage.error('加载详情失败')
  }
}

onMounted(async () => {
  await refreshAll()
})
</script>

<style scoped>
.student-notice-inbox {
  padding: 12px;
  min-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
.toolbar-card {
  margin-bottom: 12px;
  flex-shrink: 0;
}
.mb-0 {
  margin-bottom: 0;
}
.actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
.table-card {
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
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
.pager {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.unread-title {
  font-weight: 600;
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
