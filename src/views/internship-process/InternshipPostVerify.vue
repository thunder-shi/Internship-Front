<template>
  <InternshipPostPage
    ref="internshipPostPageRef"
    :page-title="'企业岗位审核'"
    :no-project-message="'当前没有可审核岗位的实习项目'"
    :button-props-fn="getButtonProps"
    :build-search-key="buildSearchKey"
    :client-filter-fn="clientFilterFn"
    @audit-click="handleAuditClick"
    @edit-click="handleEditClick"
    @post-detail-close="handlePostDetailClose"
    @post-detail-success="handlePostDetailSuccess"
  >
    <!-- 审核对话框 -->
    <template #audit-dialog>
      <DlgInternshipVerify ref="dlgInternshipVerify" @update-record="handleUpdateRecord" />
      <DlgVerify ref="dlgVerify" @success="handleVerifySuccess" />
    </template>
  </InternshipPostPage>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import CONSTANT from '@/utils/constant';
import { isUserIdInVerifyUserId } from '@/utils/verify';

defineOptions({
  name: 'InternshipPostVerify',
});

const internshipPostPageRef = ref(null);
const dlgInternshipVerify = ref(null);
const dlgVerify = ref(null);

const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

// 客户端过滤函数：精确过滤 verifyUserId 包含当前用户ID 的记录
const clientFilterFn = (dataList) => {
  const userId = userInfo.value?.id;

  if (!userId || !dataList || !Array.isArray(dataList)) {
    return dataList;
  }

  return dataList.filter(item => {
    if (!item || !item.verifyUserId) return false;
    // 过滤掉系统自动通过的记录（无需审核的流程，审核人不应看到）
    if (item.reason && item.reason.includes('系统自动通过')) return false;
    return isUserIdInVerifyUserId(item.verifyUserId, userId);
  });
};

// 按钮配置函数
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    audit: { show: true, showPass: true, showNotPass: true, showBack: true },
    update: { show: true, type: 'primary', name: '查看岗位详情' },
    visible: { show: true, type: 'primary', name: '查看审核进度' },
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
function handleAuditClick(row) {
  // row 可能是数组（多选）或单个对象（单选）
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    // 打开 DlgVerify 审核对话框
    dlgVerify.value?.showDialog(true, selectedRow);
  }
}

// 处理编辑按钮点击事件（查看岗位详情）
function handleEditClick(row) {
  // row 可能是数组（多选）或单个对象（单选）
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    // 打开 DlgPostDetail 对话框（只读模式）
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

// 处理审核成功事件
function handleVerifySuccess() {
  // 刷新数据列表
  const baseListRef = internshipPostPageRef.value?.baseListRef;
  baseListRef?.initDataList();
}
</script>
