<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'随机岗位分配'"
    :no-project-message="'当前没有可进行随机岗位分配的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :process-type-code="processTypeCode"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @project-selected="handleProjectSelected"
    @more2-click="handleBatchSubmitRowsClick"
    @more3-click="handleRandomAssign"
  />
</template>

<script setup>
import { computed, ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { useAssignmentActions } from '@/utils/useAssignmentActions';
import { useVerifyFilter } from '@/utils/useVerifyFilter';

defineOptions({
  name: 'RandomPostAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_ASSIGN_POST;

const headerPageRef = ref(null);
const randomAssignLoading = ref(false);
const { getVerifyRoleName } = useVerifyFilter();

const {
  titleObj,
  isMore1Disabled,
  projectSelectSearchKey,
  projectSelectRegKey,
  handleProjectSelected: baseHandleProjectSelected,
} = useAssignmentPageConfig({
  processTypeCode,
  mainTitle: '随机岗位分配',
  withMajorFilter: true,
});

const refreshList = () => headerPageRef.value?.baseListRef?.initDataList(true);

const { handleBatchSubmitClick: batchSubmitVerifyProcess } = useAssignmentActions(refreshList);

function toSubmitRow(row) {
  const verifyProcessId = resolveVerifyProcessId(row);
  if (!verifyProcessId) return null;
  return { ...row, id: verifyProcessId };
}

function handleBatchSubmitRowsClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  const pendingRows = rowsArray
    .map(toSubmitRow)
    .filter((row) => row && row.isAudit === CONSTANT.AUDIT_STATUS.SAVE);
  if (!pendingRows.length) {
    ElMessage.warning(`选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可提交的记录`);
    return;
  }
  batchSubmitVerifyProcess(pendingRows);
}

const currentInternship = computed(() => unref(headerPageRef.value?.currentInternship) ?? null);

const SELECTION_STATUS_LABELS = {
  notSelected: '未选岗位',
  selectedPendingAudit: '已选岗待审核',
  postApproved: '岗位已通过',
};

function pickFirstNonEmpty(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function resolveVerifyProcessId(row) {
  const id = pickFirstNonEmpty(row, [
    'verifyProcessId',
    'verify_process_id',
    'mainVerifyProcessId',
    'main_verify_process_id',
  ]);
  const num = Number(id);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function selectionStatusLabel(value) {
  return SELECTION_STATUS_LABELS[value] || value || '—';
}

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

function buildSearchKey(baseSearchKey) {
  return {
    internshipId: baseSearchKey.internshipId,
  };
}

function handleProjectSelected(internship, title) {
  baseHandleProjectSelected(internship, title);
}

async function fetchStudentPostRecords(params) {
  const internshipId = Number(
    currentInternship.value?.internshipId ??
      currentInternship.value?.id ??
      params?.searchKey?.internshipId ??
      0
  );
  if (!internshipId) {
    return {
      data: { content: [], totalElements: 0, page: { totalElements: 0 } },
    };
  }

  const res = await internshipProcessAPI.getExternalInternshipStudentPostBreakdown({
    internshipId,
    status: 'all',
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  });
  const data = unwrapPayload(res);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const page = params.pageInfo.page;
  const size = params.pageInfo.size;
  const total = Number(data.totalElements ?? rows.length ?? 0);
  const content = rows.map((row, idx) => {
    const verifyProcessId = resolveVerifyProcessId(row);
    const userId = row?.userId ?? row?.studentId;
    return {
      ...row,
      id:
        verifyProcessId ??
        row?.id ??
        (userId != null
          ? `u${userId}_${row?.internshipPostId ?? idx}_${page}`
          : `stu-${page}-${idx}`),
      verifyProcessId,
      selectionStatusText: selectionStatusLabel(row?.selectionStatus),
      studentName: row?.studentName ?? row?.userName ?? row?.name,
      studentAccount: row?.studentAccount ?? row?.account,
    };
  });

  return {
    data: {
      content,
      totalElements: total,
      page: { totalElements: total },
    },
  };
}

async function handleRandomAssign() {
  const cur = currentInternship.value;
  const internshipId = Number(cur?.internshipId ?? cur?.id ?? 0);
  if (!internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }

  randomAssignLoading.value = true;
  try {
    const res = await internshipProcessAPI.randomAssignPostsForUnselectedStudents({
      internshipId,
    });
    if (res?.message === 'successful') {
      ElMessage.success('随机分配成功');
      refreshList();
    } else {
      ElMessage.warning(res?.message || '随机分配失败');
    }
  } catch (error) {
    console.error('随机分配失败:', error);
    ElMessage.error('随机分配失败');
  } finally {
    randomAssignLoading.value = false;
  }
}

const isMore1DisabledRef = computed(() => isMore1Disabled.value);

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: true,
    operateShow: false,
  },
  fetchRecords: fetchStudentPostRecords,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: {
      more1: { show: true, name: '实习项目选择', disabled: isMore1DisabledRef.value },
      more3: {
        show: true,
        name: '随机分配',
        type: 'primary',
        disabled: !currentInternship.value?.internshipId || randomAssignLoading.value,
      },
      submit: { show: false },
      visible: { show: false },
      more2: { show: true, name: '批量提交', type: 'primary' },
      more5: { show: false },
      create: { show: false },
      update: { show: false },
      delete: { show: false },
    },
    keyWord: {
      edit: 'MainVerifyProcess',
      view: 'ViewVerifyProcessRelStuInternshipPostMerge',
    },
    allTableColumns: [
      { id: 1, showName: '学号', tableColumnName: 'account', sortable: true },
      { id: 2, showName: '学生姓名', tableColumnName: 'studentName', sortable: true },
      {
        id: 3,
        showName: '学院/部门',
        tableColumnName: 'departmentName',
        sortable: true,
      },
      { id: 4, showName: '岗位', tableColumnName: 'internshipPostName', sortable: true },
      { id: 5, showName: '公司', tableColumnName: 'companyName', sortable: true },
      {
        id: 6,
        showName: '选岗状态',
        tableColumnName: 'selectionStatusText',
        sortable: false,
      },
      { id: 7, showName: '审核状态', tableColumnName: 'customize-status', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh?.(),
});
</script>
