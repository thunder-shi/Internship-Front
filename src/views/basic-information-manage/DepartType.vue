<template>
  <BaseList :default-props="defaultProps" />
</template>
<script setup>
import { ref } from 'vue'
import BaseList from '@/views/master-page/BaseList.vue'

defineOptions({
  name: 'DepartType'
})

const defaultProps = ref({
  defaultDTLProps: {
    defaultDTHProps: {
      keyWord: { edit: 'BaseDepartType' }
    },
    sortStr: { properties: 'theOrder', direction: 'ASC' }
  },
  defaultSDProps: {
    keyWord: 'BaseDepartType'
  }
})
</script>

