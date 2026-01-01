<template>
  <BaseList :default-props="defaultProps" />
</template>
<script setup>
import { ref } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';
defineOptions({
  name: 'BaseProcessType',
});

const defaultProps = ref({
  defaultDTLProps: {
    defaultDTHProps: {
      keyWord: { edit: 'BaseProcessType' },
    },
    sortStr: { properties: 'theOrder', direction: 'ASC' },
  },
  defaultSDProps: {
    keyWord: 'BaseProcessType',
  },
});
</script>
