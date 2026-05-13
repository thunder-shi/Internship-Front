<template>
  <div class="enterprise-info-audit-page">
    <BaseList
      ref="baseListRef"
      :default-props="defaultProps"
      @audit-click="handleAuditClick"
      @audit-command="handleBatchAuditCommand"
      @edit-click="handleEditClick"
    >
      <template #current="{ row }">
        <el-tag :type="isRowDisplayEffectiveCurrent(row) ? 'success' : 'info'">
          {{ isRowDisplayEffectiveCurrent(row) ? '当前有效' : '历史版本' }}
        </el-tag>
      </template>
    </BaseList>

    <DlgVerify
      ref="dlgVerifyRef"
      dlg-title="企业信息审核"
      recall-title="退回已通过的企业信息"
      :audit-api="auditEnterpriseInfo"
      @success="handleVerifySuccess"
    />

    <DlgEnterpriseInfoDetail
      ref="dlgDetailRef"
      dlg-title="企业信息详情"
      :detail-api="enterpriseInfoAPI.auditDetail"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgEnterpriseInfoDetail from '@/views/internship-process/components/DlgEnterpriseInfoDetail.vue';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import CONSTANT from '@/utils/constant';
import { useBatchVerifyAuditDialog } from '@/utils/useBatchVerifyAuditDialog';
import {
  normalizePageResponse,
  normalizeRecord,
  resolveAuditStatus,
  resolveVerifyProcessId,
} from '@/utils/enterpriseInfoView';

defineOptions({
  name: 'EnterpriseInfoAudit',
});

const baseListRef = ref(null);
const dlgVerifyRef = ref(null);
const dlgDetailRef = ref(null);
const store = useStore();

const listSearchWords = reactive({
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
});

const { handleAuditClick, handleBatchAuditCommand } = useBatchVerifyAuditDialog(dlgVerifyRef);

const auditStatusOptions = [
  { id: '', name: '全部状态' },
  { id: CONSTANT.AUDIT_STATUS.SUBMIT, name: CONSTANT.AUDIT_STATUS.SUBMITNAME },
  { id: CONSTANT.AUDIT_STATUS.PASS, name: CONSTANT.AUDIT_STATUS.PASSNAME },
  { id: CONSTANT.AUDIT_STATUS.NOTPASS, name: CONSTANT.AUDIT_STATUS.NOTPASSNAME },
  { id: CONSTANT.AUDIT_STATUS.BACK, name: CONSTANT.AUDIT_STATUS.BACKNAME },
];

const mineScopeOptions = [
  { id: 0, name: '全部记录' },
  { id: 1, name: '仅看我的待审' },
];

const effectiveVersionOptions = [
  { id: 0, name: '全部版本' },
  { id: 1, name: '仅当前有效通过版' },
];

const defaultProps = computed(() => ({
  defaultDTLProps: {
    someFlags: {
      autoInit: true,
      checkFlag: true,
      showPage: true,
      noAdvancedSearch: false,
    },
    pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
    sortStr: { properties: 'id', direction: 'DESC' },
    fetchRecords: fetchAuditRecords,
    initSearchWords: listSearchWords.initSearchWords,
    nowSearchWords: listSearchWords.nowSearchWords,
    searchItems: [
      { name: '企业名称/统一社会信用代码', field: 'keyword', type: 'input', placeholder: '请输入企业名称或统一社会信用代码' },
      { name: '审核状态', field: 'auditStatus', type: 'select', options: auditStatusOptions, placeholder: '审核状态' },
      { name: '查询范围', field: 'onlyMine', type: 'select', options: mineScopeOptions, placeholder: '查询范围' },
      { name: '版本范围', field: 'onlyEffectiveCurrent', type: 'select', options: effectiveVersionOptions, placeholder: '版本范围' },
    ],
    buttonCondition: {
      audit: (row) => {
        const status = resolveAuditStatus(row);
        return status === CONSTANT.AUDIT_STATUS.SUBMIT || status === CONSTANT.AUDIT_STATUS.PASS;
      },
    },
    defaultDTHProps: {
      searchPanel: true,
      buttonProps: {
        audit: { show: true, showPass: true, showNotPass: true, showBack: true },
        update: { show: true, name: '查看详情' },
      },
      keyWord: { edit: 'MainEnterpriseInfo', view: 'MainEnterpriseInfo' },
      allTableColumns: [
        { id: 1, showName: '企业名称', theOrder: 1, tableColumnName: 'name', sortable: true },
        { id: 2, showName: '统一社会信用代码', theOrder: 2, tableColumnName: 'code', sortable: true },
        { id: 3, showName: '联系人', theOrder: 3, tableColumnName: 'contactName', sortable: true, width: 120 },
        { id: 4, showName: '联系电话', theOrder: 4, tableColumnName: 'contactPhone', sortable: true, width: 140 },
        { id: 5, showName: '提交人', theOrder: 5, tableColumnName: 'createUserName', sortable: true, width: 120 },
        { id: 6, showName: '提交时间', theOrder: 6, tableColumnName: 'createTime', sortable: true, width: 170 },
        { id: 7, showName: '当前有效', theOrder: 7, tableColumnName: 'customize-current', width: 100 },
        { id: 8, showName: '当前状态', theOrder: 8, tableColumnName: 'isAudit', sortable: true, width: 120 },
        { id: 9, showName: '审核意见', theOrder: 9, tableColumnName: 'reason' },
      ],
    },
  },
}));

function normalizeAuditRow(row = {}) {
  const normalized = normalizeRecord(row);
  normalized.id = resolveVerifyProcessId(row);
  normalized.verifyProcessId = resolveVerifyProcessId(row);
  normalized.isAudit = resolveAuditStatus(row);
  return normalized;
}

function isRowDisplayEffectiveCurrent(row) {
  if (row?.effectiveCurrent === true) return true;
  if (row?.effectiveCurrent === false) return false;
  return Boolean(row?.isCurrent);
}

async function fetchAuditRecords(params = {}) {
  const searchKey = {
    keyword: params?.searchKey?.keyword || '',
  };

  const rawAudit = params?.searchKey?.auditStatus;
  if (rawAudit !== undefined && rawAudit !== null && rawAudit !== '') {
    searchKey.auditStatus = rawAudit;
  }
  // 未选择审核状态时不传 auditStatus，列表保留并展示含「审核通过」「审核不通过」在内的全部记录

  if (Number(params?.searchKey?.onlyMine) === 1) {
    searchKey.onlyMine = true;
  }

  if (Number(params?.searchKey?.onlyEffectiveCurrent) === 1) {
    searchKey.onlyEffectiveCurrent = true;
  }

  const res = await enterpriseInfoAPI.auditList({
    searchKey,
    pageInfo: params?.pageInfo || { page: 1, size: 20 },
    sort: params?.sort || { properties: 'id', direction: 'DESC' },
  });
  return normalizePageResponse(res, normalizeAuditRow);
}

async function auditEnterpriseInfo(payload) {
  const list = Array.isArray(payload) ? payload : [payload];
  const userName = store.getters.userInfo?.name || store.getters.userInfo?.username || '';
  for (const item of list) {
    const auditText = item.reason != null ? String(item.reason) : '';
    // 与后端 auditReasonFromNode 读取顺序对齐，避免只认 remarks/auditReason 等别名时落库 reason 为空
    await enterpriseInfoAPI.auditProcess({
      verifyProcessId: item.id,
      isAudit: item.isAudit,
      reason: auditText,
      remarks: auditText,
      auditRemark: auditText,
      auditReason: auditText,
      auditOpinion: auditText,
      verifyUserId: item.verifyUserId,
      verifyUserName: userName,
    });
  }
  return { message: 'successful' };
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;
  dlgDetailRef.value?.showDialog(true, selectedRow);
}

function handleVerifySuccess() {
  baseListRef.value?.initDataList?.(true);
}
</script>

<style scoped>
.enterprise-info-audit-page {
  padding: 12px;
}
</style>
