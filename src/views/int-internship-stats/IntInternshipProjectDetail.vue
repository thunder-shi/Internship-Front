<template>
  <div class="internal-internship-detail page-wrap">
    <el-page-header class="page-header" @back="goBack">
      <template #content>
        <div class="header-title">
          <span class="title-text">{{ displayTitle }}</span>
          <span v-if="internshipId" class="sub-id">项目 ID：{{ internshipId }}</span>
        </div>
      </template>
    </el-page-header>

    <el-alert
      v-if="!internshipId"
      type="warning"
      show-icon
      :closable="false"
      title="未指定实习项目，请从「校内实习报名统计」列表进入。"
    />

    <template v-else>
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="学生选题情况" name="students">
          <div class="counts-row">
            <el-card shadow="hover" class="count-card">
              <div class="count-label">尚未提交选题</div>
              <div class="count-num">{{ studentCounts.notSubmitted ?? 0 }}</div>
            </el-card>
            <el-card shadow="hover" class="count-card">
              <div class="count-label">选题审核中</div>
              <div class="count-num">{{ studentCounts.pendingAudit ?? 0 }}</div>
            </el-card>
            <el-card shadow="hover" class="count-card">
              <div class="count-label">选题已通过</div>
              <div class="count-num">{{ studentCounts.titleApproved ?? 0 }}</div>
            </el-card>
          </div>

          <div class="student-toolbar">
            <span class="toolbar-label">筛选</span>
            <el-radio-group v-model="studentStatus">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="notSubmitted">尚未提交选题</el-radio-button>
              <el-radio-button label="pendingAudit">选题审核中</el-radio-button>
              <el-radio-button label="titleApproved">选题已通过</el-radio-button>
            </el-radio-group>
          </div>

          <DataTableList
            v-if="activeTab === 'students'"
            :key="`students-${internshipId}-${studentStatus}-${departmentId ?? 'whole'}`"
            ref="studentsDataTableRef"
            :default-props="studentsDtlProps"
            :fetch-records="fetchStudentRows"
          >
            <template #rowNum="{ row }">
              {{ row.__rowNum }}
            </template>
            <template #selectionStatus="{ row }">
              {{ selectionStatusLabel(row.selectionStatus) }}
            </template>
          </DataTableList>
        </el-tab-pane>

        <el-tab-pane label="尚未提交题目的老师" name="teachers">
          <div class="counts-row counts-row--inline">
            <span class="inline-count-label">未提交题目的老师人数：</span>
            <span class="inline-count-num">{{ teachersNotSubmittedCount }}</span>
          </div>
          <DataTableList
            v-if="activeTab === 'teachers'"
            :key="`teachers-${internshipId}-${departmentId ?? 'whole'}`"
            ref="teachersDataTableRef"
            :default-props="teachersDtlProps"
            :fetch-records="fetchTeacherRows"
          >
            <template #rowNum="{ row }">
              {{ row.__rowNum }}
            </template>
            <template #teacherNameCell="{ row }">
              {{ teacherCellName(row) }}
            </template>
            <template #teacherDeptCell="{ row }">
              {{ teacherCellDept(row) }}
            </template>
            <template #teacherPhoneCell="{ row }">
              {{ teacherCellPhone(row) }}
            </template>
          </DataTableList>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import DataTableList from '@/components/DataTableList.vue';
import internshipProcessAPI from '@/api/internshipProcess';
import { resolveCollegeScopeDepartmentId } from '@/utils/internshipStatsDepartment';

defineOptions({
  name: 'IntInternshipProjectDetail',
});

const route = useRoute();
const router = useRouter();
const store = useStore();

const userInfo = computed(() => store.getters.userInfo || {});

const activeTab = ref('students');
const studentsDataTableRef = ref(null);
const teachersDataTableRef = ref(null);

const internshipId = computed(() => {
  const q = route.query.internshipId;
  if (q == null || q === '') return null;
  const n = Number(q);
  return Number.isNaN(n) ? q : n;
});

const internshipNameFromQuery = computed(() => String(route.query.internshipName || ''));

/** 从列表进入会带 query；否则用账号部门解析到「学院」层，避免挂在班级上时接口范围过窄 */
const resolvedFallbackDepartmentId = ref(null);

const departmentId = computed(() => {
  const q = route.query.departmentId;
  if (q != null && q !== '') {
    const n = Number(q);
    return Number.isNaN(n) ? null : n;
  }
  return resolvedFallbackDepartmentId.value;
});

async function refreshResolvedDepartmentFallback() {
  const d = userInfo.value.departmentId;
  if (d == null || d === '') {
    resolvedFallbackDepartmentId.value = null;
    return;
  }
  resolvedFallbackDepartmentId.value = await resolveCollegeScopeDepartmentId(d);
}

onMounted(() => {
  refreshResolvedDepartmentFallback();
});

watch(
  () => userInfo.value.departmentId,
  () => {
    refreshResolvedDepartmentFallback();
  }
);

const displayTitle = computed(() => {
  if (internshipNameFromQuery.value) return internshipNameFromQuery.value;
  return '校内实习项目详情';
});

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

/** ---------- 学生选题 DataTableList ---------- */
const studentStatus = ref('all');
const studentCounts = ref({
  notSubmitted: 0,
  pendingAudit: 0,
  titleApproved: 0,
});

const STATUS_LABELS = {
  notSubmitted: '尚未提交选题',
  pendingAudit: '选题审核中',
  titleApproved: '选题已通过',
  all: '全部',
};

function selectionStatusLabel(v) {
  return STATUS_LABELS[v] || v || '—';
}

const studentsDtlProps = reactive({
  keyWord: { view: 'IntInternshipProjectDetailStudents' },
  bottomOffset: 120,
  sortStr: { properties: '', direction: 'DESC' },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    operateShow: false,
    checkFlag: true,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'IntInternshipProjectDetailStudents' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      export: { show: false },
      visible: { show: false },
      batchCreate: { show: false },
      more1: { show: false },
      more2: { show: false },
      more3: { show: false },
      audit: { show: false },
      submit: { show: false },
      buttonGroup: { show: false },
      search: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '#', tableColumnName: 'customize-rowNum', width: 55 },
      { id: 2, showName: '学生', tableColumnName: 'studentName', width: 120 },
      { id: 3, showName: '题目', tableColumnName: 'titleName', width: 200 },
      { id: 4, showName: '指导老师', tableColumnName: 'teacherName', width: 120 },
      {
        id: 5,
        showName: '选题状态',
        tableColumnName: 'customize-selectionStatus',
        width: 130,
      },
    ],
  },
});

async function fetchStudentRows(params) {
  if (!internshipId.value) {
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { totalElements: 0 },
      },
    };
  }
  const breakdownNode = {
    internshipId: Number(internshipId.value),
    status: studentStatus.value,
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  };
  if (departmentId.value != null) {
    breakdownNode.departmentId = Number(departmentId.value);
  }
  const res = await internshipProcessAPI.getInternalInternshipTitleSelectionBreakdown(breakdownNode);
  const data = unwrapPayload(res);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  if (data.counts && typeof data.counts === 'object') {
    studentCounts.value = {
      notSubmitted: Number(data.counts.notSubmitted ?? 0),
      pendingAudit: Number(data.counts.pendingAudit ?? 0),
      titleApproved: Number(data.counts.titleApproved ?? 0),
    };
  }
  const content = rows.map((r, idx) => ({
    ...r,
    id:
      r.relTitleStudentId ??
      r.studentId ??
      r.id ??
      `stu-${params.pageInfo.page}-${idx}`,
    __rowNum: (params.pageInfo.page - 1) * params.pageInfo.size + idx + 1,
  }));
  const total = Number(data.totalElements ?? 0);
  return {
    data: {
      content,
      totalElements: total,
      page: { totalElements: total },
    },
  };
}

/** ---------- 未提交题目的老师 DataTableList ---------- */
const teachersNotSubmittedCount = ref(0);

const teachersDtlProps = reactive({
  keyWord: { view: 'IntInternshipProjectDetailTeachers' },
  bottomOffset: 120,
  sortStr: { properties: '', direction: 'DESC' },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    operateShow: false,
    checkFlag: true,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'IntInternshipProjectDetailTeachers' },
    buttonProps: {
      create: { show: false },
      update: { show: false },
      delete: { show: false },
      export: { show: false },
      visible: { show: false },
      batchCreate: { show: false },
      more1: { show: false },
      more2: { show: false },
      more3: { show: false },
      audit: { show: false },
      submit: { show: false },
      buttonGroup: { show: false },
      search: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '#', tableColumnName: 'customize-rowNum', width: 55 },
      { id: 2, showName: '姓名', tableColumnName: 'customize-teacherNameCell', width: 120 },
      { id: 3, showName: '学院', tableColumnName: 'customize-teacherDeptCell', width: 160 },
      { id: 4, showName: '联系方式', tableColumnName: 'customize-teacherPhoneCell', width: 140 },
    ],
  },
});

/** 兼容接口仅返回 displayLine（「姓名 - 学院 - 联系方式」）时的拆分 */
function splitTeacherDisplayLine(row) {
  if (!row?.displayLine) return [];
  return String(row.displayLine)
    .split(/\s*-\s*/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function teacherCellName(row) {
  const v = row?.teacherName;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  const parts = splitTeacherDisplayLine(row);
  return parts[0] ?? '—';
}

function teacherCellDept(row) {
  const v = row?.departmentName;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  const parts = splitTeacherDisplayLine(row);
  return parts[1] ?? '—';
}

function teacherCellPhone(row) {
  const v = row?.phone;
  if (v != null && String(v).trim() !== '') return String(v).trim();
  const parts = splitTeacherDisplayLine(row);
  return parts[2] ?? '—';
}

async function fetchTeacherRows(params) {
  if (!internshipId.value) {
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { totalElements: 0 },
      },
    };
  }
  const teachersNode = {
    internshipId: Number(internshipId.value),
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  };
  if (departmentId.value != null) {
    teachersNode.departmentId = Number(departmentId.value);
  }
  const res = await internshipProcessAPI.listInternalInternshipTeachersNotSubmittedTopic(teachersNode);
  const data = unwrapPayload(res);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  teachersNotSubmittedCount.value = Number(
    data.notSubmittedCount ?? data.totalElements ?? rows.length ?? 0
  );
  const content = rows.map((r, idx) => ({
    ...r,
    id: r.teacherId ?? r.id ?? `tea-${params.pageInfo.page}-${idx}`,
    __rowNum: (params.pageInfo.page - 1) * params.pageInfo.size + idx + 1,
  }));
  const total = Number(data.totalElements ?? 0);
  return {
    data: {
      content,
      totalElements: total,
      page: { totalElements: total },
    },
  };
}

function pathWithLastSegment(segment) {
  const parts = route.path.split('/').filter(Boolean);
  if (parts.length) parts[parts.length - 1] = segment;
  return `/${parts.join('/')}`;
}

function goBack() {
  router.push({ path: pathWithLastSegment('IntInternshipCollegeStats') });
}

watch(
  () => [internshipId.value, activeTab.value, departmentId.value, studentStatus.value],
  ([iid, tab]) => {
    if (!iid) return;
    nextTick(() => {
      if (tab === 'students') {
        studentsDataTableRef.value?.initDataList?.(true);
      } else if (tab === 'teachers') {
        teachersDataTableRef.value?.initDataList?.(true);
      }
    });
  },
  { immediate: true }
);
</script>

<style scoped>
.page-wrap {
  padding: 12px;
}
.page-header {
  margin-bottom: 16px;
}
.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title-text {
  font-size: 16px;
  font-weight: 600;
}
.sub-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
}
.detail-tabs {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.detail-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.detail-tabs :deep(.el-tab-pane) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.detail-tabs :deep(.data-table-header) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.detail-tabs :deep(.el-card) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.detail-tabs :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.counts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.counts-row--inline {
  align-items: baseline;
  gap: 8px;
}
.inline-count-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.inline-count-num {
  font-size: 20px;
  font-weight: 600;
}
.count-card {
  min-width: 160px;
  flex: 1;
}
.count-card :deep(.el-card__body) {
  padding: 12px 16px;
}
.count-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.count-num {
  font-size: 22px;
  font-weight: 600;
  margin-top: 6px;
}
.student-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.toolbar-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.mb-12 {
  margin-bottom: 12px;
}
</style>
