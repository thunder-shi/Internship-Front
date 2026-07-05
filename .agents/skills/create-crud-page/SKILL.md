# /create-crud-page

基于 BaseList 模板快速创建标准 CRUD 页面。

## 使用方式

```
/create-crud-page <页面名称> <表名> [视图名]
```

示例：`/create-crud-page StudentInfo MainStudent ViewMainStudent`

## 执行步骤

1. **确认参数**：向用户确认页面名称、后端表名（edit 用）、视图名（view 用，可选）、所属模块目录、表格列定义、表单字段定义。

2. **创建页面文件**：在 `src/views/<模块目录>/` 下创建 Vue 文件，使用以下模板：

```vue
<template>
  <BaseList
    :default-props="defaultProps"
    ref="baseListRef"
    @append-click="appendClick"
    @edit-click="editClick"
    @delete-click="handleDeleteClick"
    @update-record="handleUpdateRecord"
  />
</template>

<script setup>
import { ref, computed } from 'vue';
import BaseList from '@/views/master-page/BaseList.vue';

defineOptions({
  name: '{{ 页面名称 }}',
});

const baseListRef = ref(null);

const defaultProps = computed(() => ({
  defaultDTLProps: {
    initSearchWords: {},
    defaultDTHProps: {
      keyWord: { edit: '{{ 表名 }}', view: '{{ 视图名 || 表名 }}' },
      buttonProps: {
        create: { show: true },
        update: { show: true },
        delete: { show: true },
      },
      allTableColumns: [
        // {{ 根据用户提供的字段生成 }}
      ],
    },
  },
  defaultSDProps: {
    keyWord: '{{ 表名 }}',
    formItems: [
      // {{ 根据用户提供的字段生成 }}
    ],
    formRules: {
      // {{ 根据必填字段生成 }}
    },
    defaultDBProps: {
      footButtons: {
        confirm: { show: true, name: '确定', type: 'primary' },
        submit: { show: false },
      },
    },
  },
}));

const appendClick = () => baseListRef.value?.openDlg('append', {});
const editClick = (row) => baseListRef.value?.openDlg('edit', row);
const handleDeleteClick = (rows) => baseListRef.value?.handleDelete(rows);
const handleUpdateRecord = () => baseListRef.value?.initDataList();
</script>
```

3. **添加路由**：路由由后端动态生成，无需手动添加到 `router/index.js`（仅包含 constantRoutes）。提醒用户在后端菜单管理中配置。

4. **验证**：检查文件语法正确，组件名与文件名一致。

## 注意事项

- `keyWord.edit` 对应后端实际表名，用于增删改操作
- `keyWord.view` 对应后端视图名，用于查询展示（可与 edit 相同）
- 所有 keyWord 参数会自动 RSA 加密
- allTableColumns 中的 `tableColumnName` 必须与后端字段名一致
- formItems 的 type 支持: input, textarea, select, select_noremote, radio, checkbox, switch, date, datetime, daterange, upload, SimpleTreeSelect 等
- 远程下拉(select)需配置 `keyWords` 指向关联表名
- 表单验证规则复用 `@/utils/formRules.js`
