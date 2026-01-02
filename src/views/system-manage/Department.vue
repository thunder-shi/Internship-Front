 <template>
  <BaseTableTree :default-props="defaultProps" />
</template>

<script setup>
import { reactive } from 'vue'
import BaseTableTree from '@/views/master-page/BaseTableTree.vue'
import { valueEquals } from 'element-plus'

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
        down: { show: true },
        batchCreate: { show: true }
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
      { name: '备注', field: 'remarks', type: 'textarea' },
      { name: '专业名称', field: 'majorId', type: 'cascader', keyWords: 'BaseMajor' },
      {
        name: '省市县',
        field: 'areaId',
        type: 'cascader',
        keyWords: 'SysArea',
      },
      { name: '详细地址', field: 'departmentAdd',type:'input'},
      { name: '邮政编码', field: 'departmentPostalCode',type:'input'},
      { name: '电话', field: 'departmentPhone',type:'input'},
      { name: '传真', field: 'departmentFax' , type:'input'},
      { name: '电子邮箱', field: 'departmentEmail', type:'input'},
      {
        name: '类型',
        field: 'departmentType',
        type: 'select_noremote',
        options: [
          { id: 1, name: '企业' },
          { id: 2, name: '学校' },
          { id: 3, name: '班级' }
        ]
        // onChange: (val) => {
        //  defaultProps.defaultSDProps.formItems[7].disabled = (val != 3)
        // },
      },
      { name: '入学年份', field: 'startYear', type: 'input', disabled: true }
    ],

    formRules: {
      code: [{ required: true, message: '编码不能为空', trigger: 'blur' }],
      name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
      areaId: [{ required: true, message: '省市县不能为空', trigger: 'blur' }],
      departmentType: [{ required: true, message: '类型不能为空', trigger: 'change' }],
      startYear: [{ required: false, message: '入学年份不能为空', trigger: 'blur' }],
      majorId: [{ required: true, message: '专业名称不能为空', trigger: 'blur' }]
    },
    defaultDBProps: {
      dialog: {}
    }
  },
  defaultDBIProps: {
    keyWords: 'BaseDepartment'
  }
})
/**
 * 🧩 下拉框通用 change 事件处理
 * 这里根据字段类型执行对应逻辑
 */
const handleSelectChange = (item, val, formModel) => {
  // 如果是部门类型选择框
  if (item.field === 'departmentType') {
    const startYearItem = defaultProps.defaultSDProps.formItems.find(i => i.field === 'startYear')
    if (startYearItem) {
      // 如果选的不是“班级”，禁用并清空值
      if (val !== 3) {
        startYearItem.disabled = true;
        formModel.startYear = ''; // 清空入学年份的值
      } else {
        // 如果是班级，启用输入
        startYearItem.disabled = false;
      }
    }
  }

  // 若原本表单项自带 onChange，也执行一下
  if (typeof item.onChange === 'function') {
    item.onChange(val, formModel);
  }
}
defaultProps.defaultSDProps.handleSelectChange = handleSelectChange

// 配置表格列
const allTableColumns = defaultProps.defaultDTTProps.defaultDTHProps.allTableColumns
Object.assign(allTableColumns, [
  { id: 1, showName: '编码', theOrder: 1, tableColumnName: 'code', sortable: true },
  { id: 2, showName: '名称', theOrder: 2, tableColumnName: 'name', sortable: true },
  { id: 3, showName: '完整名称', theOrder: 3, tableColumnName: 'allNodeNames' },
  { id: 4, showName: '专业名称', theOrder: 4, tableColumnName: 'majorId' },
  { id: 5, showName: '省市县', theOrder: 5, tableColumnName: 'areaId' },
  { id: 6, showName: '详细地址', theOrder: 5, tableColumnName: 'departmentAdd' },
  { id: 7, showName: '邮政编码', theOrder: 5, tableColumnName: 'departmentPostalCode' },
  { id: 8, showName: '电话', theOrder: 5, tableColumnName: 'departmentPhone' },
  { id: 9, showName: '传真', theOrder: 5, tableColumnName: 'departmentFax' },
  { id: 10, showName: '电子邮箱', theOrder: 5, tableColumnName: 'departmentEmail' },
  { id: 11, showName: '类型', theOrder: 6, tableColumnName: 'departmentType' },
  { id: 12, showName: '入学年份', theOrder: 7, tableColumnName: 'startYear' },
  { id: 13, showName: '备注', theOrder: 8, tableColumnName: 'remarks' },

])
</script>
