<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="pageTitle"
    :no-project-message="noProjectMessage"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    @append-click="handleAppendClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleSubmitClick"
    @view-click="handleViewClick"
    @more2-click="handleBatchSubmitClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewRelIntershipUser"
      />
      <component
        :is="selectDialogComponent"
        ref="dlgSelectRef"
        :model-value="dlgSelectVisible"
        :current-internship="dlgSelectInternship"
        @update:model-value="dlgSelectVisible = $event"
        @success="onSelectSuccess"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { useAssignmentActions } from '@/utils/useAssignmentActions';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { ASSIGNMENT_KEY_WORD } from '../config/assignmentPresets';

defineOptions({
  name: 'AssignmentPage',
});

const props = defineProps({
  /** 页面标题，如「学生实习项目安排」 */
  pageTitle: { type: String, required: true },
  /** 无项目时的提示文案 */
  noProjectMessage: { type: String, required: true },
  /** 流程类型：STUDENT_SELECT_INTERNSHIP / TEACHER_SELECT_INTERNALSHIP */
  processTypeCode: { type: String, required: true },
  /** 表格列配置，来自 assignmentPresets */
  tableColumns: { type: Array, required: true },
  /** 选择弹窗组件：DlgStudentSelect 或 DlgTeacherSelect */
  selectDialogComponent: { type: Object, required: true },
});

const {
  headerPageRef,
  isCompanyUser,
  titleObj,
  isMore1Disabled,
  projectSelectSearchKey,
  projectSelectRegKey,
  buildSearchKey,
  handleProjectSelected: baseHandleProjectSelected,
} = useAssignmentPageConfig({
  processTypeCode: props.processTypeCode,
  mainTitle: props.pageTitle,
  withMajorFilter: true,
});

const currentInternship = computed(
  () => headerPageRef.value?.currentInternship?.value ?? null
);

const dlgSelectRef = ref(null);
const dlgSelectVisible = ref(false);
const dlgSelectInternship = ref(null);

const {
  currentRow,
  showProgressDialog,
  handleViewClick,
  handleDeleteClick,
  handleSubmitClick,
  handleBatchSubmitClick,
} = useAssignmentActions(() => headerPageRef.value?.baseListRef?.initDataList(true));

function onSelectSuccess() {
  headerPageRef.value?.baseListRef?.initDataList(true);
}

function handleProjectSelected(internship, title) {
  baseHandleProjectSelected(internship, title);
  dlgSelectInternship.value = internship;
}

const { getVerifyRoleName } = useVerifyFilter();

const buttonPropsComputed = computed(() => ({
  create: {
    show: true,
    disabled: !currentInternship.value || !currentInternship.value.internshipId,
  },
  submit: { show: true },
  delete: { show: true },
  visible: { show: true, type: 'primary', name: '查看进度' },
  more2: { show: true, name: '批量提交', type: 'primary' },
  more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
}));

const buttonCondition = {
  update: (row) => {
    const isAudit = row?.isAudit;
    return (
      isAudit === null ||
      isAudit === undefined ||
      isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
      isAudit === CONSTANT.AUDIT_STATUS.BACK
    );
  },
};

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: { autoInit: false },
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: buttonPropsComputed.value,
    buttonCondition,
    keyWord: ASSIGNMENT_KEY_WORD,
    allTableColumns: props.tableColumns,
  },
  defaultDBIProps: {},
}));

function handleAppendClick(currentInternshipParam) {
  if (!currentInternshipParam?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgSelectVisible.value = true;
  dlgSelectRef.value?.showDialog(true);
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () =>
    headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>
