<template>
  <div class="enterprise-info-declaration-page">
    <BaseList
      ref="baseListRef"
      :default-props="defaultProps"
      @append-click="handleAppendClick"
      @edit-click="handleEditClick"
      @submit-click="handleSubmitClick"
      @more2-click="handleBatchSubmitClick"
      @view-click="handleViewClick"
    >
      <template #left>
        <el-button type="primary" :icon="Plus" @click="handleAppendClick">新增</el-button>
      </template>
      <template #current="{ row }">
        <el-tag :type="isRowDisplayEffectiveCurrent(row) ? 'success' : 'info'">
          {{ isRowDisplayEffectiveCurrent(row) ? '当前有效' : '历史版本' }}
        </el-tag>
      </template>
      <template #dlg />
    </BaseList>

    <DlgEnterpriseInfoDeclaration
      ref="dlgDeclarationRef"
      :mine-data="mineData"
      :current-approved="currentApproved"
      :verify-config="verifyConfig"
      @success="handleDialogSuccess"
    />

    <DlgVerifyProgress
      v-model="showProgressDialog"
      :process-info="progressProcessInfo"
      creator-label="提交者"
      key-words="MainVerifyProcess"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgEnterpriseInfoDeclaration from '@/views/internship-process/components/DlgEnterpriseInfoDeclaration.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import listAPI from '@/api/list';
import {
  clearEnterpriseMineCache,
  getEnterpriseMine,
  isCompanyUser,
} from '@/utils/enterpriseAccess';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import {
  ENTERPRISE_TABLE_NAME,
  isEnterpriseVerifyConfigReady,
  normalizeDetailPayload,
  normalizePageResponse,
  normalizeRecord,
  resolveAuditStatus,
} from '@/utils/enterpriseInfoView';

defineOptions({
  name: 'EnterpriseInfoDeclaration',
});

const baseListRef = ref(null);
const dlgDeclarationRef = ref(null);
const mineData = ref({});

const listSearchWords = reactive({
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
});

const effectiveVersionOptions = [
  { id: 0, name: '全部版本' },
  { id: 1, name: '仅当前有效通过版' },
];

const verifyConfig = ref({});
const showProgressDialog = ref(false);
const progressRow = ref({});
const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

const { getVerifyRoleName } = useVerifyFilter();

const progressProcessInfo = computed(() => {
  const row = progressRow.value || {};
  const relationId = row?.enterpriseInfoId ?? row?.relationId ?? row?.id;
  const status = resolveAuditStatus(row);
  let createUserName = row.createUserName ?? row.create_user_name;
  if ((!createUserName || String(createUserName).trim() === '') && isCurrentUserRecord(row)) {
    createUserName = userInfo.value?.name || userInfo.value?.username || userInfo.value?.userName || '';
  }
  return {
    ...row,
    relationId,
    tableName: ENTERPRISE_TABLE_NAME,
    isAudit: status,
    verifyTypeId: row.verifyTypeId ?? verifyConfig.value?.verifyTypeId,
    processId: row.processId,
    createUserName,
    _currentRoleName: getVerifyRoleName({ ...row, relationId, isAudit: status, createUserName }),
  };
});

const currentApproved = computed(() => normalizeRecord(mineData.value.currentApproved));
const latestRecord = computed(() => normalizeRecord(mineData.value.latestRecord));

const defaultProps = computed(() => ({
  defaultDTLProps: {
    someFlags: {
      autoInit: true,
      checkFlag: true,
      showPage: true,
      noAdvancedSearch: false,
    },
    pageInfo: { page: 1, size: 10, sizes: [10, 20, 50] },
    sortStr: { properties: 'id', direction: 'DESC' },
    fetchRecords: fetchHistoryRecords,
    initSearchWords: listSearchWords.initSearchWords,
    nowSearchWords: listSearchWords.nowSearchWords,
    searchItems: [
      {
        name: '企业名称/统一社会信用代码',
        field: 'keyword',
        type: 'input',
        placeholder: '请输入企业名称或统一社会信用代码',
      },
      {
        name: '版本范围',
        field: 'onlyEffectiveCurrent',
        type: 'select',
        options: effectiveVersionOptions,
        placeholder: '版本范围',
      },
    ],
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    buttonCondition: {
      submit: (row) => {
        const status = resolveAuditStatus(row);
        return status === CONSTANT.AUDIT_STATUS.SAVE || status === CONSTANT.AUDIT_STATUS.BACK;
      },
    },
    defaultDTHProps: {
      searchPanel: true,
      buttonProps: {
        create: { show: false },
        update: { show: true, name: '编辑/查看' },
        visible: { show: true, type: 'primary', name: '查看进度' },
        submit: { show: true, type: 'warning', name: '提交' },
        more2: { show: true, name: '批量提交', type: 'primary' },
      },
      keyWord: { edit: 'MainEnterpriseInfo', view: 'MainEnterpriseInfo' },
      allTableColumns: [
        { id: 1, showName: '企业名称', theOrder: 1, tableColumnName: 'name', sortable: true },
        { id: 2, showName: '统一社会信用代码', theOrder: 2, tableColumnName: 'code', sortable: true },
        { id: 3, showName: '联系人', theOrder: 3, tableColumnName: 'contactName', sortable: true },
        { id: 4, showName: '联系电话', theOrder: 4, tableColumnName: 'contactPhone', sortable: true },
        { id: 5, showName: '当前有效', theOrder: 5, tableColumnName: 'customize-current', width: 100 },
        { id: 6, showName: '状态', theOrder: 6, tableColumnName: 'customize-status', sortable: true, width: 140 },
        { id: 7, showName: '审核意见', theOrder: 7, tableColumnName: 'reason' },
        { id: 8, showName: '更新时间', theOrder: 8, tableColumnName: 'updateTime', sortable: true, width: 170 },
      ],
    },
  },
}));

async function loadMineData() {
  mineData.value = await getEnterpriseMine({ refresh: true });
}

async function loadVerifyConfig() {
  if (isCompanyUser(store)) {
    verifyConfig.value = mineData.value?.verifyConfig || {};
    return;
  }
  const res = await enterpriseInfoAPI.getVerifyConfig();
  verifyConfig.value = res?.data || {};
}

async function hasEnterpriseAttachments(enterpriseInfoId) {
  if (!enterpriseInfoId) return false;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'SysOssFile',
      searchKey: { relationIds: enterpriseInfoId, tableName: ENTERPRISE_TABLE_NAME },
      reg: { relationIds: '=', tableName: '=' },
      pageInfo: { page: 1, size: 1 },
    });
    const total = Number(res?.data?.page?.totalElements ?? res?.data?.totalElements ?? 0);
    if (total > 0) return true;
    const list = res?.data?.content;
    return Array.isArray(list) && list.length > 0;
  } catch {
    return false;
  }
}

function isRowDisplayEffectiveCurrent(row) {
  if (row?.effectiveCurrent === true) return true;
  if (row?.effectiveCurrent === false) return false;
  return Boolean(row?.isCurrent);
}

async function fetchHistoryRecords(params = {}) {
  const searchKey = {
    keyword: params?.searchKey?.keyword || '',
    createUserId: userInfo.value.id,
  };
  if (Number(params?.searchKey?.onlyEffectiveCurrent) === 1) {
    searchKey.onlyEffectiveCurrent = true;
  }
  const res = await enterpriseInfoAPI.history({
    searchKey,
    pageInfo: params?.pageInfo || { page: 1, size: 10 },
    sort: params?.sort || { properties: 'id', direction: 'DESC' },
  });
  const normalized = normalizePageResponse(res, normalizeRecord);
  const content = (normalized?.data?.content || []).filter((row) => isCurrentUserRecord(row));
  return {
    ...normalized,
    data: {
      ...(normalized.data || {}),
      content,
      totalElements: content.length,
      page: {
        ...(normalized.data?.page || {}),
        totalElements: content.length,
      },
    },
  };
}

async function fetchRecordDetail(row) {
  const enterpriseInfoId = row?.enterpriseInfoId ?? row?.id;
  if (!enterpriseInfoId) return normalizeRecord(row);
  const res = await enterpriseInfoAPI.detail({ enterpriseInfoId });
  return normalizeDetailPayload(res?.data || {}, row);
}

function getCreatePrefillSource() {
  if (latestRecord.value.enterpriseInfoId) {
    return latestRecord.value;
  }
  if (currentApproved.value.enterpriseInfoId) {
    return currentApproved.value;
  }
  return {
    companyName: mineData.value.companyName,
    companyCode: mineData.value.companyCode,
  };
}

function isCurrentUserRecord(row = {}) {
  const currentUserId = Number(userInfo.value.id);
  if (!Number.isFinite(currentUserId) || currentUserId <= 0) {
    return true;
  }
  const creatorId = Number(
    row?.createUserId ??
      row?.creatorId ??
      row?.applyUserId ??
      row?.userId ??
      row?.createBy
  );
  if (!Number.isFinite(creatorId) || creatorId <= 0) {
    return true;
  }
  return creatorId === currentUserId;
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  progressRow.value = { ...row };
  showProgressDialog.value = true;
}

function handleAppendClick() {
  dlgDeclarationRef.value?.showDialog(true, {}, {
    mode: 'append',
    prefillSource: getCreatePrefillSource(),
  });
}

async function handleEditClick(row) {
  const detail = await fetchRecordDetail(row);
  const status = resolveAuditStatus(detail);
  const mode =
    status === CONSTANT.AUDIT_STATUS.SAVE || status === CONSTANT.AUDIT_STATUS.BACK ? 'edit' : 'view';
  dlgDeclarationRef.value?.showDialog(true, detail, { mode });
}

async function submitEnterpriseRecord(row) {
  if (!isEnterpriseVerifyConfigReady(verifyConfig.value)) {
    ElMessage.warning('企业信息审核流程未配置，请联系学校管理员先完成流程配置');
    return false;
  }

  const detail = await fetchRecordDetail(row);
  const enterpriseInfoId = detail.enterpriseInfoId;
  if (!enterpriseInfoId) {
    ElMessage.warning('缺少企业信息主键，无法提交');
    return false;
  }
  const hasFiles = await hasEnterpriseAttachments(enterpriseInfoId);
  if (!hasFiles) {
    ElMessage.warning(
      '提交审核前请至少上传 1 个附件。请点击「编辑/查看」，切换到「附件材料」上传后再提交。'
    );
    return false;
  }

  const payload = {
    enterpriseInfoId,
  };
  const isBackResubmit = resolveAuditStatus(detail) === CONSTANT.AUDIT_STATUS.BACK;
  const res = isBackResubmit
    ? await enterpriseInfoAPI.resubmit(payload)
    : await enterpriseInfoAPI.submit(payload);
  return res?.message === 'successful';
}

async function handleSubmitClick(row) {
  if (!row) return;
  const success = await submitEnterpriseRecord(row);
  if (success) {
    ElMessage.success('提交成功');
    await handleDialogSuccess();
  }
}

async function handleBatchSubmitClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  if (!rowsArray.length) {
    ElMessage.warning('请先勾选需要提交的记录');
    return;
  }

  const pendingRows = rowsArray.filter((row) => {
    const status = resolveAuditStatus(row);
    return status === CONSTANT.AUDIT_STATUS.SAVE || status === CONSTANT.AUDIT_STATUS.BACK;
  });

  if (!pendingRows.length) {
    ElMessage.warning('选中的记录中没有可提交的数据');
    return;
  }

  let successCount = 0;
  const failures = [];
  for (const row of pendingRows) {
    try {
      if (await submitEnterpriseRecord(row)) {
        successCount += 1;
      } else {
        // submitEnterpriseRecord 已弹具体校验提示
        failures.push(row);
      }
    } catch (e) {
      console.error('企业信息提交失败:', e);
      failures.push(row);
    }
  }

  if (successCount > 0) {
    if (failures.length) {
      ElMessage.warning(`批量提交完成：成功 ${successCount} 条，失败 ${failures.length} 条`);
    } else {
      ElMessage.success(`批量提交完成，共成功提交 ${successCount} 条记录`);
    }
    await handleDialogSuccess();
  } else if (failures.length) {
    ElMessage.error(`批量提交失败，共 ${failures.length} 条未提交`);
  }
}

async function handleDialogSuccess() {
  clearEnterpriseMineCache();
  await loadMineData();
  await loadVerifyConfig();
  baseListRef.value?.initDataList?.(true);
}

onMounted(async () => {
  await loadMineData();
  await loadVerifyConfig();
});
</script>
