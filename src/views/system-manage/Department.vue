 <template>
  <BaseTableTree :default-props="defaultProps" @simple-select-change="handleSelectChange"  @simple-select-init-finish="onSimpleSelectInitFinish" @open-dialog="onOpenDialog" ref="baseTableTree" />
</template>

<script setup>
import { reactive, ref, nextTick, watch } from 'vue'
import BaseTableTree from '@/views/master-page/BaseTableTree.vue'

defineOptions({
  name: 'UnitDepartment'
})

const defaultProps = reactive({
  defaultDTTProps: {
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true }, up: { show: true }, down: { show: true } },
      keyWord: { edit: 'BaseDepartment', view: 'ViewBaseDepartment' },
      allTableColumns: {}
    },
    defaultDBIProps: {}
  },
  defaultSDProps: {
    keyWord: 'BaseDepartment',
    formItems: [
      { name: '完整名称', field: 'allNodeNames', type: 'input', disabled: true },
      { name: '编码', field: 'code', type: 'input' },
      { name: '名称', field: 'name', type: 'input' },
      { name: '类型', field: 'typeId', type: 'select', keyWords: 'BaseDepartType'},
      { name: '备注', field: 'remarks', type: 'textarea' },
      { name: '专业名称', field: 'majorId', type: 'cascader', keyWords: 'BaseMajor' },
      { name: '所在区域', field: 'areaId', type: 'cascader', keyWords: 'SysArea' },
      { name: '详细地址', field: 'departmentAdd',type:'input'},
      { name: '邮政编码', field: 'departmentPostalCode',type:'input'},
      { name: '电话', field: 'departmentPhone',type:'input'},
      { name: '传真', field: 'departmentFax' , type:'input'},
      { name: '电子邮箱', field: 'departmentEmail', type:'input'},
      { name: '入学年份', field: 'startYear', type: 'input' }
    ],

    formRules: {
      name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {}
    }
  },
  defaultDBIProps: {
    keyWords: 'BaseDepartment'
  }
})

function handleVisibility(val, form) {
  const startYearItem = defaultProps.defaultSDProps.formItems.find(i => i.field === 'startYear')
  const majorIdItem = defaultProps.defaultSDProps.formItems.find(i => i.field === 'majorId')
  const areaIdItem = defaultProps.defaultSDProps.formItems.find(i => i.field === 'areaId')

  // 企业(1) 或 学校(2)：隐藏专业选择框和入学年份输入框
  // 班级(3)：隐藏省市区选择框
  if (val === 1 || val === 2) {
    // 学校或企业：隐藏专业和入学年份，显示省市区
    if (majorIdItem) {
      const wasHidden = majorIdItem.hidden
      majorIdItem.hidden = true
      // 只在字段从显示变为隐藏时才清空值，避免误判为数据修改
      // 设置为 null 而不是 0，因为后端可能不接受 0 值
      if (!wasHidden && form.majorId && form.majorId !== 0) {
        form.majorId = null
      } else if (form.majorId === 0) {
        form.majorId = null
      }
    }
    if (startYearItem) {
      const wasHidden = startYearItem.hidden
      startYearItem.hidden = true
      // 只在字段从显示变为隐藏时才清空值
      if (!wasHidden && form.startYear) {
        form.startYear = ''
      }
    }
    if (areaIdItem) {
      areaIdItem.hidden = false
    }
  } else if (val === 3) {
    // 班级：隐藏省市区，显示专业和入学年份
    if (areaIdItem) {
      const wasHidden = areaIdItem.hidden
      areaIdItem.hidden = true
      // 只在字段从显示变为隐藏时才清空值
      // 设置为 null 而不是 0，因为后端可能不接受 0 值
      if (!wasHidden && form.areaId && form.areaId !== 0) {
        form.areaId = null
      } else if (form.areaId === 0) {
        form.areaId = null
      }
    }
    if (majorIdItem) {
      majorIdItem.hidden = false
    }
    if (startYearItem) {
      startYearItem.hidden = false
    }
  } else {
    // 其他类型，都显示
    if (majorIdItem) {
      majorIdItem.hidden = false
    }
    if (areaIdItem) {
      areaIdItem.hidden = false
    }
    if (startYearItem) {
      startYearItem.hidden = false
    }
  }
}

/**
 * 🧩 下拉框通用 change 事件处理
 * 这里根据字段类型执行对应逻辑
 */
const handleSelectChange = (val, field, form, options) => {
  // 如果是部门类型选择框
  if (field === 'typeId') {
    handleVisibility(val, form)
  }
}

const baseTableTree = ref(null)

function onSimpleSelectInitFinish(field, options, form) {
  if (field === 'typeId') {
    // typeId字段初始化完成时，直接刷新字段显示
    handleVisibility(form[field], form)
  }
}

// 对话框打开时，根据typeId刷新字段显示
function onOpenDialog(row, form) {
  // 延迟一下，确保表单数据已经赋值完成，并且oldData已经保存
  nextTick(() => {
    if (form && form.typeId) {
      // 刷新字段显示（可能会修改表单数据）
      handleVisibility(form.typeId, form)
      
      // 如果表单数据被修改了（由于字段显示/隐藏导致的清空操作），
      // 需要重新保存oldData，避免误判为数据修改
      // 通过BaseTableTree -> SimpleDialog -> DlgBasic 来重新保存oldData
      const simpleDialog = baseTableTree.value?.$refs?.simpleDialogRef
      const dlgBasic = simpleDialog?.dlgBasicRef
      if (dlgBasic && typeof dlgBasic.cloneOldData === 'function') {
        // 延迟一下，确保handleVisibility的修改已经完成
        nextTick(() => {
          dlgBasic.cloneOldData()
        })
      }
    }
  })
}

// 提交前清理隐藏字段的数据
function cleanHiddenFields(form) {
  const formItems = defaultProps.defaultSDProps.formItems
  formItems.forEach(item => {
    if (item.hidden && form.hasOwnProperty(item.field)) {
      // 删除隐藏字段，而不是设置为null，避免后端反射处理失败
      delete form[item.field]
    }
  })
}




// 配置表格列
const allTableColumns = defaultProps.defaultDTTProps.defaultDTHProps.allTableColumns
Object.assign(allTableColumns, [
  { id: 1, showName: '编码', theOrder: 1, tableColumnName: 'code', sortable: true },
  { id: 2, showName: '名称', theOrder: 2, tableColumnName: 'name', sortable: true },
  // { id: 3, showName: '完整名称', theOrder: 3, tableColumnName: 'allNodeNames' },
  // { id: 4, showName: '专业名称', theOrder: 4, tableColumnName: 'majorName' },
  { id: 3, showName: '类型', theOrder: 3, tableColumnName: 'typeName' },
  { id: 5, showName: '所在区域', theOrder: 5, tableColumnName: 'areaName' },
  //{ id: 6, showName: '详细地址', theOrder: 5, tableColumnName: 'departmentAdd' },
  { id: 7, showName: '邮政编码', theOrder: 5, tableColumnName: 'departmentPostalCode' },
  { id: 8, showName: '电话', theOrder: 5, tableColumnName: 'departmentPhone' },
  { id: 9, showName: '传真', theOrder: 5, tableColumnName: 'departmentFax' },
  { id: 10, showName: '电子邮箱', theOrder: 5, tableColumnName: 'departmentEmail' },
  
  // { id: 12, showName: '入学年份', theOrder: 7, tableColumnName: 'startYear' },
  // { id: 13, showName: '备注', theOrder: 8, tableColumnName: 'remarks' },

])
</script>
