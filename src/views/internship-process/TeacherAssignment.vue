<template>
  <AssignmentPage
    ref="assignmentPageRef"
    page-title="选择指导老师"
    no-project-message="当前没有可选择指导老师的实习项目"
    :process-type-code="processTypeCode"
    :table-columns="ASSIGNMENT_TEACHER_COLUMNS"
    :select-dialog-component="DlgTeacherSelect"
    :show-batch-append="false"
  />
</template>

<script setup>
import { ref } from 'vue';
import CONSTANT from '@/utils/constant';
import AssignmentPage from './components/AssignmentPage.vue';
import DlgTeacherSelect from './components/DlgTeacherSelect.vue';
import { ASSIGNMENT_TEACHER_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'TeacherAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.TEACHER_SELECT_INTERNALSHIP;
const assignmentPageRef = ref(null);

defineExpose({
  get baseListRef() {
    return assignmentPageRef.value?.baseListRef;
  },
  get currentInternship() {
    return assignmentPageRef.value?.currentInternship;
  },
  updateSearchWordsAndRefresh() {
    return assignmentPageRef.value?.updateSearchWordsAndRefresh?.();
  },
});
</script>
