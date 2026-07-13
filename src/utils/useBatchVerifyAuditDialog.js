/**
 * 与 AssignmentVerifyPage（实习安排审核 / 校内导师安排审核等）一致：
 * - audit-command：下拉只记录批量预选类型
 * - audit-click：单条直接打开 DlgVerify；多条则按预选类型筛行后打开，由 DlgVerify 内一次性 auditProcess（含数组载荷）
 */
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import CONSTANT from '@/utils/constant';

/**
 * @param {import('vue').Ref<{ showDialog: Function } | null>} dlgVerifyRef
 */
export function useBatchVerifyAuditDialog(dlgVerifyRef) {
  const lastBatchAuditCommand = ref(null);

  function handleBatchAuditCommand(command) {
    lastBatchAuditCommand.value = command;
  }

  function handleAuditClick(row) {
    const rows = Array.isArray(row) ? row : row ? [row] : [];
    if (rows.length === 0) return;
    if (rows.length === 1) {
      dlgVerifyRef.value?.showDialog(true, rows[0]);
      return;
    }
    const preSelected = lastBatchAuditCommand.value;
    const targetRows = rows.filter((r) => {
      if (!r) return false;
      const st = r.isAudit ?? r.is_audit;
      // 退回：待审核、已通过均可（与操作栏单条审核一致）
      if (preSelected === CONSTANT.AUDIT_STATUS.BACK) {
        return st === CONSTANT.AUDIT_STATUS.SUBMIT || st === CONSTANT.AUDIT_STATUS.PASS;
      }
      return st === CONSTANT.AUDIT_STATUS.SUBMIT;
    });

    if (!targetRows.length) {
      ElMessage.warning(
        preSelected === CONSTANT.AUDIT_STATUS.BACK
          ? '选中的记录中没有待审核或已通过的数据可退回'
          : '选中的记录中没有待审核的数据'
      );
      return;
    }

    dlgVerifyRef.value?.showDialog(true, targetRows[0], targetRows, preSelected);
    lastBatchAuditCommand.value = null;
  }

  return {
    lastBatchAuditCommand,
    handleBatchAuditCommand,
    handleAuditClick,
  };
}
