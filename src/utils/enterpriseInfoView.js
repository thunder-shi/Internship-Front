import CONSTANT from '@/utils/constant';

export const ENTERPRISE_TABLE_NAME = 'MainEnterpriseInfo';

export const ENTERPRISE_FILE_BADGES = Object.freeze({
  doc: { text: 'W', bg: '#2b579a' },
  docx: { text: 'W', bg: '#2b579a' },
  xls: { text: 'X', bg: '#217346' },
  xlsx: { text: 'X', bg: '#217346' },
  ppt: { text: 'P', bg: '#d24726' },
  pptx: { text: 'P', bg: '#d24726' },
  pdf: { text: 'PDF', bg: '#f40f02' },
  jpg: { text: 'IMG', bg: '#0e9c75' },
  jpeg: { text: 'IMG', bg: '#0e9c75' },
  png: { text: 'PNG', bg: '#0e9c75' },
  gif: { text: 'GIF', bg: '#0e9c75' },
  bmp: { text: 'IMG', bg: '#0e9c75' },
  webp: { text: 'IMG', bg: '#0e9c75' },
  zip: { text: 'ZIP', bg: '#7d3c98' },
  rar: { text: 'RAR', bg: '#7d3c98' },
  '7z': { text: '7Z', bg: '#7d3c98' },
});

export function normalizeAuditNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : CONSTANT.AUDIT_STATUS.SAVE;
}

export function resolveAuditStatus(record) {
  return normalizeAuditNumber(
    record?.auditStatus ?? record?.isAudit ?? record?.status ?? CONSTANT.AUDIT_STATUS.SAVE
  );
}

/**
 * 列表/详情展示「审核意见」（与主档 remarks 分离，互不兜底）。
 * 与后端 putEnterpriseVerifyListTrail / auditReasonFromNode 一致：优先 reason，并兼容 latestVerifyReason 及 audit*、verify* 等别名。
 */
export function resolveDisplayReason(record = {}) {
  const candidates = [
    record.reason,
    record.latestVerifyReason,
    record.latest_verify_reason,
    record.auditRemark,
    record.auditReason,
    record.auditOpinion,
    record.verifyReason,
    record.lastReason,
    record.lastAuditReason,
    record.verifyRemark,
    record.rejectReason,
    record.opinion,
    record.verify_reason,
    record.audit_reason,
    record.audit_remark,
    record.audit_opinion,
    record.latestReason,
    record.latest_reason,
    record.currentReason,
    record.current_reason,
    record.verifyProcessReason,
    record.verify_process_reason,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

export function resolveEnterpriseInfoId(record) {
  return record?.enterpriseInfoId ?? record?.id ?? record?.relationId ?? null;
}

export function resolveVerifyProcessId(record) {
  return (
    record?.verifyProcessId ??
    record?.verify_process_id ??
    record?.currentVerifyProcessId ??
    record?.current_verify_process_id ??
    record?.mainVerifyProcessId ??
    record?.main_verify_process_id ??
    record?.processRecordId ??
    record?.process_record_id ??
    null
  );
}

/** 提交人用户 id。企业审核列表 `enterpriseInfo/audit/list` 经 `buildRecordSummary.enrichEnterpriseSubmitter` 写入 `createUserId`（与 MainEnterpriseInfo.adminUserId 一致）；旧数据可仅有 adminUserId。 */
export function resolveSubmitterUserId(record = {}) {
  const r = record && typeof record === 'object' ? record : {};
  const candidates = [r.createUserId, r.create_user_id, r.adminUserId, r.admin_user_id];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/**
 * 申报/流程列表「提交人」展示名。
 * 与 ViewVerify* 一致优先使用 `createUserName`；企业审核列表在后端 `enrichEnterpriseSubmitter` 部署后会由接口直接带上。
 * 其余字段名为历史/多视图兼容。
 */
export function resolveCreateUserDisplayName(record = {}) {
  const r = record && typeof record === 'object' ? record : {};
  const candidates = [
    r.createUserName,
    r.create_user_name,
    r.submitUserName,
    r.submit_user_name,
    r.applyUserName,
    r.apply_user_name,
    r.creatorName,
    r.creator_name,
    r.declarantName,
    r.declarant_name,
    r.userName,
    r.user_name,
    r.createByName,
    r.create_by_name,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim();
  }
  return '';
}

/**
 * 企业信息 summary 行「当前有效通过版」（与后端 resolveEffectiveApprovedRecord 一致）。
 * 接口未返回该字段时（如通用 MainEnterpriseInfo 列表）为 undefined，勿当作 false。
 */
export function resolveEffectiveCurrent(record = {}) {
  if (record == null || typeof record !== 'object') return undefined;
  const hasNative = Object.prototype.hasOwnProperty.call(record, 'effectiveCurrent');
  const hasSnake = Object.prototype.hasOwnProperty.call(record, 'effective_current');
  if (!hasNative && !hasSnake) return undefined;
  const v = record.effectiveCurrent ?? record.effective_current;
  if (v === undefined || v === null || v === '') return undefined;
  return v === true || v === 'true' || Number(v) === 1;
}

export function normalizeRecord(record = {}) {
  const safeRecord = record && typeof record === 'object' ? record : {};
  const currentValue = safeRecord.isCurrent ?? safeRecord.current ?? safeRecord.currentFlag;
  const effectiveCurrentFlag = resolveEffectiveCurrent(safeRecord);
  return {
    ...safeRecord,
    id: resolveEnterpriseInfoId(safeRecord),
    enterpriseInfoId: resolveEnterpriseInfoId(safeRecord),
    verifyProcessId: resolveVerifyProcessId(safeRecord),
    auditStatus: resolveAuditStatus(safeRecord),
    isAudit: resolveAuditStatus(safeRecord),
    /** 行数据是否标为当前主档（库表 isCurrent）；终审/退回/不通过后由 syncIsCurrentForCompany 对齐，与 effectiveCurrent 趋同 */
    isCurrent:
      currentValue === true ||
      currentValue === 'true' ||
      Number(currentValue) === 1,
    ...(effectiveCurrentFlag !== undefined ? { effectiveCurrent: effectiveCurrentFlag } : {}),
    code: safeRecord.code ?? safeRecord.companyCode ?? '',
    name: safeRecord.name ?? safeRecord.companyName ?? '',
    companyName: safeRecord.companyName ?? safeRecord.name ?? '',
    companyCode: safeRecord.companyCode ?? safeRecord.code ?? '',
    contactName: safeRecord.contactName ?? '',
    contactPhone: safeRecord.contactPhone ?? '',
    contactEmail: safeRecord.contactEmail ?? '',
    address: safeRecord.address ?? '',
    legalPerson: safeRecord.legalPerson ?? '',
    industry: safeRecord.industry ?? '',
    companyScale: safeRecord.companyScale ?? '',
    businessScope: safeRecord.businessScope ?? '',
    introduction: safeRecord.introduction ?? '',
    remarks: safeRecord.remarks ?? '',
    reason: resolveDisplayReason(safeRecord),
    createUserId: resolveSubmitterUserId(safeRecord),
    createUserName: resolveCreateUserDisplayName(safeRecord),
  };
}

export function normalizePageResponse(res, mapper = normalizeRecord) {
  const rawData = res?.data;
  const data = Array.isArray(rawData) ? { content: rawData } : rawData || {};
  const rawList = data.content ?? data.records ?? data.list ?? data.data ?? [];
  const content = (Array.isArray(rawList) ? rawList : []).map(mapper);
  const totalElements = Number(
    data?.page?.totalElements ?? data?.totalElements ?? data?.total ?? content.length
  );
  return {
    ...(res || {}),
    data: {
      ...data,
      content,
      totalElements,
      page: {
        ...(data?.page || {}),
        totalElements,
      },
    },
  };
}

export function normalizeHistoryList(data = {}) {
  const rawList =
    data.auditHistory ||
    data.verifyHistory ||
    data.auditRecords ||
    data.history ||
    data.recordList ||
    data.records ||
    [];
  return Array.isArray(rawList) ? rawList.map(normalizeRecord) : [];
}

export function normalizeDetailPayload(data = {}, fallbackRow = {}) {
  const record =
    data.record ||
    data.detail ||
    data.enterpriseInfo ||
    data.latestRecord ||
    data.currentRecord ||
    data.node ||
    data;
  const normalized = normalizeRecord({
    ...fallbackRow,
    ...(record || {}),
  });
  normalized.enterpriseInfoId = normalized.enterpriseInfoId || resolveEnterpriseInfoId(fallbackRow);
  normalized.verifyProcessId = normalized.verifyProcessId || resolveVerifyProcessId(fallbackRow);
  return normalized;
}

export function buildEnterpriseSnapshot(source = {}, defaults = {}) {
  const safeSource = source && typeof source === 'object' ? source : {};
  return {
    enterpriseInfoId: safeSource.enterpriseInfoId ?? safeSource.id ?? null,
    code: safeSource.code ?? safeSource.companyCode ?? defaults.companyCode ?? '',
    name: safeSource.name ?? safeSource.companyName ?? defaults.companyName ?? '',
    contactName: safeSource.contactName ?? '',
    contactPhone: safeSource.contactPhone ?? '',
    contactEmail: safeSource.contactEmail ?? '',
    address: safeSource.address ?? '',
    legalPerson: safeSource.legalPerson ?? '',
    industry: safeSource.industry ?? '',
    companyScale: safeSource.companyScale ?? '',
    businessScope: safeSource.businessScope ?? '',
    introduction: safeSource.introduction ?? '',
    remarks: safeSource.remarks ?? '',
  };
}

export function fileBadge(name) {
  const ext = name?.split('.').pop()?.toLowerCase() || '';
  return ENTERPRISE_FILE_BADGES[ext] || {
    text: ext.slice(0, 4).toUpperCase() || '?',
    bg: '#909399',
  };
}

export function badgeFontSize(text) {
  if (text.length <= 1) return '20px';
  if (text.length <= 3) return '13px';
  return '10px';
}

export function isEnterpriseVerifyConfigReady(config = {}) {
  const verifyTypeId = Number(config?.verifyTypeId);
  if (!Number.isFinite(verifyTypeId) || verifyTypeId < CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    return false;
  }
  if (verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    return true;
  }

  const roleFields = [
    'verifyFirstRoleId',
    'verifySecondRoleId',
    'verifyThirdRoleId',
    'verifyFourthRoleId',
    'verifyFifthRoleId',
  ];
  const requiredRoleCount = Math.max(0, verifyTypeId - CONSTANT.VERIFY_LEVEL.NO_VERIFY);
  const rolesOk = roleFields
    .slice(0, requiredRoleCount)
    .every((field) => Number(config?.[field]) > 0);
  if (!rolesOk) return false;
  /** 合作高校根部门 id（与 BaseEnterpriseVerifyConfig.schoolId 一致），用于在高校范围内解析审核人，勿用企业树根 */
  return Number(config?.schoolId) > 0;
}
