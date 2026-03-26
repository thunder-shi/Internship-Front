<template>
  <div class="internship-verify-container">
    <InternshipPostHeaderPage
      ref="headerPageRef"
      :page-title="pageTitle"
      :no-project-message="noProjectMessage"
      :project-select-search-key="projectSelectSearchKey"
      :project-select-reg-key="projectSelectRegKey"
      :default-d-t-l-props="defaultDTLProps"
      :build-search-key="buildSearchKey"
      :is-company-user="isCompanyUser"
      :process-type-code="processTypeCode"
      @audit-click="handleAuditClick"
      @audit-command="handleBatchAuditCommand"
      @edit-click="handleEditClick"
      @project-selected="handleProjectSelected"
    >
      <template #dialogs>
        <DlgVerify
          ref="dlgVerifyRef"
          :dlg-title="dlgTitle"
          :recall-title="recallTitle"
          @success="handleVerifySuccess"
        />
        <DlgInternshipDetail ref="dlgInternshipDetail" />
      </template>
    </InternshipPostHeaderPage>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgInternshipDetail from '@/views/dialogs/DlgInternshipDetail.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { ASSIGNMENT_KEY_WORD } from '../config/assignmentPresets';

defineOptions({
  name: 'AssignmentVerifyPage',
});

const props = defineProps({
  /** 页面标题，如「学生实习项目安排审核」 */
  pageTitle: { type: String, required: true },
  /** 无项目时的提示文案 */
  noProjectMessage: { type: String, required: true },
  /** 流程类型：STUDENT_SELECT_INTERNSHIP / TEACHER_SELECT_INTERNALSHIP */
  processTypeCode: { type: String, required: true },
  /** 审核弹窗标题 */
  dlgTitle: { type: String, required: true },
  /** 退回操作的标题文案 */
  recallTitle: { type: String, required: true },
  /** 表格列配置，来自 assignmentPresets 的 VERIFY_*_COLUMNS */
  tableColumns: { type: Array, required: true },
  /** 列表 keyWord，默认 RelIntershipUser 审核视图；分配校内导师等场景可覆写 */
  listKeyWord: {
    type: Object,
    default: null,
  },
  /** 与 buildVerifySearchWords 合并的额外查询（如 jobId） */
  initSearchWordsExtra: {
    type: Object,
    default: null,
  },
  /** buildSearchKey 中的 tableName，需与列表视图业务表一致 */
  assignmentTableName: {
    type: String,
    default: 'RelIntershipUser',
  },
});

const {
  headerPageRef,
  isCompanyUser,
  titleObj,
  isMore1Disabled,
  projectSelectSearchKey,
  projectSelectRegKey,
  buildSearchKey,
  handleProjectSelected,
} = useAssignmentPageConfig({
  processTypeCode: props.processTypeCode,
  mainTitle: props.pageTitle,
  withMajorFilter: false,
  assignmentTableName: props.assignmentTableName,
});

const dlgVerifyRef = ref(null);
const dlgInternshipDetail = ref(null);
/** 下拉选择的批量审核类型（仅选择不打开弹窗；点击主按钮时再打开弹窗并带此预选值） */
const lastBatchAuditCommand = ref(null);

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

const buttonPropsComputed = computed(() => ({
  more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
  audit: { show: true, showPass: true, showNotPass: true, showBack: true },
  update: { show: true, name: '查看详情' },
}));

function mergedInitSearchWords() {
  const base = buildVerifySearchWords();
  const extra = props.initSearchWordsExtra;
  if (!extra) return base;
  return {
    searchKey: { ...base.searchKey, ...(extra.searchKey || {}) },
    regKey: { ...base.regKey, ...(extra.regKey || {}) },
    andor: { ...base.andor, ...(extra.andor || {}) },
  };
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: { autoInit: false },
  clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  initSearchWords: mergedInitSearchWords(),
  defaultDTHProps: {
    buttonProps: buttonPropsComputed.value,
    keyWord: props.listKeyWord || ASSIGNMENT_KEY_WORD,
    allTableColumns: props.tableColumns,
  },
}));

function handleVerifySuccess() {
  // 审核完成后强制刷新列表：
  // 1) 优先直接刷新 DataTableList（不依赖 currentInternship.internshipId）
  // 2) 再兜底调用 updateSearchWordsAndRefresh（保持原有刷新路径）
  const baseList = headerPageRef.value?.baseListRef;
  baseList?.initDataList?.(true);
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
}

function handleAuditClick(row) {
  const rows = Array.isArray(row) ? row : row ? [row] : [];
  if (rows.length === 0) return;
  // 单条：打开审核弹窗；多条：打开同一弹窗并传入多行，若有下拉预选的审核类型则带入弹窗
  if (rows.length === 1) {
    dlgVerifyRef.value?.showDialog(true, rows[0]);
  } else {
    const pending = rows.filter((r) => r && r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT);
    if (!pending.length) {
      ElMessage.warning('选中的记录中没有待审核的数据');
      return;
    }
    const preSelected = lastBatchAuditCommand.value;
    dlgVerifyRef.value?.showDialog(true, pending[0], pending, preSelected);
    lastBatchAuditCommand.value = null;
  }
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) dlgInternshipDetail.value?.showDialog(true, selectedRow);
}

function handleBatchAuditCommand(command, _rows) {
  // 下拉项只负责“选择批量操作类型”，不打开弹窗；真正打开弹窗在点击主按钮时（handleAuditClick）
  lastBatchAuditCommand.value = command;
}
</script>
