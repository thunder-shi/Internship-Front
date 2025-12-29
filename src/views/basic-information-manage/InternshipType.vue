<template>
  <BaseList
    :default-props="defaultProps"
    ref="baseList"
  />
</template>
<script setup>
import { reactive, ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
defineOptions({
  name: 'InternshipType',
});
const baseList = ref(null);
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '实习项目模板管理' },
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true },
        up: { show: true },
        down: { show: true },
        submit: { show: true },
        batchCreate: { show: true },
        audit: { show: true },
      },
      keyWord: { edit: 'BaseInternshipType' },  //, view: 'ViewMainPost'
      allTableColumns: [
        { id: 1, showName: '所属单位部门', theOrder: 1, tableColumnName: 'universityId', sortable: true },
        { id: 2, showName: '模板类型', theOrder: 2, tableColumnName: 'type', sortable: true },
        { id: 3, showName: '模板编码', theOrder: 3, tableColumnName: 'code', sortable: true },
        { id: 4, showName: '模板名称', theOrder: 4, tableColumnName: 'name', sortable: true }
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'BaseInternshipType',
    formItems: [
      // { name: '企业', field: 'companyId', type: 'select', keyWords: 'BaseDepartment' },
      // { name: '岗位名称', field: 'name', type: 'input' },
      // { name: '岗位代码', field: 'code', type: 'input' },
      // { name: '岗位人数', field: 'personNum', type: 'input' },
      // { name: '薪资', field: 'salary', type: 'input' },
    ],
    formRules: {
      // companyId: [{ required: true, message: '企业不能为空', trigger: 'blur' }],
      // name: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      // code: [{ required: true, message: '岗位代码不能为空', trigger: 'blur' }],
      // personNum: [{ required: true, message: '岗位人数不能为空', trigger: 'blur' }],
      // salary: [{ required: true, message: '薪资不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'BaseInternshipType',
  },
});
</script>
