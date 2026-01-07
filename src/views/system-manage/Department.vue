 <template>
  <BaseTableTree :default-props="defaultProps" @simple-select-change="handleSelectChange"  @simple-select-init-finish="onSimpleSelectInitFinish" />
</template>

<script setup>
import { reactive, ref } from 'vue'
import BaseTableTree from '@/views/master-page/BaseTableTree.vue'

defineOptions({
  name: 'UnitDepartment'
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
        down: { show: true }
      },
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
      { name: '省市县', field: 'areaId', type: 'cascader', keyWords: 'SysArea' },
      { name: '详细地址', field: 'departmentAdd',type:'input'},
      { name: '邮政编码', field: 'departmentPostalCode',type:'input'},
      { name: '电话', field: 'departmentPhone',type:'input'},
      { name: '传真', field: 'departmentFax' , type:'input'},
      { name: '电子邮箱', field: 'departmentEmail', type:'input'},
      { name: '入学年份', field: 'startYear', type: 'input' }
    ],

    formRules: {
      name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
      areaId: [{ required: true, message: '省市县不能为空', trigger: 'blur' }],
      typeId: [{ required: true, message: '类型不能为空', trigger: 'change' }],
      startYear: [{ required: false, message: '入学年份不能为空', trigger: 'blur' }],
      majorId: [{ required: true, message: '专业名称不能为空', trigger: 'blur' }],
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
      majorIdItem.hidden = true
      form.majorId = 0
    }
    if (startYearItem) {
      startYearItem.hidden = true
      form.startYear = ''
    }
    if (areaIdItem) {
      areaIdItem.hidden = false
    }
  } else if (val === 3) {
    // 班级：隐藏省市区，显示专业和入学年份
    if (areaIdItem) {
      areaIdItem.hidden = true
      form.areaId = 0
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

function onSimpleSelectInitFinish(field, options, form) {
  if (field === 'typeId') {
    handleVisibility(form[field], form)
  }
}



// 配置表格列
const allTableColumns = defaultProps.defaultDTTProps.defaultDTHProps.allTableColumns
Object.assign(allTableColumns, [
  { id: 1, showName: '编码', theOrder: 1, tableColumnName: 'code', sortable: true },
  { id: 2, showName: '名称', theOrder: 2, tableColumnName: 'name', sortable: true },
  // { id: 3, showName: '完整名称', theOrder: 3, tableColumnName: 'allNodeNames' },
  // { id: 4, showName: '专业名称', theOrder: 4, tableColumnName: 'majorName' },
  { id: 3, showName: '类型', theOrder: 3, tableColumnName: 'typeName' },
  { id: 5, showName: '省市县', theOrder: 5, tableColumnName: 'areaName' },
  //{ id: 6, showName: '详细地址', theOrder: 5, tableColumnName: 'departmentAdd' },
  { id: 7, showName: '邮政编码', theOrder: 5, tableColumnName: 'departmentPostalCode' },
  { id: 8, showName: '电话', theOrder: 5, tableColumnName: 'departmentPhone' },
  { id: 9, showName: '传真', theOrder: 5, tableColumnName: 'departmentFax' },
  { id: 10, showName: '电子邮箱', theOrder: 5, tableColumnName: 'departmentEmail' },
  
  // { id: 12, showName: '入学年份', theOrder: 7, tableColumnName: 'startYear' },
  // { id: 13, showName: '备注', theOrder: 8, tableColumnName: 'remarks' },

])
</script>
