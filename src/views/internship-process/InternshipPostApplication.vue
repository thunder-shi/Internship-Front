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
    @append-click="handleAppendClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleRowSubmitClick"
    @more2-click="handleBatchSubmitClick"
    @post-detail-close="handlePostDetailClose"
    @post-detail-success="handlePostDetailSuccess"
  />
</template>

<script setup>
import { ref, computed, unref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

defineOptions({
  name: 'InternshipPostApplication',
});

const internshipPostPageRef = ref(null);

/** 列表多选，用于批量提交 */
const listSomeFlags = { checkFlag: true };

const store = useStore();
const roles = computed(() => store.getters.roles || []);

const isCompanyUser = computed(() => {
  return roles.value.some(
    (role) =>
      role === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || role === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  );
});

/** 隐藏修改；行内提交 + 顶部批量提交 */
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    update: { show: false },
    create: { show: true, disabled: !currentInternship || !currentInternship.internshipId },
    submit: { show: true, type: 'warning', name: '提交' },
    delete: { show: true },
    visible: { show: true, type: 'primary', name: '查看进度' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled },
    more2: { show: true, name: '批量提交', type: 'primary' },
  };
}

/** 操作列「提交」仅对待提交行展示 */
const buttonCondition = {
  submit: (row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE,
};

function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

function refreshList() {
  const baseList = unref(internshipPostPageRef.value?.baseListRef);
  baseList?.initDataList(true);
}

/**
 * 仅更新 MainVerifyProcess，不调业务保存；返回成功条数
 * @param {Array} pendingRows 已确认为待提交的行
 */
async function submitMainVerifyRows(pendingRows) {
  let successCount = 0;
  for (const row of pendingRows) {
    const status =
      row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
        ? CONSTANT.AUDIT_STATUS.PASS
        : CONSTANT.AUDIT_STATUS.SUBMIT;
    try {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id,
        isAudit: status,
      });
      if (resInfo && resInfo.message === 'successful') {
        successCount += 1;
      } else {
        ElMessage.warning(resInfo?.message || '更新审核状态失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
    }
  }
  return successCount;
}

function handleAppendClick(currentInternship) {
  if (!currentInternship || !currentInternship.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
  dlgPostDetail?.showDialog(true, {});
}

/** 行内提交：与 useAssignmentActions.handleSubmitClick 一致 */
async function handleRowSubmitClick(row) {
  if (!row) return;
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
