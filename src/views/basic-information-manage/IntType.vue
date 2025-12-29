<template>
  <BaseList :default-props="defaultProps" />
</template>

<script setup>
import { ref } from 'vue'
import BaseList from '@/views/master-page/BaseList.vue'

defineOptions({
  name: 'IntType'
})

const defaultProps = ref({
  defaultDTLProps: {
    defaultDTHProps: {
      keyWord: { edit: 'BaseIntType' }
    },
    sortStr: { properties: 'theOrder', direction: 'ASC' }
  },
  defaultSDProps: {
    keyWord: 'BaseIntType'
  }
})
</script>
