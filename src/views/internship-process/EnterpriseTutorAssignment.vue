<template>
  <TutorAssignmentBase
    ref="baseRef"
    :process-type-code="processTypeCode"
    page-title="分配企业导师"
    no-project-message="当前没有可分配企业导师的实习项目"
    main-title="分配企业导师"
    :list-key-word="TUTOR_ASSIGNMENT_ENTERPRISE_LIST_KEY_WORD"
    :assignable-teacher-job-code="CONSTANT.USER_JOB_CODE.COMPANY_TUTOR"
    system-assign-mode="autoOnEmpty"
    :submit-row-condition="submitRowCondition"
  >
    <template #rightOperate="{ row }">
      <el-button
        type="primary"
        size="small"
        circle
        title="分配企业导师"
        :disabled="row?.isAudit !== CONSTANT.AUDIT_STATUS.SAVE"
        @click="baseRef?.openManualAssignDialog?.(row, { teacherOnly: true })"
      >
        <el-icon><Avatar /></el-icon>
      </el-button>
    </template>
  </TutorAssignmentBase>
</template>

<script setup>
import { ref } from 'vue';
import { Avatar } from '@element-plus/icons-vue';
import CONSTANT from '@/utils/constant';
import { TUTOR_ASSIGNMENT_ENTERPRISE_LIST_KEY_WORD } from './config/assignmentPresets';
import TutorAssignmentBase from './components/TutorAssignmentBase.vue';

defineOptions({
  name: 'EnterpriseTutorAssignment',
});

const baseRef = ref(null);

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_ASSIGN_TUTOR;

/** 未分配企业导师（无 teacherId）时不允许点操作栏「提交」 */
const submitRowCondition = (row) => {
  if (row?.isAudit !== CONSTANT.AUDIT_STATUS.SAVE) return false;
  const tid = row?.teacherId ?? row?.teacher_id;
  return tid !== undefined && tid !== null && tid !== '';
};
</script>
