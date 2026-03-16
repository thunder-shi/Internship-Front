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
    <template #audit-dialog>
      <DlgVerify ref="dlgVerifyRef" dlg-title="企业岗位审核" recall-title="退回已通过的企业岗位" @success="handleVerifySuccess" />
    </template>
  </InternshipPostPage>
</template>

<script setup>
import { ref } from 'vue';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';

defineOptions({
  name: 'InternshipPostVerify',
});

const internshipPostPageRef = ref(null);
const dlgVerifyRef = ref(null);

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

const keyWord = { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPostMerge' };
const initSearchWords = buildVerifySearchWords();

function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    audit: { show: true, showPass: true, showNotPass: true, showBack: true },
    update: { show: true, type: 'primary', name: '查看岗位详情' },
    visible: { show: true, type: 'primary', name: '查看审核进度' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled },
  };
}

function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

function handleAuditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) dlgVerifyRef.value?.showDialog(true, selectedRow);
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
    dlgPostDetail?.showDialog(true, {}, selectedRow, true);
  }
}

function handleVerifySuccess() {
  internshipPostPageRef.value?.baseListRef?.initDataList();
}

function handlePostDetailClose() {}
function handlePostDetailSuccess() {}
</script>
