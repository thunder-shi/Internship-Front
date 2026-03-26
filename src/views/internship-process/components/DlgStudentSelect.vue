<template>
  <DlgIntershipUserSelectBase
    ref="baseRef"
    :model-value="modelValue"
    :current-internship="currentInternship"
    :show-search-bar="showSearchBar"
    dlg-title="选择学生"
    job-id="2"
    empty-selection-warning="请至少勾选一名学生"
    :table-columns="studentTableColumns"
    @update:model-value="$emit('update:modelValue', $event)"
    @success="$emit('success')"
  />
</template>

<script setup>
import { ref } from 'vue';
import DlgIntershipUserSelectBase from './DlgIntershipUserSelectBase.vue';

defineOptions({
  name: 'DlgStudentSelect',
});

defineProps({
  modelValue: { type: Boolean, default: false },
  currentInternship: { type: Object, default: null },
  showSearchBar: { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'success']);

const studentTableColumns = [
  { id: 1, showName: '姓名', tableColumnName: 'name', sortable: true },
  { id: 2, showName: '班级/单位', tableColumnName: 'departmentName', sortable: true },
  { id: 3, showName: '学号', tableColumnName: 'workId', sortable: true },
  { id: 4, showName: '手机号', tableColumnName: 'phone', sortable: true },
];

const baseRef = ref(null);

defineExpose({
  showDialog: (val) => baseRef.value?.showDialog(val),
});
</script>
