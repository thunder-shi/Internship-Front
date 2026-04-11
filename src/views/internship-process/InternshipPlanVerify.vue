<template>
  <div class="internship-verify-container">
    <BaseList :default-props="defaultProps" ref="baseList" :baselist-confirm="handleConfirm" @audit-click="handleAuditClick" @audit-command="handleBatchAuditCommand" @edit-click="handleEditClick" />
    <!-- 审核对话框 -->
    <DlgVerify
      ref="dlgVerifyRef"
      dlg-title="实习项目审核"
      recall-title="退回已通过的实习计划"
      show-project-info
      show-period-info
      process-view-name="ViewRelProcessInternship"
      audit-records-view-name="ViewVerifyProcessInternship"
      @success="handleVerifySuccess"
    />
    <!-- 查看详情对话框（只读） -->
    <DlgInternshipDetail ref="dlgInternshipDetail" />
  </div>
</template>
<script setup>
/**
 * 实习计划审核页面
 *
 * 数据源：ViewVerifyProcessInternshipMerge（后端聚合视图，每个 processId 仅一条最新记录）
 * 前端只负责用户级过滤（verifyUserId 精确匹配），不再做分组/聚合/角色名解析。
 */
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgInternshipDetail from '@/views/dialogs/DlgInternshipDetail.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';

defineOptions({
  name: 'InternshipPlanVerify',
});

const store = useStore();
const baseList = ref(null);
const dlgVerifyRef = ref(null);
const dlgInternshipDetail = ref(null);

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

// 自定义确认函数，添加 creator 字段（用于新增）
const handleConfirm = async (option, type, form) => {
  const userInfo = store.getters.userInfo;
  if (userInfo && userInfo.id) {
    form.creatorId = userInfo.id;
  }
  form.studentNum = 0;
  await baseList.value?._confirm(option, type, form);
  baseList.value?.initDataList();
};

const handleVerifySuccess = () => {
  baseList.value?.initDataList();
};

/** 下拉选择的批量审核类型 */
const lastBatchAuditCommand = ref(null);

const handleAuditClick = (row) => {
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
};

const handleBatchAuditCommand = (command, _rows) => {
  lastBatchAuditCommand.value = command;
};

const handleEditClick = (row) => {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgInternshipDetail.value?.showDialog(true, selectedRow);
  }
};

onMounted(() => {
  baseList.value?.initDataList();
});

onBeforeUnmount(() => {
  dlgVerifyRef.value?.closeAllDialogs?.();
  dlgInternshipDetail.value?.closeAllDialogs?.();
});

const defaultProps = reactive({
  defaultDTLProps: {
    clientFilterFn,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: {
        audit: { show: true, showPass: true, showNotPass: true, showBack: true },
        update: { show: true, name: '查看详情' },
      },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipMerge' },
      allTableColumns: [
        { id: 1, showName: '实习项目编码', theOrder: 1, tableColumnName: 'internshipCode' },
        { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'internshipName' },
        { id: 3, showName: '提交人', theOrder: 3, width: 100, tableColumnName: 'createUserName' },
        { id: 4, showName: '流程开始时间', theOrder: 4, width: 160, tableColumnName: 'startTime' },
        { id: 5, showName: '流程结束时间', theOrder: 5, width: 160, tableColumnName: 'endTime' },
        { id: 6, showName: '当前状态', theOrder: 6, width: 120, tableColumnName: 'customize-status' },
        { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' },
      ],
    },
    initSearchWords: buildVerifySearchWords(),
  },
});
</script>
