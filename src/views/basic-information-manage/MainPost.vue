<template>
  <BaseList :default-props="defaultProps" :baselistConfirm="baselistConfirm" ref="baseList" />
</template>
<script setup>
import { reactive, ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'MainPost',
});

const baseList = ref(null);
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
        audit: { show: true },
      },
      keyWord: { edit: 'MainPost', view: 'ViewMainPost' },
      allTableColumns: [
        { id: 1, showName: '企业', theOrder: 1, tableColumnName: 'departmentName', sortable: true },
        { id: 1, showName: '岗位名称', theOrder: 1, tableColumnName: 'name', sortable: true },
        { id: 1, showName: '岗位代码', theOrder: 1, tableColumnName: 'code', sortable: true },
        { id: 2, showName: '岗位人数', theOrder: 2, tableColumnName: 'personNum', sortable: true },
        { id: 3, showName: '薪资', theOrder: 3, tableColumnName: 'salary' },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'MainPost',
    formItems: [
      { name: '企业', field: 'companyId', type: 'select', keyWords: 'BaseDepartment' },
      { name: '岗位名称', field: 'name', type: 'input' },
      { name: '岗位代码', field: 'code', type: 'input' },
      { name: '岗位人数', field: 'personNum', type: 'input' },
      { name: '薪资', field: 'salary', type: 'input' },
    ],
    formRules: {
      companyId: [{ required: true, message: '企业不能为空', trigger: 'blur' }],
      name: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      code: [{ required: true, message: '岗位代码不能为空', trigger: 'blur' }],
      personNum: [{ required: true, message: '岗位人数不能为空', trigger: 'blur' }],
      salary: [{ required: true, message: '薪资不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'MainPost',
  },
});

const baselistConfirm = (option, type) => {
  baseList.value._confirm(option, type, { isAudit: -1 });
};
</script>
