<template>
  <BaseList :default-props="defaultProps" />
</template>

<script setup>
import { ref } from 'vue'
import BaseList from '@/views/master-page/BaseList.vue'

defineOptions({
  name: 'JobPosition'
})

const defaultProps = ref({
  defaultDTLProps: {
    defaultDTHProps: {
      keyWord: { edit: 'BaseJobPosition' }
    },
    sortStr: { properties: 'theOrder', direction: 'ASC' }
  },
  defaultSDProps: {
    keyWord: 'BaseJobPosition'
  }
})
</script>
