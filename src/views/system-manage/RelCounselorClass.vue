<template>
  <BaseList :default-props="defaultProps" />
</template>

<script setup>
import { reactive } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'RelCounselorClass',
});

const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '辅导员班级对应列表' },
    someFlags: { noAdvancedSearch: false },
    searchItems: [
      { name: '辅导员', field: 'counselorName', type: 'input' },
      { name: '班级', field: 'className', type: 'input' },
    ],
    initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
    defaultDTHProps: {
      keyWord: { edit: 'RelCounselorClass', view: 'ViewRelCounselorClass' },
      buttonProps: {
        create: { show: true },
        update: { show: true },
        delete: { show: true },
      },
      allTableColumns: [
        { id: 1, showName: '辅导员', theOrder: 1, tableColumnName: 'counselorName', sortable: true },
        { id: 2, showName: '班级', theOrder: 2, tableColumnName: 'className', sortable: true },
      ],
    },
  },
  defaultSDProps: {
    keyWord: 'RelCounselorClass',
    formItems: [
      {
        name: '辅导员',
        field: 'counselorId',
        type: 'select',
        keyWords: 'ViewBaseUser',
        searchKeys: { jobCode: 'COUNSELOR' },
        regKey: { jobCode: '=' },
        sortJson: { properties: 'Id', direction: 'DESC' },
      },
      {
        name: '班级',
        field: 'classId',
        type: 'select',
        keyWords: 'BaseDepartment',
        searchKeys: { typeId: 3 },
        sortJson: { properties: 'Id', direction: 'DESC' },
      },
    ],
    formRules: {
      counselorId: [{ required: true, message: '辅导员不能为空', trigger: 'change' }],
      classId: [{ required: true, message: '班级不能为空', trigger: 'change' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'RelCounselorClass',
  },
});
</script>
