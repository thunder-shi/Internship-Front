<template>
  <BaseList :default-props="defaultProps" @tree-select-change="treeSelectChange" />
</template>
<script setup>
import { reactive, onMounted } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
import listAPI from '@/api/list';
defineOptions({
  name: 'BasePostType',
});
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'BasePostType', view: 'ViewBasePostType' },
      allTableColumns: [
        {
          id: 1,
          showName: '所属企业',
          theOrder: 1,
          tableColumnName: 'departmentName',
          sortable: true,
        },
        { id: 3, showName: '岗位代码', theOrder: 3, tableColumnName: 'code', sortable: true },
        { id: 2, showName: '岗位名称', theOrder: 2, tableColumnName: 'name', sortable: true },
        { id: 4, showName: '岗位薪资', theOrder: 4, tableColumnName: 'salary', sortable: true },
        { id: 5, showName: '岗位地址', theOrder: 5, tableColumnName: 'address', sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'BasePostType',
    formItems: [
      { name: '所属企业', field: 'companyId', type: 'cascader', keyWords: 'BaseDepartment', searchKeys: { typeId: 1 } },
      { name: '岗位代码', field: 'code', type: 'input' },
      { name: '岗位名称', field: 'name', type: 'input' },
      { name: '岗位薪资', field: 'salary', type: 'input' },
      { name: '岗位地址', field: 'address', type: 'input' },
    ],
    formRules: {
      companyId: [{ required: true, message: '所属企业不能为空', trigger: 'blur' }],
      name: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      code: [{ required: true, message: '岗位代码不能为空', trigger: 'blur' }],
      salary: [{ required: true, message: '岗位薪资不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'BasePostType',
  },
});

function getOptions() {
  return new Promise((resolve) => {
    const resp = listAPI.getSomeRecords({
      keyWords: 'BaseDepartment',
      searchKey: { typeId: 1 },
    });
    resolve(resp);
  });
}

function treeSelectChange(val, field, form, node) {
  form.address = node[0].data.departmentAdd || '';
}

onMounted(() => {
  getOptions().then((res) => {
    defaultProps.defaultSDProps.formItems[0].options = res.data.content || [];
  });
});
</script>
