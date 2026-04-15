<template>
  <div class="upload-report-page">
    <!-- 顶部：实习岗位选择 -->
    <el-card class="selector-card" shadow="never">
      <div class="selector-row">
        <span class="selector-label">当前实习：</span>
        <el-select
          v-if="studentPosts.length > 1"
          v-model="selectedPostKey"
          placeholder="请选择实习岗位"
          style="width: 360px"
          :loading="postsLoading"
          @change="onPostChange"
        >
          <el-option
            v-for="post in studentPosts"
            :key="post._key"
            :label="postLabel(post)"
            :value="post._key"
          />
        </el-select>
        <span v-else-if="studentPosts.length === 1" class="current-post-name">
          {{ postLabel(studentPosts[0]) }}
        </span>
        <span v-else-if="!postsLoading" class="empty-hint">
          暂无实习岗位，请联系管理员
        </span>
      </div>
    </el-card>

    <!-- 期次列表：DataTableList 随岗位选中后挂载，自动加载数据 -->
    <DataTableList
      v-if="selectedPostKey"
      ref="dtlRef"
      :default-props="dtlProps"
      :fetch-records="fetchRecordsFunc"
      :row-class-name="periodRowClass"
      @after-init-data="onAfterInitData"
    >
      <template #period="{ row }">
        <span>第 {{ row.periodIndex }} 期</span>
        <el-tag
          v-if="row.periodId === currentPeriodId"
          type="primary"
          effect="dark"
          size="small"
          style="margin-left: 6px"
        >当前</el-tag>
      </template>
      <template #status="{ row }">
        <el-tag :type="getDiaryTagType(row.diary)">{{ getDiaryStatusText(row.diary) }}</el-tag>
      </template>
      <template #remarks="{ row }">
        <span class="remark-text">{{ row.diary?.remarks || '——' }}</span>
      </template>
      <template #rightOperate="{ row }">
        <span v-if="!selectedPost?._approved" class="pending-text">审核中</span>
        <template v-else>
          <!-- 修改：日志存在且可编辑（草稿/退回） -->
          <el-button
            v-if="canResubmitDiary(row.diary)"
            type="info"
            size="small"
            title="填写日志"
            @click.stop="openSubmitDialog(row)"
          ><el-icon><Edit /></el-icon></el-button>
          <!-- 详情：日志已提交，查看审核情况 -->
          <el-button
            v-if="canViewDiary(row.diary)"
            type="info"
            size="small"
            title="查看审核情况"
            @click.stop="openViewDialog(row)"
          ><svg-icon icon-class="axt-view" /></el-button>
          <!-- 提交：无日志时，当前/过去期可提交，未来期禁用 -->
          <el-button
            v-if="!row.diary"
            type="primary"
            size="small"
            :disabled="isFuturePeriod(row)"
            :title="isFuturePeriod(row) ? '未到提交时间' : '提交日志'"
            @click.stop="openSubmitDialog(row)"
          ><el-icon><Position /></el-icon></el-button>
        </template>
      </template>
    </DataTableList>

    <DlgSubmitDiary ref="dlgSubmitRef" @success="onSubmitSuccess" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Position } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import DataTableList from '@/components/DataTableList.vue'
import listAPI from '@/api/list'
import { getStudentPeriods } from '@/api/diary'
import DlgSubmitDiary from './components/DlgSubmitDiary.vue'
import CONSTANT from '@/utils/constant'
import { getDiaryStatusText, getDiaryTagType, canResubmitDiary, canViewDiary } from '@/utils/verify'

const PASS = CONSTANT.AUDIT_STATUS.PASS

defineOptions({ name: 'UploadInternshipReport' })

const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})

// ── 实习岗位列表 ──────────────────────────────────────────────
const postsLoading = ref(false)
const studentPosts = ref([])
const selectedPostKey = ref(null)
const selectedPost = computed(() =>
  studentPosts.value.find(p => p._key === selectedPostKey.value) ?? null
)

// ── DataTableList ─────────────────────────────────────────────
const dtlRef = ref(null)
// 最新期的 periodId，由 after-init-data 更新，用于高亮和 canSubmit 判断
const currentPeriodId = ref(null)

/** DataTableList 数据加载完毕后回调，按日期定位当前期次 */
function onAfterInitData(list) {
  currentPeriodId.value = findCurrentPeriod(list)?.periodId ?? null
}

function periodRowClass({ row }) {
  return row.periodId === currentPeriodId.value ? 'current-period-row' : ''
}

async function fetchRecordsFunc() {
  const post = selectedPost.value
  if (!post) return { data: { content: [], totalElements: 0 }, message: 'successful' }
  const res = await getStudentPeriods({
    relationId: post._paramId,
    tableName: post._type === 'external' ? 'RelStuInternshipPost' : 'RelTitleStudent',
  })
  const list = res?.data || []
  return { data: { content: list, totalElements: list.length }, message: 'successful' }
}

const dtlProps = computed(() => ({
  someFlags: {
    autoInit: true,
    checkFlag: false,
    hideSelectColumn: true,
    showPage: false,
  },
  sortStr: { properties: 'periodIndex', direction: 'ASC' },
  defaultDTHProps: {
    keyWord: { edit: 'MainDiary', view: 'MainDiaryPeriod' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      buttonGroup: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '期次',     theOrder: 1, tableColumnName: 'customize-period'  },
      { id: 2, showName: '开始时间', theOrder: 2, tableColumnName: 'beginTime'         },
      { id: 3, showName: '结束时间', theOrder: 3, tableColumnName: 'endTime'           },
      { id: 4, showName: '状态',     theOrder: 4, tableColumnName: 'customize-status'  },
      { id: 5, showName: '批阅意见', theOrder: 5, tableColumnName: 'customize-remarks' },
    ],
  },
}))

// ── 工具函数 ──────────────────────────────────────────────────
function postLabel(post) {
  if (post._type === 'external') {
    const name = post.internshipPostName || ''
    return post.internshipName ? `${post.internshipName} — ${name}` : name || `岗位 #${post.id}`
  }
  const name = post.name || ''
  return post.teacherName ? `${name}（${post.teacherName}）` : name || `课题 #${post.relTitleStudentId}`
}

/** 期次时间判断 */
function isPastPeriod(row) {
  return row.endTime ? new Date(row.endTime) < new Date() : false
}
function isFuturePeriod(row) {
  return row.beginTime ? new Date(row.beginTime) > new Date() : false
}

/**
 * 根据今天的日期找"当前"期次：
 * 1. 今天在 beginTime-endTime 范围内的活跃期
 * 2. 无活跃期时取最近已过期的期次
 * 3. 全部未开始时取最近即将到来的期次
 */
function findCurrentPeriod(list) {
  const now = new Date()
  const active = list.find(p =>
    p.beginTime && p.endTime &&
    new Date(p.beginTime) <= now && now <= new Date(p.endTime)
  )
  if (active) return active
  const past = list
    .filter(p => p.endTime && new Date(p.endTime) < now)
    .sort((a, b) => (b.periodIndex || 0) - (a.periodIndex || 0))
  if (past.length) return past[0]
  const future = list
    .filter(p => p.beginTime && new Date(p.beginTime) > now)
    .sort((a, b) => (a.periodIndex || 0) - (b.periodIndex || 0))
  return future[0] ?? null
}


// ── 数据加载 ──────────────────────────────────────────────────
async function loadStudentPosts() {
  const userId = userInfo.value?.id
  if (!userId) return
  try {
    postsLoading.value = true
    const [extRes, intRes] = await Promise.allSettled([
      listAPI.getSomeRecords({
        keyWords: 'ViewVerifyProcessRelStuInternshipPostMerge',
        searchKey: { studentId: userId },
        reg: { studentId: '=' },
      }),
      listAPI.getSomeRecords({
        keyWords: 'ViewRelTitleTeacherStudent',
        searchKey: { stuId: userId },
        reg: { stuId: '=' },
      }),
    ])
    const extList = extRes.status === 'fulfilled'
      ? (extRes.value?.data?.content || extRes.value?.data || [])
      : []
    const intList = intRes.status === 'fulfilled'
      ? (intRes.value?.data?.content || intRes.value?.data || [])
      : []

    studentPosts.value = [
      ...extList.map(item => ({
        ...item,
        _key: `ext_${item.relationId}`,
        _type: 'external',
        _paramId: item.relationId,
        _approved: item.isAllVerified === true,
      })),
      ...intList.map(item => ({
        ...item,
        _key: `int_${item.relTitleStudentId}`,
        _type: 'internal',
        _paramId: item.relTitleStudentId,
        _approved: item.isAudit === PASS,
      })),
    ]
  } catch {
    ElMessage.error('获取实习列表失败')
  } finally {
    postsLoading.value = false
  }
}

function onPostChange() {
  dtlRef.value?.initDataList()
}

// ── 对话框操作 ────────────────────────────────────────────────
const dlgSubmitRef = ref(null)

function buildIdParam(post) {
  return {
    relationId: post._paramId,
    tableName: post._type === 'external' ? 'RelStuInternshipPost' : 'RelTitleStudent',
  }
}

function openSubmitDialog(periodItem) {
  dlgSubmitRef.value?.open({
    ...buildIdParam(selectedPost.value),
    periodId: periodItem.periodId,
    periodIndex: periodItem.periodIndex,
    diary: periodItem.diary ?? null,
    readonly: false,
  })
}

function openViewDialog(periodItem) {
  dlgSubmitRef.value?.open({
    ...buildIdParam(selectedPost.value),
    periodId: periodItem.periodId,
    periodIndex: periodItem.periodIndex,
    diary: periodItem.diary,
    readonly: true,
  })
}

function onSubmitSuccess() {
  dtlRef.value?.initDataList()
}

// ── 初始化 ────────────────────────────────────────────────────
onMounted(async () => {
  await loadStudentPosts()
  // 只有一个岗位时自动选中；DataTableList 随 v-if 挂载后会自动发起数据请求
  if (studentPosts.value.length === 1) {
    selectedPostKey.value = studentPosts.value[0]._key
  }
})
</script>

<style scoped>
.upload-report-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector-card :deep(.el-card__body) {
  padding: 14px 20px;
}

.selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selector-label {
  font-weight: 600;
  white-space: nowrap;
  color: #303133;
}

.current-post-name {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
}

.remark-text {
  color: #606266;
  font-size: 12px;
}

.pending-text {
  color: #e6a23c;
  font-size: 13px;
}

/* 当前期行高亮 */
:deep(.current-period-row td) {
  background-color: #ecf5ff !important;
}

:deep(.current-period-row:hover td) {
  background-color: #d9ecff !important;
}
</style>
