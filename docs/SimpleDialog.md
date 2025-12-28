# SimpleDialog 使用说明

`SimpleDialog` 是基于 `DlgBasic` 的表单对话框包装组件，通过传入的 `formItems` 动态渲染表单项，并提供通用的保存、校验和事件回调。

## 引入与基本用法

```vue
<template>
  <SimpleDialog
    ref="simpleDlg"
    :default-props="defaultSDProps"
    :simpledialog-confirm="onConfirm"
    @update-record="refresh"
    @simple-select-change="onSelectChange"
  >
    <template #otherItems>
      <el-form-item label="角色">
        <SimpleSelect v-model="form.roleIds" multiple key-words="SysRole" />
      </el-form-item>
    </template>
  </SimpleDialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import SimpleDialog from '@/components/SimpleDialog.vue'
import SimpleSelect from '@/components/SimpleSelect.vue'

const simpleDlg = ref(null)
const form = reactive({})

const defaultSDProps = reactive({
  keyWord: 'BaseUser',
  labelWidth: '120px',
  formItems: [
    { name: '账号', field: 'account', type: 'input', placeholder: '账号不能为空' },
    { name: '密码', field: 'password', type: 'password' },
    { name: '备注', field: 'remarks', type: 'textarea' }
  ],
  formRules: {
    account: [{ required: true, message: '账号不能为空', trigger: 'blur' }]
  },
  defaultDBProps: {
    footButtons: {} // 透传给 DlgBasic，可自定义底部按钮
  }
})

const showDialog = (visible, data = {}) => {
  Object.assign(form, data)
  simpleDlg.value?.showDialog(visible, form, true)
}

const onConfirm = async (_option, _type, dlgForm) => {
  // 自定义保存逻辑
}

const refresh = () => { /* 保存后刷新列表 */ }
const onSelectChange = (val, field, dlgForm) => { /* 处理下拉联动 */ }
</script>
```

## Props

| 名称 | 说明 | 类型 | 默认值 |
| --- | --- | --- | --- |
| `defaultProps` | 组件配置，内部会被修改 | `Object` | 见下方默认结构 |
| `simpledialogConfirm` | 覆盖默认确认逻辑的回调 `(option, type, form) => Promise<void>` | `Function` \| `null` | `null` |
| `simpledialogSpecConfirm` | 自定义“特殊确认”逻辑，若未提供则调用 `DlgBasic._onConfirm` | `Function` \| `null` | `null` |
| `simpledialogConfirmMore` | 默认确认成功后的追加回调 `(resData) => Promise<void>` | `Function` \| `null` | `null` |
| `simpledialogSubmit` | 覆盖默认 `submit` 行为 `(form) => Promise<void>` | `Function` \| `null` | `null` |

`defaultProps` 默认结构：

```js
{
  labelWidth: '',            // el-form label 宽度，默认 100px
  keyWord: ' ',
  autoSaveClose: true,       // 通用保存后是否自动关闭
  formItems: [],             // 表单描述，见下
  formRules: {},             // el-form 校验规则
  defaultDBProps: {          // 透传给 DlgBasic
    footButtons: {}
  }
}
```

### `formItems` 常用字段

必填字段：`name`（展示名）、`field`（绑定键）、`type`。  
支持的 `type` 及额外配置：

- `input`：`placeholder`、`disabled`
- `password`：同 input，会触发 `resetPass`
- `textarea`：`placeholder`
- `switch`
- `radio` / `checkbox`：`options: [{ id, value }]`
- `select_noremote`：`options: [{ id, name }]`
- `select`：`keyWords`、`selectLabel`、`multiple`、`searchKeys`、`regKey`、`autoSelect`、`placeholder`
- `cascader`：`keyWords`、`checkStrictly`、`searchKeys`
- `date`：日期时间选择
- `doubleinput` / `tripleinput`：`field1/2/3`、`placeholder1/2/3`
- `doubleLabel`：`field1/2`、`name1/2`
- `uploadFile`：`upButtonInfo`、`fileMaxSize`、`fileAllowedTypes`、`allowMultiFiles`
- `upload-card`：`fileTypes`
- `downloadFile`：使用 `fileName`、`ossFileId` 从表单数据生成下载按钮
- `icon`：图标选择器

## 插槽

- `#upItems`：在表单前方插入内容。
- `#otherItems`：表单主体之后、`textarea` 之前插入额外表单项（如自定义选择器）。
- `#bottomItems`：表单尾部内容。

## 事件

| 事件 | 触发时机 / 参数 |
| --- | --- |
| `update-record` | 对话框关闭且 `saveType === true` 时，传出当前 `form` |
| `close-dialog` | 对话框关闭时 |
| `open-dialog` | 对话框打开时，参数为行数据 |
| `simple-select-change` | 内部 `SimpleSelect` 变更时，参数 `(val, field, form, options)` |
| `simple-select-init-finish` | `SimpleSelect` 初始化完成时，参数 `(field, options)` |
| `tree-select-change` | `SimpleTreeSelect` 变更时，参数 `(val, field, form)` |

## 暴露方法

| 方法 | 说明 |
| --- | --- |
| `showDialog(visible, formData = {}, bind = false)` | 打开/关闭对话框；`bind=true` 直接绑定对象，否则深拷贝 |
| `_confirm(option, type, formData?)` | 调用通用提交逻辑（含校验、保存、继续新增等），通常无需直接调用 |

## 交互逻辑

- 表单模型 `form` 为响应式对象，`watch` 深度监听并触发校验，将校验结果传递给 `DlgBasic` 控制按钮可用状态。
- 默认确认流程：`_confirm` 调用 `dlgAPI.commonSubmitDlg` 保存，成功后触发 `simpledialogConfirmMore`（如有），支持“继续新增”时重置表单并保留树型父节点信息。
- `simpledialogConfirm` / `simpledialogSpecConfirm` / `simpledialogSubmit` 可分别覆盖默认确认、特殊确认和提交行为。
- `autoSaveClose` 为 `true` 时，保存成功会由 `DlgBasic` 负责关闭对话框（代码中已预留逻辑）。
