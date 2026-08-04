<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'随机岗位分配'"
    :no-project-message="'当前没有可进行随机岗位分配的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :process-type-code="processTypeCode"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @project-selected="handleProjectSelected"
    @more2-click="handleBatchSubmitRowsClick"
    @more3-click="handleRandomAssign"
  />

  <el-dialog
    v-model="progressVisible"
    title="随机分配进度"
    width="420px"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="progressFinished"
    @closed="onProgressDialogClosed"
  >
    <div class="assign-progress-body">
      <el-progress
        :percentage="progressPercent"
        :status="progressBarStatus"
        :stroke-width="16"
      />
      <div class="assign-progress-meta">
        <div>状态：{{ progressStatusText }}</div>
        <div>进度：{{ progressProcessed }} / {{ progressTotal }}</div>
        <div>成功 {{ progressAssigned }} · 失败 {{ progressFailed }} · 未分配 {{ progressUnassigned }}</div>
        <div v-if="progressMessage" class="assign-progress-msg">{{ progressMessage }}</div>
        <div v-if="progressDetailsText" class="assign-progress-details">{{ progressDetailsText }}</div>
      </div>
    </div>
    <template #footer>
      <el-button v-if="progressFinished" type="primary" @click="progressVisible = false">
        知道了
      </el-button>
      <span v-else class="assign-progress-hint">分配进行中，请稍候…</span>
    </template>
  </el-dialog>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { useAssignmentActions } from '@/utils/useAssignmentActions';
import { useVerifyFilter } from '@/utils/useVerifyFilter';

defineOptions({
  name: 'RandomPostAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_ASSIGN_POST;

const headerPageRef = ref(null);
const randomAssignLoading = ref(false);
const { getVerifyRoleName } = useVerifyFilter();

const progressVisible = ref(false);
const progressFinished = ref(false);
const progressPercent = ref(0);
const progressProcessed = ref(0);
const progressTotal = ref(0);
const progressAssigned = ref(0);
const progressFailed = ref(0);
const progressUnassigned = ref(0);
const progressStatus = ref('');
const progressMessage = ref('');
const progressDetails = ref(null);
let pollTimer = null;
let pollFailStreak = 0;
const POLL_FAIL_LIMIT = 5;

const progressStatusText = computed(() => {
  const map = {
    PENDING: '排队中',
    RUNNING: '分配中',
    SUCCESS: '已完成',
    FAILED: '失败',
  };
  return map[progressStatus.value] || progressStatus.value || '—';
});

const progressBarStatus = computed(() => {
  if (progressStatus.value === 'SUCCESS') return 'success';
  if (progressStatus.value === 'FAILED') return 'exception';
  return undefined;
});

const progressDetailsText = computed(() => {
  const details = progressDetails.value;
  if (details == null) return '';
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) {
    if (!details.length) return '';
    const preview = details
      .slice(0, 5)
      .map((item) => {
        if (item == null) return '';
        if (typeof item === 'string') return item;
        const name = item.studentName || item.account || item.userId || '';
        const reason = item.reason || item.message || item.status || '';
        return [name, reason].filter(Boolean).join('：');
      })
      .filter(Boolean);
    const more = details.length > 5 ? `……共 ${details.length} 条明细` : '';
    return [...preview, more].filter(Boolean).join('\n');
  }
  if (typeof details === 'object') {
    try {
      return JSON.stringify(details);
    } catch {
      return '';
    }
  }
  return String(details);
});

const {
  titleObj,
  isMore1Disabled,
  projectSelectSearchKey,
  projectSelectRegKey,
  handleProjectSelected: baseHandleProjectSelected,
} = useAssignmentPageConfig({
  processTypeCode,
  mainTitle: '随机岗位分配',
  withMajorFilter: true,
});

const refreshList = () => headerPageRef.value?.baseListRef?.initDataList(true);

const { handleBatchSubmitClick: batchSubmitVerifyProcess } = useAssignmentActions(refreshList);

function toSubmitRow(row) {
  const verifyProcessId = resolveVerifyProcessId(row);
  if (!verifyProcessId) return null;
  return { ...row, id: verifyProcessId };
}

function handleBatchSubmitRowsClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  const pendingRows = rowsArray
    .map(toSubmitRow)
    .filter((row) => row && row.isAudit === CONSTANT.AUDIT_STATUS.SAVE);
  if (!pendingRows.length) {
    ElMessage.warning(`选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可提交的记录`);
    return;
  }
  batchSubmitVerifyProcess(pendingRows);
}

const currentInternship = computed(() => unref(headerPageRef.value?.currentInternship) ?? null);

const SELECTION_STATUS_LABELS = {
  notSelected: '未选岗位',
  selectedPendingAudit: '已选岗待审核',
  postApproved: '岗位已通过',
};

function pickFirstNonEmpty(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function resolveVerifyProcessId(row) {
  const id = pickFirstNonEmpty(row, [
    'verifyProcessId',
    'verify_process_id',
    'mainVerifyProcessId',
    'main_verify_process_id',
  ]);
  const num = Number(id);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function selectionStatusLabel(value) {
  return SELECTION_STATUS_LABELS[value] || value || '—';
}

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

function buildSearchKey(baseSearchKey) {
  return {
    internshipId: baseSearchKey.internshipId,
  };
}

function handleProjectSelected(internship, title) {
  baseHandleProjectSelected(internship, title);
}

async function fetchStudentPostRecords(params) {
  const internshipId = Number(
    currentInternship.value?.internshipId ??
      currentInternship.value?.id ??
      params?.searchKey?.internshipId ??
      0
  );
  if (!internshipId) {
    return {
      data: { content: [], totalElements: 0, page: { totalElements: 0 } },
    };
  }

  const res = await internshipProcessAPI.getExternalInternshipStudentPostBreakdown({
    internshipId,
    status: 'all',
    pageInfo: { page: params.pageInfo.page, size: params.pageInfo.size },
  });
  const data = unwrapPayload(res);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const page = params.pageInfo.page;
  const size = params.pageInfo.size;
  const total = Number(data.totalElements ?? rows.length ?? 0);
  const content = rows.map((row, idx) => {
    const verifyProcessId = resolveVerifyProcessId(row);
    const userId = row?.userId ?? row?.studentId;
    return {
      ...row,
      id:
        verifyProcessId ??
        row?.id ??
        (userId != null
          ? `u${userId}_${row?.internshipPostId ?? idx}_${page}`
          : `stu-${page}-${idx}`),
      verifyProcessId,
      selectionStatusText: selectionStatusLabel(row?.selectionStatus),
      studentName: row?.studentName ?? row?.userName ?? row?.name,
      studentAccount: row?.studentAccount ?? row?.account,
    };
  });

  return {
    data: {
      content,
      totalElements: total,
      page: { totalElements: total },
    },
  };
}

function stopPolling() {
  if (pollTimer != null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function applyProgress(data) {
  progressStatus.value = data.status || '';
  progressPercent.value = Math.min(100, Math.max(0, Number(data.percent ?? 0)));
  progressProcessed.value = Number(data.processed ?? 0);
  progressTotal.value = Number(data.total ?? data.candidateStudentCount ?? 0);
  progressAssigned.value = Number(data.assignedCount ?? 0);
  progressFailed.value = Number(data.failedCount ?? 0);
  progressUnassigned.value = Number(data.unassignedCount ?? 0);
  progressMessage.value = data.message || '';
  if (data.details !== undefined) {
    progressDetails.value = data.details;
  }
}

function finishProgress(success) {
  progressFinished.value = true;
  stopPolling();
  randomAssignLoading.value = false;
  if (success) {
    ElMessage.success(
      `分配完成：成功 ${progressAssigned.value}，失败 ${progressFailed.value}，未分配 ${progressUnassigned.value}`
    );
    refreshList();
  } else {
    ElMessage.error(progressMessage.value || '随机分配失败');
  }
}

async function pollTaskStatus(taskId) {
  try {
    const res = await internshipProcessAPI.getRandomAssignPostsTaskStatus({ taskId });
    if (res?.message !== 'successful') {
      pollFailStreak += 1;
      progressMessage.value = res?.message || '查询进度失败';
      if (pollFailStreak >= POLL_FAIL_LIMIT) {
        finishProgress(false);
      }
      return;
    }
    pollFailStreak = 0;
    const data = unwrapPayload(res);
    applyProgress(data);
    if (data.status === 'SUCCESS') {
      finishProgress(true);
    } else if (data.status === 'FAILED') {
      finishProgress(false);
    }
  } catch (error) {
    console.error('查询随机分配进度失败:', error);
    pollFailStreak += 1;
    progressMessage.value = error?.response?.data?.message || error?.message || '查询进度失败';
    if (pollFailStreak >= POLL_FAIL_LIMIT) {
      finishProgress(false);
    }
  }
}

function onProgressDialogClosed() {
  stopPolling();
  if (!progressFinished.value) {
    randomAssignLoading.value = false;
  }
}

async function handleRandomAssign() {
  const cur = currentInternship.value;
  const internshipId = Number(cur?.internshipId ?? cur?.id ?? 0);
  if (!internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }

  randomAssignLoading.value = true;
  progressFinished.value = false;
  progressPercent.value = 0;
  progressProcessed.value = 0;
  progressTotal.value = 0;
  progressAssigned.value = 0;
  progressFailed.value = 0;
  progressUnassigned.value = 0;
  progressStatus.value = 'PENDING';
  progressMessage.value = '';
  progressDetails.value = null;
  pollFailStreak = 0;
  progressVisible.value = true;

  try {
    const res = await internshipProcessAPI.randomAssignPostsForUnselectedStudents({
      internshipId,
    });
    if (res?.message !== 'successful') {
      progressMessage.value = res?.message || '启动随机分配失败';
      finishProgress(false);
      return;
    }
    const data = unwrapPayload(res);
    applyProgress(data);

    // 启动时已无学生 / 已完成
    if (data.status === 'SUCCESS') {
      finishProgress(true);
      return;
    }
    if (data.status === 'FAILED') {
      finishProgress(false);
      return;
    }

    const taskId = data.taskId;
    if (!taskId) {
      progressMessage.value = '未返回 taskId';
      finishProgress(false);
      return;
    }

    stopPolling();
    pollTimer = setInterval(() => {
      void pollTaskStatus(taskId);
    }, 1000);
    await pollTaskStatus(taskId);
  } catch (error) {
    console.error('随机分配失败:', error);
    progressMessage.value = error?.response?.data?.message || error?.message || '随机分配失败';
    finishProgress(false);
  }
}

onBeforeUnmount(() => {
  stopPolling();
});

const isMore1DisabledRef = computed(() => isMore1Disabled.value);

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: true,
    operateShow: false,
  },
  fetchRecords: fetchStudentPostRecords,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: {
      more1: { show: true, name: '实习项目选择', disabled: isMore1DisabledRef.value },
      more3: {
        show: true,
        name: '随机分配',
        type: 'primary',
        disabled: !currentInternship.value?.internshipId || randomAssignLoading.value,
      },
      submit: { show: false },
      visible: { show: false },
      more2: { show: false },
      more5: { show: false },
      create: { show: false },
      update: { show: false },
      delete: { show: false },
    },
    keyWord: {
      edit: 'MainVerifyProcess',
      view: 'ViewVerifyProcessRelStuInternshipPostMerge',
    },
    allTableColumns: [
      { id: 1, showName: '学号', tableColumnName: 'account', sortable: true },
      { id: 2, showName: '学生姓名', tableColumnName: 'studentName', sortable: true },
      {
        id: 3,
        showName: '学院/部门',
        tableColumnName: 'departmentName',
        sortable: true,
      },
      { id: 4, showName: '岗位', tableColumnName: 'internshipPostName', sortable: true },
      { id: 5, showName: '公司', tableColumnName: 'companyName', sortable: true },
      {
        id: 6,
        showName: '选岗状态',
        tableColumnName: 'selectionStatusText',
        sortable: false,
      },
      { id: 7, showName: '审核状态', tableColumnName: 'customize-status', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh?.(),
});
</script>

<style scoped>
.assign-progress-body {
  padding: 8px 4px 0;
}
.assign-progress-meta {
  margin-top: 16px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  font-size: 14px;
}
.assign-progress-msg {
  margin-top: 4px;
  color: var(--el-color-danger);
}
.assign-progress-details {
  margin-top: 8px;
  white-space: pre-line;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.6;
  max-height: 120px;
  overflow: auto;
}
.assign-progress-hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
