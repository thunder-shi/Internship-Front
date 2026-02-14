<template>
  <div>
    <!-- :search-key="searchKey"  -->
    <DataTableTree ref="dataTableTreeRef" :default-props="defaultProps.defaultDTTProps" @edit-click="editClick" @append-click="appendClick" @batch-import-click="batchImportClick" />
    <slot name="dlg">
      <!-- 简单窗口 -->
      <SimpleDialog ref="simpleDialogRef" :default-props="defaultProps.defaultSDProps" @update-record="updateDataTree" @simple-select-change="onSimpleSelectChange" @simple-select-init-finish="onSimpleSelectInitFinish" @open-dialog="onOpenDialog"/>
    </slot>
    <slot name="batch">
      <!-- 批量录入窗口 -->
      <DlgBatchImport ref="batchAppendDlg" :default-props="defaultDBIProps" @batch-import="batchImport" @import-success="importSuccess" />
    </slot>
  </div>
</template>
<script setup>
import { ref, reactive, getCurrentInstance } from 'vue'
import DataTableTree from '@/components/DataTableTree.vue'
import SimpleDialog from '@/components/SimpleDialog.vue'
import DlgBatchImport from '@/views/dialogs/DlgBatchImport.vue'
import { resetForm, customize } from '@/utils/common'
import _ from 'lodash'

// 获取组件实例(用于判断事件监听)
const instance = getCurrentInstance()

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        keyWord: { },
        defaultDTTProps: {
          title: {},
          defaultDTHProps: {
            tableColumns: { }
          }
        },
        defaultSDProps: {
          formItems: [],
          formRules: {},
          defaultDBProps: {
            dialog: { }
          }
        }
      }
    }
  }
})

const emit = defineEmits(['edit-click', 'append-click', 'open-dialog'])

const dataTableTreeRef = ref(null)
const simpleDialogRef = ref(null)
const batchAppendDlg = ref(null)

const defaultDTTProps = reactive({
})


const defaultDBIProps = reactive({})
_.mergeWith(defaultDBIProps, props.defaultProps.defaultDBIProps, customize)

const defaultSDProps = reactive({
  formItems: [
    { name: '完整名称', field: 'allNodeNames', type: 'input', disabled: true },
    { name: '编码', field: 'code', type: 'input' },
    { name: '名称', field: 'name', type: 'input' },
    { name: '备注', field: 'remarks', type: 'textarea' }
  ],
  formRules: { name: [{ required: true, message: '名称不能为空', trigger: 'blur' }] },
  defaultDBProps: {
    dialog: { }
  }
})

const form = reactive({})
const keyWord = reactive({})

if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'defaultSDProps')) {
  const dialog = props.defaultProps.defaultSDProps.defaultDBProps.dialog // 关联dialog
}

// 辅助方法:判断是否有指定事件的监听器
const hasListener = (eventName) => {
  // 将事件名转换为驼峰形式，例如: append-click -> onAppendClick
  const camelCaseName = 'on' + eventName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, letter => letter.toUpperCase());

  // 检查 vnode.props 中是否存在对应的事件监听器
  return instance?.vnode?.props?.[camelCaseName] !== undefined;
};

async function updateDataTree(row) {
  dataTableTreeRef.value.updatePartTree(row)
}

function _appendClick(data) {
  form.allNodeNames = data ? data.allNodeNames : '全部'
  form.parentId = data ? data.id : -1
  form.isLeaf = true
  form.childNum = 0
  simpleDialogRef.value.showDialog(true, form)
}

function appendClick(data) {
  if (hasListener('append-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('append-click', data)
  } else {
    // 无监听器:执行默认逻辑
    Object.assign(form, resetForm(form))
    _appendClick(data)
  }
}

function editClick(data) {
  if (hasListener('edit-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('edit-click', data)
  } else {
    // 无监听器:执行默认逻辑
    Object.assign(form, _.cloneDeep(data))
    simpleDialogRef.value.showDialog(true, form)
  }
}

function batchImportClick() {
  batchAppendDlg.value.showDialog(true)
}

function batchImport() {
  console.log('上传')
}

function importSuccess() {
  dataTableTreeRef.value.initDataTree()
}

function onSimpleSelectChange(val, field, form, options) {
  emit('simple-select-change', val, field, form, options)
}

function onSimpleSelectInitFinish(field, options, form) {
  emit('simple-select-init-finish', field, options, form)
}

function onOpenDialog(row, form) {
  emit('open-dialog', row, form)
}

</script>

