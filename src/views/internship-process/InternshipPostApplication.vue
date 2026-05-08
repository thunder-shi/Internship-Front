<template>
  <InternshipPostPage
    ref="internshipPostPageRef"
    :page-title="'企业岗位申报'"
    :no-project-message="'当前没有可申报岗位的实习项目'"
    :button-props-fn="getButtonProps"
    :button-condition="buttonCondition"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    :list-some-flags="listSomeFlags"
    :get-verify-role-name="getVerifyRoleName"
    @append-click="handleAppendClick"
    @edit-click="handleEditClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleRowSubmitClick"
    @more2-click="handleBatchSubmitClick"
    @more3-click="handleSubmitAllClick"
    @post-detail-close="handlePostDetailClose"
    @post-detail-success="handlePostDetailSuccess"
  />
</template>

<script setup>
import { ref, computed, unref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';

defineOptions({
  name: 'InternshipPostApplication',
});

const internshipPostPageRef = ref(null);
const { getVerifyRoleName } = useVerifyFilter();

/** 列表多选，用于批量提交 */
const listSomeFlags = { checkFlag: true };

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

// 通过部门类型判断是否为企业用户（typeId=1 表示企业）
const isCompanyUser = computed(() => userInfo.value.departmentTypeId === 1);

/** 隐藏修改；行内提交 + 顶部批量提交 */
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    update: { show: true },
    create: { show: true, disabled: !currentInternship || !currentInternship.internshipId },
    submit: { show: true, type: 'warning', name: '提交' },
    delete: { show: true },
    visible: { show: true, type: 'primary', name: '查看进度' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled },
    more2: { show: true, name: '批量提交', type: 'primary' },
    more3: { show: true, name: '全部提交', type: 'warning' },
  };
}

/** 操作列按钮显示条件 */
const buttonCondition = {
  submit: (row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
    (row?.isAudit === CONSTANT.AUDIT_STATUS.PASS && row?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY),
  update: (row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row?.isAudit === CONSTANT.AUDIT_STATUS.BACK,
};

function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

function refreshList() {
  const baseList = unref(internshipPostPageRef.value?.baseListRef);
  baseList?.initDataList(true);
}

/**
 * 仅更新 MainVerifyProcess，不调业务保存；批量 editManyNodes，返回成功条数（失败为 0）
 * @param {Array} pendingRows 已确认为待提交的行
 */
async function submitMainVerifyRows(pendingRows) {
  if (!pendingRows?.length) return 0;
  const nodes = pendingRows.map((row) => ({
    id: row.id,
    isAudit:
      row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
        ? CONSTANT.AUDIT_STATUS.PASS
        : CONSTANT.AUDIT_STATUS.SUBMIT,
  }));
  try {
    const resInfo = await listAPI.editManyNodes('MainVerifyProcess', nodes);
    if (resInfo && resInfo.message === 'successful') {
      return nodes.length;
    }
    ElMessage.warning(resInfo?.message || '更新审核状态失败');
    return 0;
  } catch (error) {
    console.error('提交失败:', error);
    ElMessage.error('提交失败');
    return 0;
  }
}

function handleAppendClick(currentInternship) {
  if (!currentInternship || !currentInternship.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
  dlgPostDetail?.showDialog(true, {});
}

function handleEditClick(row) {
  if (!row) return;
  const editable = row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row.isAudit === CONSTANT.AUDIT_STATUS.BACK;
  const editRow = { ...row, id: row.internshipPostId || row.relationId };
  const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
  dlgPostDetail?.showDialog(true, {}, editRow, !editable);
}

/** 行内提交：与 useAssignmentActions.handleSubmitClick 一致 */
async function handleRowSubmitClick(row) {
  if (!row) return;
  // 自动通过的记录：提供退回选项
  if (row.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
      row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    try {
      await ElMessageBox.confirm('该记录为自动通过，是否退回以重新编辑？', '提示', {
        confirmButtonText: '退回', cancelButtonText: '取消', type: 'warning',
      });
    } catch { return; }
    try {
      const res = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id,
        isAudit: CONSTANT.AUDIT_STATUS.SAVE,
        reason: null,
        verifyUserName: null,
        verifyUserId: null,
      });
      if (res?.message === 'successful') {
        ElMessage.success('退回成功，可以修改后重新提交');
        refreshList();
      } else {
        ElMessage.error(res?.message || '退回失败');
      }
    } catch (e) { console.error('退回失败:', e); }
    return;
  }
  if (row.isAudit !== CONSTANT.AUDIT_STATUS.SAVE) {
    ElMessage.warning('该记录已提交，不能再次提交');
    return;
  }
  const successCount = await submitMainVerifyRows([row]);
  if (successCount > 0) {
    ElMessage.success('提交成功');
    refreshList();
  }
}

async function handleBatchSubmitClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  if (!rowsArray.length) {
    ElMessage.warning('请先勾选需要提交的记录');
    return;
  }

  const pendingRows = rowsArray.filter((row) => row && row.isAudit === CONSTANT.AUDIT_STATUS.SAVE);
  if (!pendingRows.length) {
    ElMessage.warning(`选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可以提交的记录`);
    return;
  }

  const successCount = await submitMainVerifyRows(pendingRows);
  if (successCount > 0) {
    ElMessage.success(`批量提交完成，共成功提交 ${successCount} 条记录`);
    refreshList();
  }
}

/** 全部提交：查询当前实习项目下所有待提交记录并批量提交 */
async function handleSubmitAllClick() {
  const internshipId = internshipPostPageRef.value?.currentInternship?.value?.internshipId;
  if (!internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessInternshipPostMerge',
      searchKey: { internshipId, isAudit: `${CONSTANT.AUDIT_STATUS.SAVE},${CONSTANT.AUDIT_STATUS.BACK}` },
      reg: { internshipId: '=', isAudit: CONSTANT.SEARCH_OPERATOR.IN },
    });
    const allRows = res?.data?.content || res?.data || [];
    const pendingRows = allRows.filter(
      (row) => row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row.isAudit === CONSTANT.AUDIT_STATUS.BACK
    );
    if (!pendingRows.length) {
      ElMessage.info('没有待提交的记录');
      return;
    }
    await ElMessageBox.confirm(
      `确定提交当前实习项目下全部 ${pendingRows.length} 条待提交记录吗？`,
      '全部提交',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    );
    const successCount = await submitMainVerifyRows(pendingRows);
    if (successCount > 0) {
      ElMessage.success(`全部提交完成，共成功提交 ${successCount} 条记录`);
      refreshList();
    }
  } catch (e) {
    if (e !== 'cancel') console.error('全部提交失败:', e);
  }
}

async function handleDeleteClick(rows) {
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];

  if (!rowsToDelete || rowsToDelete.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }

  const invalidRows = rowsToDelete.filter((row) => {
    const isAudit = row.isAudit;
    return isAudit !== CONSTANT.AUDIT_STATUS.SAVE;
  });

  if (invalidRows.length > 0) {
    ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的记录`);
    return;
  }

  try {
    const verifyProcessIds = [];
    const internshipPostIds = [];

    rowsToDelete.forEach((row) => {
      if (row.id) {
        verifyProcessIds.push(row.id);
      }
      const postId = row.internshipPostId || row.relationId;
      if (postId) {
        internshipPostIds.push(postId);
      }
    });

    if (verifyProcessIds.length > 0) {
      const deleteVerifyProcessRes = await listAPI.delOneOrManyNodes(
        'MainVerifyProcess',
        verifyProcessIds
      );
      if (!deleteVerifyProcessRes || deleteVerifyProcessRes.message !== 'successful') {
        ElMessage.error(deleteVerifyProcessRes?.message || '删除流程记录失败');
        return;
      }
    }

    if (internshipPostIds.length > 0) {
      const deletePostRes = await listAPI.delOneOrManyNodes(
        'MainInternshipPost',
        internshipPostIds
      );
      if (!deletePostRes || deletePostRes.message !== 'successful') {
        ElMessage.error(deletePostRes?.message || '删除岗位记录失败');
        return;
      }
    }
    ElMessage.success('删除成功');
    refreshList();
  } catch (error) {
    console.error('删除失败:', error);
  }
}

function handlePostDetailClose() {}

function handlePostDetailSuccess() {
  refreshList();
}
</script>
