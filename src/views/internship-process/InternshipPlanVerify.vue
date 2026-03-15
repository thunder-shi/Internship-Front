<template>
  <div class="internship-verify-container">
    <BaseList :default-props="defaultProps" ref="baseList" :baselist-confirm="handleConfirm" @audit-click="handleAuditClick" />
    <!-- 审核对话框 -->
    <DlgInternshipVerify ref="dlgInternshipVerify" @update-record="handleUpdateRecord" />
  </div>
</template>
<script setup>
import { reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import { useVerifyFilter } from '@/composables/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';

defineOptions({
  name: 'InternshipPlanVerify',
});

const store = useStore();
const baseList = ref(null);
const dlgInternshipVerify = ref(null);

const { clientFilterFn, getVerifyRoleName, initAndLoad } = useVerifyFilter();

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

const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

const handleAuditClick = (row) => {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgInternshipVerify.value?.showDialog(true, selectedRow);
  }
};

// 预加载流程配置和角色名称，加载完成后刷新列表以应用角色名解析
onMounted(async () => {
  await initAndLoad();
  baseList.value?.initDataList();
});

onBeforeUnmount(() => {
  dlgInternshipVerify.value?.closeAllDialogs?.();
});

const defaultProps = reactive({
  defaultDTLProps: {
    clientFilterFn,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: { audit: { show: true, showPass: true, showNotPass: true, showBack: true } },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternship' },
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
