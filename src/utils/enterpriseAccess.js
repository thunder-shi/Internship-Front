import { ElMessage } from 'element-plus';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import CONSTANT from '@/utils/constant';

let mineCache = null;
let minePromise = null;

export function isCompanyUser(store) {
  const userInfo = store?.getters?.userInfo || {};
  const roles = store?.getters?.roles || [];
  if (userInfo.departmentTypeId === 1) {
    return true;
  }
  return roles.some(
    (role) =>
      role === CONSTANT.ROLE_TABLE.COMPANY_ADMIN ||
      role === CONSTANT.ROLE_TABLE.COMPANY_TUTOR ||
      role?.id === CONSTANT.ROLE_TABLE.COMPANY_ADMIN ||
      role?.id === CONSTANT.ROLE_TABLE.COMPANY_TUTOR ||
      role?.jobCode === CONSTANT.USER_JOB_CODE.COMPANY_ADMIN ||
      role?.jobCode === CONSTANT.USER_JOB_CODE.COMPANY_TUTOR
  );
}

/**
 * 是否具备企业侧「已通过」资格（校外实习等入口）。
 * 依赖 /enterpriseInfo/mine 的 currentApproved：后端已改为 resolveEffectiveApprovedRecord，
 * 在 isCurrent 无法命中时回落为该企业 PASS 中按 approvedTime（及 versionNo、id）最新的一条，避免新版退回后误判为未通过。
 */
export function hasEnterpriseAccess(mineData) {
  const currentApproved = mineData?.currentApproved;
  if (!currentApproved || typeof currentApproved !== 'object') {
    return false;
  }
  if (
    currentApproved.enterpriseInfoId != null ||
    currentApproved.id != null ||
    currentApproved.relationId != null
  ) {
    return true;
  }
  return Object.keys(currentApproved).length > 0;
}

export async function getEnterpriseMine(options = {}) {
  const { refresh = false } = options;
  if (!refresh && mineCache) {
    return mineCache;
  }
  if (!refresh && minePromise) {
    return minePromise;
  }

  minePromise = enterpriseInfoAPI
    .mine()
    .then((res) => {
      mineCache = res?.data || {};
      return mineCache;
    })
    .finally(() => {
      minePromise = null;
    });

  return minePromise;
}

export async function ensureEnterpriseAccess(store, options = {}) {
  const {
    refresh = false,
    silent = false,
    message = '企业信息未审核通过，暂无校外实习申报资格',
  } = options;

  if (!isCompanyUser(store)) {
    return {
      passed: true,
      skipped: true,
      mineData: null,
    };
  }

  try {
    const mineData = await getEnterpriseMine({ refresh });
    const passed = hasEnterpriseAccess(mineData);
    if (!passed && !silent) {
      ElMessage.warning(message);
    }
    return {
      passed,
      skipped: false,
      mineData,
    };
  } catch (error) {
    if (!silent) {
      ElMessage.warning(message);
    }
    return {
      passed: false,
      skipped: false,
      mineData: null,
      error,
    };
  }
}

export function clearEnterpriseMineCache() {
  mineCache = null;
  minePromise = null;
}
