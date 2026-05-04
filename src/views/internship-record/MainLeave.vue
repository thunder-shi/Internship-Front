<template>
  <div class="main-leave-page">
    <el-skeleton v-if="!ready" :rows="5" animated />
    <DataTableList
      v-else
      ref="dtlRef"
      :default-props="defaultDTLProps"
      :fetch-records="fetchLeaveRecords"
      @append-click="handleAppendClick"
      @edit-click="handleEditClick"
      @delete-click="handleDeleteClick"
      @submit-click="handleSubmitClick"
      @more2-click="handleBatchSubmitClick"
      @view-click="handleViewClick"
    />

    <el-dialog
      v-model="leaveDialogVisible"
      :title="leaveForm.id ? '编辑请假单' : '新增请假单'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="leaveFormRef" :model="leaveForm" :rules="leaveRules" label-width="120px">
        <el-form-item label="关联实习记录" prop="stuInternshipId">
          <el-select
            v-model="leaveForm.stuInternshipId"
            filterable
            clearable
            placeholder="请选择关联实习记录"
            style="width: 100%"
          >
            <el-option
              v-for="item in stuInternshipOptions"
              :key="item.optionKey"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="请假时间" prop="timeRange">
          <el-date-picker
            v-model="leaveTimeRange"
            type="datetimerange"
            value-format="YYYY-MM-DD HH:mm:ss"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
            @change="syncRangeToForm"
          />
        </el-form-item>
        <el-form-item label="请假原因" prop="remarks">
          <el-input
            v-model="leaveForm.remarks"
            type="textarea"
            :rows="4"
            :maxlength="500"
            placeholder="请填写请假原因"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="leaveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLeaveOnly">保存</el-button>
        <el-button type="success" @click="saveAndSubmit">保存并提交</el-button>
      </template>
    </el-dialog>

    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="currentRow.internshipId"
      :process-info="currentRow"
      key-words="ViewLeaveAuditFlow"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import DataTableList from '@/components/DataTableList.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import listAPI from '@/api/list';
import mainLeaveAPI from '@/api/mainLeave';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import CONSTANT from '@/utils/constant';

defineOptions({ name: 'MainLeave' });

const LEAVE_PROCESS_NAME = '请假';
const LEAVE_TABLE_NAME = 'MainLeave';
const APPROVED_POST_MERGE_KEY = 'ViewVerifyProcessRelStuInternshipPostMerge';
const APPROVED_TITLE_MERGE_KEY = 'ViewVerifyProcessRelTitleStudentMerge';

const store = useStore();
const dtlRef = ref(null);
const leaveFormRef = ref(null);
const ready = ref(false);

const leaveDialogVisible = ref(false);
const leaveTimeRange = ref([]);
const editingRowSnapshot = ref(null);

const showProgressDialog = ref(false);
const currentRow = ref({});

const stuInternshipOptions = ref([]);

const userInfo = computed(() => store.getters.userInfo || {});
const studentId = computed(() => userInfo.value?.id || null);
const { getVerifyRoleName } = useVerifyFilter();

const titleObj = reactive({ mainTitle: '学生请假申请' });

const leaveForm = reactive({
  id: null,
  stuInternshipId: null,
  startTime: '',
  endTime: '',
  remarks: '',
  timeRange: null,
});

const leaveRules = {
  stuInternshipId: [{ required: true, message: '请选择关联实习记录', trigger: 'change' }],
  timeRange: [{ required: true, message: '请选择请假时间', trigger: 'change' }],
  remarks: [{ required: true, message: '请输入请假原因', trigger: 'blur' }],
};

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: true,
    checkFlag: true,
    showPage: true,
  },
  pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
  sortStr: { properties: 'leaveId', direction: 'DESC' },
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  buttonCondition: {
    update: canEditLeave,
    delete: canDeleteLeave,
    submit: canSubmitLeave,
  },
  defaultDTHProps: {
    buttonProps: {
      create: { show: true, name: '新增请假', type: 'primary' },
      update: { show: true, name: '编辑请假', type: 'primary' },
      delete: { show: true, name: '删除', type: 'danger' },
      visible: { show: true, type: 'primary', name: '查看进度' },
      submit: { show: true, name: '提交', type: 'warning' },
      more2: { show: true, name: '批量提交', type: 'primary' },
      buttonGroup: { show: true },
    },
    keyWord: { edit: LEAVE_TABLE_NAME, view: 'ViewLeaveUniversalDetails' },
    allTableColumns: [
      { id: 1, showName: '学生', tableColumnName: 'studentName', sortable: true },
      { id: 2, showName: '关联实习', tableColumnName: 'internshipName', sortable: true },
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

function rowAuditStatus(row) {
  return normalizeAuditStatus(row?.isAudit ?? row?.is_audit);
}

function canEditLeave(row) {
  const status = rowAuditStatus(row);
  return (
    status === null ||
    status === undefined ||
    status === CONSTANT.AUDIT_STATUS.SAVE ||
    status === CONSTANT.AUDIT_STATUS.BACK
  );
}

function canDeleteLeave(row) {
  return rowAuditStatus(row) === CONSTANT.AUDIT_STATUS.SAVE;
}

function canSubmitLeave(row) {
  const status = rowAuditStatus(row);
  return (
    status === CONSTANT.AUDIT_STATUS.SAVE ||
    status === CONSTANT.AUDIT_STATUS.BACK ||
    (status === CONSTANT.AUDIT_STATUS.PASS &&
      Number(row?.verifyTypeId) === CONSTANT.VERIFY_LEVEL.NO_VERIFY)
  );
}

function canBatchSubmitLeave(row) {
  const status = rowAuditStatus(row);
  return status === CONSTANT.AUDIT_STATUS.SAVE || status === CONSTANT.AUDIT_STATUS.BACK;
}

function isApprovedRelation(row) {
  return (
    row?.isAllVerified === true ||
    Number(row?.isAudit ?? row?.is_audit) === CONSTANT.AUDIT_STATUS.PASS
  );
}

function resolveLeaveId(row) {
  const raw = row?.leaveId ?? row?.mainLeaveId ?? row?.relationId ?? row?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveVerifyProcessId(row) {
  const raw = row?.verifyProcessId ?? row?.mainVerifyProcessId ?? row?.mvpId;
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
  const relationId = record?.relationId ?? record?.relation_id ?? record?.leaveId ?? leaveId;
  const fallbackId = Number(record?.id ?? 0);
  const id = resolveVerifyProcessId(record) ??
    (Number.isFinite(fallbackId) && fallbackId > 0 ? fallbackId : null);
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

async function loadLatestLeaveAuditStateMap(leaveIds) {
  const ids = [
    ...new Set(
      leaveIds
        .filter((id) => id != null && id !== '')
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id))
    ),
  ];
  if (!ids.length) return new Map();

  try {
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
          return res?.data?.content || [];
        } catch (error) {
          console.error(`加载请假最新审核状态失败 leaveId=${leaveId}:`, error);
          return [];
        }
      })
    );
    const latestMap = new Map();
    results.flat().forEach((record) => {
      const leaveId = resolveLeaveId(record);
      if (!leaveId || latestMap.has(String(leaveId))) return;
      latestMap.set(String(leaveId), normalizeFlowRecord(record, leaveId));
    });
    return latestMap;
  } catch (error) {
    console.error('加载请假最新审核状态失败:', error);
    return new Map();
  }
}

async function fetchLeaveRecords(params) {
  if (!studentId.value) {
    return { data: { content: [], totalElements: 0, page: { totalElements: 0 } } };
  }

  const payload = {
    page: params?.pageInfo?.page ?? 1,
    size: params?.pageInfo?.size ?? 20,
    sort: params?.sort?.properties ?? 'leaveId',
    order: params?.sort?.direction ?? 'DESC',
    studentId: studentId.value,
    searchKey: { studentId: studentId.value },
    reg: { studentId: '=' },
  };

  const res = await mainLeaveAPI.getLeaveUniversalDetailsPage(payload);
  const rawContent = (res?.data?.content || []).map((row) => {
    const leaveId = resolveLeaveId(row);
    return {
      ...row,
      id: leaveId,
      leaveId,
      relationId: leaveId,
      tableName: row?.tableName ?? row?.table_name ?? LEAVE_TABLE_NAME,
      isAudit: normalizeAuditStatus(row?.isAudit ?? row?.is_audit ?? CONSTANT.AUDIT_STATUS.SAVE),
    };
  });

  const latestStateMap = await loadLatestLeaveAuditStateMap(rawContent.map((row) => row.leaveId));
  const content = rawContent.map((row) => {
    const latestState = latestStateMap.get(String(row.leaveId));
    if (!latestState) return row;
    return {
      ...row,
      ...latestState,
      id: row.leaveId,
      leaveId: row.leaveId,
      relationId: row.leaveId,
      isAudit: latestState.isAudit ?? row.isAudit,
    };
  });
  const totalElements = Number(
    res?.data?.page?.totalElements ?? res?.data?.totalElements ?? content.length
  );

  return {
    ...res,
    data: {
      ...(res?.data || {}),
      content,
      totalElements,
      page: {
        ...(res?.data?.page || {}),
        totalElements,
      },
    },
  };
}

async function loadStuInternshipOptions() {
  if (!studentId.value) {
    stuInternshipOptions.value = [];
    return;
  }

  const [extRes, intRes] = await Promise.allSettled([
    listAPI.getSomeRecords({
      keyWords: APPROVED_POST_MERGE_KEY,
      pageInfo: { page: 1, size: 5000 },
      searchKey: { studentId: studentId.value },
      reg: { studentId: '=' },
    }),
    listAPI.getSomeRecords({
      keyWords: APPROVED_TITLE_MERGE_KEY,
      pageInfo: { page: 1, size: 5000 },
      searchKey: { stuId: studentId.value },
      reg: { stuId: '=' },
    }),
  ]);

  const ext = extRes.status === 'fulfilled' ? extRes.value?.data?.content || [] : [];
  const int = intRes.status === 'fulfilled' ? intRes.value?.data?.content || [] : [];

  const extOptions = ext.filter(isApprovedRelation).map((item) => {
    const value = item.relationId ?? item.relStuInternshipPostId ?? item.id;
    return {
      optionKey: `ext_${value}`,
      value,
      internshipId: item.internshipId ?? null,
      label: `校外 - ${item.internshipName || ''} ${item.internshipPostName || ''}`.trim(),
    };
  });
  const intOptions = int.filter(isApprovedRelation).map((item) => {
    const value = item.relationId ?? item.relTitleStudentId ?? item.id;
    return {
      optionKey: `int_${value}`,
      value,
      internshipId: item.internshipId ?? null,
      label: `校内 - ${item.internshipName || ''} ${item.titleName || item.name || ''}`.trim(),
    };
  });

  stuInternshipOptions.value = [...extOptions, ...intOptions].filter(
    (item) => item.value != null && item.value !== '' && item.internshipId != null
  );
}

function resetLeaveForm() {
  leaveForm.id = null;
  leaveForm.stuInternshipId = null;
  leaveForm.startTime = '';
  leaveForm.endTime = '';
  leaveForm.remarks = '';
  leaveForm.timeRange = null;
  leaveTimeRange.value = [];
  editingRowSnapshot.value = null;
}

function syncRangeToForm() {
  if (!Array.isArray(leaveTimeRange.value) || leaveTimeRange.value.length !== 2) {
    leaveForm.startTime = '';
    leaveForm.endTime = '';
    return;
  }
  leaveForm.startTime = leaveTimeRange.value[0];
  leaveForm.endTime = leaveTimeRange.value[1];
}

function handleAppendClick() {
  openLeaveDialog();
}

function handleEditClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  if (!canEditLeave(row)) {
    ElMessage.warning('该请假单已提交或已审核，不能编辑');
    return;
  }
  openLeaveDialog(row);
}

function openLeaveDialog(row = null) {
  resetLeaveForm();
  if (row) {
    editingRowSnapshot.value = { ...row };
    leaveForm.id = resolveLeaveId(row);
    leaveForm.stuInternshipId = row.stuInternshipId ?? row.stu_internship_id ?? null;
    leaveForm.startTime = row.startTime || '';
    leaveForm.endTime = row.endTime || '';
    leaveForm.remarks = row.remarks || '';
    if (leaveForm.startTime && leaveForm.endTime) {
      leaveTimeRange.value = [leaveForm.startTime, leaveForm.endTime];
    }
  } else if (stuInternshipOptions.value.length === 1) {
    leaveForm.stuInternshipId = stuInternshipOptions.value[0].value;
  }
  leaveDialogVisible.value = true;
}

function verifyPayloadFromProcess(proc) {
  if (!proc) return null;
  return {
    verifyTypeId: Number(proc.verifyTypeId ?? CONSTANT.VERIFY_LEVEL.NO_VERIFY),
    verifyFirstRoleId: Number(proc.verifyFirstRoleId || 0),
    verifySecondRoleId: Number(proc.verifySecondRoleId || 0),
    verifyThirdRoleId: Number(proc.verifyThirdRoleId || 0),
    verifyFourthRoleId: Number(proc.verifyFourthRoleId || 0),
    verifyFifthRoleId: Number(proc.verifyFifthRoleId || 0),
  };
}

function verifyPayloadFromLeaveRow(row) {
  if (!row || row.verifyTypeId == null) return null;
  return {
    verifyTypeId: Number(row.verifyTypeId),
    verifyFirstRoleId: Number(row.verifyFirstRoleId || 0),
    verifySecondRoleId: Number(row.verifySecondRoleId || 0),
    verifyThirdRoleId: Number(row.verifyThirdRoleId || 0),
    verifyFourthRoleId: Number(row.verifyFourthRoleId || 0),
    verifyFifthRoleId: Number(row.verifyFifthRoleId || 0),
  };
}

async function loadLeaveProcessForInternship(internshipId) {
  if (!internshipId) return null;
  const res = await listAPI.getSomeRecords({
    keyWords: 'ViewRelProcessInternship',
    searchKey: { internshipId, processTypeName: LEAVE_PROCESS_NAME },
    reg: { internshipId: '=', processTypeName: CONSTANT.SEARCH_OPERATOR.LIKE },
    pageInfo: { page: 1, size: 1 },
    sort: { properties: 'id', direction: 'ASC' },
  });
  return res?.data?.content?.[0] ?? null;
}

async function buildLeavePayload() {
  const opt = stuInternshipOptions.value.find(
    (item) => String(item.value) === String(leaveForm.stuInternshipId)
  );
  if (!opt) {
    throw new Error('请选择关联实习记录');
  }

  let verifyPayload = null;
  const proc = await loadLeaveProcessForInternship(opt.internshipId);
  verifyPayload = verifyPayloadFromProcess(proc);
  if (!verifyPayload && editingRowSnapshot.value) {
    verifyPayload = verifyPayloadFromLeaveRow(editingRowSnapshot.value);
  }
  if (!verifyPayload) {
    throw new Error('无法获取关联项目下的请假审核流程配置，请联系管理员或稍后再试');
  }

  return {
    ...(leaveForm.id != null ? { id: leaveForm.id } : {}),
    stuInternshipId: Number(leaveForm.stuInternshipId),
    startTime: leaveForm.startTime,
    endTime: leaveForm.endTime,
    remarks: (leaveForm.remarks || '').trim(),
    ...verifyPayload,
  };
}

async function validateLeaveForm() {
  syncRangeToForm();
  leaveForm.timeRange =
    Array.isArray(leaveTimeRange.value) && leaveTimeRange.value.length === 2 ? 1 : '';
  await leaveFormRef.value?.validate();
}

function resolveSavedLeaveId(res) {
  const raw = res?.data?.id ?? res?.data?.leaveId ?? res?.data ?? leaveForm.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function persistLeave({ showMessage = true } = {}) {
  await validateLeaveForm();
  const payload = await buildLeavePayload();
  const res = await mainLeaveAPI.saveLeave(payload);
  if (!res || (res.message && res.message !== 'successful')) {
    throw new Error(res?.message || '保存失败');
  }
  const savedId = resolveSavedLeaveId(res);
  if (savedId) leaveForm.id = savedId;
  if (showMessage) ElMessage.success('保存成功');
  return savedId;
}

async function saveLeaveOnly() {
  try {
    await persistLeave();
    leaveDialogVisible.value = false;
    await refreshList();
  } catch (e) {
    if (e?.message) ElMessage.warning(e.message);
  }
}

async function saveAndSubmit() {
  try {
    const leaveId = await persistLeave({ showMessage: false });
    if (!leaveId) {
      ElMessage.warning('保存成功，但未获取到请假单 ID，暂时无法提交');
      await refreshList();
      return;
    }
    await submitLeaveById(leaveId);
    leaveDialogVisible.value = false;
    await refreshList();
  } catch (e) {
    if (e?.message) ElMessage.warning(e.message);
  }
}

async function submitLeaveById(leaveId) {
  const res = await mainLeaveAPI.submitLeaveAudit(leaveId);
  if (res && res.message && res.message !== 'successful') {
    throw new Error(res.message || '提交审核失败');
  }
  ElMessage.success('提交成功');
}

async function rollbackAutoPassedLeave(row) {
  const verifyProcessId = resolveVerifyProcessId(row);
  if (!verifyProcessId) {
    ElMessage.warning('未找到审核流程记录，无法退回');
    return;
  }
  try {
    await ElMessageBox.confirm('该记录为自动通过，是否退回以重新编辑？', '提示', {
      confirmButtonText: '退回',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  const res = await listAPI.editOneNode('MainVerifyProcess', {
    id: verifyProcessId,
    isAudit: CONSTANT.AUDIT_STATUS.SAVE,
    reason: null,
    verifyUserName: null,
    verifyUserId: null,
  });
  if (res?.message === 'successful') {
    ElMessage.success('退回成功，可以修改后重新提交');
    await refreshList();
  } else {
    ElMessage.error(res?.message || '退回失败');
  }
}

async function handleSubmitClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;

  if (
    rowAuditStatus(row) === CONSTANT.AUDIT_STATUS.PASS &&
    Number(row?.verifyTypeId) === CONSTANT.VERIFY_LEVEL.NO_VERIFY
  ) {
    await rollbackAutoPassedLeave(row);
    return;
  }

  if (!canSubmitLeave(row)) {
    ElMessage.warning('该请假单已提交或已审核，不能再次提交');
    return;
  }

  const leaveId = resolveLeaveId(row);
  if (!leaveId) {
    ElMessage.warning('无法解析请假单 ID');
    return;
  }

  try {
    await submitLeaveById(leaveId);
    await refreshList();
  } catch (e) {
    ElMessage.warning(e?.message || '提交审核失败');
  }
}

async function handleBatchSubmitClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  const pendingRows = rowsArray.filter((row) => row && canBatchSubmitLeave(row));
  if (!pendingRows.length) {
    ElMessage.warning(`选中的记录中没有可提交的${CONSTANT.AUDIT_STATUS.SAVENAME}或${CONSTANT.AUDIT_STATUS.BACKNAME}数据`);
    return;
  }

  let successCount = 0;
  for (const row of pendingRows) {
    const leaveId = resolveLeaveId(row);
    if (!leaveId) continue;
    try {
      await mainLeaveAPI.submitLeaveAudit(leaveId);
      successCount += 1;
    } catch (error) {
      console.error('批量提交请假单失败:', error);
    }
  }

  if (successCount > 0) {
    ElMessage.success(`批量提交完成，共成功提交 ${successCount} 条记录`);
    await refreshList();
  } else {
    ElMessage.warning('批量提交失败，请稍后重试');
  }
}

async function handleDeleteClick(rows) {
  const list = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  if (!list.length) {
    ElMessage.warning('请选择要删除的请假单');
    return;
  }
  const invalid = list.filter((row) => !canDeleteLeave(row));
  if (invalid.length) {
    ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的请假单`);
    return;
  }

  try {
    for (const row of list) {
      const verifyProcessId = resolveVerifyProcessId(row);
      const leaveId = resolveLeaveId(row);
      if (verifyProcessId) {
        await listAPI.delOneOrManyNodes('MainVerifyProcess', [verifyProcessId]);
      }
      if (leaveId) {
        await mainLeaveAPI.deleteLeave(leaveId);
      }
    }
    ElMessage.success('删除成功');
    await refreshList();
  } catch (error) {
    console.error('删除请假单失败:', error);
    ElMessage.error('删除失败');
  }
}

async function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  const leaveId = resolveLeaveId(row);
  const records = await loadLeaveFlowRows(leaveId);
  currentRow.value = {
    ...row,
    id: resolveVerifyProcessId(row) ?? row.id,
    leaveId,
    relationId: leaveId,
    tableName: LEAVE_TABLE_NAME,
    _allRecords: records,
  };
  showProgressDialog.value = true;
}

async function refreshList() {
  await dtlRef.value?.initDataList?.(true);
}

onMounted(async () => {
  await loadStuInternshipOptions();
  ready.value = true;
});

defineExpose({
  baseListRef: computed(() => dtlRef.value),
  updateSearchWordsAndRefresh: refreshList,
});
</script>

<style scoped>
.main-leave-page {
  padding: 12px;
}
</style>
