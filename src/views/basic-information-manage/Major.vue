<template>
  <BaseTableTree :default-props="defaultProps" />
</template>
<script setup>
import { reactive } from 'vue'
import BaseTableTree from '@/views/master-page/BaseTableTree.vue'

defineOptions({
  name: 'Major'
})

const defaultProps = reactive({
  defaultDTTProps: {
    title: { mainTitle: '专业信息管理'},
    defaultDTHProps: {
      keyWord: { edit: 'BaseMajor' }
    }
  },
  defaultSDProps: {
    keyWord: 'BaseMajor',
    formItems: [
      { name: '专业代码', field: 'code', type: 'input' },
      { name: '专业名称', field: 'name', type: 'input' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      code: [{ required: true, message: '专业代码不能为空', trigger: 'blur' }],
      name: [{ required: true, message: '专业名称不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {}
    }
  }
})
</script>

