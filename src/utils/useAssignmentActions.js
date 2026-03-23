/**
 * 安排页面（学生实习项目安排 / 指导老师安排）的公共操作逻辑
 *
 * 提取 handleDeleteClick、handleSubmitClick、handleBatchSubmitClick、
 * updateVerifyProcess、handleViewClick 等完全一致的函数，
 * 各页面只需传入差异化配置即可。
 */
import { ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

/**
 * @param {Function} getRefreshFn - 返回刷新列表的回调，如 () => headerPageRef.value?.baseListRef?.initDataList(true)
 */
export function useAssignmentActions(getRefreshFn) {
  const currentRow = ref({});
  const showProgressDialog = ref(false);

  function handleViewClick(rowOrArray) {
    const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
    currentRow.value = row ? { ...row } : {};
    showProgressDialog.value = true;
  }

  async function handleDeleteClick(rows) {
    const rowsToDelete = Array.isArray(rows) ? rows : [rows];

    if (!rowsToDelete || rowsToDelete.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }

    const invalidRows = rowsToDelete.filter(
      (row) => row.isAudit !== CONSTANT.AUDIT_STATUS.SAVE
    );
    if (invalidRows.length > 0) {
      ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的记录`);
      return;
    }

    try {
      const verifyProcessIds = [];
      const internshipUserIds = [];

      rowsToDelete.forEach((row) => {
        if (row.id) verifyProcessIds.push(row.id);
        if (row.relIntershipUserId) internshipUserIds.push(row.relIntershipUserId);
      });

      if (verifyProcessIds.length > 0) {
        const res = await listAPI.delOneOrManyNodes('MainVerifyProcess', verifyProcessIds);
        if (!res || res.message !== 'successful') {
          ElMessage.error(res?.message || '删除流程记录失败');
          return;
        }
      }

      if (internshipUserIds.length > 0) {
        const res = await listAPI.delOneOrManyNodes('RelIntershipUser', internshipUserIds);
        if (!res || res.message !== 'successful') {
          ElMessage.error(res?.message || '删除记录失败');
          return;
        }
      }

      ElMessage.success('删除成功');
      getRefreshFn()?.();
    } catch (error) {
      console.error('删除失败:', error);
    }
  }

  async function handleSubmitClick(row) {
    // 自动通过的记录：提供退回选项
    if (row.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
        row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
      try {
        await ElMessageBox.confirm('该记录为自动通过，是否退回以重新编辑？', '提示', {
          confirmButtonText: '退回', cancelButtonText: '取消', type: 'warning',
        });
      } catch { return; }
      await rollbackVerifyProcess(row.id);
      return;
    }
    if (row.isAudit != -1) {
      ElMessage.warning('该记录已提交，不能再次提交');
      return;
    }
    const STATUS =
      row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
        ? CONSTANT.AUDIT_STATUS.PASS
        : CONSTANT.AUDIT_STATUS.SUBMIT;
    updateVerifyProcess(row.id, STATUS);
  }

  async function rollbackVerifyProcess(id) {
    try {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
        id,
        isAudit: CONSTANT.AUDIT_STATUS.SAVE,
        reason: null,
        verifyUserName: null,
        verifyUserId: null,
      });
      if (resInfo && resInfo.message === 'successful') {
        ElMessage.success('退回成功，可以修改后重新提交');
        getRefreshFn()?.();
        return true;
      }
      ElMessage.error(resInfo?.message || '退回失败');
      return false;
    } catch (error) {
      console.error('退回失败:', error);
      ElMessage.error('退回失败');
      return false;
    }
  }

  async function handleBatchSubmitClick(rows) {
    const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    if (!rowsArray.length) {
      ElMessage.warning('请先勾选需要提交的记录');
      return;
    }

    const pendingRows = rowsArray.filter(
      (row) => row && row.isAudit === CONSTANT.AUDIT_STATUS.SAVE
    );
    if (!pendingRows.length) {
      ElMessage.warning(
        `选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可以提交的记录`
      );
      return;
    }

    let successCount = 0;
    for (const row of pendingRows) {
      const STATUS =
        row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
          ? CONSTANT.AUDIT_STATUS.PASS
          : CONSTANT.AUDIT_STATUS.SUBMIT;
      const ok = await updateVerifyProcess(row.id, STATUS, false);
      if (ok) successCount += 1;
    }

    if (successCount > 0) {
      ElMessage.success(`批量提交完成，共成功提交 ${successCount} 条记录`);
    }
  }

  async function updateVerifyProcess(id, isAudit, messageVisible = true) {
    try {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', { id, isAudit });
      if (resInfo && resInfo.message === 'successful') {
        if (messageVisible) ElMessage.success('提交成功');
        getRefreshFn()?.();
        return true;
      } else {
        ElMessage.warning(resInfo?.message || '更新审核状态失败');
        return false;
      }
    } catch (error) {
      console.error('更新审核状态失败:', error);
      return false;
    }
  }

  return {
    currentRow,
    showProgressDialog,
    handleViewClick,
    handleDeleteClick,
    handleSubmitClick,
    handleBatchSubmitClick,
  };
}
