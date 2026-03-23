<template>
  <AssignmentVerifyPage
    page-title="分配校内导师审核"
    no-project-message="当前没有需要审核的校内导师分配数据"
    :process-type-code="processTypeCode"
    dlg-title="分配校内导师审核"
    recall-title="退回已通过的校内导师分配"
    :table-columns="VERIFY_TEACHER_COLUMNS"
  />
</template>

<script setup>
import CONSTANT from '@/utils/constant';
import AssignmentVerifyPage from './components/AssignmentVerifyPage.vue';
import { VERIFY_TEACHER_COLUMNS } from './config/assignmentPresets';

defineOptions({
  name: 'InternalTutorAssignmentVerify',
});

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ASSIGN_INTERNAL_TUTOR;
</script>
