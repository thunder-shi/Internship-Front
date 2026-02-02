<template>
  <BaseList :default-props="defaultProps" />
</template>
<script setup>
import { reactive } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'RelTeacherStudent',
});
const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true } },
      keyWord: { edit: 'RelTeacherStudent', view: 'ViewRelTeacherStudent' },
      allTableColumns: [
        {
          id: 1,
          showName: '教师名称',
          tableColumnName: 'teacherName',
          sortable: true,
        },
        {
          id: 3,
          showName: '实习项目',
          tableColumnName: 'internshipName',
          sortable: true,
        },
        {
          id: 2,
          showName: '实习岗位',
          tableColumnName: 'relInternshipName',
          sortable: true,
        },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'RelTeacherStudent',
    formItems: [
      {
        name: '教师名称',
        field: 'teacherId',
        type: 'select',
        keyWords: 'BaseUser',
        searchKeys: { jobId: '3' },
        sortJson: { properties: 'Id', direction: 'DESC' },
      },
      { name: '实习项目', field: 'internshipId', type: 'select', keyWords: 'MainInternship' },
      { name: '实习岗位', field: 'relInternshipId', type: 'select', keyWords: 'RelStuInternship' },
    ],
    formRules: {
      teacherId: [{ required: true, message: '教师名称不能为空', trigger: 'blur' }],
      internshipId: [{ required: true, message: '实习项目不能为空', trigger: 'blur' }],
      relInternshipId: [{ required: true, message: '实习岗位不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'RelTeacherStudent',
  },
});
</script>
