<template>
  <BaseList :default-props="defaultProps" />
</template>

<script setup>
import { ref } from 'vue'
import BaseList from '@/views/master-page/BaseList.vue'

defineOptions({
  name: 'VerifyType'
})

const defaultProps = ref({
  defaultDTLProps: {
    defaultDTHProps: {
      keyWord: { edit: 'BaseVerifyType' }
    },
    sortStr: { properties: 'theOrder', direction: 'ASC' }
  },
  defaultSDProps: {
    keyWord: 'BaseVerifyType'
  }
})
</script>

