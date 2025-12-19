<template>
  <BaseTableTree :default-props="defaultProps" />
</template>
<script setup>
import { reactive } from 'vue'
import BaseTableTree from '@/views/master-page/BaseTableTree.vue'

const defaultProps = reactive({
  defaultDTTProps: {
    title: { mainTitle: '测试1', subTitle: '测试2'},
    defaultDTHProps: {
      keyWord: { edit: 'SysMenu' }      
    }
  },
  defaultSDProps: {
    keyWord: 'SysMenu',
    formItems: [
      { name: '完整名称', field: 'allNodeNames', type: 'input', disabled: true },
      { name: '编码', field: 'code', type: 'input' },
      { name: '名称', field: 'name', type: 'input' },
      { name: '图标', field: 'icon', type: 'icon' },
      { name: '路由', field: 'path', type: 'input' },
      { name: '组件目录', field: 'component', type: 'input' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
      path: [{ required: true, message: '路由不能为空', trigger: 'blur' }],
      component: [{ required: true, message: '组件目录不能为空', trigger: 'blur' }]
    },
    defaultDBProps: {
      dialog: {}
    }
  }
})
</script>

