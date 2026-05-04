<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生请假审核'"
    :no-project-message="'当前没有可审核请假的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @audit-click="handleAuditClick"
    @audit-command="handleBatchAuditCommand"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerify
        ref="dlgVerifyRef"
        dlg-title="学生请假审核"
        recall-title="退回已通过的请假申请"
        @success="handleVerifySuccess"
      />

      <el-dialog v-model="detailDialogVisible" title="请假详情" width="560px" destroy-on-close>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="学生">{{ detailRow.studentName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="学号">{{ detailRow.studentAccount || '--' }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ detailRow.startTime || '--' }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ detailRow.endTime || '--' }}</el-descriptions-item>
          <el-descriptions-item label="请假原因">
            <div class="leave-reason">{{ detailRow.remarks || '--' }}</div>
          </el-descriptions-item>
        </el-descriptions>
        <template #footer>
          <el-button @click="detailDialogVisible = false">关 闭</el-button>
        </template>
      </el-dialog>

      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewLeaveAuditFlow"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { computed, reactive, ref, unref } from 'vue';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import mainLeaveAPI from '@/api/mainLeave';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';
import { useBatchVerifyAuditDialog } from '@/utils/useBatchVerifyAuditDialog';
import CONSTANT from '@/utils/constant';

defineOptions({ name: 'MainLeaveAudit' });

const LEAVE_PROCESS_NAME = '请假';
const LEAVE_TABLE_NAME = 'MainLeave';

const headerPageRef = ref(null);
const dlgVerifyRef = ref(null);
const showProgressDialog = ref(false);
const currentRow = ref({});

const detailDialogVisible = ref(false);
const detailRow = ref({});

const titleObj = reactive({ mainTitle: '学生请假审核' });

const { clientFilterFn: verifyClientFilterFn, getVerifyRoleName } = useVerifyFilter();
const { handleBatchAuditCommand, handleAuditClick } = useBatchVerifyAuditDialog(dlgVerifyRef);

const currentInternship = computed(() => unref(headerPageRef.value?.currentInternship) ?? null);
const isMore1Disabled = computed(() => unref(headerPageRef.value?.isMore1Disabled) ?? false);

const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return {
    processTypeName: LEAVE_PROCESS_NAME,
    startTime: currentTime,
    endTime: currentTime,
  };
});

const projectSelectRegKey = computed(() => ({
  processTypeName: CONSTANT.SEARCH_OPERATOR.LIKE,
  startTime: CONSTANT.SEARCH_OPERATOR.LE,
  endTime: CONSTANT.SEARCH_OPERATOR.GE,
}));

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: true,
    showPage: true,
  },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  sortStr: { properties: 'verifyProcessId', direction: 'DESC' },
  fetchRecords: fetchLeaveAuditRecords,
  clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  initSearchWords: buildVerifySearchWords(),
  defaultDTHProps: {
    buttonProps: {
      audit: { show: true, showPass: true, showNotPass: true, showBack: true },
      update: { show: true, type: 'primary', name: '查看请假详情' },
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewLeaveAuditFlow' },
    allTableColumns: [
      { id: 1, showName: '学生姓名', tableColumnName: 'studentName', sortable: true },
      { id: 2, showName: '学号', tableColumnName: 'studentAccount', sortable: true },
      { id: 3, showName: '开始时间', tableColumnName: 'startTime', sortable: true },
      { id: 4, showName: '结束时间', tableColumnName: 'endTime', sortable: true },
      { id: 5, showName: '请假原因', tableColumnName: 'remarks', sortable: false },
      { id: 6, showName: '当前状态', tableColumnName: 'customize-status' },
      { id: 7, showName: '审核意见', tableColumnName: 'reason', sortable: false },
    ],
  },
  defaultDBIProps: {},
}));

function normalizeAuditStatus(value) {
  if (value === null || value === undefined || value === '') return value;
  const num = Number(value);
  return Number.isNaN(num) ? value : num;
}

function resolveInternshipId(row) {
  const raw = row?.internshipId ?? row?.internship_id ?? row?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveProcessId(row) {
  const raw = row?.processId ?? row?.process_id ?? row?.realId ?? row?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveLeaveId(row) {
  const raw = row?.leaveId ?? row?.mainLeaveId ?? row?.relationId ?? row?.relation_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveVerifyProcessId(row) {
  const raw = row?.verifyProcessId ?? row?.mainVerifyProcessId ?? row?.mvpId ?? row?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveCurrentRoleName(row) {
  return (
    row?.currentRoleName ??
    row?.current_role_name ??
    row?._currentRoleName ??
    ''
  );
}

function normalizeFlowRecord(record, leaveId) {
  const id = resolveVerifyProcessId(record);
  const relationId = record?.relationId ?? record?.relation_id ?? record?.leaveId ?? leaveId;
  const currentRoleName = resolveCurrentRoleName(record);
  return {
    ...record,
    id,
    verifyProcessId: id,
    leaveId: record?.leaveId ?? record?.mainLeaveId ?? leaveId,
    relationId,
    tableName: record?.tableName ?? record?.table_name ?? LEAVE_TABLE_NAME,
    isAudit: normalizeAuditStatus(record?.isAudit ?? record?.is_audit),
    currentRoleName,
    _currentRoleName: currentRoleName,
    isAllVerified:
      record?.isAllVerified === true ||
      Number(record?.isAudit ?? record?.is_audit) === CONSTANT.AUDIT_STATUS.PASS,
  };
}

function statusAllowed(status, rawAllowed) {
  if (rawAllowed == null || rawAllowed === '') return true;
  const allowed = String(rawAllowed)
    .split(',')
    .map((item) => Number(item))
    .filter((item) => !Number.isNaN(item));
  return allowed.includes(Number(status));
}

function clientFilterFn(dataList) {
  const filtered = verifyClientFilterFn(dataList);
  if (!Array.isArray(filtered)) return filtered || [];
  return filtered.filter((row) => resolveLeaveId(row));
}

function buildSearchKey(baseSearchKey) {
  return { internshipId: baseSearchKey.internshipId };
}

function handleProjectSelected(_internship, title) {
  if (title) titleObj.mainTitle = title;
}

async function fetchLeaveDetails(internshipId) {
  const res = await mainLeaveAPI.getLeaveUniversalDetailsPage({
    page: 1,
    size: 5000,
    sort: 'leaveId',
    order: 'DESC',
    internshipId,
    searchKey: { internshipId },
    reg: { internshipId: '=' },
  });
  return (res?.data?.content || [])
    .filter((row) => {
      const rowInternshipId = row?.internshipId ?? row?.internship_id;
      return rowInternshipId == null || String(rowInternshipId) === String(internshipId);
    })
    .map((row) => {
      const leaveId = resolveLeaveId(row);
      return {
        ...row,
        id: leaveId,
        leaveId,
        relationId: leaveId,
        tableName: LEAVE_TABLE_NAME,
      };
    });
}

async function fetchLeaveFlows(leaveIds) {
  const ids = [
    ...new Set(
      leaveIds
        .filter((id) => id != null && id !== '')
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id))
    ),
  ];
  if (!ids.length) return [];

  const results = await Promise.all(
    ids.map(async (leaveId) => {
      try {
        const res = await mainLeaveAPI.getLeaveAuditFlowPage({
          page: 1,
          size: 50,
          leaveId,
          sort: 'verifyProcessId',
          order: 'DESC',
        });
        return (res?.data?.content || []).map((record) => normalizeFlowRecord(record, leaveId));
      } catch (error) {
        console.error(`加载请假审核流程失败 leaveId=${leaveId}:`, error);
        return [];
      }
    })
  );

  return results.flat();
}

async function fetchLeaveAuditRecords(params) {
  const internshipId = params?.searchKey?.internshipId ?? resolveInternshipId(currentInternship.value);
  const processId = resolveProcessId(currentInternship.value);
  if (!internshipId) {
    return { data: { content: [], totalElements: 0, page: { totalElements: 0 } } };
  }

  const detailRows = await fetchLeaveDetails(internshipId);
  const flowRows = await fetchLeaveFlows(detailRows.map((row) => row.leaveId));
  const latestFlowMap = new Map();
  flowRows.forEach((row) => {
    const leaveId = resolveLeaveId(row);
    if (!leaveId || latestFlowMap.has(String(leaveId))) return;
    latestFlowMap.set(String(leaveId), row);
  });

  const statusSearch = params?.searchKey?.isAudit;
  const content = detailRows
    .map((detail) => {
      const latest = latestFlowMap.get(String(detail.leaveId));
      if (!latest) return null;
      return {
        ...detail,
        ...latest,
        id: latest.id,
        leaveId: detail.leaveId,
        relationId: detail.leaveId,
        internshipId: detail.internshipId ?? internshipId,
        processId: latest.processId ?? latest.process_id ?? detail.processId ?? detail.process_id ?? processId,
        tableName: LEAVE_TABLE_NAME,
      };
    })
    .filter(Boolean)
    .filter((row) => statusAllowed(row.isAudit, statusSearch));

  return {
    data: {
      content,
      totalElements: content.length,
      page: { totalElements: content.length },
    },
  };
}

async function loadLeaveFlowRows(leaveId) {
  if (!leaveId) return [];
  const res = await mainLeaveAPI.getLeaveAuditFlowPage({
    page: 1,
    size: 200,
    leaveId,
    sort: 'verifyProcessId',
    order: 'ASC',
  });
  return (res?.data?.content || []).map((record) => normalizeFlowRecord(record, leaveId));
}

function handleEditClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  detailRow.value = { ...row };
  detailDialogVisible.value = true;
}

async function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  const leaveId = resolveLeaveId(row);
  const records = await loadLeaveFlowRows(leaveId);
  currentRow.value = {
    ...row,
    id: resolveVerifyProcessId(row),
    leaveId,
    relationId: leaveId,
    processId: row.processId ?? row.process_id ?? resolveProcessId(currentInternship.value),
    tableName: LEAVE_TABLE_NAME,
    _allRecords: records,
  };
  showProgressDialog.value = true;
}

function handleVerifySuccess() {
  const baseList = headerPageRef.value?.baseListRef;
  baseList?.initDataList?.(true);
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh?.(),
});
</script>

<style scoped>
.leave-reason {
  min-height: 72px;
  line-height: 22px;
  white-space: pre-wrap;
}
</style>
