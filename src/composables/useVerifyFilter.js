/**
 * 多级审核过滤 composable
 *
 * 封装 InternshipPlanVerify / StudentAssignmentVerify / TeacherAssignmentVerify
 * 三个审核页面中 100% 相同的逻辑：
 *   - 流程配置与角色名称预加载
 *   - 按 processId 分组的多级审核过滤（clientFilterFn）
 *   - 当前审核角色名解析（用于 "XX角色审核中" 状态列）
 *
 * 设计决策：
 *   composable 内部自行获取 store，因为三个消费方取 userId / roles 的方式完全一致。
 *   不接收外部参数——三页逻辑无差异，参数化反而增加理解成本。
 */
import { ref } from 'vue';
import { useStore } from 'vuex';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';
import {
  isUserIdInVerifyUserId,
  ROLE_NAME_FIELDS,
  ROLE_ID_FIELDS,
} from '@/utils/verify';

export function useVerifyFilter() {
  const store = useStore();

  // ─── 缓存 ────────────────────────────────────────────────────────────

  /** 流程配置缓存（processId → 流程配置），从 ViewRelProcessInternship 加载 */
  const processConfigMap = ref(new Map());

  /** 角色名称缓存（roleId → roleName），从 SysRole 表加载 */
  const roleNameMap = ref(new Map());

  // ─── 数据加载 ─────────────────────────────────────────────────────────

  /** 预加载流程配置（包含每级审核角色 ID） */
  async function loadProcessConfigs() {
    try {
      const res = await listAPI.getSomeRecords({
        keyWords: 'ViewRelProcessInternship',
        pageInfo: { page: 1, size: 500 },
      });
      if (res?.data?.content) {
        res.data.content.forEach(config => {
          // 使用 String key 避免类型不匹配（processId 可能是 number 或 string）
          processConfigMap.value.set(String(config.id), config);
        });
      }
    } catch (error) {
      console.error('加载流程配置失败:', error);
    }
  }

  /** 预加载角色名称（将角色 ID 解析为角色名称） */
  async function loadRoleNames() {
    try {
      const res = await listAPI.getSomeRecords({
        keyWords: 'SysRole',
        pageInfo: { page: 1, size: 100 },
      });
      if (res?.data?.content) {
        res.data.content.forEach(role => {
          roleNameMap.value.set(role.id, role.name);
        });
      }
    } catch (error) {
      console.error('加载角色名称失败:', error);
    }
  }

  /** 并行加载流程配置和角色名称 */
  function initAndLoad() {
    return Promise.all([loadProcessConfigs(), loadRoleNames()]);
  }

  // ─── 角色名解析 ────────────────────────────────────────────────────────

  /**
   * 通过 processId 和审核级别索引（0-based）获取角色名称
   *
   * 优先使用 VIEW 中的角色名称字段，回退到 SysRole 表解析角色 ID。
   *
   * @param {string|number} processId - 流程 ID
   * @param {number} levelIndex - 审核级别索引（0 = 一级审核）
   * @returns {string} 角色名称，未找到时返回空字符串
   */
  function getRoleNameByLevel(processId, levelIndex) {
    const config = processConfigMap.value.get(String(processId));
    if (!config) return '';
    if (levelIndex < 0 || levelIndex >= ROLE_NAME_FIELDS.length) return '';

    // 优先使用 VIEW 中的角色名称
    const roleName = config[ROLE_NAME_FIELDS[levelIndex]];
    if (roleName && roleName !== '--' && roleName.trim() !== '') {
      return roleName;
    }

    // 回退：通过 SysRole 解析角色 ID
    const roleId = config[ROLE_ID_FIELDS[levelIndex]];
    if (roleId && roleNameMap.value.has(roleId)) {
      return roleNameMap.value.get(roleId);
    }

    return '';
  }

  /**
   * 获取当前审核角色名称（用于 customize-status 列显示 "待XX审核"）
   *
   * clientFilterFn 在过滤过程中会为每条待审核记录挂载 _currentRoleName 字段，
   * 此函数仅做读取。
   *
   * @param {object} row - 表格行数据
   * @returns {string}
   */
  function getVerifyRoleName(row) {
    return row._currentRoleName || '';
  }

  // ─── 权限判断 ─────────────────────────────────────────────────────────

  /**
   * 判断当前用户是否拥有指定流程最后一级审核角色
   *
   * 用途：已通过的记录应对同一角色的所有用户可见（用于退回操作），
   * 而不仅是 verifyUserId 中列出的用户。
   *
   * @param {string|number} processId - 流程 ID
   * @returns {boolean}
   */
  function userHasLastLevelRole(processId) {
    const config = processConfigMap.value.get(String(processId));
    const userRoles = store.getters.roles || [];

    if (!config || !config.verifyTypeId) return false;

    // verifyTypeId: 1=无需审核, 2=一级审核, 3=二级审核, ...
    const lastLevelIndex = config.verifyTypeId - 2;
    if (lastLevelIndex < 0 || lastLevelIndex >= ROLE_ID_FIELDS.length) return false;

    const lastLevelRoleId = config[ROLE_ID_FIELDS[lastLevelIndex]];
    if (!lastLevelRoleId) return false;

    return userRoles.some(role => String(role) === String(lastLevelRoleId));
  }

  // ─── 客户端过滤 ────────────────────────────────────────────────────────

  /**
   * 多级审核的客户端精确过滤
   *
   * 三层过滤逻辑：
   * 1. 排除系统自动通过的记录（reason 包含 "系统自动通过"）
   * 2. 按 processId 分组，区分待审核 / 已通过
   * 3. 待审核记录：精确匹配 verifyUserId 并计算 _currentRoleName
   *    已全部通过：仅对最后一级审核角色用户可见（用于退回）
   *
   * @param {Array} dataList - 后端返回的原始数据列表
   * @returns {Array} 过滤后的数据列表
   */
  function clientFilterFn(dataList) {
    const userInfo = store.getters.userInfo;
    const userId = userInfo?.id;

    if (!userId || !dataList || !Array.isArray(dataList)) {
      return dataList;
    }

    // 过滤掉系统自动通过的记录（无需审核的流程，审核人不应看到）
    dataList = dataList.filter(item => {
      return !item.reason || !item.reason.includes('系统自动通过');
    });

    // 按 processId 分组，区分待审核和已通过的记录
    const processGroups = {};
    dataList.forEach(item => {
      if (!item) return;
      const key = item.processId || item.id;
      if (!processGroups[key]) processGroups[key] = [];
      processGroups[key].push(item);
    });

    const result = [];

    Object.values(processGroups).forEach(group => {
      const pendingRecords = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT);
      const approvedRecords = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS);

      // 待审核记录：精确匹配 verifyUserId + 计算当前审核角色名
      pendingRecords.forEach(record => {
        if (isUserIdInVerifyUserId(record.verifyUserId, userId)) {
          const passedCount = group.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS).length;
          const roleName = getRoleNameByLevel(record.processId, passedCount);
          if (roleName) {
            record._currentRoleName = roleName;
          }
          result.push(record);
        }
      });

      // 已全部通过的流程（无待审核记录）：
      // 最后一级审核角色的所有用户都可以看到并退回，而不仅是 verifyUserId 中的用户
      if (pendingRecords.length === 0 && approvedRecords.length > 0) {
        // 取整个分组中最新的记录（最高 ID），判断流程当前真实状态
        // 如果最新记录是退回(3)或待提交(-1)，说明流程已被退回，不应再显示
        const latestOverall = group.reduce(
          (latest, r) => (!latest || r.id > latest.id) ? r : latest,
          null,
        );
        if (latestOverall && (
          latestOverall.isAudit === CONSTANT.AUDIT_STATUS.BACK ||
          latestOverall.isAudit === CONSTANT.AUDIT_STATUS.SAVE
        )) {
          return;
        }

        // 取最高 ID 的通过记录 = 最后一级审核人的审核记录
        const lastLevelRecord = approvedRecords.reduce(
          (latest, r) => (!latest || r.id > latest.id) ? r : latest,
          null,
        );

        if (lastLevelRecord && (
          userHasLastLevelRole(lastLevelRecord.processId) ||
          isUserIdInVerifyUserId(lastLevelRecord.verifyUserId, userId)
        )) {
          result.push(lastLevelRecord);
        }
      }
    });

    return result;
  }

  // ─── 返回 ─────────────────────────────────────────────────────────────

  return {
    processConfigMap,
    roleNameMap,
    initAndLoad,
    getRoleNameByLevel,
    getVerifyRoleName,
    userHasLastLevelRole,
    clientFilterFn,
  };
}
