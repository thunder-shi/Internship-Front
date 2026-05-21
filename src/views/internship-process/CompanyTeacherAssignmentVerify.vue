<template>
  <AssignmentVerifyPage
    page-title="企业老师实习项目安排审核"
    no-project-message="当前没有需要审核的企业老师实习项目"
    :process-type-code="processTypeCode"
    dlg-title="企业老师实习项目安排审核"
    recall-title="退回已通过的企业老师实习安排"
    :table-columns="VERIFY_TEACHER_COLUMNS"
  />
</template>

<script setup>
import CONSTANT from '@/utils/constant';
import AssignmentVerifyPage from './components/AssignmentVerifyPage.vue';
import { VERIFY_TEACHER_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'CompanyTeacherAssignmentVerify',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.TUTOR_SELECT_INTERNALSHIP;
</script>
