<template>
  <div class="int-internship-college-stats page-wrap">
    <div class="stats-layout">
      <aside class="stats-aside">
        <DataTree ref="dataTreeRef" :default-props="treeProps" @node-click="handleNodeClick" />
      </aside>
      <main class="stats-main">
        <div class="stats-scope-bar">
          <span class="scope-label">统计范围</span>
          <el-radio-group v-model="statsScope" size="small" @change="onStatsScopeChange">
            <el-radio-button label="school">全校</el-radio-button>
            <el-radio-button label="college">本学院（账号归属）</el-radio-button>
            <el-radio-button label="tree">左侧部门树</el-radio-button>
          </el-radio-group>
        </div>
        <DataTableList
          ref="dataTableListRef"
          :default-props="defaultDTLProps"
          :fetch-records="fetchCollegeStats"
        >
          <template #rightOperate="{ row }">
            <el-button type="primary" size="small" title="项目详情" @click="goProjectDetail(row)">
              <svg-icon icon-class="axt-view" />
            </el-button>
          </template>
        </DataTableList>
      </main>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import internshipProcessAPI from '@/api/internshipProcess';
import CONSTANT from '@/utils/constant';
import {
  fetchSchoolRootDepartmentId,
  resolveCollegeScopeDepartmentId,
} from '@/utils/internshipStatsDepartment';

defineOptions({
  name: 'IntInternshipCollegeStats',
});

const router = useRouter();
const route = useRoute();
const store = useStore();

const userInfo = computed(() => store.getters.userInfo || {});

const dataTreeRef = ref(null);
const dataTableListRef = ref(null);

const selectedDepartmentId = ref(null);

/** school | college | tree — 接口 departmentId 为子树根 id，勿直接使用挂在班级上的用户 departmentId */
const statsScope = ref('college');

const titleState = reactive({
  mainTitle: '校内实习报名统计',
  subTitle: '',
});

const treeProps = computed(() => {
  const searchKey = {};
  const regKey = {};
  if (userInfo.value.schoolId) {
    searchKey.schoolId = userInfo.value.schoolId;
    regKey.schoolId = CONSTANT.SEARCH_OPERATOR.EQ;
  }
  return {
    title: { mainTitle: '单位部门' },
    keyWord: 'BaseDepartment',
    checkFlag: false,
    sort: { properties: 'theOrder', direction: 'ASC' },
    initSearchWords: {
      searchKey,
      regKey,
      andor: {},
    },
  };
});

const defaultDTLProps = reactive({
  keyWord: { view: 'IntInternshipCollegeStats' },
  title: titleState,
  bottomOffset: 80,
  sortStr: { properties: 'internshipId', direction: 'DESC' },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
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
    keyWord: { view: 'IntInternshipCollegeStats' },
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
        id: 2,
        showName: '报名学生数',
        tableColumnName: 'signupStudentCount',
        sortable: false,
        width: 110,
      },
      {
        id: 3,
        showName: '报名老师数',
        tableColumnName: 'signupTeacherCount',
        sortable: false,
        width: 110,
      },
      {
        id: 4,
        showName: '题目审核通过数量',
        tableColumnName: 'titleApprovedCount',
        sortable: false,
        width: 140,
      },
      {
        id: 5,
        showName: '尚未提交题目的老师数',
        tableColumnName: 'teachersNotSubmittedTopicCount',
        sortable: false,
        width: 160,
      },
      {
        id: 6,
        showName: '选题通过的学生数',
        tableColumnName: 'studentsTitleApprovedCount',
        sortable: false,
        width: 140,
      },
      {
        id: 7,
        showName: '选题审核中的学生数',
        tableColumnName: 'studentsTitlePendingCount',
        sortable: false,
        width: 150,
      },
      {
        id: 8,
        showName: '尚未选题的学生数',
        tableColumnName: 'studentsNotSelectedTitleCount',
        sortable: false,
        width: 140,
      },
    ],
  },
});

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

async function fetchCollegeStats(params) {
  const departmentId = selectedDepartmentId.value;
  if (departmentId == null || departmentId === '') {
    ElMessage.warning('请选择统计范围（全校 / 本学院）或在左侧部门树选择节点');
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { totalElements: 0 },
      },
    };
  }

  const res = await internshipProcessAPI.listInternalInternshipCollegeStats({
    departmentId: Number(departmentId),
    pageInfo: {
      page: params.pageInfo.page,
      size: params.pageInfo.size,
    },
  });
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
}

function handleNodeClick(node) {
  if (!node || node.id === -1) return;
  statsScope.value = 'tree';
  selectedDepartmentId.value = node.id;
  titleState.subTitle = node.name ? `部门树：${node.name}` : `部门树 ID：${node.id}`;
  dataTableListRef.value?.initDataList?.(true);
}

async function applyStatsScope(scope) {
  const uid = userInfo.value.departmentId;
  if (scope === 'school') {
    const id = await fetchSchoolRootDepartmentId(userInfo.value);
    selectedDepartmentId.value = id;
    titleState.subTitle = id != null ? `全校：学校根 departmentId=${id}` : '未能解析学校根，请检查部门数据';
    return;
  }
  if (scope === 'college') {
    if (uid == null || uid === '') {
      selectedDepartmentId.value = null;
      titleState.subTitle = '本学院：账号未绑定部门，请改选「全校」或左侧树';
      return;
    }
    const id = await resolveCollegeScopeDepartmentId(uid);
    selectedDepartmentId.value = id;
    titleState.subTitle =
      id != null ? `本学院：按账号部门解析为 departmentId=${id}` : '本学院：解析失败，请使用左侧树选择';
    return;
  }
  // tree：仅刷新列表，id 由点击树维护
  if (selectedDepartmentId.value != null && selectedDepartmentId.value !== '') {
    titleState.subTitle = '按左侧部门树所选节点';
  }
}

async function onStatsScopeChange(scope) {
  await applyStatsScope(scope);
  dataTableListRef.value?.initDataList?.(true);
}

function pathWithLastSegment(segment) {
  const parts = route.path.split('/').filter(Boolean);
  if (parts.length) parts[parts.length - 1] = segment;
  return `/${parts.join('/')}`;
}

function goProjectDetail(row) {
  const id = row?.internshipId;
  if (id == null) {
    ElMessage.warning('缺少 internshipId');
    return;
  }
  const name = row?.internshipName ?? '';
  const dept = selectedDepartmentId.value;
  router.push({
    path: pathWithLastSegment('IntInternshipProjectDetail'),
    query: {
      internshipId: String(id),
      internshipName: name,
      ...(dept != null && dept !== '' ? { departmentId: String(dept) } : {}),
    },
  });
}

onMounted(async () => {
  await applyStatsScope(statsScope.value);
  if (statsScope.value === 'college' && selectedDepartmentId.value == null) {
    statsScope.value = 'school';
    await applyStatsScope('school');
  }

  nextTick(() => {
    dataTreeRef.value?.initDataTree?.();
    dataTableListRef.value?.initDataList?.(true);
  });
});
</script>

<style scoped>
.page-wrap {
  padding: 12px;
  height: 100%;
  box-sizing: border-box;
}
.stats-layout {
  display: flex;
  gap: 12px;
  align-items: stretch;
  min-height: calc(100vh - 120px);
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
.stats-scope-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 10px;
  padding: 8px 10px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
.stats-scope-bar .scope-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
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
</style>
