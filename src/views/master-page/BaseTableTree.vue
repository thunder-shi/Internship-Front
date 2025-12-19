<template>
  <div>
    <!-- :search-key="searchKey"  -->
    <DataTableTree ref="dataTableTreeRef" :default-props="defaultProps.defaultDTTProps" @edit-click="editClick" @append-click="appendClick" />
    <slot name="dlg">
      <!-- 简单窗口 -->
      <SimpleDialog ref="simpleDialogRef" :default-props="defaultProps.defaultSDProps" @update-record="updateDataTree" />
    </slot>
  </div>
</template>
<script setup>
import { ref, reactive, onMounted, useAttrs } from 'vue'
import DataTableTree from '@/components/DataTableTree.vue'
import SimpleDialog from '@/components/SimpleDialog.vue'
import { resetForm } from '@/utils/common'
import _ from 'lodash'

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

const emit = defineEmits(['edit-click', 'append-click'])

const dataTableTreeRef = ref(null)
const simpleDialogRef = ref(null)

const defaultDTTProps = reactive({
})

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
const attrs = useAttrs()
let thisEvents = {}

if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'defaultSDProps')) {
  const dialog = props.defaultProps.defaultSDProps.defaultDBProps.dialog // 关联dialog
}

onMounted(() => {
  // 在 Vue 3 中，使用 attrs 来检查事件监听器
  // 事件监听器在 attrs 中以 'on' + 事件名（首字母大写）的形式存在
  thisEvents = {
    'append-click': 'onAppendClick' in attrs,
    'edit-click': 'onEditClick' in attrs
  }
})

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
  if (thisEvents['append-click']) {
    emit('append-click', data)
  } else {
    Object.assign(form, resetForm(form))
    _appendClick(data)
  }
}

function editClick(data) {
  if (thisEvents['edit-click']) {
    emit('edit-click', data)
  } else {
    Object.assign(form, _.cloneDeep(data))
    simpleDialogRef.value.showDialog(true, form)
  }
}
</script>

