<template>
  <div class="ext-internship-college-stats page-wrap">
    <div class="stats-layout">
      <aside class="stats-aside">
        <DataTree ref="dataTreeRef" :default-props="treeProps" @node-click="handleNodeClick" />
      </aside>
      <main class="stats-main">
        <div class="stats-table-flex">
          <DataTableList
            ref="dataTableListRef"
            :default-props="defaultDTLProps"
            :fetch-records="fetchCollegeStats"
          >
            <template #rightOperate="{ row }">
              <!-- 与实习流程列表「查看」一致：primary + small + axt-view（同 TutorAssignmentBase visible 按钮） -->
              <el-button type="primary" size="small" title="项目详情" @click="goProjectDetail(row)">
                <svg-icon icon-class="axt-view" />
              </el-button>
            </template>
          </DataTableList>
        </div>
      </main>
    </div>
    <DlgExtInternshipProjectDetail ref="projectDetailDlgRef" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgExtInternshipProjectDetail from '@/views/ext-internship-stats/DlgExtInternshipProjectDetail.vue';
import internshipProcessAPI from '@/api/internshipProcess';
import CONSTANT from '@/utils/constant';
import {
  canViewInternshipCollegeStats,
  isInternshipStatsSchoolScopeUser,
  isInternshipStatsDepartmentAdmin,
  fetchDepartmentSubtreeRootRow,
} from '@/utils/internshipStatsDepartment';

defineOptions({
  name: 'ExtInternshipCollegeStats',
});

const store = useStore();

const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

const isDeptAdminOnly = computed(
  () =>
    isInternshipStatsDepartmentAdmin(userInfo.value, roles.value) &&
    !isInternshipStatsSchoolScopeUser(userInfo.value, roles.value)
);

const dataTreeRef = ref(null);
const dataTableListRef = ref(null);
const projectDetailDlgRef = ref(null);

/** 校级 + 树下钻时，为左侧所选部门 id；全校汇总时为 null。院系管理员不按此字段请求接口。 */
const selectedDepartmentId = ref(null);

const titleState = reactive({
  mainTitle: '校外实习报名统计',
});

const treeProps = computed(() => {
  const searchKey = {};
  const regKey = {};
  if (userInfo.value.schoolId) {
    searchKey.schoolId = userInfo.value.schoolId;
    regKey.schoolId = CONSTANT.SEARCH_OPERATOR.EQ;
  }
  const deptOnly = isDeptAdminOnly.value;
  return {
    title: { mainTitle: '单位部门' },
    keyWord: 'ViewBaseDepartment',
    checkFlag: false,
    sort: { properties: 'theOrder', direction: 'ASC' },
    // 不要虚拟根「全部」：首层即学校，点击学校节点即按该校子树下钻统计
    virtualRootFlag: false,
    autoInit: !deptOnly,
    initSearchWords: {
      searchKey,
      regKey,
      andor: {},
    },
  };
});

const defaultDTLProps = reactive({
  keyWord: { view: 'ExtInternshipCollegeStats' },
  title: titleState,
  // bottomOffset: 150,
  sortStr: { properties: 'internshipId', direction: 'DESC' },
  pageInfo: { page: 1, size: 25, sizes: [25, 50, 75, 100] },
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  someFlags: {
    operateShow: true,
    checkFlag: true,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    showSearchPanel: false,
    keyWord: { view: 'ExtInternshipCollegeStats' },
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
      {
        id: 1,
        showName: '实习项目名称',
        tableColumnName: 'internshipName',
        sortable: false,
        width: 220,
      },
      {
        id: 4,
        showName: '岗位条数',
        tableColumnName: 'postSignupCount',
        sortable: false,
        width: 100,
      },
      {
        id: 5,
        showName: '招聘总人数',
        tableColumnName: 'totalRecruitmentHeadcount',
        sortable: false,
        width: 120,
      },
      {
        id: 3,
        showName: '报名导师数',
        tableColumnName: 'signupTeacherCount',
        sortable: false,
        width: 130,
      },
      {
        id: 2,
        showName: '报名学生总数',
        tableColumnName: 'signupStudentTotalCount',
        sortable: false,
        width: 120,
      },
      {
        id: 2,
        showName: '当前部门报名学生数',
        tableColumnName: 'signupStudentCount',
        sortable: false,
        width: 170,
      },
      {
        id: 6,
        showName: '待审核岗位数',
        tableColumnName: 'pendingAuditPostCount',
        sortable: false,
        width: 130,
      },
      {
        id: 7,
        showName: '已选岗学生数',
        tableColumnName: 'studentWithPostSelectionCount',
        sortable: false,
        width: 150,
      },
    ],
  },
});

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

async function fetchCollegeStats(params) {
  if (!canViewInternshipCollegeStats(userInfo.value, roles.value)) {
    ElMessage.error('无权查看实习统计');
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { totalElements: 0 },
      },
    };
  }

  const payload = {
    pageInfo: {
      page: params.pageInfo.page,
      size: params.pageInfo.size,
    },
  };

  if (isDeptAdminOnly.value) {
    const departmentId = selectedDepartmentId.value;
    if (departmentId == null || departmentId === '') {
      ElMessage.warning('请先在左侧部门树选择要统计的节点');
      return {
        data: {
          content: [],
          totalElements: 0,
          page: { totalElements: 0 },
        },
      };
    }
    payload.departmentId = Number(departmentId);
  } else if (selectedDepartmentId.value != null && selectedDepartmentId.value !== '') {
    payload.departmentId = Number(selectedDepartmentId.value);
  }

  try {
    const res = await internshipProcessAPI.listExternalInternshipCollegeStats(payload);
    const data = unwrapPayload(res);
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const content = rows.map((r) => ({
      ...r,
      id: r.internshipId ?? r.id,
    }));
    const total = Number(data.totalElements ?? 0);

    return {
      data: {
        content,
        totalElements: total,
        page: { totalElements: total },
      },
    };
  } catch {
    ElMessage.error('获取统计数据失败，请重试');
    return { data: { content: [], totalElements: 0, page: { totalElements: 0 } } };
  }
}

function handleNodeClick(node) {
  if (!node || node.id === -1) return;
  selectedDepartmentId.value = node.id;
  dataTableListRef.value?.initDataList?.(true);
}

function goProjectDetail(row) {
  const id = row?.internshipId;
  if (id == null) {
    ElMessage.warning('缺少 internshipId');
    return;
  }
  let dept = null;
  if (isDeptAdminOnly.value) {
    dept =
      selectedDepartmentId.value != null && selectedDepartmentId.value !== ''
        ? selectedDepartmentId.value
        : userInfo.value.departmentId;
  } else if (selectedDepartmentId.value != null && selectedDepartmentId.value !== '') {
    dept = selectedDepartmentId.value;
  } else {
    dept = row?.departmentId;
  }
  const opts = {};
  if (dept != null && dept !== '') {
    opts.departmentId = Number(dept);
  }
  projectDetailDlgRef.value?.show(row, opts);
}

onMounted(async () => {
  if (!canViewInternshipCollegeStats(userInfo.value, roles.value)) {
    ElMessage.error('无权查看实习统计');
    nextTick(() => dataTableListRef.value?.initDataList?.(true));
    return;
  }

  if (isDeptAdminOnly.value) {
    const uid = userInfo.value.departmentId;
    if (uid == null || uid === '') {
      ElMessage.error('院系管理员未绑定部门，无法查看实习统计');
      nextTick(() => dataTableListRef.value?.initDataList?.(true));
      return;
    }
    selectedDepartmentId.value = Number(uid);
    const kw = treeProps.value.keyWord;
    const rootRow = await fetchDepartmentSubtreeRootRow(kw, uid);
    nextTick(async () => {
      if (rootRow) {
        await dataTreeRef.value?.initDataTreeWithRootRows?.([rootRow]);
      }
      dataTableListRef.value?.initDataList?.(true);
    });
    return;
  }

  nextTick(() => {
    dataTableListRef.value?.initDataList?.(true);
  });
});
</script>

<style scoped>
.page-wrap {
  padding: 12px;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.stats-layout {
  display: flex;
  gap: 12px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}
.stats-aside {
  flex: 0 0 auto;
  width: auto;
  min-width: 220px;
  max-width: 320px;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.stats-aside :deep(.tree-panel) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 360px;
}
.stats-aside :deep(.el-card) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.stats-aside :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.stats-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.stats-table-flex {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.stats-table-flex :deep(> div) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.stats-main :deep(.data-table-header) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.stats-main :deep(.el-card) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.stats-main :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cell-tip {
  margin-left: 4px;
  vertical-align: middle;
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
