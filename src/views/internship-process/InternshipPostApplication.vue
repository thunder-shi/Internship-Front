<template>
  <InternshipPostPage
    ref="internshipPostPageRef"
    :page-title="'企业岗位申报'"
    :no-project-message="'当前没有可申报岗位的实习项目'"
    :button-props-fn="getButtonProps"
    :button-condition="buttonCondition"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    @append-click="handleAppendClick"
    @edit-click="handleEditClick"
    @delete-click="handleDeleteClick"
    @post-detail-close="handlePostDetailClose"
    @post-detail-success="handlePostDetailSuccess"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

defineOptions({
  name: 'InternshipPostApplication',
});

const internshipPostPageRef = ref(null);

// Vuex store
const store = useStore();

// 获取用户信息和角色
const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

// 判断是否是企业用户（企业管理员或企业导师）
const isCompanyUser = computed(() => {
  return roles.value.some(role => 
    role === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || role === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  );
});

// 按钮配置函数
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    update: { show: true },
    create: { show: true, disabled: !currentInternship || !currentInternship.internshipId },
    delete: { show: true },
    visible: { show: true, type: 'primary', name: '查看进度' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled }
  };
}

// 按钮条件配置（update 按钮始终显示，由 handleEditClick 控制只读模式）
const buttonCondition = {};

// 构建查询条件（不添加 isAudit 过滤）
function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

// 处理新增按钮点击
function handleAppendClick(currentInternship) {
  if (!currentInternship || !currentInternship.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
  dlgPostDetail?.showDialog(true, {});
}

// 处理修改按钮点击（已提交或审核中的记录以只读模式打开）
function handleEditClick(row) {
  const isAudit = row?.isAudit;
  const editable = isAudit === null || isAudit === undefined ||
    isAudit === CONSTANT.AUDIT_STATUS.SAVE || isAudit === CONSTANT.AUDIT_STATUS.BACK;
  const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
  dlgPostDetail?.showDialog(true, {}, row, !editable);
}

// 处理删除按钮点击
async function handleDeleteClick(rows) {
  // 将 rows 转换为数组
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];
  
  if (!rowsToDelete || rowsToDelete.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }

  // 1. 检查状态：只有"待提交"（-1）状态的项目才可以删除
  const invalidRows = rowsToDelete.filter(row => {
    const isAudit = row.isAudit;
    return isAudit !== CONSTANT.AUDIT_STATUS.SAVE;
  });

  if (invalidRows.length > 0) {
    ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的记录`);
    return;
  }

  try {
    // 收集需要删除的 ID
    const verifyProcessIds = [];
    const internshipPostIds = [];

    rowsToDelete.forEach(row => {
      if (row.id) {
        verifyProcessIds.push(row.id);
      }
      const postId = row.internshipPostId || row.relationId;
      if (postId) {
        internshipPostIds.push(postId);
      }
    });

    // 2. 先删除 MainVerifyProcess 表中的记录（流程表）
    if (verifyProcessIds.length > 0) {
      const deleteVerifyProcessRes = await listAPI.delOneOrManyNodes('MainVerifyProcess', verifyProcessIds);
      if (!deleteVerifyProcessRes || deleteVerifyProcessRes.message !== 'successful') {
        ElMessage.error(deleteVerifyProcessRes?.message || '删除流程记录失败');
        return;
      }
    }

    // 3. 再删除 MainInternshipPost 表中的记录（岗位表）
    if (internshipPostIds.length > 0) {
      const deletePostRes = await listAPI.delOneOrManyNodes('MainInternshipPost', internshipPostIds);
      if (!deletePostRes || deletePostRes.message !== 'successful') {
        ElMessage.error(deletePostRes?.message || '删除岗位记录失败');
        return;
      }
    }
    ElMessage.success('删除成功');
    // 刷新数据列表（强制刷新）
    const baseListRef = internshipPostPageRef.value?.baseListRef;
    baseListRef?.initDataList(true);
  } catch (error) {
    console.error('删除失败:', error);
  }
}

// 处理岗位详情对话框关闭
function handlePostDetailClose() {
  // 可以在这里处理关闭后的逻辑
}

// 处理岗位详情保存成功
function handlePostDetailSuccess() {
  // 公共页面已经处理了刷新，这里可以添加额外的逻辑
}
</script>




