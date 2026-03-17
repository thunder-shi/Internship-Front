<template>
  <AssignmentPage
    ref="assignmentPageRef"
    page-title="学生实习项目安排"
    no-project-message="当前没有可分配学生实习项目"
    :process-type-code="processTypeCode"
    :table-columns="ASSIGNMENT_STUDENT_COLUMNS"
    :select-dialog-component="DlgStudentSelect"
  />
</template>

<script setup>
import { ref } from 'vue';
import CONSTANT from '@/utils/constant';
import AssignmentPage from './components/AssignmentPage.vue';
import DlgStudentSelect from './components/DlgStudentSelect.vue';
import { ASSIGNMENT_STUDENT_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'StudentAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.STUDENT_SELECT_INTERNSHIP;
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
