<template>
  <BaseTableTree :default-props="defaultProps" />
</template>

<script setup>
import { reactive } from 'vue'
import BaseTableTree from '@/views/master-page/BaseTableTree.vue'

defineOptions({
  name: 'Department'
})

const defaultProps = reactive({
  defaultDTTProps: {
    sort: { properties: 'name', direction: 'DESC' },
    defaultDTHProps: {
      keyWord: { edit: 'BaseDepartment' }
    }
  },
  defaultSDProps: {
    keyWord: 'BaseDepartment',
    formItems: [
      { name: '完整名称', field: 'allNodeNames', type: 'input', disabled: true },
      { name: '编码', field: 'code', type: 'input' },
      { name: '名称', field: 'name', type: 'input' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: { name: [{ required: true, message: '名称不能为空', trigger: 'blur' }] },
    defaultDBProps: {

    }
  }
})
</script>

