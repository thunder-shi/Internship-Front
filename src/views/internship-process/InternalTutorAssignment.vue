<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    page-title="分配校内导师"
    no-project-message="当前没有可分配校内导师的实习项目"
    pending-select-message="当前实习项目：待选择"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    :process-type-code="processTypeCode"
    @project-selected="handleProjectSelected"
    @append-click="handleBatchSubmitClick"
    @submit-click="handleRowSubmitClick"
    @more2-click="handleSystemAssign"
  />
</template>

<script setup>
import { computed, ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';

defineOptions({
  name: 'InternalTutorAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ASSIGN_INTERNAL_TUTOR;
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
  mainTitle: '分配校内导师',
  withMajorFilter: false,
});

const assigning = ref(false);

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: true,
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
      more2: {
        show: true,
        name: '系统分配',
        type: 'warning',
        disabled: assigning.value,
      },
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
    ElMessage.success(
      isBatch ? `批量提交完成，共成功提交 ${successCount} 条记录` : '提交成功'
    );
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

async function handleSystemAssign() {
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
    });
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '系统分配失败');
      return;
    }
    ElMessage.success('系统分配成功');
    const baseListRef = unref(headerPageRef.value?.baseListRef);
    await baseListRef?.initDataList(true);
  } catch (error) {
    console.error('系统分配失败:', error);
    ElMessage.error('系统分配失败');
  } finally {
    assigning.value = false;
  }
}
</script>
