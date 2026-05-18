import request from '@/utils/request';

/**
 * 实习评分配置 API
 * 后端 base path: /internshipGradeConfig
 * 所有接口 POST + JSON，参数包在 node 里
 */

/**
 * 列出某实习 + 源表下的全部成绩项（带配置元数据）
 *
 * 响应（破坏性变更）：
 *   data: {
 *     internshipId, sourceTable,
 *     items: [{ id, levelOrder, weight, maxScore, ... }],  // 一级一项，无 itemName/orderNum
 *     maxLevelOrder, // 日志.verifyTypeId - 1；无日志/NO_VERIFY 时为 null
 *     locked,        // true = 已有 SUBMIT/PASS 日志，配置只读
 *     totalWeight, expected, valid,
 *   }
 *
 * @param {{ internshipId: number, sourceTable: string }} node
 */
function listGradeConfig(node) {
  return request({
    url: '/internshipGradeConfig/list',
    method: 'post',
    data: { node: JSON.stringify(node) },
  });
}

/**
 * 新增/编辑单项（编辑传 id；新增 id=null）
 * 适用：只调一项分值的小修；多项整体配置请用 saveBatch
 */
function saveGradeConfig(node) {
  return request({
    url: '/internshipGradeConfig/save',
    method: 'post',
    data: { node: JSON.stringify(node) },
  });
}

/**
 * 批量替换某 (internshipId, sourceTable) 下的全部配置项
 * 事务：软删旧 → 插新 → 校验 SUM=100；任一失败回滚
 * @param {{ internshipId, sourceTable, items: Array }} node
 */
function saveBatchGradeConfig(node) {
  return request({
    url: '/internshipGradeConfig/saveBatch',
    method: 'post',
    data: { node: JSON.stringify(node) },
  });
}

/**
 * 软删一项
 */
function deleteGradeConfig(node) {
  return request({
    url: '/internshipGradeConfig/delete',
    method: 'post',
    data: { node: JSON.stringify(node) },
  });
}

/**
 * 校验当前权重总和（兼容用，建议直接读 /list 响应的 totalWeight/valid）
 */
function validateWeights(node) {
  return request({
    url: '/internshipGradeConfig/validateWeights',
    method: 'post',
    data: { node: JSON.stringify(node) },
  });
}

export default {
  listGradeConfig,
  saveGradeConfig,
  saveBatchGradeConfig,
  deleteGradeConfig,
  validateWeights,
};
