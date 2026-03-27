<template>
  <DlgIntershipUserSelectBase
    ref="baseRef"
    :model-value="modelValue"
    :current-internship="currentInternship"
    :show-search-bar="showSearchBar"
    dlg-title="选择指导老师"
    job-code="SCHOOL_TEACHER"
    empty-selection-warning="请至少勾选一位指导老师"
    :table-columns="teacherTableColumns"
    @update:model-value="$emit('update:modelValue', $event)"
    @success="$emit('success')"
  />
</template>

<script setup>
import { ref } from 'vue';
import DlgIntershipUserSelectBase from './DlgIntershipUserSelectBase.vue';

defineOptions({
  name: 'DlgTeacherSelect',
});

defineProps({
  modelValue: { type: Boolean, default: false },
  currentInternship: { type: Object, default: null },
  showSearchBar: { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'success']);

const teacherTableColumns = [
  { id: 1, showName: '单位部门', tableColumnName: 'departmentName', sortable: true },
  { id: 2, showName: '工号', tableColumnName: 'workId', sortable: true },
  { id: 3, showName: '姓名', tableColumnName: 'name', sortable: true },
  { id: 4, showName: '手机号', tableColumnName: 'phone', sortable: true },
];

const baseRef = ref(null);

defineExpose({
  showDialog: (val) => baseRef.value?.showDialog(val),
});
</script>
