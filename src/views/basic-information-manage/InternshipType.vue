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
    // title: { mainTitle: '实习项目模板管理' },
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true }
      },
      keyWord: { edit: 'BaseInternshipType', view: 'ViewBaseInternshipType' },
      allTableColumns: [
        { id: 1, showName: '所属院系', theOrder: 1, tableColumnName: 'universityName',  sortable: true },
        { id: 2, showName: '模板类型', theOrder: 2, tableColumnName: 'typeName', sortable: true },
        { id: 3, showName: '模板编码', theOrder: 3, tableColumnName: 'code', sortable: true },
        { id: 4, showName: '模板名称', theOrder: 4, tableColumnName: 'name', sortable: true }
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'BaseInternshipType',
    formItems: [
      { name: '学校院系', field: 'universityId', type: 'cascader',searchKeys: { departmentType: 1 }, keyWords: 'ViewBaseDepartment' },
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
</script>
