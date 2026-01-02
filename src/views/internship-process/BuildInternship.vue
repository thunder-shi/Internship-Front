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
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
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
    sortStr: { properties: 'theOrder', direction: 'ASC' },
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
  },
});

</script>
