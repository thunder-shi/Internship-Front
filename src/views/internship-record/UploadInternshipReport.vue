<template>
  <div class="upload-report-page">
    <!-- 实习项目选择卡片 -->
    <el-card shadow="never" class="selector-card">
      <el-form-item label="实习项目" label-width="80px" class="mb-0">
        <el-select
          v-model="selectedPostKey"
          placeholder="请选择实习项目"
          :loading="postsLoading"
          filterable
          clearable
          style="width: 100%; max-width: 500px"
          @change="onPostChange"
        >
          <template #empty>
            <p class="select-empty">{{ postsLoading ? '加载中...' : '暂无分配的实习项目' }}</p>
          </template>
          <el-option
            v-for="post in studentPosts"
            :key="post._key"
            :label="postLabel(post)"
            :value="post._key"
          >
            <div class="post-option">
              <el-tag
                size="small"
                :type="post._type === 'external' ? 'primary' : 'success'"
                effect="light"
                class="type-tag"
              >{{ post._type === 'external' ? '校外' : '校内' }}</el-tag>
              <span class="option-text">{{ postLabel(post) }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>
    </el-card>

    <DataTableList
      ref="dtlRef"
      :default-props="dtlProps"
      :fetch-records="fetchRecordsFunc"
      :row-class-name="periodRowClass"
      @after-init-data="onAfterInitData"
      @view-click="onViewClick"
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
      <template #rightOperate="{ row }">
        <el-button
          type="warning"
          size="small"
          :title="row.diary?.submit ? '查看日志' : '编辑日志'"
          :disabled="!selectedPost?._approved && !row.diary"
          @click.stop="openSubmitDialog(row)"
        ><el-icon><Edit /></el-icon></el-button>
        <el-button
          type="success"
          size="small"
          :disabled="!selectedPost?._approved || isFuturePeriod(row) || !row.diary || row.diary?.submit === true"
          :title="submitBtnTitle(row)"
          @click.stop="handleDirectSubmit(row)"
        ><el-icon><Position /></el-icon></el-button>
      </template>
    </DataTableList>

    <DlgSubmitDiary ref="dlgSubmitRef" @success="onSubmitSuccess" />
    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="null"
      :process-info="progressProcessInfo"
      key-words="ViewVerifyMainDiary"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, watch, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Position } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import DataTableList from '@/components/DataTableList.vue'
import listAPI from '@/api/list'
import { getStudentPeriods, submitDiary } from '@/api/diary'
import DlgSubmitDiary from './components/DlgSubmitDiary.vue'
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue'
import { getDiaryStatusText, getDiaryTagType } from '@/utils/verify'

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

// ── 表格标题 ──────────────────────────────────────────────────
const titleObj = reactive({ mainTitle: '上传实习报告' })
watch(selectedPost, (post) => {
  titleObj.mainTitle = post ? postLabel(post) : '上传实习报告'
}, { immediate: true })

// ── DataTableList ─────────────────────────────────────────────
const dtlRef = ref(null)
const currentPeriodId = ref(null)

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
  title: titleObj,
  someFlags: {
    autoInit: true,
    checkFlag: false,
    hideSelectColumn: true,
  },
  sortStr: { properties: 'periodIndex', direction: 'ASC' },
  defaultDTHProps: {
    keyWord: { edit: 'MainDiary', view: 'MainDiaryPeriod' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      buttonGroup: { show: false },
      visible: { show: true, name: '查看审核历程' },
    },
    allTableColumns: [
      { id: 1, showName: '期次',     theOrder: 1, tableColumnName: 'customize-period'  },
      { id: 2, showName: '开始时间', theOrder: 2, tableColumnName: 'beginTime'         },
      { id: 3, showName: '结束时间', theOrder: 3, tableColumnName: 'endTime'           },
      { id: 4, showName: '状态',     theOrder: 4, tableColumnName: 'customize-status'  },
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

function isFuturePeriod(row) {
  return row.beginTime ? new Date(row.beginTime) > new Date() : false
}

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
    const [extRes, intRes, intVerifyRes] = await Promise.allSettled([
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
      // 单独查 Merge View 获取 isAllVerified（ViewRelTitleTeacherStudent.isAudit 是导师课题
      // 授权状态，不是学生选题审核状态，语义不同，不能用于判断选题是否最终通过）
      listAPI.getSomeRecords({
        keyWords: 'ViewVerifyProcessRelTitleStudentMerge',
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
    const intVerifyList = intVerifyRes.status === 'fulfilled'
      ? (intVerifyRes.value?.data?.content || intVerifyRes.value?.data || [])
      : []
    // relationId 对应 RelTitleStudent.id，与 ViewRelTitleTeacherStudent.relTitleStudentId 相同
    const intVerifyMap = new Map(intVerifyList.map(v => [v.relationId, v.isAllVerified === true]))

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
        _approved: intVerifyMap.get(item.relTitleStudentId) ?? false,
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

// ── 审核历程对话框 ────────────────────────────────────────────
const showProgressDialog = ref(false)
const currentRow = ref({})
const progressProcessInfo = computed(() => ({
  relationId: currentRow.value.diary?.relationId,
  isAudit: currentRow.value.diary?.isAudit,
  tableName: 'MainDiary',
}))

function onViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray
  currentRow.value = { ...row }
  showProgressDialog.value = true
}

// ── 提交日志对话框 ────────────────────────────────────────────
const dlgSubmitRef = ref(null)

function buildIdParam(post) {
  return {
    relationId: post._paramId,
    tableName: post._type === 'external' ? 'RelStuInternshipPost' : 'RelTitleStudent',
  }
}

function submitBtnTitle(row) {
  if (!selectedPost.value?._approved) return '实习未开始'
  if (isFuturePeriod(row)) return '未到提交时间'
  if (!row.diary) return '请先保存日志内容'
  if (row.diary?.submit === true) return '已提交'
  return '提交日志'
}

function openSubmitDialog(periodItem) {
  const isSubmitted = periodItem.diary?.submit === true
  dlgSubmitRef.value?.open({
    ...buildIdParam(selectedPost.value),
    periodId: periodItem.periodId,
    periodIndex: periodItem.periodIndex,
    diary: periodItem.diary ?? null,
    readonly: isSubmitted,
  })
}

async function handleDirectSubmit(row) {
  const diary = row.diary
  if (!diary || diary.submit === true) return
  if (!diary.title?.trim()) {
    ElMessage.warning('请先填写日志标题后再提交')
    return
  }
  if (!diary.content?.trim()) {
    ElMessage.warning('请先填写日志内容后再提交')
    return
  }
  const post = selectedPost.value
  try {
    const res = await submitDiary({
      ...buildIdParam(post),
      periodId: row.periodId,
      title: diary.title || '',
      content: diary.content || '',
      submit: true,
    })
    if (res?.message === 'successful') {
      ElMessage.success('提交成功')
      dtlRef.value?.initDataList()
    } else {
      ElMessage.error(res?.message || '提交失败')
    }
  } catch {
    // 拦截器已处理
  }
}

function onSubmitSuccess() {
  dtlRef.value?.initDataList()
}

// ── 初始化 ────────────────────────────────────────────────────
onMounted(async () => {
  await loadStudentPosts()
  if (studentPosts.value.length === 1) {
    selectedPostKey.value = studentPosts.value[0]._key
    await nextTick()
    dtlRef.value?.initDataList()
  }
})
</script>

<style scoped>
.upload-report-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.mb-0 {
  margin-bottom: 0;
}

.select-empty {
  text-align: center;
  color: #909399;
  padding: 10px 0;
  margin: 0;
}

.post-option {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.type-tag {
  flex-shrink: 0;
}

.option-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.current-period-row td) {
  background-color: #ecf5ff !important;
}

:deep(.current-period-row:hover td) {
  background-color: #d9ecff !important;
}
</style>
