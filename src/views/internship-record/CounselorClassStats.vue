<template>
  <div class="counselor-class-stats" v-loading="pageLoading">
    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <div class="filter-item project-filter">
          <span class="filter-label">实习项目</span>
          <el-select
            v-model="selectedInternshipId"
            placeholder="请选择实习项目"
            :loading="projectOptionsLoading"
            :disabled="!projectOptions.length"
            clearable
            filterable
            @change="handleProjectChange"
          >
            <el-option
              v-for="item in projectOptions"
              :key="item.internshipId"
              :label="item.internshipName"
              :value="item.internshipId"
            />
          </el-select>
        </div>
        <div class="filter-item class-filter">
          <span class="filter-label">班级</span>
          <el-select
            v-model="selectedClassId"
            placeholder="全部所辖班级"
            :loading="classOptionsLoading"
            :disabled="!hasSelectedProject"
            clearable
            @change="handleReportFilterChange"
          >
            <el-option v-for="item in classOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </div>
        <div class="filter-item mode-filter">
          <span class="filter-label">实习类型</span>
          <el-select v-model="internshipMode" :disabled="!hasSelectedProject" clearable placeholder="全部类型" @change="handleReportFilterChange">
            <el-option label="全部" value="" />
            <el-option label="校外实习" value="EXTERNAL" />
            <el-option label="校内实习" value="INTERNAL" />
          </el-select>
        </div>
        <div class="filter-item status-filter">
          <span class="filter-label">实习状态</span>
          <el-select v-model="internshipStatusCode" :disabled="!hasSelectedProject" clearable placeholder="全部状态" @change="handleReportFilterChange">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <div class="filter-item keyword-item">
          <span class="filter-label">关键词</span>
          <el-input
            v-model.trim="keyword"
            :disabled="!hasSelectedProject"
            clearable
            placeholder="姓名、学号、项目、岗位/题目或导师"
            @keyup.enter="handleReportFilterChange"
            @clear="handleReportFilterChange"
          />
        </div>
        <el-button type="primary" :icon="Refresh" :loading="pageLoading" @click="refreshAll">刷新统计</el-button>
      </div>
    </el-card>

    <el-empty
      v-if="!projectOptionsLoading && projectOptionsError"
      description="实习项目加载失败，请点击“刷新统计”重试"
    />
    <el-empty
      v-else-if="!projectOptionsLoading && !projectOptions.length"
      description="当前账号暂无可统计的实习项目"
    />
    <el-empty
      v-else-if="!projectOptionsLoading && !hasSelectedProject"
      description="请先选择实习项目"
    />

    <template v-else-if="hasSelectedProject">
      <div class="summary-grid">
        <el-card shadow="never" class="summary-card">
          <el-statistic title="本页班级" :value="summary.classCount" suffix="个" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="本页学生" :value="summary.studentCount" suffix="人" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="本页实习记录" :value="summary.internshipCount" suffix="条" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="本页打卡记录" :value="summary.signCount" suffix="次" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="本页请假记录" :value="summary.leaveCount" suffix="次" />
        </el-card>
        <el-card shadow="never" class="summary-card">
          <el-statistic title="本页任务提交" :value="summary.taskSubmitted" :suffix="` / ${summary.taskTotal}`" />
        </el-card>
      </div>

      <div class="table-card">
        <div class="table-tip">
          当前筛选共 {{ reportTotal }} 条；打卡、请假为“审核通过/总数”，日志为“已提交/总期次”，上方汇总为当前页数据
        </div>
        <DataTableList
          :key="tableKey"
          ref="tableRef"
          :default-props="tableProps"
          :fetch-records="fetchTableRecords"
          @view-click="handleViewClick"
        >
          <template #internshipStatus="{ row }">
            <el-tag :type="internshipStatusTag(row.internshipStatusCode)" effect="plain">
              {{ internshipStatusName(row) }}
            </el-tag>
          </template>
          <template #signStat="{ row }">{{ row.signPassed }}/{{ row.signCount }}</template>
          <template #leaveStat="{ row }">{{ row.leavePassed }}/{{ row.leaveCount }}</template>
          <template #taskStat="{ row }">{{ row.taskSubmitted }}/{{ row.taskTotal }}</template>
        </DataTableList>
      </div>
    </template>

    <el-dialog v-model="detailVisible" title="学生实习统计明细" width="1100px" append-to-body>
      <template v-if="detailRow">
        <el-descriptions :column="3" border class="detail-summary">
          <el-descriptions-item label="班级">{{ display(detailRow.className) }}</el-descriptions-item>
          <el-descriptions-item label="学生">{{ display(detailRow.studentName) }}</el-descriptions-item>
          <el-descriptions-item label="学号">{{ display(detailRow.studentAccount) }}</el-descriptions-item>
          <el-descriptions-item label="实习类型">{{ display(detailRow.internshipModeName) }}</el-descriptions-item>
          <el-descriptions-item label="实习项目">{{ display(detailRow.internshipName) }}</el-descriptions-item>
          <el-descriptions-item label="岗位/题目">{{ display(detailRow.subjectName) }}</el-descriptions-item>
          <el-descriptions-item label="校内指导老师">{{ display(detailRow.schoolTeacherName) }}</el-descriptions-item>
          <el-descriptions-item label="企业导师">{{ display(detailRow.companyTeacherName) }}</el-descriptions-item>
          <el-descriptions-item label="实习状态">
            <el-tag :type="internshipStatusTag(detailRow.internshipStatusCode)" effect="plain">
              {{ internshipStatusName(detailRow) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <el-descriptions :column="3" border>
          <el-descriptions-item label="打卡通过/总数">{{ countPair(detailRow.signPassed, detailRow.signCount) }}</el-descriptions-item>
          <el-descriptions-item label="请假通过/总数">{{ countPair(detailRow.leavePassed, detailRow.leaveCount) }}</el-descriptions-item>
          <el-descriptions-item label="日志提交/总期次">{{ countPair(detailRow.taskSubmitted, detailRow.taskTotal) }}</el-descriptions-item>
          <el-descriptions-item label="日志通过/总期次">{{ countPair(detailRow.taskPassed, detailRow.taskTotal) }}</el-descriptions-item>
          <el-descriptions-item label="终止申请编号">{{ display(detailRow.terminationId) }}</el-descriptions-item>
          <el-descriptions-item label="关系表">{{ display(detailRow.relationTable) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Refresh } from '@element-plus/icons-vue';
import DataTableList from '@/components/DataTableList.vue';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';

defineOptions({ name: 'CounselorClassStats' });

const REPORT_VIEW = 'ViewCounselorClassInternshipStats';
const PROJECT_OPTION_VIEW = 'ViewCounselorInternshipOption';

const statusOptions = [
  { label: '未安排', value: 'UNASSIGNED' },
  { label: '待选题/选岗', value: 'PENDING_SELECTION' },
  { label: '实习中', value: 'IN_PROGRESS' },
  { label: '已完成', value: 'COMPLETED' },
  { label: '已终止', value: 'TERMINATED' },
];

const STATUS_NAME_MAP = {
  UNASSIGNED: '未安排',
  PENDING_SELECTION: '待选题/选岗',
  IN_PROGRESS: '实习中',
  COMPLETED: '已完成',
  TERMINATED: '已终止',
};

const STATUS_TAG_MAP = {
  UNASSIGNED: 'info',
  PENDING_SELECTION: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  TERMINATED: 'info',
};

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});
const loading = ref(false);
const classOptions = ref([]);
const classOptionsLoading = ref(false);
const projectOptions = ref([]);
const projectOptionsLoading = ref(false);
const projectOptionsError = ref(false);
const selectedInternshipId = ref('');
const selectedClassId = ref('');
const internshipMode = ref('');
const internshipStatusCode = ref('');
const keyword = ref('');
const reportRows = ref([]);
const reportTotal = ref(0);
const tableRef = ref(null);
const tableKey = ref(0);
const detailVisible = ref(false);
const detailRow = ref(null);
let projectOptionsVersion = 0;
let classOptionsVersion = 0;
let reportRequestVersion = 0;

const hasSelectedProject = computed(
  () => selectedInternshipId.value !== '' && selectedInternshipId.value != null
);
const pageLoading = computed(() => projectOptionsLoading.value || loading.value);

const tableProps = reactive({
  title: { mainTitle: '所辖班级学生实习全量统计' },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  sortStr: { properties: 'id', direction: 'DESC' },
  bottomOffset: 24,
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    autoInit: true,
    checkFlag: false,
    hideSelectColumn: true,
    showPage: true,
    operateShow: true,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'CounselorClassStats' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      export: { show: false },
      visible: { show: true, type: 'primary', name: '查看明细' },
      buttonGroup: { show: false },
      search: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '班级', tableColumnName: 'className', sortable: true, width: 150 },
      { id: 2, showName: '学生姓名', tableColumnName: 'studentName', sortable: true, width: 110 },
      { id: 3, showName: '学号', tableColumnName: 'studentAccount', sortable: true, width: 135 },
      { id: 4, showName: '实习类型', tableColumnName: 'internshipModeName', sortable: true, width: 100 },
      { id: 5, showName: '实习项目', tableColumnName: 'internshipName', sortable: true, width: 180 },
      { id: 6, showName: '岗位/题目', tableColumnName: 'subjectName', sortable: true, width: 170 },
      { id: 7, showName: '校内指导老师', tableColumnName: 'schoolTeacherName', sortable: true, width: 130 },
      { id: 8, showName: '企业导师', tableColumnName: 'companyTeacherName', sortable: true, width: 110 },
      { id: 9, showName: '实习状态', tableColumnName: 'customize-internshipStatus', width: 120 },
      { id: 10, showName: '打卡', tableColumnName: 'customize-signStat', width: 80 },
      { id: 11, showName: '请假', tableColumnName: 'customize-leaveStat', width: 80 },
      { id: 12, showName: '任务提交', tableColumnName: 'customize-taskStat', width: 95 },
    ],
  },
});

const summary = computed(() => {
  const rows = reportRows.value;
  const classIds = new Set(
    rows.map((row) => row.classId).filter((id) => id !== null && id !== undefined).map(String)
  );
  const studentIds = new Set(
    rows.map((row) => row.studentId).filter((id) => id !== null && id !== undefined).map(String)
  );
  return {
    classCount: classIds.size,
    studentCount: studentIds.size,
    internshipCount: rows.filter((row) => row.hasInternship).length,
    signCount: rows.reduce((sum, row) => sum + row.signCount, 0),
    leaveCount: rows.reduce((sum, row) => sum + row.leaveCount, 0),
    taskSubmitted: rows.reduce((sum, row) => sum + row.taskSubmitted, 0),
    taskTotal: rows.reduce((sum, row) => sum + row.taskTotal, 0),
  };
});

function sortFieldOf(field) {
  const map = {
    'customize-internshipStatus': 'internshipStatusName',
    'customize-signStat': 'signCount',
    'customize-leaveStat': 'leaveCount',
    'customize-taskStat': 'taskTotal',
  };
  return map[field] || field;
}

async function fetchTableRecords(params = {}) {
  const counselorId = userInfo.value?.id;
  const internshipId = selectedInternshipId.value;
  if (!counselorId || internshipId === '' || internshipId == null) {
    return emptyListResponse();
  }

  const requestVersion = ++reportRequestVersion;
  const requestedCounselorId = String(counselorId);
  const requestedInternshipId = String(internshipId);
  const { searchKey, reg } = buildReportSearchWords(params.searchKey, params.reg);
  const sort = params.sort || {};
  const pageInfo = {
    page: Number(params.pageInfo?.page) || 1,
    size: Number(params.pageInfo?.size) || 20,
  };
  const requestSort = {
    properties: sortFieldOf(sort.properties || 'id'),
    direction: sort.direction === 'ASC' ? 'ASC' : 'DESC',
  };

  loading.value = true;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: REPORT_VIEW,
      pageInfo,
      searchKey,
      reg,
      andor: {},
      sort: requestSort,
    });
    if (
      requestVersion !== reportRequestVersion ||
      String(userInfo.value?.id) !== requestedCounselorId ||
      String(selectedInternshipId.value) !== requestedInternshipId
    ) {
      return emptyListResponse(pageInfo);
    }

    let rows = normalizeReportRows(responseRows(res));
    const query = keyword.value.toLowerCase();
    if (query) {
      rows = rows.filter((row) =>
        [
          row.studentName,
          row.studentAccount,
          row.className,
          row.internshipName,
          row.subjectName,
          row.schoolTeacherName,
          row.companyTeacherName,
        ].some((value) => String(value || '').toLowerCase().includes(query))
      );
    }
    const total = responseTotal(res, rows.length);
    reportRows.value = rows;
    reportTotal.value = total;
    return replaceResponseRows(res, rows, total);
  } catch (error) {
    if (requestVersion === reportRequestVersion) {
      console.error('加载辅导员班级统计失败:', error);
      reportRows.value = [];
      reportTotal.value = 0;
      ElMessage.error('加载班级统计失败');
    }
    return emptyListResponse(pageInfo);
  } finally {
    if (requestVersion === reportRequestVersion) {
      loading.value = false;
    }
  }
}

function emptyListResponse(pageInfo = {}) {
  return {
    data: {
      content: [],
      totalElements: 0,
      page: {
        number: Number(pageInfo.page) || 1,
        size: Number(pageInfo.size) || 20,
        totalElements: 0,
      },
    },
    message: 'successful',
  };
}

function responseTotal(res, fallback = 0) {
  return Number(res?.data?.page?.totalElements ?? res?.data?.totalElements ?? fallback) || 0;
}

function replaceResponseRows(res, rows, total) {
  const sourceData = res?.data && !Array.isArray(res.data) ? res.data : {};
  return {
    ...res,
    data: {
      ...sourceData,
      content: rows,
      totalElements: total,
      page: {
        ...(sourceData.page || {}),
        totalElements: total,
      },
    },
  };
}

function responseRows(res) {
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.data?.records)) return res.data.records;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatusCode(value) {
  return String(value || '').toUpperCase();
}

function normalizeReportRows(rows) {
  return rows.map((row, index) => {
    const internshipStatus = normalizeStatusCode(row.internshipStatusCode);
    const internshipModeValue = String(row.internshipMode || '').toUpperCase();
    return {
      ...row,
      id:
        row.id ??
        `${row.classId ?? 'class'}-${row.studentId ?? index}-${row.internshipId ?? 'none'}-${row.relationTable ?? 'none'}-${row.relationId ?? 'none'}`,
      internshipMode: internshipModeValue,
      internshipModeName:
        row.internshipModeName ||
        (internshipModeValue === 'EXTERNAL'
          ? '校外实习'
          : internshipModeValue === 'INTERNAL'
            ? '校内实习'
            : '未安排'),
      internshipStatusCode: internshipStatus,
      internshipStatusName: row.internshipStatusName || STATUS_NAME_MAP[internshipStatus] || internshipStatus,
      signCount: toNumber(row.signCount),
      signPassed: toNumber(row.signPassed),
      leaveCount: toNumber(row.leaveCount),
      leavePassed: toNumber(row.leavePassed),
      taskTotal: toNumber(row.taskTotal),
      taskSubmitted: toNumber(row.taskSubmitted),
      taskPassed: toNumber(row.taskPassed),
      hasInternship: internshipStatus !== 'UNASSIGNED',
    };
  });
}

function buildReportSearchWords(extraSearchKey = {}, extraReg = {}) {
  const counselorId = userInfo.value?.id;
  const searchKey = {
    counselorId,
    internshipId: selectedInternshipId.value,
  };
  const reg = {
    counselorId: CONSTANT.SEARCH_OPERATOR.EQ,
    internshipId: CONSTANT.SEARCH_OPERATOR.EQ,
  };
  if (selectedClassId.value !== '' && selectedClassId.value != null) {
    searchKey.classId = selectedClassId.value;
    reg.classId = CONSTANT.SEARCH_OPERATOR.EQ;
  }
  if (internshipMode.value) {
    searchKey.internshipMode = internshipMode.value;
    reg.internshipMode = CONSTANT.SEARCH_OPERATOR.EQ;
  }
  if (internshipStatusCode.value) {
    searchKey.internshipStatusCode = internshipStatusCode.value;
    reg.internshipStatusCode = CONSTANT.SEARCH_OPERATOR.EQ;
  }
  ['classId', 'studentId', 'internshipMode', 'internshipStatusCode'].forEach((field) => {
    if (
      searchKey[field] === undefined &&
      extraSearchKey?.[field] !== undefined &&
      extraSearchKey[field] !== ''
    ) {
      searchKey[field] = extraSearchKey[field];
      reg[field] = extraReg?.[field] || CONSTANT.SEARCH_OPERATOR.EQ;
    }
  });
  return { searchKey, reg };
}

async function loadProjectOptions({ counselorId = userInfo.value?.id, preserveSelection = false } = {}) {
  const version = ++projectOptionsVersion;
  const previousInternshipId = preserveSelection ? selectedInternshipId.value : '';
  if (!counselorId) {
    projectOptions.value = [];
    selectedInternshipId.value = '';
    projectOptionsError.value = false;
    return;
  }

  projectOptionsLoading.value = true;
  projectOptionsError.value = false;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: PROJECT_OPTION_VIEW,
      pageInfo: { page: 1, size: 1000 },
      searchKey: { counselorId },
      reg: { counselorId: CONSTANT.SEARCH_OPERATOR.EQ },
      andor: {},
      sort: { properties: 'internshipId', direction: 'DESC' },
    });
    if (version !== projectOptionsVersion || String(userInfo.value?.id) !== String(counselorId)) {
      return;
    }
    projectOptions.value = responseRows(res)
      .filter((row) => row.internshipId !== null && row.internshipId !== undefined && row.internshipId !== '')
      .map((row) => ({
        ...row,
        internshipName: row.internshipName || `实习项目 #${row.internshipId}`,
      }));
    const previousStillExists = projectOptions.value.some(
      (item) => String(item.internshipId) === String(previousInternshipId)
    );
    selectedInternshipId.value = previousStillExists ? previousInternshipId : '';
    if (!previousStillExists) {
      clearReportData();
    }
  } catch (error) {
    if (version === projectOptionsVersion) {
      console.error('获取实习项目失败:', error);
      projectOptions.value = [];
      selectedInternshipId.value = '';
      projectOptionsError.value = true;
      clearReportData();
      ElMessage.error('获取实习项目失败');
    }
  } finally {
    if (version === projectOptionsVersion) {
      projectOptionsLoading.value = false;
    }
  }
}

let loadedClassCounselorId = '';

async function loadClassOptions(counselorId = userInfo.value?.id, force = false) {
  if (!counselorId) {
    classOptions.value = [];
    return;
  }
  if (!force && loadedClassCounselorId === String(counselorId)) return;

  const version = ++classOptionsVersion;
  classOptionsLoading.value = true;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelCounselorClass',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { counselorId },
      reg: { counselorId: CONSTANT.SEARCH_OPERATOR.EQ },
      andor: {},
      sort: { properties: 'className', direction: 'ASC' },
    });
    if (version !== classOptionsVersion || String(userInfo.value?.id) !== String(counselorId)) {
      return;
    }
    const rows = responseRows(res);
    const map = new Map();
    rows.forEach((row) => {
      if (row.classId != null && !map.has(String(row.classId))) {
        map.set(String(row.classId), { id: row.classId, name: row.className || `班级 #${row.classId}` });
      }
    });
    classOptions.value = Array.from(map.values());
    loadedClassCounselorId = String(counselorId);
    if (
      selectedClassId.value &&
      !classOptions.value.some((item) => String(item.id) === String(selectedClassId.value))
    ) {
      selectedClassId.value = '';
    }
  } catch (error) {
    if (version === classOptionsVersion) {
      console.error('获取所辖班级失败:', error);
      classOptions.value = [];
      loadedClassCounselorId = '';
      ElMessage.error('获取所辖班级失败');
    }
  } finally {
    if (version === classOptionsVersion) {
      classOptionsLoading.value = false;
    }
  }
}

function clearReportData() {
  reportRequestVersion += 1;
  loading.value = false;
  reportRows.value = [];
  reportTotal.value = 0;
  detailVisible.value = false;
  detailRow.value = null;
}

function resetReportTable() {
  clearReportData();
  if (hasSelectedProject.value) {
    tableKey.value += 1;
  }
}

async function handleProjectChange() {
  resetReportTable();
  if (!hasSelectedProject.value) return;
  await loadClassOptions();
}

function handleReportFilterChange() {
  resetReportTable();
}

async function refreshAll() {
  const counselorId = userInfo.value?.id;
  if (!counselorId) {
    ElMessage.warning('无法获取当前辅导员信息');
    return;
  }
  await loadProjectOptions({ counselorId, preserveSelection: true });
  if (!hasSelectedProject.value) return;
  await loadClassOptions(counselorId, true);
  resetReportTable();
}

function openDetail(row) {
  detailRow.value = row;
  detailVisible.value = true;
}

function handleViewClick(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row) openDetail(row);
}

function display(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function countPair(passed, total) {
  return `${toNumber(passed)} / ${toNumber(total)}`;
}

function internshipStatusName(row) {
  const status = normalizeStatusCode(row?.internshipStatusCode);
  return row?.internshipStatusName || STATUS_NAME_MAP[status] || display(status);
}

function internshipStatusTag(statusCode) {
  return STATUS_TAG_MAP[normalizeStatusCode(statusCode)] || 'info';
}

function resetCounselorState() {
  projectOptionsVersion += 1;
  classOptionsVersion += 1;
  clearReportData();
  projectOptions.value = [];
  classOptions.value = [];
  projectOptionsLoading.value = false;
  classOptionsLoading.value = false;
  projectOptionsError.value = false;
  selectedInternshipId.value = '';
  selectedClassId.value = '';
  internshipMode.value = '';
  internshipStatusCode.value = '';
  keyword.value = '';
  loadedClassCounselorId = '';
  tableKey.value += 1;
}

watch(
  () => userInfo.value?.id,
  async (counselorId) => {
    resetCounselorState();
    if (counselorId) {
      await loadProjectOptions({ counselorId });
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.counselor-class-stats {
  padding: 16px;
}

.filter-card,
.summary-grid {
  margin-bottom: 16px;
}

.filter-row {
  display: grid;
  grid-template-columns:
    minmax(240px, 1.2fr)
    minmax(200px, 1fr)
    190px
    210px
    minmax(280px, 1.4fr)
    auto;
  align-items: center;
  gap: 12px;
}

.filter-item {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.filter-item .el-select,
.filter-item .el-input {
  width: 100%;
}

.keyword-item {
  min-width: 0;
}

.filter-label {
  flex: none;
  color: #606266;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(130px, 1fr));
  gap: 12px;
}

.summary-card {
  text-align: center;
}

.table-tip {
  color: #909399;
  font-size: 12px;
  font-weight: normal;
  margin: 0 0 8px 2px;
}

.detail-summary {
  margin-bottom: 16px;
}

@media (max-width: 1360px) {
  .filter-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .keyword-item {
    grid-column: 1 / 3;
  }

  .filter-row > .el-button {
    justify-self: start;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(130px, 1fr));
  }
}

@media (max-width: 900px) {
  .filter-row {
    grid-template-columns: 1fr;
  }

  .keyword-item {
    grid-column: auto;
  }
}
</style>
