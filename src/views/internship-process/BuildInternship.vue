<template>
  <BaseList
    :default-props="defaultProps"
    ref="baseList"
    :baselist-confirm="handleConfirm"
  />
</template>
<script setup>
import { reactive, ref } from 'vue';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: 'MainInternship',
});

const store = useStore();
const baseList = ref(null);

// 自定义确认函数，添加 creator 字段
const handleConfirm = async (option, type, form) => {
  // 添加当前用户 ID 作为 creator
  const userInfo = store.getters.userInfo;
  if (userInfo && userInfo.id) {
    form.creatorId = userInfo.id;
  }
  form.studentNum = 0;
  // 调用 BaseList 暴露的原有保存逻辑
  await baseList.value?._confirm(option, type, form);
  baseList.value?.initDataList();
};

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
        { id: 4, showName: '实习类型', theOrder: 4, tableColumnName: 'intTypeName' },
        { id: 4, showName: '实习模板', theOrder: 4, tableColumnName: 'internshipTypeName' },
        { id: 5, showName: '创建者', theOrder: 5, tableColumnName: 'creatorName' },
        { id: 2, showName: '实习开始时间', theOrder: 2, tableColumnName: 'startTime', sortable: true },
        { id: 3, showName: '实习结束时间', theOrder: 3, tableColumnName: 'endTime', sortable: true },
        { id: 6, showName: '报告周期', theOrder: 6, tableColumnName: 'cron' },
        { id: 7, showName: '上报开始日期', theOrder: 7, tableColumnName: 'reportStartDate', sortable: true },
        { id: 8, showName: '上报结束日期', theOrder: 8, tableColumnName: 'reportEndDate', sortable: true },
        { id: 9, showName: '已选学生人数', theOrder: 9, tableColumnName: 'studentNum', sortable: true },
        { id: 10, showName: '备注', theOrder: 10, tableColumnName: 'remarks'}
      ],
    },
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
    formItems: [
      { name: '实习名称', field: 'name', type: 'input' },
      { name: '开始时间', field: 'startTime', type: 'datetime' },
      { name: '结束时间', field: 'endTime', type: 'datetime' },
      { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: {properties: 'Id', direction: 'DESC'} },
      { name: '报告周期', field: 'cron', type: 'cron', relatedFields: ['reportStartDate', 'reportEndDate'] },
      { name: '上报开始日期', field: 'reportStartDate', type: 'date' },
      { name: '上报结束日期', field: 'reportEndDate', type: 'date' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
      startTime: [{ required: true, message: '开始时间不能为空', trigger: 'blur' }],
      endTime: [{ required: true, message: '结束时间不能为空', trigger: 'blur' }],
      internshipTypeId: [{ required: true, message: '请选择实习模板', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {}
    }
  },
});

</script>
