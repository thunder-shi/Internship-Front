<template>
  <BaseList
    :default-props="defaultProps"
    @simple-select-change="SimpleSelectChange"
    @simple-select-init-finish="simpleSelectInitFinish"
  />
</template>
<script setup>
import { reactive } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
defineOptions({
  name: 'BasePostType',
});
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '岗位信息管理' },
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true },
        up: { show: true },
        down: { show: true },
        batchCreate: { show: true },
      },
      keyWord: { edit: 'BasePostType', view: 'ViewBasePostType' },
      allTableColumns: [
        { id: 1, showName: '企业', theOrder: 1, tableColumnName: 'departmentName', sortable: true },
        { id: 2, showName: '岗位名称', theOrder: 2, tableColumnName: 'name', sortable: true },
        { id: 3, showName: '岗位代码', theOrder: 3, tableColumnName: 'code', sortable: true },
        { id: 4, showName: '薪资', theOrder: 4, tableColumnName: 'salary', sortable: true },
        { id: 5, showName: '岗位地址', theOrder: 5, tableColumnName: 'address', sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'BasePostType',
    formItems: [
      {
        name: '企业',
        field: 'companyId',
        type: 'select',
        keyWords: 'BaseDepartment',
        regKey: { type: 1 },
      },
      { name: '岗位名称', field: 'name', type: 'input' },
      { name: '岗位代码', field: 'code', type: 'input' },
      { name: '薪资', field: 'salary', type: 'input' },
      { name: '岗位地址', field: 'address', type: 'input' },
    ],
    formRules: {
      companyId: [{ required: true, message: '企业不能为空', trigger: 'blur' }],
      name: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      code: [{ required: true, message: '岗位代码不能为空', trigger: 'blur' }],
      salary: [{ required: true, message: '薪资不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'BasePostType',
  },
});

const SimpleSelectChange = (val, field, form, options) => {
  form.address = options[0].departmentAdd || '';
};

const simpleSelectInitFinish = (field, options) => {
  if (!options.length) return;
  options.sort((a, b) => a.departmentType - b.departmentType);
  const index = options.findIndex((i) => i.departmentType != 1);
  if (index > -1) {
    options.splice(index);
  }
};
</script>
