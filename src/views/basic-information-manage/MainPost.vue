<template>
  <BaseList
    :default-props="defaultProps"
    :baselistConfirm="baselistConfirm"
    ref="baseList"
    @edit-audit="editAudit"
    @submit="handleSubmit"
  />
  <SimpleDialog
    ref="simpleDialog"
    :default-props="auditProps"
    :simpledialog-confirm="simpledialogConfirm"
    @update-record="initDataList"
  />
</template>
<script setup>
import { reactive, ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
import listAPI from '@/api/list';
import { useStore } from 'vuex';
import SimpleDialog from '@/components/SimpleDialog.vue';
import { clone } from 'lodash';
import { ElMessage } from 'element-plus';
defineOptions({
  name: 'MainPost',
});
const simpleDialog = ref(null);
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
        submit: { show: true },
        batchCreate: { show: true },
        audit: { show: true },
      },
      keyWord: { edit: 'MainPost', view: 'ViewMainPost' },
      allTableColumns: [
        { id: 1, showName: '企业', theOrder: 1, tableColumnName: 'departmentName', sortable: true },
        { id: 2, showName: '岗位名称', theOrder: 2, tableColumnName: 'name', sortable: true },
        { id: 3, showName: '岗位代码', theOrder: 3, tableColumnName: 'code', sortable: true },
        { id: 4, showName: '岗位人数', theOrder: 4, tableColumnName: 'personNum', sortable: true },
        { id: 5, showName: '薪资', theOrder: 5, tableColumnName: 'salary' },
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
const auditProps = reactive({
  keyWord: 'MainPost',
  formItems: [
    {
      name: '是否通过',
      field: 'isAudit',
      type: 'select_noremote',
      options: [
        { name: '通过', id: 1 },
        { name: '未通过', id: 2 },
        { name: '退回', id: 3 },
      ],
    },
    {
      name: '理由',
      field: 'reason',
      type: 'textarea',
    },
  ],
  formRules: {
    isAudit: [{ required: true, message: '是否通过不能为空', trigger: 'blur' }],
  },
});
const editAudit = function (row) {
  const form = clone(row);
  simpleDialog.value?.showDialog(true, form);
};
const handleSubmit = function (row) {
  listAPI.editOneNode('MainPost', {
    id: row.id,
    isAudit: 0,
  });
  ElMessage.success('提交成功！');
};
const store = useStore();
const simpledialogConfirm = (option, type, form) => {
  listAPI.editOneNode('MainPost', {
    id: form.id,
    isAudit: form.isAudit,
    reason: form.reason,
    auditUserId: store.getters.userInfo.id,
  });
  setTimeout(() => {
    baseList.value.initDataList();
  }, 500);
};
const baselistConfirm = (option, type) => {
  baseList.value._confirm(option, type, { isAudit: -1 });
  setTimeout(() => {
    baseList.value.initDataList();
  }, 500);
};
</script>
