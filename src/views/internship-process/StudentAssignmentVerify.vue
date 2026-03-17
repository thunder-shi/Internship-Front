<template>
  <AssignmentVerifyPage
    page-title="学生实习项目安排审核"
    no-project-message="当前没有需要审核的学生实习项目"
    :process-type-code="processTypeCode"
    dlg-title="学生实习项目安排审核"
    recall-title="退回已通过的学生实习安排"
    :table-columns="VERIFY_STUDENT_COLUMNS"
  />
</template>

<script setup>
import CONSTANT from '@/utils/constant';
import AssignmentVerifyPage from './components/AssignmentVerifyPage.vue';
import { VERIFY_STUDENT_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'StudentAssignmentVerify',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.STUDENT_SELECT_INTERNSHIP;
</script>
