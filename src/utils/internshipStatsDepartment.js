import treeAPI from '@/api/tree';
import CONSTANT from '@/utils/constant';

/**
 * 实习统计接口约定：departmentId = 待统计子树的根节点 id（非「用户所在节点」字面量）。
 * @see IntInternshipCollegeStats / listInternalInternshipCollegeStats
 */

/**
 * getAllParentIndex 返回从「当前节点」到「根」的数组，转为从根到叶的链。
 * @param {Array} parentIndexData getAllParentIndex 的 data
 * @returns {Array}
 */
export function rootToLeafChainFromParentIndex(parentIndexData) {
  if (!Array.isArray(parentIndexData) || parentIndexData.length === 0) return [];
  return [...parentIndexData].reverse();
}

/**
 * 在「学校根 → … → 当前」链上，取学校根下一层作为「本学院」统计范围，避免账号挂在班级上时过窄。
 * 若链上仅有学校一层（用户就在学校节点），则返回学校根 id（与全校一致）。
 * @param {Array<{ id: number, parentId?: number }>} chainRootToLeaf
 * @returns {number|null}
 */
export function pickCollegeScopeDepartmentIdFromChain(chainRootToLeaf) {
  if (!chainRootToLeaf?.length) return null;
  const schoolRoot = chainRootToLeaf[0];
  if (chainRootToLeaf.length === 1) return schoolRoot?.id != null ? Number(schoolRoot.id) : null;
  const next = chainRootToLeaf[1];
  return next?.id != null ? Number(next.id) : null;
}

/**
 * 根据用户 departmentId 解析「本学院」统计用 departmentId（向上至学校根下的学院层）。
 * @param {number|string|null|undefined} userDepartmentId
 * @returns {Promise<number|null>}
 */
export async function resolveCollegeScopeDepartmentId(userDepartmentId) {
  if (userDepartmentId == null || userDepartmentId === '') return null;
  try {
    const res = await treeAPI.getAllParentIndex('BaseDepartment', userDepartmentId);
    const chain = rootToLeafChainFromParentIndex(res.data || []);
    return pickCollegeScopeDepartmentIdFromChain(chain);
  } catch (e) {
    console.warn('resolveCollegeScopeDepartmentId failed', e);
    return null;
  }
}

/** 别名：从登录用户部门解析「本学院」统计用 departmentId */
export const getStatsDepartmentId = resolveCollegeScopeDepartmentId;

/**
 * 取当前学校下 parentId=-1 的学校根节点 id，作为「全校」统计范围。
 * @param {{ schoolId?: number|string }} userInfo 用于与左侧部门树一致的过滤
 * @returns {Promise<number|null>}
 */
export async function fetchSchoolRootDepartmentId(userInfo = {}) {
  const searchKey = {};
  const regKey = {};
  if (userInfo.schoolId) {
    searchKey.schoolId = userInfo.schoolId;
    regKey.schoolId = CONSTANT.SEARCH_OPERATOR.EQ;
  }
  try {
    const res = await treeAPI.getAllNodes({
      keyWords: 'BaseDepartment',
      virtualRootFlag: false,
      searchKey,
      lazy: false,
      parentId: -1,
      sort: { properties: 'theOrder', direction: 'ASC' },
    });
    const nodes = res.data || [];
    const school = nodes.find((n) => n.parentId === -1) || nodes[0];
    return school?.id != null ? Number(school.id) : null;
  } catch (e) {
    console.warn('fetchSchoolRootDepartmentId failed', e);
    return null;
  }
}
