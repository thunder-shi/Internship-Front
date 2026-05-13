<template>
  <div class="enterprise-info-query-page">
    <BaseList
      ref="baseListRef"
      :default-props="defaultProps"
      @edit-click="handleEditClick"
    >
      <template #current="{ row }">
        <el-tag :type="isRowDisplayCurrent(row) ? 'success' : 'info'">
          {{ isRowDisplayCurrent(row) ? '当前有效' : '历史版本' }}
        </el-tag>
      </template>
    </BaseList>

    <DlgEnterpriseInfoDetail
      ref="dlgDetailRef"
      dlg-title="企业信息详情"
      :detail-api="enterpriseInfoAPI.detail"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import listAPI from '@/api/list';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgEnterpriseInfoDetail from '@/views/internship-process/components/DlgEnterpriseInfoDetail.vue';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import CONSTANT from '@/utils/constant';
import { normalizePageResponse, normalizeRecord, resolveAuditStatus } from '@/utils/enterpriseInfoView';

/**
 * 列表「当前有效」列：优先 effectiveCurrent（企业专用 summary 接口才有）；否则 isCurrent；
 * 通用 getSomeRecords(MainEnterpriseInfo) 无 effectiveCurrent 时，在本页内按与后端 resolveEffectiveApprovedRecord
 * 一致规则为 PASS 行推断（同企业信用代码下 approvedTime → versionNo → id，仅本页展示）。
 */
defineOptions({
  name: 'EnterpriseInfoQuery',
});

const baseListRef = ref(null);
const dlgDetailRef = ref(null);

/** 须为稳定引用，供 DataTableList 就地写入；勿放在 computed 内否则每次求值会清空条件导致搜索无效 */
const listSearchWords = reactive({
  initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
  nowSearchWords: { searchKey: {}, regKey: {}, andor: {} },
});

const currentFlagOptions = [
  { id: 1, name: '当前有效' },
  { id: 0, name: '历史版本' },
];

const defaultProps = computed(() => ({
  defaultDTLProps: {
    someFlags: {
      autoInit: true,
      checkFlag: false,
      hideSelectColumn: true,
      showPage: true,
      noAdvancedSearch: false,
    },
    pageInfo: { page: 1, size: 20, sizes: [10, 20, 50, 100] },
    sortStr: { properties: 'id', direction: 'DESC' },
    fetchRecords: fetchQueryRecords,
    initSearchWords: listSearchWords.initSearchWords,
    nowSearchWords: listSearchWords.nowSearchWords,
    searchItems: [
      { name: '企业名称', field: 'name', type: 'input', placeholder: '请输入企业名称' },
      {
        name: '统一社会信用代码',
        field: 'code',
        type: 'input',
        placeholder: '请输入统一社会信用代码',
      },
      {
        name: '当前有效',
        field: 'isCurrent',
        type: 'select',
        options: currentFlagOptions,
        placeholder: '全部',
      },
    ],
    defaultDTHProps: {
      searchPanel: true,
      buttonProps: {
        search: { show: true },
        update: { show: true, name: '查看详情' },
      },
      keyWord: { edit: 'MainEnterpriseInfo', view: 'MainEnterpriseInfo' },
      allTableColumns: [
        { id: 1, showName: '企业名称', theOrder: 1, tableColumnName: 'name', sortable: true },
        { id: 2, showName: '统一社会信用代码', theOrder: 2, tableColumnName: 'code', sortable: true },
        { id: 3, showName: '联系人', theOrder: 3, tableColumnName: 'contactName', sortable: true, width: 120 },
        { id: 4, showName: '联系电话', theOrder: 4, tableColumnName: 'contactPhone', sortable: true, width: 140 },
        { id: 5, showName: '联系邮箱', theOrder: 5, tableColumnName: 'contactEmail', sortable: true, width: 180 },
        { id: 6, showName: '当前有效', theOrder: 6, tableColumnName: 'customize-current', width: 100 },
        { id: 7, showName: '当前状态', theOrder: 7, tableColumnName: 'isAudit', sortable: true, width: 120 },
        { id: 8, showName: '审核意见', theOrder: 8, tableColumnName: 'reason' },
        { id: 9, showName: '更新时间', theOrder: 9, tableColumnName: 'updateTime', sortable: true, width: 170 },
      ],
    },
  },
}));

function companyGroupKey(row) {
  const code = String(row.code || row.companyCode || '').trim();
  if (code) return `code:${code}`;
  const cid = row.companyId ?? row.company_id;
  if (cid != null && String(cid).trim() !== '') return `companyId:${cid}`;
  return `eid:${row.enterpriseInfoId ?? row.id}`;
}

function parseTimeMs(t) {
  if (t == null || t === '') return 0;
  const n = Date.parse(t);
  return Number.isFinite(n) ? n : 0;
}

/** 与后端 PASS 回落序一致：approvedTime → versionNo → id */
function compareNewestPassFirst(a, b) {
  const at =
    parseTimeMs(a.approvedTime ?? a.approved_time) ||
    parseTimeMs(a.updateTime);
  const bt =
    parseTimeMs(b.approvedTime ?? b.approved_time) ||
    parseTimeMs(b.updateTime);
  if (bt !== at) return bt - at;
  const va = Number(a.versionNo ?? a.version_no ?? 0) || 0;
  const vb = Number(b.versionNo ?? b.version_no ?? 0) || 0;
  if (vb !== va) return vb - va;
  const ida = Number(a.enterpriseInfoId ?? a.id) || 0;
  const idb = Number(b.enterpriseInfoId ?? b.id) || 0;
  return idb - ida;
}

/** 本页展示用：优先 effectiveCurrent，再 isCurrent，再本页推断 */
function isRowDisplayCurrent(row) {
  if (row?.effectiveCurrent === true) return true;
  if (row?.effectiveCurrent === false) return false;
  return Boolean(row?.isCurrent || row?._queryDisplayCurrent);
}

function augmentQueryListDisplayCurrent(rows) {
  if (!Array.isArray(rows)) return;
  if (
    rows.length > 0 &&
    rows.every((r) => r.effectiveCurrent === true || r.effectiveCurrent === false)
  ) {
    return;
  }
  for (const row of rows) {
    row._queryDisplayCurrent = false;
  }
  const map = new Map();
  for (const row of rows) {
    const key = companyGroupKey(row);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  for (const group of map.values()) {
    const pass = group.filter((r) => resolveAuditStatus(r) === CONSTANT.AUDIT_STATUS.PASS);
    if (!pass.length) continue;
    const explicit = pass.filter((r) => r.isCurrent === true);
    if (explicit.length > 0) {
      for (const r of explicit) {
        r._queryDisplayCurrent = true;
      }
      continue;
    }
    pass.sort(compareNewestPassFirst);
    pass[0]._queryDisplayCurrent = true;
  }
}

async function fetchQueryRecords(params = {}) {
  const searchKey = { ...(params.searchKey || {}) };
  const reg = { ...(params.reg || {}) };

  const trimOrDelete = (field) => {
    if (!(field in searchKey)) return;
    const v = searchKey[field];
    if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
      delete searchKey[field];
      delete reg[field];
      return;
    }
    if (typeof v === 'string') {
      searchKey[field] = v.trim();
    }
  };

  trimOrDelete('name');
  trimOrDelete('code');

  if (searchKey.name != null && searchKey.name !== '' && !reg.name) {
    reg.name = CONSTANT.SEARCH_OPERATOR.LIKE;
  }
  if (searchKey.code != null && searchKey.code !== '' && !reg.code) {
    reg.code = CONSTANT.SEARCH_OPERATOR.LIKE;
  }

  if (
    searchKey.isCurrent !== undefined &&
    searchKey.isCurrent !== null &&
    searchKey.isCurrent !== ''
  ) {
    searchKey.isCurrent = Number(searchKey.isCurrent);
    if (!reg.isCurrent) {
      reg.isCurrent = CONSTANT.SEARCH_OPERATOR.EQ;
    }
  } else {
    delete searchKey.isCurrent;
    delete reg.isCurrent;
  }

  const res = await listAPI.getSomeRecords({
    keyWords: params?.keyWords || 'MainEnterpriseInfo',
    searchKey,
    reg,
    pageInfo: params?.pageInfo || { page: 1, size: 20 },
    sort: params?.sort || { properties: 'id', direction: 'DESC' },
  });
  const normalized = normalizePageResponse(res, normalizeRecord);
  augmentQueryListDisplayCurrent(normalized?.data?.content || []);
  return normalized;
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;
  dlgDetailRef.value?.showDialog(true, selectedRow);
}
</script>

<style scoped>
.enterprise-info-query-page {
  padding: 12px;
}
</style>
