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
    @audit-command="handleBatchAuditCommand"
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
import { ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import CONSTANT from '@/utils/constant';
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

/** 下拉选择的批量审核类型 */
const lastBatchAuditCommand = ref(null);

function handleAuditClick(row) {
  const rows = Array.isArray(row) ? row : row ? [row] : [];
  if (rows.length === 0) return;
  if (rows.length === 1) {
    dlgVerifyRef.value?.showDialog(true, rows[0]);
  } else {
    const pending = rows.filter((r) => r && r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT);
    if (!pending.length) {
      ElMessage.warning('选中的记录中没有待审核的数据');
      return;
    }
    const preSelected = lastBatchAuditCommand.value;
    dlgVerifyRef.value?.showDialog(true, pending[0], pending, preSelected);
    lastBatchAuditCommand.value = null;
  }
}

function handleBatchAuditCommand(command, _rows) {
  lastBatchAuditCommand.value = command;
}

function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    const dlgPostDetail = internshipPostPageRef.value?.dlgPostDetail;
    dlgPostDetail?.showDialog(true, {}, selectedRow, true);
  }
}

function handleVerifySuccess() {
  // InternshipPostPage 列表 someFlags.autoInit 为 false 时，必须传 true 才会真正请求数据
  const baseList = unref(internshipPostPageRef.value?.baseListRef);
  baseList?.initDataList(true);
}

function handlePostDetailClose() {}
function handlePostDetailSuccess() {}
</script>
