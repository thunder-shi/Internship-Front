<template>
  <TutorAssignmentBase
    ref="baseRef"
    :process-type-code="processTypeCode"
    page-title="分配校内导师"
    no-project-message="当前没有可分配校内导师的实习项目"
    main-title="分配校内导师"
    :init-search-words="initSearchWords"
    system-assign-mode="manual"
    :tutor-assign-kind="null"
    :submit-row-condition="submitRowCondition"
  />
</template>

<script setup>
import { ref } from 'vue';
import CONSTANT from '@/utils/constant';
import TutorAssignmentBase from './components/TutorAssignmentBase.vue';

defineOptions({
  name: 'InternalTutorAssignment',
});

const baseRef = ref(null);

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ASSIGN_INTERNAL_TUTOR;

const initSearchWords = {
  searchKey: { jobId: 3 },
  regKey: { jobId: CONSTANT.SEARCH_OPERATOR.EQ },
};

const submitRowCondition = (row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE;
</script>
