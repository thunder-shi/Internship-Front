<template>
  <AssignmentPage
    ref="assignmentPageRef"
    page-title="企业老师实习项目安排"
    no-project-message="当前没有可选择企业老师的实习项目"
    :process-type-code="processTypeCode"
    :table-columns="ASSIGNMENT_TEACHER_COLUMNS"
    :select-dialog-component="DlgCompanyTeacherSelect"
    :show-batch-append="false"
  />
</template>

<script setup>
import { ref } from 'vue';
import CONSTANT from '@/utils/constant';
import AssignmentPage from './components/AssignmentPage.vue';
import DlgCompanyTeacherSelect from './components/DlgCompanyTeacherSelect.vue';
import { ASSIGNMENT_TEACHER_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'CompanyTeacherAssignment',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.TUTOR_SELECT_INTERNALSHIP;
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
