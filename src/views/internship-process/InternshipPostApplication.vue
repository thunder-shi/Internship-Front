<template>
  <BaseList :default-props="defaultProps" ref="baseListRef" @more1-click="handleMore1Click" />
  <!-- 实习项目选择对话框 -->
  <SimpleDialog ref="projectSelectDialog" :default-props="projectSelectDialogProps" />
</template>

<script setup>
import { reactive, ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';

defineOptions({
  name: 'InternshipPostApplication',
});

const baseListRef = ref(null);
const projectSelectDialog = ref(null);

// 实习项目选择对话框配置
const projectSelectDialogProps = reactive({
  keyWord: 'ProjectSelect',
  formItems: [
    { name: '实习项目', field: 'internshipId', type: 'select', keyWords: 'MainInternship' },
  ],
  formRules: {
    internshipId: [{ required: true, message: '请选择实习项目', trigger: 'change' }],
  },
  defaultDBProps: {
    dialog: {
      title: '实习项目选择',
      width: '500px',
    },
  },
});

// 处理 more1 按钮点击事件（实习项目选择）
function handleMore1Click(rows) {
  // 打开项目选择对话框
  projectSelectDialog.value?.showDialog(true, {});
}

const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '企业岗位申报' },
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, more1: { show: true, name: '实习项目选择' } },
      keyWord: { edit: 'InternshipPostApplication', view: 'ViewInternshipPostApplication' },
      allTableColumns: [
        { id: 1, showName: '岗位名称', tableColumnName: 'postName', sortable: true },
        { id: 2, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
        { id: 3, showName: '岗位人数', tableColumnName: 'personNum', sortable: true },
        { id: 4, showName: '申报状态', tableColumnName: 'status', sortable: true },
        { id: 5, showName: '申报时间', tableColumnName: 'applicationTime', sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'InternshipPostApplication',
    formItems: [
      { name: '岗位名称', field: 'postName', type: 'input' },
      { name: '企业名称', field: 'companyId', type: 'select', keyWords: 'BaseDepartment', searchKeys: { typeId: 1 } },
      { name: '岗位人数', field: 'personNum', type: 'input' },
      { name: '岗位描述', field: 'description', type: 'textarea' },
      { name: '备注', field: 'remarks', type: 'textarea' },
    ],
    formRules: {
      postName: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      companyId: [{ required: true, message: '企业名称不能为空', trigger: 'blur' }],
      personNum: [{ required: true, message: '岗位人数不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'InternshipPostApplication',
  },
});
</script>
