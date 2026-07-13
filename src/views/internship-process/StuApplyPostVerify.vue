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
    @audit-command="handleBatchAuditCommand"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgPostDetail
        ref="dlgPostDetail"
        :current-internship="currentInternship"
        @close-dialog="handlePostDetailClose"
      />
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewVerifyProcessRelStuInternshipPost"
      />
      <DlgVerify
        ref="dlgVerifyRef"
        dlg-title="学生岗位申请审核"
        recall-title="退回已通过的学生岗位申请"
        @success="handleVerifySuccess"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, unref } from 'vue';
import { ElMessage } from 'element-plus';
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
      { id: 1, showName: '学号', tableColumnName: 'studentAccount', sortable: true },
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

/** 下拉选择的批量审核类型 */
const lastBatchAuditCommand = ref(null);

function handleAuditClick(row) {
  const rows = Array.isArray(row) ? row : row ? [row] : [];
  if (rows.length === 0) return;
  // 单条：打开审核弹窗；多条：打开同一弹窗并传入多行，若有下拉预选的审核类型则带入弹窗
  if (rows.length === 1) {
    dlgVerifyRef.value?.showDialog(true, rows[0]);
  } else {
    const preSelected = lastBatchAuditCommand.value;
    const targetRows = rows.filter((r) => {
      if (!r) return false;
      // 退回：待审核、已通过均可（与操作栏单条审核一致）
      if (preSelected === CONSTANT.AUDIT_STATUS.BACK) {
        return r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT || r.isAudit === CONSTANT.AUDIT_STATUS.PASS;
      }
      return r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT;
    });

    if (!targetRows.length) {
      ElMessage.warning(
        preSelected === CONSTANT.AUDIT_STATUS.BACK
          ? '选中的记录中没有待审核或已通过的数据可退回'
          : '选中的记录中没有待审核的数据'
      );
      return;
    }

    dlgVerifyRef.value?.showDialog(true, targetRows[0], targetRows, preSelected);
    lastBatchAuditCommand.value = null;
  }
}

function handleBatchAuditCommand(command, _rows) {
  lastBatchAuditCommand.value = command;
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
