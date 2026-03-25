<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生岗位申请审核'"
    :no-project-message="'当前没有可审核的学生岗位申请'"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELECT_POST"
    @audit-click="handleAuditClick"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgPostDetail ref="dlgPostDetail" :current-internship="currentInternship" @close-dialog="handlePostDetailClose" />
      <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId" :process-info="currentRow" key-words="ViewVerifyProcessRelStuInternshipPost" />
      <DlgVerify ref="dlgVerifyRef" dlg-title="学生岗位申请审核" recall-title="退回已通过的学生岗位申请" @success="handleVerifySuccess" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, unref } from 'vue';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';

defineOptions({
  name: 'StuApplyPostVerify',
});

const headerPageRef = ref(null);
const dlgPostDetail = ref(null);
const dlgVerifyRef = ref(null);
const showProgressDialog = ref(false);
const currentRow = ref({});

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

const titleObj = reactive({
  mainTitle: '学生岗位申请审核',
});

const currentInternship = computed(() => {
  return unref(headerPageRef.value?.currentInternship) ?? null;
});

const isMore1Disabled = computed(() => {
  return unref(headerPageRef.value?.isMore1Disabled) ?? false;
});

function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

function handleProjectSelected(_internship, title) {
  if (title) {
    titleObj.mainTitle = title;
  }
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
  },
  clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: {
      audit: { show: true, showPass: true, showNotPass: true, showBack: true },
      update: { show: true, type: 'primary', name: '查看岗位详情' },
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelStuInternshipPostMerge' },
    allTableColumns: [
      { id: 1, showName: '学号', tableColumnName: 'account', sortable: true },
      { id: 2, showName: '学生姓名', tableColumnName: 'studentName', sortable: true },
      { id: 3, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
      { id: 4, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
      { id: 5, showName: '当前状态', tableColumnName: 'customize-status' },
      { id: 6, showName: '审核理由', tableColumnName: 'reason' },
    ],
  },
  initSearchWords: buildVerifySearchWords(),
  defaultDBIProps: {},
}));

function handleAuditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) dlgVerifyRef.value?.showDialog(true, selectedRow);
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgPostDetail.value?.showDialog(true, {}, selectedRow, true);
  }
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = row ? { ...row } : {};
  showProgressDialog.value = true;
}

function handleVerifySuccess() {
  headerPageRef.value?.baseListRef?.initDataList?.(true);
}

function handlePostDetailClose() {}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh?.(),
});
</script>
