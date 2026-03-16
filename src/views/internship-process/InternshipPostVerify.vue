<template>
  <InternshipPostPage
    ref="internshipPostPageRef"
    :page-title="'企业岗位审核'"
    :no-project-message="'当前没有可审核岗位的实习项目'"
    :button-props-fn="getButtonProps"
    :build-search-key="buildSearchKey"
    :client-filter-fn="clientFilterFn"
    :key-word="keyWord"
    :init-search-words="initSearchWords"
    :get-verify-role-name="getVerifyRoleName"
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
import { ref } from 'vue';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';

defineOptions({
  name: 'InternshipPostVerify',
});

const internshipPostPageRef = ref(null);
const dlgInternshipVerify = ref(null);
const dlgVerify = ref(null);

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

const keyWord = { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPostMerge' };
const initSearchWords = buildVerifySearchWords();

// 按钮配置函数
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    audit: { show: true, showPass: true, showNotPass: true, showBack: true },
    update: { show: true, type: 'primary', name: '查看岗位详情' },
    visible: { show: true, type: 'primary', name: '查看审核进度' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled }
  };
}

// 构建查询条件：使用 buildVerifySearchWords 查询待审核/已通过/已退回
function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

// 处理审核按钮点击事件
function handleAuditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgVerify.value?.showDialog(true, selectedRow);
  }
}

// 处理编辑按钮点击事件（查看岗位详情）
function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
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
function handlePostDetailClose() {}

// 处理岗位详情对话框成功事件
function handlePostDetailSuccess() {}

// 处理审核成功事件
function handleVerifySuccess() {
  const baseListRef = internshipPostPageRef.value?.baseListRef;
  baseListRef?.initDataList();
}
</script>
