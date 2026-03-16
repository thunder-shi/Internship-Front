/**
 * 多级审核过滤 composable（Merge View 版本）
 *
 * 后端聚合视图（Merge Views）已完成 processId 分组和角色名解析，
 * 每个 processId 仅返回一条最新记录，包含 currentRoleName 和 isAllVerified 字段。
 *
 * 前端只需做用户级精确过滤：
 *   - 待审核(0)：当前用户在 verifyUserId 中
 *   - 全部通过(1) + isAllVerified：最终级审核人可见（用于退回）
 *   - 退回(3)：创建人可见
 */
import { computed } from 'vue';
import { useStore } from 'vuex';
import CONSTANT from '@/utils/constant';
import { isUserIdInVerifyUserId } from '@/utils/verify';

export function useVerifyFilter() {
  const store = useStore();

  const userId = computed(() => store.getters.userInfo?.id);

  /**
   * 客户端过滤（适配 Merge View 输出）
   *
   * Merge View 已保证每个 processId 仅一条最新记录，
   * 前端只需按当前用户过滤。
   */
  function clientFilterFn(dataList) {
    if (!Array.isArray(dataList)) return dataList;
    const uid = userId.value;
    if (!uid) return dataList;

    return dataList.filter(row => {
      // 排除系统自动通过
      if (row.reason && row.reason.includes('系统自动通过')) return false;

      if (row.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT) {
        // 待审核：当前用户在审核人列表中才显示
        return isUserIdInVerifyUserId(row.verifyUserId, uid);
      } else if (row.isAudit === CONSTANT.AUDIT_STATUS.PASS && row.isAllVerified) {
        // 全部通过：仅最终级审核人可见（用于退回）
        return isUserIdInVerifyUserId(row.verifyUserId, uid);
      } else if (row.isAudit === CONSTANT.AUDIT_STATUS.BACK) {
        // 退回：创建人可见
        return String(row.createUserId) === String(uid);
      }
      return false;
    });
  }

  /**
   * 获取当前审核角色名称（直接读取 Merge View 预计算的 currentRoleName）
   */
  function getVerifyRoleName(row) {
    return row.currentRoleName || '';
  }

  /**
   * 初始化（Merge View 无需预加载流程配置和角色名称）
   */
  function initAndLoad() {
    return Promise.resolve();
  }

  return {
    clientFilterFn,
    getVerifyRoleName,
    initAndLoad,
  };
}
