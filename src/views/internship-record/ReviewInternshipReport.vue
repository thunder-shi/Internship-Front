<template>
  <div class="review-internship-report">
    <!-- 顶部：实习项目 + 期数选择 -->
    <el-card class="selector-card" shadow="never" v-loading="optionsLoading">
      <el-row :gutter="16" align="middle">
        <el-col :span="10">
          <el-form-item label="实习项目" label-width="80px" class="mb-0">
            <el-select
              v-model="selectedInternshipId"
              placeholder="请选择实习项目"
              style="width: 100%"
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
        <el-col :span="8">
          <el-form-item label="期数" label-width="50px" class="mb-0">
            <el-select
              v-model="selectedPeriod"
              placeholder="请选择期数"
              :disabled="!selectedInternshipId || currentPeriods.length === 0"
              style="width: 100%"
              @change="onPeriodChange"
            >
              <el-option
                v-for="p in currentPeriods"
                :key="p.periodId"
                :label="periodLabel(p)"
                :value="p.periodId"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-button :icon="Refresh" @click="refreshReviewOptions">刷新</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 学生列表 -->
    <DataTableList
      v-if="selectedInternshipId && selectedPeriod"
      :key="tableKey"
      ref="dtlRef"
      :default-props="dtlProps"
      :fetch-records="fetchRecordsFunc"
      @audit-click="onAuditClick"
      @view-click="onViewClick"
    >
      <template #left>
        <span class="pending-summary">待批阅：{{ reviewTotal }} 人</span>
        <el-button type="primary" style="margin-left: 12px" :disabled="allStudents.length === 0" @click="onBatchAuditClick">
          批量审核当前页
        </el-button>
      </template>

      <template #status="{ row }">
        <el-tag :type="getDiaryTagType(row.diary)">{{ getDiaryStatusText(row.diary) }}</el-tag>
      </template>

      <template #totalScore="{ row }">
        <span v-if="row._totalScore != null">{{ row._totalScore }}</span>
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

    <el-empty v-else :description="emptyDescription" :image-size="120" />

    <DlgReviewDiary ref="dlgReviewRef" @success="onReviewSuccess" />
    <DlgBatchReviewDiary ref="dlgBatchReviewRef" @success="onReviewSuccess" />
    <DlgStudentDetail ref="dlgDetailRef" />
    <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="null" :process-info="progressProcessInfo"
      key-words="ViewVerifyMainDiary" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled, Refresh } from '@element-plus/icons-vue'
import DataTableList from '@/components/DataTableList.vue'
import DlgReviewDiary from './components/DlgReviewDiary.vue'
import DlgBatchReviewDiary from './components/DlgBatchReviewDiary.vue'
import DlgStudentDetail from './components/DlgStudentDetail.vue'
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue'
import { getDiaryReviewOptions, getDiaryReviewStudents } from '@/api/diary'
import { getDiaryStatusText, getDiaryTagType, canReviewDiary } from '@/utils/verify'

defineOptions({ name: 'ReviewInternshipReport' })

// ── 实习项目 / 期数选择 ───────────────────────────────────────
const selectedInternshipId = ref(null)
const selectedPeriod = ref(null)
const internshipOptions = ref([])
const optionsLoading = ref(false)

const currentPeriods = computed(() => {
  const current = internshipOptions.value.find(item => item.internshipId === selectedInternshipId.value)
  return current?.periods || []
})

const currentPeriod = computed(() =>
  currentPeriods.value.find(item => item.periodId === selectedPeriod.value) || null
)

const tableKey = computed(() => `${selectedInternshipId.value || 'none'}-${selectedPeriod.value || 'none'}`)
const emptyDescription = computed(() => {
  if (optionsLoading.value) return '加载中'
  if (internshipOptions.value.length === 0) return '暂无可批阅的实习报告'
  if (!selectedInternshipId.value) return '请先选择实习项目'
  return '请选择期数'
})

function findCurrentPeriod(list) {
  const now = new Date()
  const active = list.find(p =>
    p.beginTime && p.endTime &&
    new Date(p.beginTime) <= now && now <= new Date(p.endTime)
  )
  if (active) return active
  return list[0] || null
}

function getPeriodsByInternshipId(internshipId) {
  return internshipOptions.value.find(item => item.internshipId === internshipId)?.periods || []
}

function selectDefaultPeriod(internshipId) {
  const periods = getPeriodsByInternshipId(internshipId)
  const period = findCurrentPeriod(periods)
  selectedPeriod.value = period?.periodId ?? null
}

async function loadReviewOptions({ keepSelection = true, refreshList = true } = {}) {
  try {
    optionsLoading.value = true
    const res = await getDiaryReviewOptions()
    const data = res?.data || {}
    internshipOptions.value = Array.isArray(data.internships)
      ? data.internships
      : (Array.isArray(data) ? data : [])

    const selectedInternshipExists = internshipOptions.value.some(item => item.internshipId === selectedInternshipId.value)
    if (!keepSelection || !selectedInternshipExists) {
      selectedInternshipId.value = internshipOptions.value[0]?.internshipId ?? null
    }

    const periodExists = getPeriodsByInternshipId(selectedInternshipId.value)
      .some(item => item.periodId === selectedPeriod.value)
    if (!keepSelection || !periodExists) {
      selectDefaultPeriod(selectedInternshipId.value)
    }

    if (!selectedInternshipId.value || !selectedPeriod.value) {
      allStudents.value = []
      reviewTotal.value = 0
      return
    }

    if (refreshList) {
      await nextTick()
      await dtlRef.value?.initDataList(true)
    }
  } catch {
    ElMessage.error('获取可批阅项目失败')
  } finally {
    optionsLoading.value = false
  }
}

async function refreshReviewOptions() {
  await loadReviewOptions({ keepSelection: true, refreshList: true })
}

async function onInternshipChange(internshipId) {
  allStudents.value = []
  reviewTotal.value = 0
  selectDefaultPeriod(internshipId)
  await nextTick()
  dtlRef.value?.initDataList(true)
}

async function onPeriodChange() {
  allStudents.value = []
  reviewTotal.value = 0
  await nextTick()
  dtlRef.value?.initDataList(true)
}

function periodLabel(p) {
  const idx = `第 ${p.periodIndex} 期`
  if (!p.beginTime && !p.endTime) return idx
  const fmt = (dateStr) => dateStr ? dateStr.slice(0, 10) : ''
  const begin = fmt(p.beginTime)
  const end = fmt(p.endTime)
  const dateStr = (begin === end || !end) ? `（${begin}）` : `（${begin} ~ ${end}）`
  return `${idx}${dateStr}`
}

// ── 学生列表 DataTableList ────────────────────────────────────
const dtlRef = ref(null)
const allStudents = ref([])
const reviewTotal = ref(0)

function getDiaryId(diary) {
  return diary?.diaryId ?? diary?.relationId ?? null
}

function getVerifyProcessId(diary) {
  return diary?.verifyProcessId ?? diary?.id ?? null
}

async function fetchRecordsFunc(params = {}) {
  if (!selectedInternshipId.value || !selectedPeriod.value) {
    allStudents.value = []
    reviewTotal.value = 0
    return { data: { content: [], totalElements: 0 }, message: 'successful' }
  }
  const res = await getDiaryReviewStudents({
    internshipId: selectedInternshipId.value,
    periodId: selectedPeriod.value,
    page: params?.pageInfo?.page || 1,
    size: params?.pageInfo?.size || 25,
  })
  const data = res?.data || {}
  const list = Array.isArray(data.students)
    ? data.students
    : (Array.isArray(data.content) ? data.content : (Array.isArray(data) ? data : []))
  const total = Number(data.total ?? data.totalElements ?? data.page?.totalElements ?? list.length)

  // 扁平化嵌套字段，避免在模板中使用 customize-* 插槽
  const flat = list.map(row => ({
    ...row,
    id: row.id ?? row.diary?.verifyProcessId ?? row.diary?.diaryId ?? row.studentId,
    diary: {
      ...(row.diary || {}),
      periodIndex: row.diary?.periodIndex ?? currentPeriod.value?.periodIndex,
    },
    _postOrTitle: row.internshipPostName || row.titleName || null,
    _submitTime: row.diary?.createTime ?? null,
    _diaryTitle: row.diary?.title ?? null,
    _totalScore: row.diary?.totalScore ?? null,
  }))

  allStudents.value = flat
  reviewTotal.value = Number.isFinite(total) ? total : flat.length
  return { data: { content: flat, totalElements: reviewTotal.value }, message: 'successful' }
}

const dtlProps = computed(() => ({
  someFlags: {
    autoInit: false,
    checkFlag: true,
  },
  buttonDisabledCondition: {
    audit: (row) => !canReviewDiary(row.diary) || !getVerifyProcessId(row.diary),
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
  relationId: getDiaryId(currentRow.value.diary),
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
    ElMessage.warning('当前页没有待审核的日志')
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
  loadReviewOptions({ keepSelection: true, refreshList: true })
}

onMounted(() => {
  loadReviewOptions({ keepSelection: false, refreshList: true })
})
</script>

<style scoped>
.review-internship-report {
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

.pending-summary {
  color: #606266;
  font-size: 14px;
}
</style>
