/**
 * 审核模块通用工具函数
 *
 * 提供 verifyUserId 精确匹配、审核查询条件构建等纯函数，
 * 供各审核页面和 composable 复用。
 */
import moment from 'moment';
import CONSTANT from '@/utils/constant';

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
