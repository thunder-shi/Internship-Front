<template>
  <InternshipPostPage
    ref="internshipPostPageRef"
    :page-title="'企业岗位审核'"
    :no-project-message="'当前没有可审核岗位的实习项目'"
    :button-props-fn="getButtonProps"
    :build-search-key="buildSearchKey"
    :client-filter-fn="clientFilterFn"
    @audit-click="handleAuditClick"
    @post-detail-close="handlePostDetailClose"
    @post-detail-success="handlePostDetailSuccess"
  >
    <!-- 审核对话框 -->
    <template #audit-dialog>
      <DlgInternshipVerify ref="dlgInternshipVerify" @update-record="handleUpdateRecord" />
    </template>
  </InternshipPostPage>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'InternshipPostVerify',
});

const internshipPostPageRef = ref(null);
const dlgInternshipVerify = ref(null);

// Vuex store
const store = useStore();

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

// 精确检查 verifyUserId 是否包含指定的用户ID
const isUserIdInVerifyUserId = (verifyUserId, userId) => {
  if (!verifyUserId || !userId) return false;
  const userIdStr = String(userId);
  const verifyUserIdStr = String(verifyUserId);
  const ids = verifyUserIdStr.split('|').filter(id => id !== '');
  return ids.includes(userIdStr);
};

// 客户端过滤函数：精确过滤 verifyUserId 包含当前用户ID 的记录
const clientFilterFn = (dataList) => {
  const userId = userInfo.value?.id;

  if (!userId || !dataList || !Array.isArray(dataList)) {
    return dataList;
  }

  return dataList.filter(item => {
    if (!item || !item.verifyUserId) return false;
    return isUserIdInVerifyUserId(item.verifyUserId, userId);
  });
};

// 按钮配置函数
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    audit: { show: true, showPass: true, showNotPass: true, showBack: true },
    visible: { show: true, type: 'primary', name: '查看进度' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled }
  };
}

// 构建查询条件（添加 isAudit 过滤）
function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey,
    isAudit: CONSTANT.AUDIT_STATUS.SUBMIT // 只查询"待审核"状态的记录
  };
}

// 处理审核按钮点击事件
function handleAuditClick(row, currentInternship) {
  // row 可能是数组（多选）或单个对象（单选）
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow && currentInternship) {
    // 打开 DlgPostDetail 对话框，传入审核模式标志
    const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
    dlgPostDetail?.showDialog(true, {}, selectedRow, true);
  }
}

// 处理更新记录后的回调
function handleUpdateRecord() {
  const baseListRef = internshipPostPageRef.value?.baseListRef;
  baseListRef?.initDataList();
}

// 处理岗位详情对话框关闭
function handlePostDetailClose() {
  // 对话框关闭时的处理
}

// 处理岗位详情对话框成功事件
function handlePostDetailSuccess() {
  // 公共页面已经处理了刷新，这里可以添加额外的逻辑
}
</script>
