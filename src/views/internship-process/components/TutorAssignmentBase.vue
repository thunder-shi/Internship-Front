<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="pageTitle"
    :no-project-message="noProjectMessage"
    :pending-select-message="pendingSelectMessage"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    :process-type-code="processTypeCode"
    @project-selected="handleProjectSelectedWrap"
    @append-click="handleBatchSubmitClick"
    @submit-click="handleRowSubmitClick"
    @more2-click="handleBatchSubmitClick"
    @more3-click="handleSystemAssign"
    @after-init-data="handleListAfterInit"
    @view-click="handleViewClick"
  >
    <template #rightOperate="{ row }">
      <slot name="rightOperate" :row="row" />
    </template>
    <template #dialogs>
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        :key-words="progressKeyWords"
      />
      <slot name="dialogsExtra" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { computed, reactive, ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { useVerifyFilter } from '@/utils/useVerifyFilter';

const props = defineProps({
  processTypeCode: { type: String, required: true },
  pageTitle: { type: String, required: true },
  noProjectMessage: { type: String, required: true },
  pendingSelectMessage: { type: String, default: '当前实习项目：待选择' },
  mainTitle: { type: String, required: true },
  initSearchWords: { type: Object, required: true },
  progressKeyWords: { type: String, default: 'ViewVerifyProcessRelTeacherStudent' },

  systemAssignMode: {
    type: String,
    default: 'manual', // 'manual' | 'autoOnEmpty'
    validator: (v) => ['manual', 'autoOnEmpty'].includes(v),
  },
  tutorAssignKind: { type: Number, default: null }, // Enterprise=2；Internal 默认不传

  // submit 按钮行条件，满足则可提交
  submitRowCondition: { type: Function, default: null },
});

defineOptions({
  name: 'TutorAssignmentBase',
});

const store = useStore();
const { getVerifyRoleName } = useVerifyFilter();

const autoAssignLocked = ref(false);
const assigning = ref(false);

const showProgressDialog = ref(false);
const currentRow = reactive({});

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
  processTypeCode: props.processTypeCode,
  mainTitle: props.mainTitle,
  withMajorFilter: false,
});

const buildSearchKey = (baseSearchKey) => {
  return {
    ...baseBuildSearchKey(baseSearchKey),
    internshipId: baseSearchKey?.internshipId,
    tableName: 'RelTeacherStudent',
  };
};

function handleProjectSelectedWrap(internship, title) {
  if (props.systemAssignMode === 'autoOnEmpty') {
    autoAssignLocked.value = false;
  }
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
  const allowedRows = props.submitRowCondition
    ? pendingRows.filter((row) => props.submitRowCondition(row))
    : pendingRows;

  if (!pendingRows.length) {
    ElMessage.warning(
      isBatch
        ? `选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可以提交的记录`
        : '该记录已提交，不能再次提交'
    );
    return;
  }
  if (pendingRows.length > 0 && allowedRows.length === 0) {
    ElMessage.warning(isBatch ? '选中的记录不满足提交条件' : '当前记录不满足提交条件');
    return;
  }

  let successCount = 0;
  for (const row of allowedRows) {
    try {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id,
        isAudit: getSubmitStatus(row),
      });
      if (resInfo && resInfo.message === 'successful') successCount += 1;
      else ElMessage.warning(resInfo?.message || '更新审核状态失败');
    } catch (error) {
      console.error('提交失败:', error);
    }
  }

  if (successCount > 0) {
    ElMessage.success(isBatch ? `批量提交完成，共成功提交 ${successCount} 条记录` : '提交成功');
    await headerPageRef.value?.baseListRef?.initDataList(true);
  }
}

function handleRowSubmitClick(row) {
  void updateVerifyProcessStatus(row, false);
}

function handleBatchSubmitClick(rows) {
  void updateVerifyProcessStatus(rows, true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  Object.keys(currentRow).forEach((k) => delete currentRow[k]);
  Object.assign(currentRow, row ? { ...row } : {});
  showProgressDialog.value = true;
}

async function runSystemAssign() {
  const cur = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  const processId = Number(cur?.processId ?? cur?.realId ?? cur?.id);
  const createUserId = Number(store.getters.userInfo?.id);
  const verifyRoleId = cur?.verifyFirstRoleId;
  const currentVerifyTypeId =
    cur?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;

  if (assigning.value) return;
  assigning.value = true;

  try {
    const verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
      // 部分业务（如企业导师分配）需要基于当前实习项目获取审核人
      internshipId,
    });
    const verifyUserId = verifyResp?.data ?? verifyResp;

    const payload = {
      internshipId,
      processId,
      createUserId,
      verifyUserId,
      currentVerifyTypeId,
    };
    if (props.tutorAssignKind != null) payload.tutorAssignKind = props.tutorAssignKind;

    const res = await internshipProcessAPI.initTeacherStudentByInternshipId(payload);
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '系统分配失败');
      return;
    }

    ElMessage.success('系统分配成功');
    await headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('系统分配失败:', error);
    ElMessage.error('系统分配失败');
  } finally {
    assigning.value = false;
  }
}

function handleSystemAssign() {
  void runSystemAssign();
}

async function handleListAfterInit(dataList) {
  if (props.systemAssignMode !== 'autoOnEmpty') return;
  if (!Array.isArray(dataList) || dataList.length > 0) return;
  if (autoAssignLocked.value) return;
  autoAssignLocked.value = true;
  await runSystemAssign();
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  someFlags: { autoInit: false, checkFlag: true },
  initSearchWords: props.initSearchWords,
  defaultDTHProps: {
    keyWord: { edit: 'RelTeacherStudent', view: 'ViewVerifyProcessRelTeacherStudentMerge' },
    buttonProps: {
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
      create: { show: false, name: '批量提交', type: 'primary' },
      submit: { show: true, name: '提交', type: 'warning' },
      visible: { show: true, type: 'primary', name: '查看进度' },
      more3:
        props.systemAssignMode === 'manual'
          ? {
              show: true,
              name: '系统分配',
              type: 'warning',
              disabled: assigning.value,
            }
          : { show: false },
      more2: {
        show: true,
        name: '批量提交',
        type: 'primary',
      },
    },
    buttonCondition: {
      submit: props.submitRowCondition || ((row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE),
    },
    allTableColumns: [
      { id: 1, showName: '教师名称', tableColumnName: 'teacherName', sortable: true },
      { id: 1, showName: '学生名称', tableColumnName: 'studentName', sortable: true },
      { id: 2, showName: '实习岗位', tableColumnName: 'internshipPostName', sortable: true },
      { id: 3, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      { id: 4, showName: '状态', tableColumnName: 'customize-status', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

defineExpose({
  refreshList: () => headerPageRef.value?.baseListRef?.initDataList(true),
});
</script>
