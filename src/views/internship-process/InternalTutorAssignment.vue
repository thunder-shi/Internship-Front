<template>
  <TutorAssignmentBase
    ref="baseRef"
    :process-type-code="processTypeCode"
    page-title="分配校内导师"
    no-project-message="当前没有可分配校内导师的实习项目"
    main-title="分配校内导师"
    :list-key-word="TUTOR_ASSIGNMENT_INTERNAL_LIST_KEY_WORD"
    system-assign-mode="manual"
    :submit-row-condition="submitRowCondition"
  >
    <template #rightOperate="{ row }">
      <el-button
        type="primary"
        size="small"
        circle
        title="分配老师"
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
import { TUTOR_ASSIGNMENT_INTERNAL_LIST_KEY_WORD } from './config/assignmentPresets';
import TutorAssignmentBase from './components/TutorAssignmentBase.vue';

defineOptions({
  name: 'InternalTutorAssignment',
});

const baseRef = ref(null);

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ASSIGN_INTERNAL_TUTOR;

const submitRowCondition = (row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE;
</script>
