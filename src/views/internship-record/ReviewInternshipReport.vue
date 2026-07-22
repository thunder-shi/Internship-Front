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

    <!-- 统计区 -->
    <DiaryStatsCard
      :submitted="submittedCount"
      :not-submitted="notSubmittedCount"
      :total="submittedCount + notSubmittedCount"
    />

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
        <span class="pending-summary">待批阅：{{ pendingReviewCount }} 人</span>
        <el-button
          type="primary"
          style="margin-left: 12px"
          :disabled="allStudents.length === 0"
          @click="onBatchAuditClick"
        >
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
        <el-button
          type="warning"
          size="small"
          title="学生详情"
          @click.stop="openStudentDetail(row)"
        >
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
    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="null"
      :process-info="progressProcessInfo"
      key-words="ViewVerifyMainDiary"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { InfoFilled, Refresh } from '@element-plus/icons-vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgReviewDiary from './components/DlgReviewDiary.vue';
import DlgBatchReviewDiary from './components/DlgBatchReviewDiary.vue';
import DlgStudentDetail from './components/DlgStudentDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DiaryStatsCard from './components/DiaryStatsCard.vue';
import listAPI from '@/api/list';
import { getInternshipPeriods, getPeriodStudents } from '@/api/diary';
import { getDiaryStatusText, getDiaryTagType, canReviewDiary } from '@/utils/verify';
import { useProcessWindowProjectSelectKeys } from '@/utils/useProcessWindowProjectSelectKeys';

defineOptions({ name: 'ReviewInternshipReport' });

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});
const { projectSelectSearchKey, projectSelectRegKey } = useProcessWindowProjectSelectKeys(
  userInfo,
  false
);

// ── 实习项目 / 期数选择 ───────────────────────────────────────
const selectedInternshipId = ref(null);
const selectedPeriod = ref(null);
const internshipOptions = ref([]);
const periodOptions = ref([]);
const optionsLoading = ref(false);

const currentPeriods = computed(() => periodOptions.value);

const currentPeriod = computed(
  () => currentPeriods.value.find((item) => item.periodId === selectedPeriod.value) || null
);

const tableKey = computed(
  () => `${selectedInternshipId.value || 'none'}-${selectedPeriod.value || 'none'}`
);
const emptyDescription = computed(() => {
  if (optionsLoading.value) return '加载中';
  if (internshipOptions.value.length === 0) return '暂无进行中的实习项目';
  if (!selectedInternshipId.value) return '请先选择实习项目';
  return '请选择期数';
});

function findCurrentPeriod(list) {
  const now = new Date();
  const active = list.find(
    (p) => p.beginTime && p.endTime && new Date(p.beginTime) <= now && now <= new Date(p.endTime)
  );
  if (active) return active;
  return list[0] || null;
}

function selectDefaultPeriod() {
  const period = findCurrentPeriod(periodOptions.value);
  selectedPeriod.value = period?.periodId ?? null;
}

function normalizeInternshipOptions(list) {
  const seen = new Set();
  const options = [];
  list.forEach((item) => {
    const internshipId = item?.internshipId ?? item?.id;
    if (!internshipId || seen.has(internshipId)) return;
    seen.add(internshipId);
    options.push({
      ...item,
      internshipId,
      internshipName: item.internshipName || item.name || `实习项目 #${internshipId}`,
    });
  });
  return options;
}

function normalizePeriodOptions(list) {
  return list
    .map((item) => ({
      ...item,
      periodId: item.periodId ?? item.id,
    }))
    .filter((item) => item.periodId != null);
}

async function loadPeriodOptions(internshipId, preferredPeriodId = null) {
  periodOptions.value = [];
  selectedPeriod.value = null;
  if (!internshipId) return;

  try {
    const res = await getInternshipPeriods({ internshipId });
    const list = Array.isArray(res?.data) ? res.data : [];
    periodOptions.value = normalizePeriodOptions(list);
    const preferredExists = periodOptions.value.some((item) => item.periodId === preferredPeriodId);
    if (preferredExists) {
      selectedPeriod.value = preferredPeriodId;
    } else {
      selectDefaultPeriod();
    }
  } catch {
    ElMessage.error('获取期数信息失败');
  }
}

async function loadReviewOptions({ keepSelection = true, refreshList = true } = {}) {
  try {
    optionsLoading.value = true;
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 1000 },
      searchKey: projectSelectSearchKey.value,
      reg: projectSelectRegKey.value,
      andor: {},
      sort: { properties: 'startTime', direction: 'DESC' },
    });
    const rawOptions = res?.data?.content || res?.data || [];
    internshipOptions.value = normalizeInternshipOptions(rawOptions);

    const previousPeriodId = selectedPeriod.value;
    const selectedInternshipExists = internshipOptions.value.some(
      (item) => item.internshipId === selectedInternshipId.value
    );
    if (!keepSelection || !selectedInternshipExists) {
      selectedInternshipId.value = internshipOptions.value[0]?.internshipId ?? null;
    }

    const preferredPeriodId = keepSelection && selectedInternshipExists ? previousPeriodId : null;
    await loadPeriodOptions(selectedInternshipId.value, preferredPeriodId);

    if (!selectedInternshipId.value || !selectedPeriod.value) {
      resetReviewData();
      return;
    }

    if (refreshList) {
      await nextTick();
      await dtlRef.value?.initDataList(true);
    }
  } catch {
    ElMessage.error('获取实习项目失败');
  } finally {
    optionsLoading.value = false;
  }
}

async function refreshReviewOptions() {
  await loadReviewOptions({ keepSelection: true, refreshList: true });
}

async function onInternshipChange(internshipId) {
  resetReviewData();
  await loadPeriodOptions(internshipId);
  await nextTick();
  dtlRef.value?.initDataList(true);
}

async function onPeriodChange() {
  resetReviewData();
  await nextTick();
  dtlRef.value?.initDataList(true);
}

function periodLabel(p) {
  const idx = `第 ${p.periodIndex} 期`;
  if (!p.beginTime && !p.endTime) return idx;
  const fmt = (dateStr) => (dateStr ? dateStr.slice(0, 10) : '');
  const begin = fmt(p.beginTime);
  const end = fmt(p.endTime);
  const dateStr = begin === end || !end ? `（${begin}）` : `（${begin} ~ ${end}）`;
  return `${idx}${dateStr}`;
}

// ── 学生列表 DataTableList ────────────────────────────────────
const dtlRef = ref(null);
const allStudents = ref([]);
const reviewTotal = ref(0);
const submittedCount = ref(0);
const notSubmittedCount = ref(0);
const pendingReviewCount = ref(0);

function toCount(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function resetReviewData() {
  allStudents.value = [];
  reviewTotal.value = 0;
  submittedCount.value = 0;
  notSubmittedCount.value = 0;
  pendingReviewCount.value = 0;
}

function getDiaryId(diary) {
  return diary?.diaryId ?? diary?.relationId ?? null;
}

function getVerifyProcessId(diary) {
  return diary?.verifyProcessId ?? diary?.id ?? null;
}

function normalizeStudentRows(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.students)) return data.students;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.records)) return data.records;
  return [];
}

function isDiarySubmitted(diary) {
  return diary?.submit === true;
}

function normalizeDiaryRows(list) {
  return list.map((row) => {
    const diary = row.diary
      ? { ...row.diary, periodIndex: row.diary.periodIndex ?? currentPeriod.value?.periodIndex }
      : null;

    return {
      ...row,
      id: row.id ?? diary?.verifyProcessId ?? diary?.diaryId ?? row.studentId,
      diary,
      _postOrTitle: row.internshipPostName || row.titleName || null,
      _submitTime: diary?.createTime ?? null,
      _diaryTitle: diary?.title ?? null,
      _totalScore: diary?.totalScore ?? null,
    };
  });
}

function sortRows(list, sort = {}) {
  const field = sort.properties || 'studentName';
  const direction = sort.direction === 'DESC' ? -1 : 1;
  return [...list].sort((a, b) => {
    const valA = a[field];
    const valB = b[field];
    if (valA == null && valB == null) return 0;
    if (valA == null) return direction;
    if (valB == null) return -direction;
    if (valA < valB) return -direction;
    if (valA > valB) return direction;
    return 0;
  });
}

function paginateRows(list, pageInfo = {}) {
  const page = Number(pageInfo.page) || 1;
  const size = Number(pageInfo.size) || 25;
  const start = (page - 1) * size;
  return list.slice(start, start + size);
}

function refreshStats(data, rows) {
  const submitted = rows.filter((row) => isDiarySubmitted(row.diary)).length;
  const notSubmitted = rows.length - submitted;
  const pending = rows.filter((row) => canReviewDiary(row.diary)).length;

  submittedCount.value = toCount(data?.submittedCount, submitted);
  notSubmittedCount.value = toCount(data?.notSubmittedCount, notSubmitted);
  pendingReviewCount.value = toCount(data?.pendingReviewCount, pending);
}

async function fetchRecordsFunc(params = {}) {
  if (!selectedInternshipId.value || !selectedPeriod.value) {
    resetReviewData();
    return { data: { content: [], totalElements: 0 }, message: 'successful' };
  }
  const res = await getPeriodStudents({
    internshipId: selectedInternshipId.value,
    periodId: selectedPeriod.value,
    periodIndex: currentPeriod.value?.periodIndex,
    userId: userInfo.value?.id,
  });
  const data = res?.data || {};
  const fullRows = sortRows(normalizeDiaryRows(normalizeStudentRows(data)), params?.sort);
  const pageRows = paginateRows(fullRows, params?.pageInfo);

  allStudents.value = pageRows;
  reviewTotal.value = fullRows.length;
  refreshStats(data, fullRows);
  return { data: { content: pageRows, totalElements: reviewTotal.value }, message: 'successful' };
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
      // { id: 8, showName: '总成绩', theOrder: 8, tableColumnName: 'customize-totalScore' },
    ],
  },
}));

// ── 审核历程对话框 ────────────────────────────────────────────
const showProgressDialog = ref(false);
const currentRow = ref({});
const progressProcessInfo = computed(() => ({
  relationId: getDiaryId(currentRow.value.diary),
  isAudit: currentRow.value.diary?.isAudit,
  tableName: 'MainDiary',
}));

// ── 对话框 ───────────────────────────────────────────────────
const dlgReviewRef = ref(null);
const dlgBatchReviewRef = ref(null);
const dlgDetailRef = ref(null);

function onAuditClick(row) {
  dlgReviewRef.value?.open(row, { internshipId: selectedInternshipId.value });
}

function onBatchAuditClick() {
  const pending = allStudents.value.filter((r) => canReviewDiary(r.diary));
  if (!pending.length) {
    ElMessage.warning('当前页没有待审核的日志');
    return;
  }
  dlgBatchReviewRef.value?.open(pending, { internshipId: selectedInternshipId.value });
}

function onViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = { ...row };
  showProgressDialog.value = true;
}

function openStudentDetail(row) {
  dlgDetailRef.value?.open(row);
}

function onReviewSuccess() {
  loadReviewOptions({ keepSelection: true, refreshList: true });
}

onMounted(() => {
  loadReviewOptions({ keepSelection: false, refreshList: true });
});
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
