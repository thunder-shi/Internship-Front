<template>
  <div class="internal-internship-detail-panel">
    <el-alert
      v-if="!resolvedInternshipId"
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

          <div class="tab-datalist">
            <DataTableList
              v-if="activeTab === 'students'"
              :key="`students-${resolvedInternshipId}-${studentStatus}`"
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
          </div>
        </el-tab-pane>

        <el-tab-pane label="尚未提交题目的老师" name="teachers">
          <el-alert
            v-if="resolvedDepartmentId == null"
            type="warning"
            show-icon
            :closable="false"
            class="mb-12"
            title="缺少学院 departmentId，请从统计列表进入本页，或在后台菜单中携带部门信息。"
          />
          <template v-else>
            <div class="counts-row counts-row--inline">
              <span class="inline-count-label">未提交题目的老师人数：</span>
              <span class="inline-count-num">{{ teachersNotSubmittedCount }}</span>
            </div>
            <div class="tab-datalist">
              <DataTableList
                v-if="activeTab === 'teachers'"
                :key="`teachers-${resolvedInternshipId}-${resolvedDepartmentId}`"
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
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import DataTableList from '@/components/DataTableList.vue';
import internshipProcessAPI from '@/api/internshipProcess';
import { resolveCollegeScopeDepartmentId } from '@/utils/internshipStatsDepartment';

defineOptions({
  name: 'IntInternshipProjectDetailPanel',
});

const props = defineProps({
  internshipId: { type: [Number, String], default: null },
  internshipName: { type: String, default: '' },
  departmentId: { type: [Number, String], default: null },
});

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

const activeTab = ref('students');
const studentsDataTableRef = ref(null);
const teachersDataTableRef = ref(null);

const resolvedFallbackDepartmentId = ref(null);
const resolvedInternshipId = computed(() => {
  if (props.internshipId == null || props.internshipId === '') return null;
  const n = Number(props.internshipId);
  return Number.isNaN(n) ? props.internshipId : n;
});

const resolvedDepartmentId = computed(() => {
  if (props.departmentId != null && props.departmentId !== '') {
    const n = Number(props.departmentId);
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

watch(
  () => userInfo.value.departmentId,
  () => {
    refreshResolvedDepartmentFallback();
  },
  { immediate: true }
);

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

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
  bottomOffset: 0,
  sortStr: { properties: '', direction: 'DESC' },
  pageInfo: { page: 1, size: 25, sizes: [25, 50, 75, 100] },
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
      { id: 1, showName: '序号', tableColumnName: 'customize-rowNum' },
      { id: 2, showName: '学生', tableColumnName: 'studentName'},
      { id: 3, showName: '题目', tableColumnName: 'titleName'},
      { id: 4, showName: '指导老师', tableColumnName: 'teacherName' },
      {
        id: 5,
        showName: '选题状态',
        tableColumnName: 'customize-selectionStatus',
      },
    ],
  },
});

async function fetchStudentRows(params) {
  if (!resolvedInternshipId.value) {
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { totalElements: 0 },
      },
    };
  }
  const res = await internshipProcessAPI.getInternalInternshipTitleSelectionBreakdown({
    internshipId: Number(resolvedInternshipId.value),
    status: studentStatus.value,
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  });
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
    id: r.relTitleStudentId ?? r.studentId ?? r.id ?? `stu-${params.pageInfo.page}-${idx}`,
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

const teachersNotSubmittedCount = ref(0);

const teachersDtlProps = reactive({
  keyWord: { view: 'IntInternshipProjectDetailTeachers' },
  bottomOffset: 0,
  sortStr: { properties: '', direction: 'DESC' },
  pageInfo: { page: 1, size: 25, sizes: [25, 50, 75, 100] },
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
      { id: 1, showName: '序号', tableColumnName: 'customize-rowNum' },
      { id: 2, showName: '姓名', tableColumnName: 'customize-teacherNameCell' },
      { id: 3, showName: '学院', tableColumnName: 'customize-teacherDeptCell' },
      { id: 4, showName: '联系方式', tableColumnName: 'customize-teacherPhoneCell' },
    ],
  },
});

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
  if (!resolvedInternshipId.value || resolvedDepartmentId.value == null) {
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { totalElements: 0 },
      },
    };
  }
  const res = await internshipProcessAPI.listInternalInternshipTeachersNotSubmittedTopic({
    internshipId: Number(resolvedInternshipId.value),
    departmentId: Number(resolvedDepartmentId.value),
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  });
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

watch(
  () => [resolvedInternshipId.value, activeTab.value, resolvedDepartmentId.value, studentStatus.value],
  ([iid, tab, did]) => {
    if (!iid) return;
    nextTick(() => {
      if (tab === 'students') {
        studentsDataTableRef.value?.initDataList?.(true);
      } else if (tab === 'teachers' && did != null) {
        teachersDataTableRef.value?.initDataList?.(true);
      }
    });
  },
  { immediate: true }
);
</script>

<style scoped>
.internal-internship-detail-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.detail-tabs {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.internal-internship-detail-panel :deep(.el-tabs__header) {
  flex-shrink: 0;
}
.detail-tabs :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.detail-tabs :deep(.el-tab-pane) {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab-datalist {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.tab-datalist :deep(.data-table-header) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.tab-datalist :deep(.el-card) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  border: none;
  box-shadow: none;
}
.tab-datalist :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.counts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
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
  flex-shrink: 0;
}
.toolbar-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.mb-12 {
  margin-bottom: 12px;
}
.internal-internship-detail-panel :deep(.el-scrollbar__bar.is-vertical) {
  display: none !important;
}
</style>
