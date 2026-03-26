import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import constant from '@/utils/constant';

/** 从 editManyNodes(RelIntershipUser) 返回的 data 中解析主键列表 */
export function parseRelIntershipUserIdsFromResponse(data) {
  if (data == null) return [];
  const arr = Array.isArray(data) ? data : [data];
  return arr
    .map((item) => {
      if (item == null) return null;
      if (typeof item === 'object') {
        const id = item.id ?? item.ID;
        return id != null ? Number(id) : null;
      }
      const n = Number(item);
      return Number.isNaN(n) ? null : n;
    })
    .filter((id) => id != null);
}

/**
 * 批量创建 MainVerifyProcess（与 RelIntershipUser 批量保存配套）
 * @param {object} options
 * @param {object} options.editManyResponse - listAPI.editManyNodes('RelIntershipUser') 的返回值
 * @param {object} options.currentInternship - 当前实习项目
 * @param {number|string} options.createUserId - 当前用户 id
 */
export async function saveRelIntershipUserVerifyBatch({
  editManyResponse,
  currentInternship,
  createUserId,
}) {
  const relationIds = parseRelIntershipUserIdsFromResponse(editManyResponse?.data);
  if (!relationIds.length) {
    return { success: false, message: '未返回关联记录主键，无法生成审核数据' };
  }
  let verifyUserIds;
  try {
    const verifyRes = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId: currentInternship.verifyFirstRoleId,
      createUserId,
    });
    verifyUserIds = verifyRes?.data;
  } catch (e) {
    console.error('获取审核人失败:', e);
    return { success: false, message: '获取审核人失败' };
  }
  const processId = currentInternship?.realId;
  const tableName = 'RelIntershipUser';
  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: { processId, tableName },
      pageInfo: { page: 1, size: 5000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
    const existingRelationIdSet = new Set();
    existingRecords.forEach((r) => {
      const rid = r.relationId ?? r.relation_id;
      if (rid != null) existingRelationIdSet.add(Number(rid));
    });
    const nodes = relationIds
      .filter((relationId) => !existingRelationIdSet.has(Number(relationId)))
      .map((relationId) => ({
        processId,
        relationId,
        tableName,
        createUserId,
        isAudit: constant.AUDIT_STATUS.SAVE,
        verifyUserId: verifyUserIds,
      }));
    if (!nodes.length) {
      return { success: true };
    }
    const resInfo = await listAPI.editManyNodes('MainVerifyProcess', nodes);
    if (!resInfo || resInfo.message !== 'successful') {
      return { success: false, message: resInfo?.message || '保存审核记录失败' };
    }
    return { success: true };
  } catch (error) {
    console.error('批量写入 MainVerifyProcess 失败:', error);
    return { success: false, message: '保存审核记录失败' };
  }
}
