<template>
  <div class="review-internship-report">
    <!-- 顶部选择区 -->
    <InternshipPeriodSelector
      v-model:internshipId="selectedInternshipId"
      v-model:periodId="selectedPeriod"
      :user-id="userInfo.id"
      @internship-change="onInternshipChange"
      @period-change="onPeriodChange"
    />

    <!-- 统计区 -->
    <DiaryStatsCard
      v-if="selectedPeriod"
      :submitted="submittedCount"
      :not-submitted="notSubmittedCount"
      :total="allStudents.length"
    />

    <!-- 学生列表 -->
    <template v-if="selectedPeriod">
      <DataTableList
        ref="dtlRef"
        :default-props="dtlProps"
        :fetch-records="fetchRecordsFunc"
        :client-filter-fn="activeClientFilterFn"
        @audit-click="onAuditClick"
        @view-click="onViewClick"
        @selection-change="onSelectionChange"
      >
        <template #left>
          <el-radio-group v-model="activeTab" @change="onTabChange">
            <el-radio-button value="all">全部（{{ allStudents.length }}）</el-radio-button>
            <el-radio-button value="submitted">已提交（{{ submittedCount }}）</el-radio-button>
            <el-radio-button value="not-submitted">未提交（{{ notSubmittedCount }}）</el-radio-button>
          </el-radio-group>
        </template>
        <template #postOrTitle="{ row }">
          {{ row.internshipPostName || row.titleName || '——' }}
        </template>
        <template #submitTime="{ row }">
          {{ row.diary?.createTime || '——' }}
        </template>
        <template #status="{ row }">
          <el-tag :type="getDiaryTagType(row.diary)">{{ getDiaryStatusText(row.diary) }}</el-tag>
        </template>
      </DataTableList>
    </template>

    <el-empty v-if="!selectedInternshipId" description="请先选择实习项目" :image-size="120" />

    <DlgReviewDiary ref="dlgReviewRef" @success="onReviewSuccess" />
    <DlgStudentDetail ref="dlgDetailRef" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore } from 'vuex'
import DataTableList from '@/components/DataTableList.vue'
import DlgReviewDiary from './components/DlgReviewDiary.vue'
import DlgStudentDetail from './components/DlgStudentDetail.vue'
import InternshipPeriodSelector from './components/InternshipPeriodSelector.vue'
import DiaryStatsCard from './components/DiaryStatsCard.vue'
import { getPeriodStudents } from '@/api/diary'
import { getDiaryStatusText, getDiaryTagType, canReviewDiary } from '@/utils/verify'

defineOptions({ name: 'ReviewInternshipReport' })

const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})
const roles = computed(() => store.getters.roles || [])
const isSuperAdmin = computed(() => roles.value.some(r => r.name === '超级管理员'))

// ── 实习项目 / 期数选择 ───────────────────────────────────────
const selectedInternshipId = ref(null)
const selectedPeriod = ref(null)

function onInternshipChange() {
  allStudents.value = []
}

function onPeriodChange() {
  dtlRef.value?.initDataList()
}

// ── 学生列表 DataTableList ────────────────────────────────────
const dtlRef = ref(null)
const activeTab = ref('all')
const allStudents = ref([])
const selectedRows = ref([])

// diary=null 或 diary.submit=false（预建桩）均视为未提交
const isSubmitted = (s) => s.diary?.submit === true
const submittedCount = computed(() => allStudents.value.filter(isSubmitted).length)
const notSubmittedCount = computed(() => allStudents.value.filter(s => !isSubmitted(s)).length)

function activeClientFilterFn(list) {
  if (activeTab.value === 'submitted') return list.filter(isSubmitted)
  if (activeTab.value === 'not-submitted') return list.filter(s => !isSubmitted(s))
  return list
}

async function fetchRecordsFunc() {
  if (!selectedInternshipId.value || !selectedPeriod.value) {
    allStudents.value = []
    return { data: { content: [], totalElements: 0 }, message: 'successful' }
  }
  const params = {
    internshipId: selectedInternshipId.value,
    periodId: selectedPeriod.value,
  }
  // 超管不传 userId，后端返回该期全部学生；普通教师传 userId 只返回其负责的学生
  if (!isSuperAdmin.value) params.userId = userInfo.value.id
  const res = await getPeriodStudents(params)
  const list = res?.data || []
  allStudents.value = list   // 全量数据供统计用（在 clientFilterFn 之前赋值）
  return { data: { content: list, totalElements: list.length }, message: 'successful' }
}

function onTabChange() {
  dtlRef.value?.initDataList()
}

const dtlProps = computed(() => ({
  someFlags: {
    autoInit: true,
    checkFlag: true,
  },
  sortStr: { properties: 'studentName', direction: 'ASC' },
  buttonCondition: {
    // 可批阅（待审核）→ 审核按钮
    audit:   (row) => canReviewDiary(row.diary),
    // 其余情况（无日志 或 已审核）→ 查看按钮
    visible: (row) => !canReviewDiary(row.diary),
  },
  defaultDTHProps: {
    keyWord: { edit: 'MainDiary', view: 'ViewPeriodStudents' },
    buttonProps: {
      create:  { show: false },
      update:  { show: false },
      delete:  { show: false },
      audit:   { show: true, type: 'primary', name: '批阅' },
      visible: { show: true, name: '查看' },
    },
    allTableColumns: [
      { id: 1, showName: '学生姓名', theOrder: 1, tableColumnName: 'studentName' },
      { id: 2, showName: '学号',     theOrder: 2, tableColumnName: 'studentNo' },
      { id: 3, showName: '岗位/题目', theOrder: 3, tableColumnName: 'customize-postOrTitle' },
      { id: 4, showName: '提交时间', theOrder: 4, tableColumnName: 'customize-submitTime' },
      { id: 5, showName: '审核状态', theOrder: 5, tableColumnName: 'customize-status' },
    ],
  },
}))

// ── 对话框 ───────────────────────────────────────────────────
const dlgReviewRef = ref(null)
const dlgDetailRef = ref(null)

// audit 按钮 → 批阅（待审核状态）
function onAuditClick(row) {
  dlgReviewRef.value?.open(row)
}

// visible 按钮 → 有日志时查看，无日志时看学生详情
function onViewClick([row]) {
  if (row.diary) dlgReviewRef.value?.open(row)
  else dlgDetailRef.value?.open(row)
}

function onSelectionChange(rows) {
  selectedRows.value = rows
}

function onReviewSuccess() {
  dtlRef.value?.initDataList()
}

</script>

<style scoped>
.review-internship-report {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
