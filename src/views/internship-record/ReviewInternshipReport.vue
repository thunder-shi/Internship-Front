<template>
  <div class="review-internship-report">
    <!-- 顶部：实习项目 + 期数选择 -->
    <InternshipPeriodSelector v-model:internshipId="selectedInternshipId" v-model:periodId="selectedPeriod"
      :user-id="userInfo.id" @internship-change="onInternshipChange" @period-change="onPeriodChange" />

    <!-- 统计区 -->
    <DiaryStatsCard :submitted="submittedCount" :not-submitted="notSubmittedCount" :total="allStudents.length" />

    <!-- 学生列表 -->
    <DataTableList v-if="selectedInternshipId" ref="dtlRef" :default-props="dtlProps" :fetch-records="fetchRecordsFunc"
      :client-filter-fn="activeClientFilterFn" @audit-click="onAuditClick" @view-click="onViewClick">
      <template #left>
        <el-radio-group v-model="activeTab" @change="onTabChange">
          <el-radio-button value="all">全部（{{ allStudents.length }}）</el-radio-button>
          <el-radio-button value="submitted">已提交（{{ submittedCount }}）</el-radio-button>
          <el-radio-button value="not-submitted">未提交（{{ notSubmittedCount }}）</el-radio-button>
        </el-radio-group>
        <el-button type="primary" style="margin-left: 12px" @click="onBatchAuditClick">批量审核</el-button>
      </template>

      <template #status="{ row }">
        <el-tag :type="getDiaryTagType(row.diary)">{{ getDiaryStatusText(row.diary) }}</el-tag>
      </template>

      <template #totalScore="{ row }">
        <el-tooltip
          v-if="row._totalScore != null && row._scoreDetail?.length"
          placement="top"
          effect="light"
        >
          <template #content>
            <div class="score-detail-tooltip">
              <div v-for="(d, idx) in row._scoreDetail" :key="idx" class="score-detail-row">
                第{{ d.levelOrder }}级：
                <b>{{ d.score }}</b> / {{ d.maxScore }}（{{ d.weight }}%）
                <span v-if="d.verifyUserName" class="score-verifier">— {{ d.verifyUserName }}</span>
              </div>
            </div>
          </template>
          <el-tag type="success">{{ row._totalScore }}</el-tag>
        </el-tooltip>
        <span v-else-if="row._totalScore != null">{{ row._totalScore }}</span>
        <span v-else>—</span>
      </template>

      <template #rightOperate="{ row }">
        <el-button type="warning" size="small" title="学生详情" @click.stop="openStudentDetail(row)">
          <el-icon>
            <InfoFilled />
          </el-icon>
        </el-button>
      </template>
    </DataTableList>

    <el-empty v-else description="请先选择实习项目" :image-size="120" />

    <DlgReviewDiary ref="dlgReviewRef" @success="onReviewSuccess" />
    <DlgBatchReviewDiary ref="dlgBatchReviewRef" @success="onReviewSuccess" />
    <DlgStudentDetail ref="dlgDetailRef" />
    <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="null" :process-info="progressProcessInfo"
      key-words="ViewVerifyMainDiary" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { useStore } from 'vuex'
import DataTableList from '@/components/DataTableList.vue'
import DlgReviewDiary from './components/DlgReviewDiary.vue'
import DlgBatchReviewDiary from './components/DlgBatchReviewDiary.vue'
import DlgStudentDetail from './components/DlgStudentDetail.vue'
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue'
import InternshipPeriodSelector from './components/InternshipPeriodSelector.vue'
import DiaryStatsCard from './components/DiaryStatsCard.vue'
import listAPI from '@/api/list'
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
  const res = await getPeriodStudents({
    internshipId: selectedInternshipId.value,
    periodId: selectedPeriod.value,
  })
  let list = res?.data || []

  if (!isSuperAdmin.value) {
    list = await filterByCurrentTeacher(list)
  }

  // 扁平化嵌套字段，避免在模板中使用 customize-* 插槽
  const flat = list.map(row => ({
    ...row,
    _postOrTitle: row.internshipPostName || row.titleName || null,
    _submitTime: row.diary?.createTime ?? null,
    _diaryTitle: row.diary?.title ?? null,
    _totalScore: row.diary?.totalScore ?? null,
    _scoreDetail: null,
  }))

  // 批量查询评分明细（ViewMainDiaryScoreDetail 独立表）
  const diaryIds = [...new Set(flat.map(r => r.diary?.id).filter(Boolean))]
  if (diaryIds.length) {
    try {
      const sdRes = await listAPI.getSomeRecords({
        keyWords: 'ViewMainDiaryScoreDetail',
        searchKey: { diaryId: diaryIds.join(',') },
        reg: { diaryId: '()' },
        sort: { properties: 'diaryId', direction: 'ASC' },
        pageInfo: { page: 1, size: 10000 },
      })
      const sdList = sdRes?.data?.content || sdRes?.data || []
      const sdMap = {}
      for (const d of sdList) {
        const key = d.diaryId
        if (!sdMap[key]) sdMap[key] = []
        sdMap[key].push(d)
      }
      for (const row of flat) {
        if (row.diary?.id && sdMap[row.diary.id]) {
          row._scoreDetail = sdMap[row.diary.id]
        }
      }
    } catch (e) {
      console.error('加载评分明细失败:', e)
    }
  }

  allStudents.value = flat
  return { data: { content: flat, totalElements: flat.length }, message: 'successful' }
}

async function filterByCurrentTeacher(list) {
  const myId = userInfo.value.id
  let externalRelIds = new Set()
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      searchKey: { teacherId: myId, internshipId: selectedInternshipId.value },
      reg: { teacherId: '=', internshipId: '=' },
      pageInfo: { page: 1, size: 1000 },
    })
    const items = res?.data?.content || res?.data || []
    items.forEach(s => s.relInternshipId != null && externalRelIds.add(s.relInternshipId))
  } catch {
    ElMessage.warning('获取负责学生列表失败，请刷新重试')
    return []
  }

  return list.filter(row => {
    if (row.titleName) return row.teacherId === myId
    if (row.internshipPostName) return externalRelIds.has(row.stuRelationId)
    return true
  })
}

function onTabChange() {
  dtlRef.value?.initDataList()
}

const dtlProps = computed(() => ({
  someFlags: {
    autoInit: true,
    checkFlag: true,
  },
  buttonDisabledCondition: {
    audit: (row) => row.diary?.submit !== true,
  },
  sortStr: { properties: 'studentName', direction: 'ASC' },
  defaultDTHProps: {
    keyWord: { edit: 'MainDiary', view: 'ViewPeriodStudents' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      audit: { show: true, type: 'primary', name: '批阅', showHeaderBtn: false },
      visible: { show: true, name: '查看审核历程' },
    },
    allTableColumns: [
      { id: 1, showName: '学生姓名', theOrder: 1, tableColumnName: 'studentName' },
      { id: 2, showName: '学号', theOrder: 2, tableColumnName: 'studentAccount' },
      { id: 3, showName: '岗位/题目', theOrder: 3, tableColumnName: '_postOrTitle' },
      { id: 4, showName: '提交时间', theOrder: 4, tableColumnName: '_submitTime' },
      { id: 5, showName: '日志标题', theOrder: 5, tableColumnName: '_diaryTitle' },
      { id: 7, showName: '审核状态', theOrder: 7, tableColumnName: 'customize-status' },
      { id: 8, showName: '总成绩', theOrder: 8, tableColumnName: 'customize-totalScore' },
    ],
  },
}))

// ── 审核历程对话框 ────────────────────────────────────────────
const showProgressDialog = ref(false)
const currentRow = ref({})
const progressProcessInfo = computed(() => ({
  relationId: currentRow.value.diary?.relationId,
  isAudit: currentRow.value.diary?.isAudit,
  tableName: 'MainDiary',
}))

// ── 对话框 ───────────────────────────────────────────────────
const dlgReviewRef = ref(null)
const dlgBatchReviewRef = ref(null)
const dlgDetailRef = ref(null)

function onAuditClick(row) {
  dlgReviewRef.value?.open(row, { internshipId: selectedInternshipId.value })
}

function onBatchAuditClick() {
  const pending = allStudents.value.filter(r => canReviewDiary(r.diary))
  if (!pending.length) {
    ElMessage.warning('当前列表中没有待审核的日志')
    return
  }
  dlgBatchReviewRef.value?.open(pending, { internshipId: selectedInternshipId.value })
}

function onViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray
  currentRow.value = { ...row }
  showProgressDialog.value = true
}

function openStudentDetail(row) {
  dlgDetailRef.value?.open(row)
}

function onReviewSuccess() {
  dtlRef.value?.initDataList()
}
</script>

<style scoped>
.review-internship-report {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-detail-tooltip {
  max-width: 320px;
  font-size: 12px;
  line-height: 1.6;
}

.score-detail-row {
  white-space: nowrap;
}

.score-verifier {
  color: #909399;
  margin-left: 4px;
}
</style>
