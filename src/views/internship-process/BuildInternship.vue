<template>
  <BaseList :default-props="defaultProps" ref="baseList" />
</template>
<script setup>
import { reactive, ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
defineOptions({
  name: 'MainInternship',
});

const baseList = ref(null);

const defaultProps = reactive({
  defaultDTLProps: {
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true }
      },
      keyWord: { edit: 'MainInternship', view: 'MainInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', theOrder: 1, tableColumnName: 'name' },
        { id: 2, showName: '实习开始时间', theOrder: 2, tableColumnName: 'startTime', sortable: true },
        { id: 3, showName: '实习结束时间', theOrder: 3, tableColumnName: 'endTime', sortable: true },
        { id: 4, showName: '类型', theOrder: 4, tableColumnName: 'internshipType' },
        { id: 5, showName: '创建者', theOrder: 5, tableColumnName: 'creatorName' },
        { id: 6, showName: '报告周期', theOrder: 6, tableColumnName: 'cron' },
        { id: 7, showName: '上报开始时间', theOrder: 7, tableColumnName: 'reportStartTime', sortable: true },
        { id: 8, showName: '上报结束时间', theOrder: 8, tableColumnName: 'reportEndTime', sortable: true },
        { id: 9, showName: '审核状态', theOrder: 9, tableColumnName: 'isAudit', sortable: true },
        { id: 10, showName: '备注', theOrder: 10, tableColumnName: 'remarks'}
      ],
    },
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
    audit: true,
    formItems: [
      { name: '实习名称', field: 'name', type: 'input' },
      { name: '开始时间', field: 'startTime', type: 'datetime' },
      { name: '结束时间', field: 'endTime', type: 'datetime' },
      { name: '实习模板', field: 'internshipType', type: 'select', keyWords: 'BaseInternshipType', sortJson: {properties: 'Id', direction: 'DESC'} },
      { name: '报告周期', field: 'cron', type: 'cron' },
      { name: '上报开始时间', field: 'reportStartTime', type: 'datetime' },
      { name: '上报结束时间', field: 'reportEndTime', type: 'datetime' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
      startTime: [{ required: true, message: '开始时间不能为空', trigger: 'blur' }],
      endTime: [{ required: true, message: '结束时间不能为空', trigger: 'blur' }],
      internshipType: [{ required: true, message: '请选择实习模板', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {}
    }
  },
});

</script>
