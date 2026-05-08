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
    @more3-click="handleBatchAppendClick"
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
      <el-dialog
        v-model="batchDialogVisible"
        title="批量新增学生"
        width="420px"
        append-to-body
        :close-on-click-modal="false"
      >
        <el-form label-width="90px">
          <el-form-item label="部门选择" required>
            <SimpleTreeSelect
              v-model="selectedDepartmentIds"
              key-words="ViewBaseDepartment"
              :search-keys="departmentSearchKeys"
              :multiple="true"
              :check-strictly="false"
              :lazy="true"
              placeholder="请选择部门（可多选）"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="batchDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="batchAppendLoading" @click="handleBatchDialogConfirm">
            确定
          </el-button>
        </template>
      </el-dialog>
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';
import CONSTANT from '@/utils/constant';
import otherAPI from '@/api/other';
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
  /** 是否显示表头「批量新增」（按部门批量初始化学生名单） */
  showBatchAppend: { type: Boolean, default: true },
});
const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

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

const currentInternship = computed(() => {
  const exposedInternship = headerPageRef.value?.currentInternship;
  // 兼容组件 expose 返回 ref 或已解包对象两种场景
  return exposedInternship?.value ?? exposedInternship ?? null;
});

const dlgSelectRef = ref(null);
const dlgSelectVisible = ref(false);
const dlgSelectInternship = ref(null);
const batchDialogVisible = ref(false);
const batchAppendLoading = ref(false);
const selectedDepartmentIds = ref([]);
const departmentSearchKeys = computed(() => {
  const searchKey = {};
  if (userInfo.value.schoolId) {
    searchKey.schoolId = userInfo.value.schoolId;
  }
  return searchKey;
});

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
  more3: {
    show: props.showBatchAppend,
    name: '批量新增',
    type: 'primary',
    disabled: !currentInternship.value || !currentInternship.value.internshipId,
  },
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

function handleBatchAppendClick() {
  if (!currentInternship.value?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  selectedDepartmentIds.value = [];
  batchDialogVisible.value = true;
}

async function handleBatchDialogConfirm() {
  if (!Array.isArray(selectedDepartmentIds.value) || selectedDepartmentIds.value.length === 0) {
    ElMessage.warning('请至少选择一个部门');
    return;
  }
  const internshipId = Number(currentInternship.value?.internshipId);
  const processId = Number(currentInternship.value?.realId);
  const verifyRoleId = Number(currentInternship.value?.verifyFirstRoleId);
  const createUserId = Number(userInfo.value?.id);
  const currentVerifyTypeId =
    currentInternship.value?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('缺少 internshipId，无法批量新增');
    return;
  }
  if (!processId || Number.isNaN(processId)) {
    ElMessage.warning('缺少 processId，无法批量新增');
    return;
  }
  if (!createUserId || Number.isNaN(createUserId)) {
    ElMessage.warning('缺少 createUserId，无法批量新增');
    return;
  }
  const departmentId = selectedDepartmentIds.value
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));
  if (!departmentId.length) {
    ElMessage.warning('部门参数无效，请重新选择');
    return;
  }

  batchAppendLoading.value = true;
  try {
    const res = await otherAPI.batchInitRelIntershipUserFromAvailable({
      internshipId,
      jobCode: 'STUDENT',
      departmentId,
      processId,
      createUserId,
      verifyRoleId,
      currentVerifyTypeId,
    });
    if (!res || res.message !== 'successful') {
      ElMessage.error(res?.message || '批量新增失败');
      return;
    }
    ElMessage.success('批量新增成功');
    batchDialogVisible.value = false;
    headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('批量新增失败:', error);
    ElMessage.error('批量新增失败');
  } finally {
    batchAppendLoading.value = false;
  }
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>
