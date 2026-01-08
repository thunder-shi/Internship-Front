<template>
  <div class="build-internship-container">
    <BaseList
      :default-props="defaultProps"
      ref="baseList"
      :baselist-confirm="handleConfirm"
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
import BaseList from '@/views/master-page/BaseList.vue';
import DlgMainInternship from '@/views/dialogs/DlgMainInternship.vue';

defineOptions({
  name: 'MainInternship',
});

const store = useStore();
const baseList = ref(null);
const dlgMainInternship = ref(null);

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

// 处理新增按钮点击事件
const appendClick = () => {
  // 通过 BaseList 的 openDlg 方法打开新增窗口（使用默认的 SimpleDialog）
  baseList.value?.openDlg('append', {});
};

// 处理编辑按钮点击事件，使用自定义的编辑窗口
const editClick = (row) => {
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
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true }
      },
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', theOrder: 1, tableColumnName: 'name' },
        { id: 2, showName: '实习类型', theOrder: 2, tableColumnName: 'typeName' },
        { id: 3, showName: '实习模板', theOrder: 3, tableColumnName: 'internshipTypeName' },
        { id: 4, showName: '创建者', theOrder: 4, tableColumnName: 'creatorName' },
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
      dialog: {}
    }
  },
});
</script>
