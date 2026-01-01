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
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true },
        up: { show: true },
        down: { show: true },
        batchCreate: { show: true },
      },
      keyWord: { edit: 'BaseMajor' },
      allTableColumns: { },
    },
    defaultDBIProps: {

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
  },
  defaultDBIProps: {
    keyWords: 'BaseMajor'
  }
})


const allTableColumns = defaultProps.defaultDTTProps.defaultDTHProps.allTableColumns
Object.assign(allTableColumns, [
  { id: 1, showName: '专业代码', theOrder: 1, tableColumnName: 'code', sortable: true },
  { id: 2, showName: '专业名称', theOrder: 2, tableColumnName: 'name', sortable: true },
  { id: 3, showName: '备注', theOrder: 3, tableColumnName: 'remarks'}
])

</script>

