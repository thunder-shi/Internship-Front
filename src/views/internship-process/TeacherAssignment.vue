<template>
  <div class="teacher-assignment-container">
    <BaseList ref="baseListRef" :default-props="defaultProps" />
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'TeacherAssignment',
});

const baseListRef = ref(null);

const defaultProps = reactive({
  // 明细列表配置
  defaultDTLProps: {
    defaultDTHProps: {
      // 数据来源：编辑表 & 视图表
      keyWord: { edit: 'RelIntershipUser', view: 'ViewRelIntershipUser' },
      buttonProps: {
        update: { show: false },
        create: { show: true },
        delete: { show: true },
        export: { show: false },
      },
      // 列配置：展示实习项目名称和指导老师
      allTableColumns: [
        {
          id: 1,
          showName: '实习项目名称',
          tableColumnName: 'internshipName', // 需与 ViewRelIntershipUser 视图字段一致
          sortable: true,
        },
        {
          id: 2,
          showName: '指导老师',
          tableColumnName: 'userName', // 需与 ViewRelIntershipUser 视图字段一致
          sortable: true,
        },
        {
          id: 3,
          showName: '备注',
          tableColumnName: 'remarks', // 需与 ViewRelIntershipUser 视图字段一致
          sortable: true,
        },
      ],
    },
    defaultDBIProps: {},
  },
  // 新增 / 编辑弹窗配置
  defaultSDProps: {
    keyWord: 'RelIntershipUser',
    formItems: [
      {
        name: '实习项目',
        field: 'internshipId',
        type: 'select',
        keyWords: 'MainInternship',
        // changeLabel: 'internshipName',
        // 只显示已审核通过的项目：isAudit = 1
        searchKeys: { isAudit: 1 },
        sortJson: { properties: 'Id', direction: 'DESC' },
        placeholder: '请选择实习项目',
      },
      {
        name: '指导老师',
        field: 'userId',
        type: 'select',
        keyWords: 'BaseUser',
        // jobId 为 2 或 3 的老师
        searchKeys: { jobId: '2,3' },
        regKey: { jobId: '()' },
        sortJson: { properties: 'Id', direction: 'DESC' },
        placeholder: '请选择指导老师',
      },
      {
        name: '备注',
        field: 'remarks',
        type: 'textarea',
        placeholder: '请输入备注',
      },
    ],
    formRules: {
      internshipId: [{ required: true, message: '请选择实习项目', trigger: 'change' }],
      userId: [{ required: true, message: '请选择指导老师', trigger: 'change' }],
    },
    defaultDBProps: {
      footButtons: {
        confirm: { show: true, name: '保存', type: 'primary' },
        submit: { show: false },
        repeatAdd: { show: false },
      },
      dialog: {},
    },
  },
  // 行编辑等场景的数据表
  defaultDBIProps: {
    keyWords: 'RelIntershipUser',
  },
});
</script>

<style scoped>
.teacher-assignment-container {
  width: 100%;
  height: 100%;
}
</style>
