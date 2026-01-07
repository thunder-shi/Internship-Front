# Vue 3 + Vite

This template should help get you started developing with Vue 3 in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

Learn more about IDE Support for Vue in the [Vue Docs Scaling up Guide](https://vuejs.org/guide/scaling-up/tooling.html#ide-support).

---

# 查询条件编写指南

## 查询操作符

| 操作符 | 符号 | 说明 |
|--------|------|------|
| EQ | `=` | 等于 |
| NE | `!=` | 不等于 |
| LIKE | `≈` | 模糊查询 |
| IN | `()` | 包含于(多值) |
| NOT_IN | `!()` | 不包含于 |
| GT | `>` | 大于 |
| LT | `<` | 小于 |
| GE | `>=` | 大于等于 |
| LE | `<=` | 小于等于 |
| RANGE | `<=>` | 范围查询 |

---

## 一、API 请求中的查询条件

直接调用 API 时，通过 `searchKey`（查询值）和 `regKey`（操作符）配合使用。

### 示例

```javascript
// 1. 精确匹配：name = '软件实习'
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { name: '软件实习' },
  regKey: { name: '=' }
})

// 2. 不等于：name != '测试项目'
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { name: '测试项目' },
  regKey: { name: '!=' }
})

// 3. 模糊查询：name LIKE '%软件%'
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { name: '软件' },
  regKey: { name: '≈' }
})

// 4. IN 查询：internshipTypeId IN (1, 2, 3)
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { internshipTypeId: '1,2,3' },
  regKey: { internshipTypeId: '()' }
})

// 5. NOT IN 查询：internshipTypeId NOT IN (1, 2)
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { internshipTypeId: '1,2' },
  regKey: { internshipTypeId: '!()' }
})

// 6. 组合条件（AND）：name LIKE '%实习%' AND studentNum > 10
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { name: '实习', studentNum: '10' },
  regKey: { name: '≈', studentNum: '>' }
})

// 7. OR 逻辑：internshipTypeId = 1 OR creatorId = 5
// andor 中 false 表示 OR，true 或不设置表示 AND
await listAPI.getSomeRecords({
  keyWords: 'MainInternship',
  searchKey: { internshipTypeId: '1', creatorId: '5' },
  andor: { internshipTypeId: false, creatorId: false }
})
```

---

## 二、formItems 中的查询条件

在 SimpleDialog 或 FormItemsforDialog 的 `formItems` 配置中，可以为下拉框设置查询过滤条件。

### 属性说明

| 属性名 | 类型 | 说明 |
|--------|------|------|
| `searchKeys` | Object 或 String | 查询值。对象为静态条件，字符串为动态条件（从 form 取值） |
| `regKey` | Object | 查询操作符 |

### 示例

```javascript
const formItems = [
  // 1. 静态过滤 - 排除特定选项（NOT IN）
  // 排除 name 为 '超级管理员'、'--'、'学生' 的选项
  {
    name: '审核角色',
    field: 'verifyRoleId',
    type: 'select',
    keyWords: 'SysRole',
    searchKeys: { name: '超级管理员,--,学生' },
    regKey: { name: '!()' }
  },

  // 2. 静态过滤 - 只显示特定选项（IN）
  // 只显示 name 为 '教师'、'辅导员'、'院长' 的选项
  {
    name: '角色类型',
    field: 'roleId',
    type: 'select',
    keyWords: 'SysRole',
    searchKeys: { name: '教师,辅导员,院长' },
    regKey: { name: '()' }
  },

  // 3. 静态过滤 - 模糊匹配
  // 只显示 name 包含 '学院' 的选项
  {
    name: '部门',
    field: 'departmentId',
    type: 'select',
    keyWords: 'BaseDepartment',
    searchKeys: { name: '学院' },
    regKey: { name: '≈' }
  },

  // 4. 动态过滤 - 联动（根据其他字段值过滤）
  // 城市下拉框根据已选省份过滤
  { name: '省份', field: 'provinceId', type: 'select', keyWords: 'Province' },
  {
    name: '城市',
    field: 'cityId',
    type: 'select',
    keyWords: 'City',
    searchKeys: 'provinceId'  // 字符串：从 form.provinceId 取值
  },

  // 5. cascader 级联选择框
  {
    name: '学校院系',
    field: 'universityId',
    type: 'cascader',
    keyWords: 'ViewBaseDepartment',
    searchKeys: { typeName: '学校' }
  }
]
```

### 注意事项

- `regKey` 是**单数形式**，不是 `regKeys`
- 多个值用**逗号分隔**，不需要额外的引号：`'值1,值2,值3'`
- `select` 类型：`searchKeys` 可以是对象（静态）或字符串（动态）
- `cascader` 类型：`searchKeys` 直接使用对象
