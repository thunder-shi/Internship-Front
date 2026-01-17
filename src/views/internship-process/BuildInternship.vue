<template>
  <div class="build-internship-container">
    <BaseList
      :default-props="defaultProps"
      ref="baseList"
      :baselist-confirm="handleConfirm"
      :check-row-edit="checkRowEditable"
      :check-row-delete="checkRowDeletable"
      @append-click="appendClick"
      @edit-click="editClick"
    />
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgMainInternship
      ref="dlgMainInternship"
      @update-record="handleUpdateRecord"
    />
  </div>
</template>
<script setup>
import { reactive, ref, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgMainInternship from '@/views/dialogs/DlgMainInternship.vue';

defineOptions({
  name: 'MainInternship',
});

const store = useStore();
const baseList = ref(null);
const dlgMainInternship = ref(null);

// 自定义暂存函数（isAudit = -1 暂存未提交）
const handleConfirm = async (option, type, form) => {
  const userInfo = store.getters.userInfo;
  if (userInfo && userInfo.id) {
    form.creatorId = userInfo.id;
  }
  form.studentNum = 0;
  form.isAudit = -1; // 暂存未提交
  await baseList.value?._confirm(option, type, form);
  baseList.value?.initDataList();
};

// 检查行是否可编辑（isAudit = 0 或 1 不可编辑，-1 保存未提交和 2 审核退回可编辑）
const checkRowEditable = (row) => {
  if (row.isAudit === 0 || row.isAudit === 1) {
    ElMessage.warning('已提交或审核通过的记录不可编辑');
    return false;
  }
  return true;
};

// 检查行是否可删除（isAudit = 0 或 1 不可删除，-1 保存未提交和 2 审核退回可删除）
const checkRowDeletable = (row) => {
  if (row.isAudit === 0 || row.isAudit === 1) {
    ElMessage.warning('已提交或审核通过的记录不可删除');
    return false;
  }
  return true;
};

// 处理新增按钮点击事件
const appendClick = () => {
  baseList.value?.openDlg('append', {});
};

// 处理编辑按钮点击事件，使用自定义的编辑窗口
const editClick = (row) => {
  // isAudit = 0 或 1 不可编辑
  if (row.isAudit === 0 || row.isAudit === 1) {
    ElMessage.warning('已提交或审核通过的记录不可编辑');
    return;
  }
  dlgMainInternship.value?.showDialog(true, row);
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgMainInternship.value?.closeAllDialogs?.();
});

const defaultProps = reactive({
  defaultDTLProps: {
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', theOrder: 1, tableColumnName: 'name' },
        { id: 1, showName: '所属院系', theOrder: 1, tableColumnName: 'universityName' },
        { id: 2, showName: '实习类型', theOrder: 2, tableColumnName: 'typeName' },
        { id: 3, showName: '实习模板', theOrder: 3, tableColumnName: 'internshipTypeName' },
        { id: 5, showName: '报告周期', theOrder: 5, tableColumnName: 'cron' },
        { id: 8, showName: '已选学生人数', theOrder: 8, tableColumnName: 'studentNum', sortable: true },
        { id: 9, showName: '备注', theOrder: 9, tableColumnName: 'remarks'}
      ],
    },
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
    formItems: [
      { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: {properties: 'Id', direction: 'DESC'} },
      { name: '实习名称', field: 'name', type: 'input' },
      { name: '报告周期', field: 'cron', type: 'cron' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
      internshipTypeId: [{ required: true, message: '请选择实习模板', trigger: 'blur' }],
    },
    defaultDBProps: {
      footButtons: {
        confirm: { show: true, name: '暂 存', type: 'primary' },
        submit: { show: false },
        repeatAdd: { show: false }
      },
      dialog: {}
    }
  },
});
</script>
