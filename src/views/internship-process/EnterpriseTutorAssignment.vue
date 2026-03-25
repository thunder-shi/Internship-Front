<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    page-title="分配企业导师"
    no-project-message="当前没有可分配企业导师的实习项目"
    pending-select-message="当前实习项目：待选择"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    :process-type-code="processTypeCode"
    @project-selected="handleProjectSelectedWrap"
    @append-click="handleBatchSubmitClick"
    @submit-click="handleRowSubmitClick"
    @after-init-data="handleListAfterInit"
  >
    <template #rightOperate="{ row }">
      <el-button
        type="primary"
        size="small"
        title="分配企业导师"
        @click="openAssignEnterpriseTutor(row)"
      >
        分配企业导师
      </el-button>
    </template>
    <template #dialogs>
      <SimpleDialog
        ref="assignDlgRef"
        :default-props="assignDialogProps"
        :simpledialog-confirm="confirmAssignEnterpriseTutor"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { computed, reactive, ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';

defineOptions({
  name: 'EnterpriseTutorAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_ASSIGN_TUTOR;
const store = useStore();

const {
  headerPageRef,
  isCompanyUser,
  titleObj,
  projectSelectSearchKey,
  projectSelectRegKey,
  isMore1Disabled,
  handleProjectSelected,
  buildSearchKey: baseBuildSearchKey,
} = useAssignmentPageConfig({
  processTypeCode,
  mainTitle: '分配企业导师',
  withMajorFilter: false,
});

const assigning = ref(false);
/** 每个实习项目仅自动触发一次系统分配，避免空列表时反复请求 */
const autoAssignLocked = ref(false);

const assignDlgRef = ref(null);
const assignTargetRow = ref(null);

const assignDialogProps = reactive({
  dlgTitle: '分配企业导师',
  keyWord: ' ',
  formItems: [
    {
      name: '企业导师',
      field: 'teacherId',
      type: 'select_noremote',
      options: [],
    },
  ],
  formRules: {
    teacherId: [{ required: true, message: '请选择企业导师', trigger: 'change' }],
  },
  defaultDBProps: {
    footButtons: {
      repeatAdd: { show: false },
    },
  },
});

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: true,
  },
  // 列表：jobId 不等于 3（与「分配校内导师」中 jobId=3 区分开）
  initSearchWords: {
    searchKey: { jobId: 3 },
    regKey: { jobId: CONSTANT.SEARCH_OPERATOR.NE },
  },
  defaultDTHProps: {
    keyWord: {
      edit: 'RelTeacherStudent',
      view: 'ViewVerifyProcessRelTeacherStudentMerge',
    },
    buttonProps: {
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
      create: { show: true, name: '批量提交', type: 'primary' },
      submit: { show: true, name: '提交', type: 'warning' },
      more2: { show: false },
    },
    buttonCondition: {
      submit: (row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE,
    },
    allTableColumns: [
      { id: 1, showName: '教师名称', tableColumnName: 'teacherName', sortable: true },
      { id: 2, showName: '实习岗位', tableColumnName: 'relInternshipName', sortable: true },
      { id: 3, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      { id: 4, showName: '状态', tableColumnName: 'customize-status', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

function buildSearchKey(baseSearchKey) {
  return {
    ...baseBuildSearchKey(baseSearchKey),
    internshipId: baseSearchKey?.internshipId,
    tableName: 'RelTeacherStudent',
  };
}

function handleProjectSelectedWrap(internship, title) {
  autoAssignLocked.value = false;
  handleProjectSelected(internship, title);
}

function getSubmitStatus(row) {
  return row?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
    ? CONSTANT.AUDIT_STATUS.PASS
    : CONSTANT.AUDIT_STATUS.SUBMIT;
}

async function updateVerifyProcessStatus(rows, isBatch = false) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  const pendingRows = rowsArray.filter((row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE);

  if (!pendingRows.length) {
    ElMessage.warning(
      isBatch
        ? `选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可以提交的记录`
        : '该记录已提交，不能再次提交'
    );
    return;
  }

  let successCount = 0;
  for (const row of pendingRows) {
    try {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id,
        isAudit: getSubmitStatus(row),
      });
      if (resInfo && resInfo.message === 'successful') {
        successCount += 1;
      } else {
        ElMessage.warning(resInfo?.message || '更新审核状态失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  }

  if (successCount > 0) {
    ElMessage.success(isBatch ? `批量提交完成，共成功提交 ${successCount} 条记录` : '提交成功');
    const baseListRef = unref(headerPageRef.value?.baseListRef);
    await baseListRef?.initDataList(true);
  }
}

function handleRowSubmitClick(row) {
  void updateVerifyProcessStatus(row, false);
}

function handleBatchSubmitClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  if (!rowsArray.length) {
    ElMessage.warning('请先勾选需要提交的记录');
    return;
  }
  void updateVerifyProcessStatus(rowsArray, true);
}

/** 与「分配校内导师」页中系统分配逻辑一致，用于无数据时自动生成师生关系 */
async function runSystemAssign() {
  const currentInternship = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(currentInternship?.internshipId ?? currentInternship?.id);
  const processId = Number(
    currentInternship?.processId ?? currentInternship?.realId ?? currentInternship?.id
  );
  const createUserId = Number(store.getters.userInfo?.id);
  const verifyRoleId = currentInternship?.verifyFirstRoleId;

  if (assigning.value) return;

  assigning.value = true;
  try {
    const verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
    });
    const verifyUserId = verifyResp?.data ?? verifyResp;
    const res = await internshipProcessAPI.initTeacherStudentByInternshipId({
      internshipId,
      processId,
      createUserId,
      verifyUserId,
      tutorAssignKind: 2,
    });
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '自动系统分配失败');
      return;
    }
    ElMessage.success('已自动系统分配，正在刷新列表');
    const baseListRef = unref(headerPageRef.value?.baseListRef);
    await baseListRef?.initDataList(true);
  } catch (error) {
    console.error('自动系统分配失败:', error);
    ElMessage.error('自动系统分配失败');
  } finally {
    assigning.value = false;
  }
}

async function handleListAfterInit(dataList) {
  if (!Array.isArray(dataList) || dataList.length > 0) return;
  const cur = unref(headerPageRef.value?.currentInternship);
  if (!cur?.internshipId) return;
  if (autoAssignLocked.value) return;
  autoAssignLocked.value = true;
  await runSystemAssign();
}

async function openAssignEnterpriseTutor(row) {
  assignTargetRow.value = row;
  const schoolId = store.getters.userInfo?.schoolId;
  if (schoolId === undefined || schoolId === null || schoolId === '') {
    ElMessage.warning('当前账号缺少 schoolId，无法筛选企业导师');
    return;
  }
  const relId = row?.relationId;
  if (!relId) {
    ElMessage.warning('当前行缺少 relationId，无法更新师生关系');
    return;
  }

  try {
    const resp = await listAPI.getSomeRecords({
      keyWords: 'ViewBaseUser',
      searchKey: { jobId: 4, schoolId },
      reg: {
        jobId: CONSTANT.SEARCH_OPERATOR.EQ,
        schoolId: CONSTANT.SEARCH_OPERATOR.EQ,
      },
    });
    const list = resp?.data?.content || [];
    if (!list.length) {
      ElMessage.warning('未找到符合条件的用户（岗位 jobId=4 且 schoolId 与当前操作人一致）');
      return;
    }
    assignDialogProps.formItems[0].options = list.map((u) => ({
      id: u.id,
      name: u.name || u.account || String(u.id),
    }));
    assignDlgRef.value?.showDialog(true, {}, true);
  } catch (error) {
    console.error('加载企业导师列表失败:', error);
    ElMessage.error('加载企业导师列表失败');
  }
}

async function confirmAssignEnterpriseTutor(_option, _type, form) {
  const row = assignTargetRow.value;
  const relId = row?.relationId;
  if (!relId) {
    ElMessage.warning('缺少 relationId');
    return false;
  }
  const teacherId = form?.teacherId;
  if (teacherId === undefined || teacherId === null || teacherId === '') {
    ElMessage.warning('请选择企业导师');
    return false;
  }

  try {
    const res = await listAPI.editOneNode('RelTeacherStudent', {
      id: relId,
      teacherId,
    });
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '保存失败');
      return false;
    }
    ElMessage.success('分配成功');
    const baseListRef = unref(headerPageRef.value?.baseListRef);
    await baseListRef?.initDataList(true);
    return true;
  } catch (error) {
    console.error('保存企业导师失败:', error);
    return false;
  }
}
</script>
