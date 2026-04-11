/**
 * 审核模块通用工具函数
 *
 * 提供 verifyUserId 精确匹配、审核查询条件构建等纯函数，
 * 供各审核页面和 composable 复用。
 */
import moment from 'moment';
import CONSTANT from '@/utils/constant';

const { AUDIT_STATUS } = CONSTANT;

/**
 * 审核级别字段映射（最多五级审核）
 * 将索引映射到 ViewRelProcessInternship 视图中对应的字段名
 */
export const ROLE_NAME_FIELDS = Object.freeze([
  'verifyFirstRoleName', 'verifySecondRoleName', 'verifyThirdRoleName',
  'verifyFourthRoleName', 'verifyFifthRoleName',
]);

export const ROLE_ID_FIELDS = Object.freeze([
  'verifyFirstRoleId', 'verifySecondRoleId', 'verifyThirdRoleId',
  'verifyFourthRoleId', 'verifyFifthRoleId',
]);

/**
 * 精确检查 verifyUserId 是否包含指定的用户 ID
 *
 * verifyUserId 格式为管道符分隔的 ID 列表，如 "5|12|18"。
 * 后端 LIKE 查询会产生误匹配（如 ID=3 匹配到 "|33|"），因此必须在前端精确匹配。
 *
 * @param {string|number} verifyUserId - 管道符分隔的用户 ID 列表
 * @param {string|number} userId - 待匹配的用户 ID
 * @returns {boolean}
 */
export function isUserIdInVerifyUserId(verifyUserId, userId) {
  if (!verifyUserId || !userId) return false;
  const ids = String(verifyUserId).split('|').filter(id => id !== '');
  return ids.includes(String(userId));
}

/**
 * 审核状态 isAudit 值对应的显示文字
 */
export function getAuditStatusText(isAudit) {
  const map = {
    [AUDIT_STATUS.SAVE]:    AUDIT_STATUS.SAVENAME,
    [AUDIT_STATUS.SUBMIT]:  AUDIT_STATUS.SUBMITNAME,
    [AUDIT_STATUS.PASS]:    AUDIT_STATUS.PASSNAME,
    [AUDIT_STATUS.NOTPASS]: AUDIT_STATUS.NOTPASSNAME,
    [AUDIT_STATUS.BACK]:    AUDIT_STATUS.BACKNAME,
  }
  return map[isAudit] ?? '未知'
}

/**
 * 审核状态 isAudit 值对应的 el-tag type
 */
export function getAuditTagType(isAudit) {
  const map = {
    [AUDIT_STATUS.SAVE]:    'info',
    [AUDIT_STATUS.SUBMIT]:  '',
    [AUDIT_STATUS.PASS]:    'success',
    [AUDIT_STATUS.NOTPASS]: 'danger',
    [AUDIT_STATUS.BACK]:    'warning',
  }
  return map[isAudit] ?? 'info'
}

// ── 实习日志（diary）专用 ────────────────────────────────────

/**
 * 日志状态文字（供 el-tag 内容使用）
 * @param {Object|null} diary - ViewVerifyMainDiaryMerge 字段
 */
export function getDiaryStatusText(diary) {
  if (!diary) return '未提交'
  if (diary.submit === false) return '草稿'
  if (diary.isAllVerified === true) return AUDIT_STATUS.PASSNAME
  return getAuditStatusText(diary.isAudit)
}

/**
 * 日志状态对应的 el-tag type
 */
export function getDiaryTagType(diary) {
  if (!diary || diary.submit === false) return 'info'
  if (diary.isAllVerified === true) return 'success'
  return getAuditTagType(diary.isAudit)
}

/**
 * 日志是否处于可批阅状态（待审核）
 */
export function canReviewDiary(diary) {
  return diary?.isAudit === AUDIT_STATUS.SUBMIT
}

/**
 * 草稿未提交 或 教师退回：可重新提交
 */
export function canResubmitDiary(diary) {
  if (!diary) return false
  return diary.submit === false || diary.isAudit === AUDIT_STATUS.BACK
}

/**
 * 已提交且未退回：只可查看（不可重提）
 */
export function canViewDiary(diary) {
  if (!diary) return false
  if (diary.submit === false) return false
  if (diary.isAudit === AUDIT_STATUS.BACK) return false
  return true
}

/**
 * 构建审核页面的初始查询条件
 *
 * 包含三个标准过滤维度：
 * 1. isAudit IN (待审核, 已通过, 已退回)
 * 2. startTime <= 当前时间（流程已开始）
 * 3. endTime >= 当前时间（流程未结束）
 *
 * @returns {{ searchKey: object, regKey: object, andor: object }}
 */
export function buildVerifySearchWords() {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');

  return {
    searchKey: {
      isAudit: `${CONSTANT.AUDIT_STATUS.SUBMIT},${CONSTANT.AUDIT_STATUS.PASS},${CONSTANT.AUDIT_STATUS.BACK}`,
      startTime: currentTime,
      endTime: currentTime,
    },
    regKey: {
      isAudit: CONSTANT.SEARCH_OPERATOR.IN,
      startTime: CONSTANT.SEARCH_OPERATOR.LE,
      endTime: CONSTANT.SEARCH_OPERATOR.GE,
    },
    andor: {},
  };
}
