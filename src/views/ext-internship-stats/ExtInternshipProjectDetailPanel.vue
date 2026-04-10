<template>
  <div class="ext-internship-detail-panel">
    <el-alert
      v-if="!normalizedId"
      type="warning"
      show-icon
      :closable="false"
      title="未指定实习项目。"
    />

    <template v-else>
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="已通过审核的岗位" name="posts">
          <div class="tab-datalist">
            <DataTableList
              :key="`posts-${normalizedId}`"
              ref="postsTableRef"
              :default-props="postsDtlProps"
              :fetch-records="fetchPostsRecords"
            >
              <template #salary="{ row }">
                {{ row.salary != null && row.salary !== '' ? row.salary : '—' }}
              </template>
            </DataTableList>
          </div>
        </el-tab-pane>

        <el-tab-pane label="学生选岗情况" name="students">
          <div class="counts-row">
            <el-card shadow="hover" class="count-card">
              <div class="count-label">未选岗位</div>
              <div class="count-num">{{ studentCounts.notSelected ?? 0 }}</div>
            </el-card>
            <el-card shadow="hover" class="count-card">
              <div class="count-label">已选岗待审核</div>
              <div class="count-num">{{ studentCounts.selectedPendingAudit ?? 0 }}</div>
            </el-card>
            <el-card shadow="hover" class="count-card">
              <div class="count-label">岗位已通过</div>
              <div class="count-num">{{ studentCounts.postApproved ?? 0 }}</div>
            </el-card>
          </div>

          <div class="student-toolbar">
            <span class="toolbar-label">筛选</span>
            <el-radio-group v-model="studentStatus">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="notSelected">未选岗位</el-radio-button>
              <el-radio-button label="selectedPendingAudit">已选岗待审核</el-radio-button>
              <el-radio-button label="postApproved">岗位已通过</el-radio-button>
            </el-radio-group>
          </div>

          <div class="tab-datalist">
            <DataTableList
              :key="`students-${normalizedId}-${studentStatus}`"
              ref="studentsTableRef"
              :default-props="studentsDtlProps"
              :fetch-records="fetchStudentsRecords"
            >
              <template #selectionStatus="{ row }">
                {{ selectionStatusLabel(row.selectionStatus) }}
              </template>
            </DataTableList>
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import DataTableList from '@/components/DataTableList.vue';
import internshipProcessAPI from '@/api/internshipProcess';

defineOptions({
  name: 'ExtInternshipProjectDetailPanel',
});

const props = defineProps({
  internshipId: { type: [Number, String], default: null },
  internshipName: { type: String, default: '' },
});

const activeTab = ref('posts');
const postsTableRef = ref(null);
const studentsTableRef = ref(null);

const normalizedId = computed(() => {
  const v = props.internshipId;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? v : n;
});

const studentStatus = ref('all');
const studentCounts = ref({
  notSelected: 0,
  selectedPendingAudit: 0,
  postApproved: 0,
});

const STATUS_LABELS = {
  notSelected: '未选岗位',
  selectedPendingAudit: '已选岗待审核',
  postApproved: '岗位已通过',
  all: '全部',
};

function selectionStatusLabel(v) {
  return STATUS_LABELS[v] || v || '—';
}

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

const postsDtlProps = reactive({
  keyWord: { view: 'ExtInternshipDetailPosts' },
  title: {},
  bottomOffset: 0,
  pageInfo: { page: 1, size: 25, sizes: [25, 50, 75, 100] },
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'ExtInternshipDetailPosts' },
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
      { id: 1, showName: '#', tableColumnName: '_rowNum', sortable: false, width: 55 },
      {
        id: 2,
        showName: '岗位名称',
        tableColumnName: 'internshipPostName',
        sortable: false,
        width: 220,
      },
      { id: 3, showName: '公司', tableColumnName: 'companyName', sortable: false, width: 160 },
      { id: 4, showName: '薪资', tableColumnName: 'customize-salary', sortable: false, width: 120 },
      { id: 5, showName: '招聘人数', tableColumnName: 'allPersonNum', sortable: false, width: 100 },
      { id: 6, showName: '已招人数', tableColumnName: 'nowPersonNum', sortable: false, width: 100 },
      {
        id: 7,
        showName: '岗位编码',
        tableColumnName: 'internshipPostCode',
        sortable: false,
        width: 120,
      },
      { id: 8, showName: '备注', tableColumnName: 'remarks', sortable: false, width: 160 },
    ],
  },
});

const studentsDtlProps = reactive({
  keyWord: { view: 'ExtInternshipDetailStudents' },
  title: {},
  bottomOffset: 0,
  pageInfo: { page: 1, size: 25, sizes: [25, 50, 75, 100] },
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'ExtInternshipDetailStudents' },
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
      { id: 1, showName: '#', tableColumnName: '_rowNum', sortable: false, width: 55 },
      { id: 2, showName: '姓名', tableColumnName: 'userName', sortable: false, width: 120 },
      {
        id: 3,
        showName: '学院/部门',
        tableColumnName: 'departmentName',
        sortable: false,
        width: 160,
      },
      {
        id: 4,
        showName: '岗位',
        tableColumnName: 'internshipPostName',
        sortable: false,
        width: 160,
      },
      { id: 5, showName: '公司', tableColumnName: 'companyName', sortable: false, width: 160 },
      {
        id: 6,
        showName: '选岗状态',
        tableColumnName: 'customize-selectionStatus',
        sortable: false,
        width: 130,
      },
      { id: 7, showName: '审核状态', tableColumnName: 'isAudit', sortable: false, width: 110 },
    ],
  },
});

async function fetchPostsRecords(params) {
  if (!normalizedId.value) {
    return {
      data: { content: [], totalElements: 0, page: { totalElements: 0 } },
    };
  }
  const res = await internshipProcessAPI.listApprovedExternalInternshipPosts({
    internshipId: Number(normalizedId.value),
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  });
  const data = unwrapPayload(res);
  const rows = Array.isArray(data.posts) ? data.posts : [];
  const page = params.pageInfo.page;
  const size = params.pageInfo.size;
  const total = Number(data.totalElements ?? data.total ?? rows.length ?? 0);
  const content = rows.map((r, idx) => ({
    ...r,
    id: r.id ?? r.postId ?? r.internshipPostId ?? `post-${page}-${idx}`,
    _rowNum: (page - 1) * size + idx + 1,
  }));
  return {
    data: {
      content,
      totalElements: total,
      page: { totalElements: total },
    },
  };
}

async function fetchStudentsRecords(params) {
  if (!normalizedId.value) {
    return {
      data: { content: [], totalElements: 0, page: { totalElements: 0 } },
    };
  }
  const res = await internshipProcessAPI.getExternalInternshipStudentPostBreakdown({
    internshipId: Number(normalizedId.value),
    status: studentStatus.value,
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  });
  const data = unwrapPayload(res);
  if (data.counts && typeof data.counts === 'object') {
    studentCounts.value = {
      notSelected: Number(data.counts.notSelected ?? 0),
      selectedPendingAudit: Number(data.counts.selectedPendingAudit ?? 0),
      postApproved: Number(data.counts.postApproved ?? 0),
    };
  }
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const page = params.pageInfo.page;
  const size = params.pageInfo.size;
  const total = Number(data.totalElements ?? 0);
  const content = rows.map((r, idx) => ({
    ...r,
    id:
      r.id ??
      (r.userId != null
        ? `u${r.userId}_${r.internshipPostId ?? idx}_${page}`
        : `stu-${page}-${idx}`),
    _rowNum: (page - 1) * size + idx + 1,
  }));
  return {
    data: {
      content,
      totalElements: total,
      page: { totalElements: total },
    },
  };
}

function reloadBothTables() {
  if (normalizedId.value == null || normalizedId.value === '') return;
  nextTick(() => {
    postsTableRef.value?.initDataList?.(true);
    studentsTableRef.value?.initDataList?.(true);
  });
}

watch(
  () => normalizedId.value,
  (id) => {
    if (id == null || id === '') return;
    reloadBothTables();
  },
  { immediate: true }
);

watch(studentStatus, () => {
  nextTick(() => studentsTableRef.value?.initDataList?.(true));
});
</script>

<style scoped>
.ext-internship-detail-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 4px 2px 0;
  box-sizing: border-box;
}
.detail-tabs {
  margin-top: 4px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.ext-internship-detail-panel :deep(.el-tabs__header) {
  flex-shrink: 0;
}
.ext-internship-detail-panel :deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.ext-internship-detail-panel :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
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
</style>
