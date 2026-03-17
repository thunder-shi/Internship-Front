<template>
  <AssignmentVerifyPage
    page-title="项目指导老师审核"
    no-project-message="当前没有需要审核的指导老师项目"
    :process-type-code="processTypeCode"
    dlg-title="项目指导老师审核"
    recall-title="退回已通过的指导老师安排"
    :table-columns="VERIFY_TEACHER_COLUMNS"
  />
</template>

<script setup>
import CONSTANT from '@/utils/constant';
import AssignmentVerifyPage from './components/AssignmentVerifyPage.vue';
import { VERIFY_TEACHER_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'TeacherAssignmentVerify',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.TEACHER_SELECT_INTERNALSHIP;
</script>
