<template>
  <div class="termination-verify-page">
    <DataTableList
      ref="dtlRef"
      :default-props="defaultDTLProps"
      :fetch-records="fetchAuditRecords"
      :row-selectable-fn="rowSelectableFn"
      @audit-click="handleAuditClick"
      @audit-command="handleBatchAuditCommand"
      @edit-click="handleEditClick"
      @view-click="handleViewClick"
    />

    <DlgVerify
      ref="dlgVerifyRef"
      dlg-title="终止学生实习审核"
      recall-title="退回已通过的终止申请"
      :audit-api="terminationAPI.audit"
      @success="handleVerifySuccess"
    />

    <DlgInternshipTerminationDetail
      v-model="detailDialogVisible"
      :loading="detailLoading"
      :detail="detailInfo"
    />

    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="currentRow.internshipId"
      :process-info="currentRow"
      key-words="MainVerifyProcess"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DlgInternshipTerminationDetail from '@/views/internship-process/components/DlgInternshipTerminationDetail.vue';
import terminationAPI from '@/api/internshipTermination';
import listAPI from '@/api/list';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { useBatchVerifyAuditDialog } from '@/utils/useBatchVerifyAuditDialog';
import CONSTANT from '@/utils/constant';

defineOptions({ name: 'StudentInternshipTerminationVerify' });

const TERMINATION_TABLE_NAME = 'MainInternshipTermination';
const TERMINATION_VERIFY_MERGE_VIEW = 'ViewVerifyStudentInternshipTerminationMerge';

const dtlRef = ref(null);
const dlgVerifyRef = ref(null);
const showProgressDialog = ref(false);
const currentRow = ref({});

const detailDialogVisible = ref(false);
const detailLoading = ref(false);
const detailInfo = ref({});

const titleObj = reactive({ mainTitle: '终止学生实习审核' });

const { clientFilterFn: verifyClientFilterFn, getVerifyRoleName } = useVerifyFilter();
const { handleBatchAuditCommand, handleAuditClick } = useBatchVerifyAuditDialog(dlgVerifyRef);

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: true,
    checkFlag: true,
    showPage: true,
  },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  sortStr: { properties: 'id', direction: 'DESC' },
  fetchRecords: fetchAuditRecords,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: {
      audit: { show: true, showPass: true, showNotPass: true, showBack: true },
      update: { show: true, type: 'primary', name: '查看详情' },
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      buttonGroup: { show: true },
    },
    buttonCondition: {
      audit: (row) => !isAutoPassedTermination(row),
    },
    keyWord: { edit: 'MainVerifyProcess', view: TERMINATION_VERIFY_MERGE_VIEW },
    allTableColumns: [
      { id: 1, showName: '学生', tableColumnName: 'studentName', sortable: true, width: 110 },
      { id: 2, showName: '学号', tableColumnName: 'studentAccount', sortable: true, width: 130 },
      { id: 3, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      { id: 4, showName: '类型', tableColumnName: 'internshipModeName', sortable: true, width: 100 },
      { id: 5, showName: '终止日期', tableColumnName: 'terminateDate', sortable: true, width: 130 },
      { id: 6, showName: '原因类型', tableColumnName: 'reasonType', sortable: true, width: 110 },
      { id: 7, showName: '原因', tableColumnName: 'applyReason', sortable: false },
      { id: 8, showName: '发起人', tableColumnName: 'applyUserName', sortable: true, width: 110 },
      { id: 9, showName: '当前状态', tableColumnName: 'customize-status', width: 130 },
      { id: 10, showName: '审核意见', tableColumnName: 'reason', sortable: false },
    ],
  },
  defaultDBIProps: {},
}));

function normalizePageResponse(res, mapper) {
  const data = res?.data;
  const contentRaw = Array.isArray(data)
    ? data
    : data?.content || data?.records || data?.list || [];
  const content = contentRaw.map(mapper);
  const totalElements = Number(
    data?.page?.totalElements ?? data?.totalElements ?? data?.total ?? content.length
  );
  return {
    ...(res || {}),
    data: {
      ...(Array.isArray(data) ? {} : data || {}),
      content,
      totalElements,
      page: {
        ...(data?.page || {}),
        totalElements,
      },
    },
  };
}

function normalizeAuditStatus(value) {
  if (value === null || value === undefined || value === '') return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

function normalizeModeName(value) {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'INTERNAL') return '校内实习';
  if (normalized === 'EXTERNAL') return '校外实习';
  return value || '--';
}

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return value;
}

function normalizeAuditRow(row) {
  const verifyProcessId = row.verifyProcessId ?? row.verify_process_id ?? row.id;
  const internshipRelationId = row.relationId ?? row.relation_id;
  const terminationId =
    row.terminationId ??
    row.termination_id ??
    row.terminationApplyId ??
    row.termination_apply_id ??
    internshipRelationId;
  const internshipMode = row.internshipMode ?? row.internship_mode;
  const currentRoleName = row.currentRoleName ?? row.current_role_name ?? row.currentRole ?? '';
  const isAudit = normalizeAuditStatus(row.isAudit ?? row.is_audit ?? row.auditStatus ?? row.status);

  return {
    ...row,
    id: verifyProcessId,
    verifyProcessId,
    terminationId,
    internshipRelationId,
    relationId: terminationId,
    tableName: row.tableName ?? row.table_name ?? TERMINATION_TABLE_NAME,
    processId: row.processId ?? row.process_id,
    internshipId: row.internshipId ?? row.internship_id,
    studentId: row.studentId ?? row.student_id ?? row.stuId,
    studentName: row.studentName ?? row.student_name ?? row.stuName,
    studentAccount: row.studentAccount ?? row.student_account ?? row.account,
    internshipName: row.internshipName ?? row.internship_name,
    internshipMode,
    internshipModeName: row.internshipModeName ?? normalizeModeName(internshipMode),
    relationTable: row.relationTable ?? row.relation_table,
    terminateDate: row.terminateDate ?? row.terminate_date,
    reasonType: row.reasonType ?? row.reason_type,
    applyReason: row.applyReason ?? row.apply_reason ?? row.terminationReason ?? row.termination_reason ?? row.reason,
    reason: row.auditReason ?? row.audit_reason ?? row.verifyReason ?? row.verify_reason ?? row.reason,
    applyUserId: row.applyUserId ?? row.apply_user_id ?? row.createUserId ?? row.create_user_id,
    applyUserName: row.applyUserName ?? row.apply_user_name ?? row.createUserName ?? row.create_user_name,
    createUserId: row.createUserId ?? row.create_user_id ?? row.applyUserId ?? row.apply_user_id,
    verifyUserId: row.verifyUserId ?? row.verify_user_id,
    verifyUserName: row.verifyUserName ?? row.verify_user_name,
    currentRoleName,
    _currentRoleName: currentRoleName,
    isAllVerified: normalizeBoolean(row.isAllVerified ?? row.is_all_verified),
    verifyTypeId: row.verifyTypeId ?? row.verify_type_id,
    verifyTypeName: row.verifyTypeName ?? row.verify_type_name,
    isAudit,
  };
}

function clientFilterFn(dataList) {
  const normalized = Array.isArray(dataList) ? dataList.map(normalizeAuditRow) : dataList;
  const manualAuditRows = verifyClientFilterFn(normalized);
  const autoPassedRows = normalized.filter(isAutoPassedTermination);
  return uniqueRows([...manualAuditRows, ...autoPassedRows]);
}

function isAutoPassedTermination(row) {
  const item = row?.terminationId ? row : normalizeAuditRow(row || {});
  if (Number(item.isAudit) !== CONSTANT.AUDIT_STATUS.PASS) return false;
  const verifyTypeId = Number(item.verifyTypeId);
  const verifyTypeName = String(item.verifyTypeName || '');
  const reason = String(item.reason || '');
  return (
    verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY ||
    verifyTypeName.includes('无需') ||
    reason.includes('系统自动通过') ||
    (!item.verifyUserId && item.isAllVerified === true)
  );
}

function uniqueRows(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = String(row.verifyProcessId ?? row.id ?? row.terminationId ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rowSelectableFn(row) {
  return !isAutoPassedTermination(row);
}

async function fetchAuditRecords(params) {
  const res = await listAPI.getSomeRecords({
    keyWords: TERMINATION_VERIFY_MERGE_VIEW,
    pageInfo: { page: 1, size: 5000 },
    sort: params?.sort || { properties: 'id', direction: 'DESC' },
  });
  const normalized = normalizePageResponse(res, normalizeAuditRow);
  const filtered = clientFilterFn(normalized.data.content || []);
  const sorted = sortRows(filtered, params?.sort);
  const page = Number(params?.pageInfo?.page || 1);
  const size = Number(params?.pageInfo?.size || 20);
  const start = Math.max(page - 1, 0) * size;
  const content = sorted.slice(start, start + size);
  return {
    ...normalized,
    data: {
      ...normalized.data,
      content,
      totalElements: filtered.length,
      page: {
        ...(normalized.data.page || {}),
        totalElements: filtered.length,
      },
    },
  };
}

function sortRows(rows, sort = {}) {
  const field = sort?.properties;
  if (!field) return rows;
  const direction = sort.direction === 'ASC' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return direction;
    if (bv == null) return -direction;
    if (av < bv) return -direction;
    if (av > bv) return direction;
    return 0;
  });
}

async function openTerminationDetail(row) {
  const terminationId = row?.terminationId ?? row?.relationId;
  if (!terminationId) return;
  detailDialogVisible.value = true;
  detailLoading.value = true;
  detailInfo.value = { termination: row };
  try {
    const res = await terminationAPI.detail({
      terminationId,
      relationTable: row.relationTable,
      relationId: row.internshipRelationId,
    });
    const data = res?.data;
    detailInfo.value = data && typeof data === 'object' ? data : { termination: row };
  } catch (error) {
    console.error('加载终止申请详情失败:', error);
  } finally {
    detailLoading.value = false;
  }
}

function handleEditClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  openTerminationDetail(normalizeAuditRow(row));
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  const normalized = normalizeAuditRow(row);
  currentRow.value = {
    ...normalized,
    relationId: normalized.terminationId,
    tableName: TERMINATION_TABLE_NAME,
  };
  showProgressDialog.value = true;
}

function handleVerifySuccess() {
  dtlRef.value?.initDataList?.(true);
}

defineExpose({
  baseListRef: computed(() => dtlRef.value),
  updateSearchWordsAndRefresh: () => dtlRef.value?.initDataList?.(true),
});
</script>

<style scoped>
.termination-verify-page {
  padding: 12px;
}
</style>
