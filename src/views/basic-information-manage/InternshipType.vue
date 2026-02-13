<template>
  <div class="internship-type-container">
    <BaseList :default-props="defaultProps" ref="baseList" @append-click="appendClick" @edit-click="editClick" />
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgInternshipType ref="dlgInternshipType" @update-record="handleUpdateRecord" />
  </div>
</template>
<script setup>
import { reactive, ref, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipType from '@/views/dialogs/DlgInternshipType.vue';

defineOptions({
  name: 'InternshipType',
});
const baseList = ref(null);
const dlgInternshipType = ref(null);
const store = useStore();
const defaultProps = reactive({
  defaultDTLProps: {
    // title: { mainTitle: '实习项目模板管理' },
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'BaseInternshipType', view: 'ViewBaseInternshipType' },
      allTableColumns: [
        { id: 4, showName: '模板名称', theOrder: 4, tableColumnName: 'name', sortable: true },
        { id: 2, showName: '模板类型', theOrder: 2, tableColumnName: 'typeName', autoSelect:true, sortable: true },
        { id: 1, showName: '所属院系', theOrder: 1, tableColumnName: 'universityName',  sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'BaseInternshipType',
    formItems: [
      { name: '学校院系', field: 'universityId', type: 'cascader',searchKeys: { typeName: "学校" }, keyWords: 'ViewBaseDepartment' },
      { name: '模板类型', field: 'intTypeId', type: 'select', keyWords: 'BaseIntType' },
      { name: '模板编码', field: 'code', type: 'input' },
      { name: '模板名称', field: 'name', type: 'input' },
      { name: '模板说明', field: 'remarks', type: 'textarea' }
    ],
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'BaseInternshipType',
  },
});

// 处理新增按钮点击事件，设置默认的所属院系
const appendClick = () => {
  const userInfo = store.getters.userInfo || {};
  const formData = {};

  // 如果用户有部门ID，则设置为默认值
  if (userInfo.departmentId) {
    formData.universityId = userInfo.departmentId;
  }

  // 使用深拷贝确保数据正确传递
  const form = JSON.parse(JSON.stringify(formData));
  // 通过 BaseList 的 openDlg 方法打开新增窗口（会使用默认的 SimpleDialog）
  baseList.value?.openDlg('append', form);
};

// 处理编辑按钮点击事件，使用自定义的编辑窗口
const editClick = (row) => {
  dlgInternshipType.value?.showDialog(true, row);
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 组件销毁前关闭所有对话框，防止遮罩层残留导致页面空白
onBeforeUnmount(() => {
  dlgInternshipType.value?.closeAllDialogs?.();
});
</script>
