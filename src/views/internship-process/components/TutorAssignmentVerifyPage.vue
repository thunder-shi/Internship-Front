<template>
  <AssignmentVerifyPage v-bind="presetProps" />
</template>

<script setup>
import { computed } from 'vue';
import AssignmentVerifyPage from './AssignmentVerifyPage.vue';
import {
  TUTOR_ASSIGNMENT_VERIFY_VARIANT,
  getTutorAssignmentVerifyBindProps,
} from '../config/tutorAssignmentVerifyPresets';

defineOptions({
  name: 'TutorAssignmentVerifyPage',
});

const props = defineProps({
  /** 使用 TUTOR_ASSIGNMENT_VERIFY_VARIANT.INTERNAL | ENTERPRISE */
  variant: {
    type: String,
    required: true,
    validator: (v) => Object.values(TUTOR_ASSIGNMENT_VERIFY_VARIANT).includes(v),
  },
});

const presetProps = computed(() => getTutorAssignmentVerifyBindProps(props.variant));
</script>
