<template>
  <TutorAssignmentVerifyPage :variant="TUTOR_ASSIGNMENT_VERIFY_VARIANT.ENTERPRISE" />
</template>

<script setup>
import TutorAssignmentVerifyPage from './components/TutorAssignmentVerifyPage.vue';
import { TUTOR_ASSIGNMENT_VERIFY_VARIANT } from './config/tutorAssignmentVerifyPresets';

defineOptions({
  name: 'EnterpriseTutorAssignmentVerify',
});
</script>
