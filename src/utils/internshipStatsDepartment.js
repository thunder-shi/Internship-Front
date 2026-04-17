import treeAPI from '@/api/tree';
import CONSTANT from '@/utils/constant';

/**
 * 实习统计接口约定：
 * - 校级：departmentId 可选，省略表示全校汇总；传入表示下钻该部门子树。
 * - 院系管理员：统计范围限定在本人部门子树内；请求可传所选节点 departmentId 做子树下钻（须在权限范围内）。
 * @see listInternalInternshipCollegeStats / listExternalInternshipCollegeStats
 */

const INTERNSHIP_STATS_SCHOOL_SCOPE_JOB_CODES = new Set([
  CONSTANT.USER_JOB_CODE.SUPER_ADMIN,
  CONSTANT.USER_JOB_CODE.SCHOOL_ADMIN,
  CONSTANT.USER_JOB_CODE.ACADEMIC_AFFAIRS_ADMIN,
]);

const INTERNSHIP_STATS_SCHOOL_SCOPE_ROLE_IDS = [
  CONSTANT.ROLE_TABLE.SUPER_ADMIN,
  CONSTANT.ROLE_TABLE.SCHOOL_ADMIN,
  CONSTANT.ROLE_TABLE.ACADEMIC_AFFAIRS_ADMIN,
];

/**
 * 校级三角色：全校部门树 + 可下钻；与 ViewBaseUser.jobCode / sys_role 一致。
 */
export function isInternshipStatsSchoolScopeUser(userInfo = {}, roles = []) {
  const code = userInfo.jobCode;
  if (code && INTERNSHIP_STATS_SCHOOL_SCOPE_JOB_CODES.has(code)) return true;
  return roles.some((r) => INTERNSHIP_STATS_SCHOOL_SCOPE_ROLE_IDS.includes(r));
}

/** 院系管理员（且非校级三角色之一时按本院口径） */
export function isInternshipStatsDepartmentAdmin(userInfo = {}, roles = []) {
  if (userInfo.jobCode === CONSTANT.USER_JOB_CODE.DEPARTMENT_ADMIN) return true;
  return roles.includes(CONSTANT.ROLE_TABLE.DEPARTMENT_ADMIN);
}

/** 可访问学院汇总实习统计的角色（其余身份后端返回 lackPermissions） */
export function canViewInternshipCollegeStats(userInfo = {}, roles = []) {
  return (
    isInternshipStatsSchoolScopeUser(userInfo, roles) ||
    isInternshipStatsDepartmentAdmin(userInfo, roles)
  );
}

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

/**
 * 院系管理员左侧树：以本人部门为根展示子树（懒加载子节点）。
 * @param {string} keyWords DataTree keyWord，须与页面一致（如 BaseDepartment / ViewBaseDepartment）
 * @param {number|string} departmentId 用户绑定的部门 id
 */
export async function fetchDepartmentSubtreeRootRow(keyWords, departmentId) {
  if (departmentId == null || departmentId === '') return null;
  try {
    const res = await treeAPI.getAllParentIndex(keyWords, departmentId);
    const chain = rootToLeafChainFromParentIndex(res.data || []);
    if (!chain.length) return null;
    const self = chain[chain.length - 1];
    if (self?.id == null) return null;
    return { ...self, isLeaf: false };
  } catch (e) {
    console.warn('fetchDepartmentSubtreeRootRow failed', e);
    return null;
  }
}
