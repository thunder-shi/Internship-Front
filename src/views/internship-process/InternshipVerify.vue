<template>
  <div class="internship-verify-container">
    <BaseList
      :default-props="defaultProps"
      ref="baseList"
      :baselist-confirm="handleConfirm"
      @audit-click="handleAuditClick"
    />
    <!-- 审核对话框 -->
    <DlgInternshipVerify
      ref="dlgInternshipVerify"
      @update-record="handleUpdateRecord"
    />
  </div>
</template>
<script setup>
import { reactive, ref, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipVerify from '@/views/dialogs/DlgInternshipVerify.vue';


defineOptions({
  name: 'InternshipVerify',
});

const store = useStore();
const baseList = ref(null);

const dlgInternshipVerify = ref(null);

// 自定义确认函数，添加 creator 字段（用于新增）
const handleConfirm = async (option, type, form) => {
  // 添加当前用户 ID 作为 creator
  const userInfo = store.getters.userInfo;
  if (userInfo && userInfo.id) {
    form.creatorId = userInfo.id;
  }
  form.studentNum = 0;
  // 调用 BaseList 暴露的原有保存逻辑
  await baseList.value?._confirm(option, type, form);
  baseList.value?.initDataList();
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 处理审核按钮点击事件
const handleAuditClick = (row) => {
  // row 可能是数组（多选）或单个对象（单选）
  // 取第一个选中的项目进行审核
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) {
    dlgInternshipVerify.value?.showDialog(true, selectedRow);
  }
};

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgInternshipVerify.value?.closeAllDialogs?.();
});

const defaultProps = reactive({
  defaultDTLProps: {
    defaultDTHProps: {
      buttonProps: { audit: { show: true, showPass: true, showNotPass: true, showBack: true } },
      keyWord: { edit: 'MainInternship', view: 'ViewInternshipVerifyProcess' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', theOrder: 1, tableColumnName: 'internshipName' },
        { id: 2, showName: '所属院系', theOrder: 2, tableColumnName: 'universityName' },
        { id: 3, showName: '实习类型', theOrder: 3, tableColumnName: 'typeName' },
        { id: 4, showName: '实习模板', theOrder: 4, tableColumnName: 'internshipTypeName' },
        { id: 5, showName: '上级审核人', theOrder: 5, tableColumnName: 'createUserName' },
        { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'isAudit' },
        { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' }
      ],
    },
  }
});
</script>
