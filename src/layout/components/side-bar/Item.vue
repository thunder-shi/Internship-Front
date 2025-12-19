<template>
  <div>
    <svg-icon v-if="icon" :icon-class="icon" />
    <span v-if="title">{{ title }}</span>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '' },
  title: { type: String, default: '' }
})

defineOptions({
  name: 'MenuItem'
})
</script>
