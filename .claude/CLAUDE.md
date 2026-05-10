# CLAUDE.md - 实习实训系统前端项目指南

## 重要约束

- 所有操作只能在当前项目目录内进行
- 禁止访问 ~/、$HOME 或项目目录以外的任何路径

## 技术栈

| 层次 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | 3.5.22 |
| 构建 | Vite (rolldown) | 7.1.14 |
| UI 库 | Element Plus | 2.11.4 |
| 路由 | Vue Router | 4.6.0 |
| 状态 | Vuex + vuex-persistedstate | 4.0.2 |
| HTTP | Axios | 1.12.2 |
| 样式 | Sass | 1.93.2 |

## 常用命令

```bash
npm run dev      # 开发服务器 (http://localhost:5173)
npm run build    # 生产构建
```

## 项目结构

```
src/
├── api/            # API 模块（list.js 核心 CRUD）
├── components/     # 可复用组件（DataTableList、SimpleUpload 等）
├── directive/      # v-permission、v-adaptive、v-dialogDrag
├── layout/         # 后台布局（NavBar、SideBar、TagsView）
├── router/         # 路由（constantRoutes + asyncRoutes）
├── store/          # Vuex 模块（user、permission、app、settings、tagsView）
├── utils/          # 工具函数 + Composables
└── views/          # 页面组件
```

## BaseList 模板（核心开发模式）

大多数 CRUD 页面基于 `views/master-page/BaseList.vue`：

```vue
<template>
  <BaseList :default-props="defaultProps" ref="baseList" />
</template>

<script setup>
import { ref, computed } from 'vue'
import BaseList from '@/views/master-page/BaseList.vue'

const baseList = ref(null)
const defaultProps = computed(() => ({
  defaultDTLProps: {
    initSearchWords: { searchKey: { status: 1 }, regKey: { status: '=' }, andor: {} },
    defaultDTHProps: {
      keyWord: { edit: 'TableName', view: 'ViewName' },
      buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true } },
      allTableColumns: [
        { id: 1, showName: '名称', theOrder: 1, tableColumnName: 'name' }
      ]
    }
  },
  defaultSDProps: {
    keyWord: 'TableName',
    formItems: [{ name: '名称', field: 'name', type: 'input' }],
    formRules: { name: [{ required: true, message: '名称不能为空', trigger: 'blur' }] }
  }
}))
// baseList.value?.openDlg('append', {})  → 新建
// baseList.value?.openDlg('edit', row)   → 编辑
// baseList.value?.initDataList()         → 刷新
</script>
```

## FormItemsforDialog 表单类型

`input` / `doubleinput` / `tripleinput` / `password` / `textarea` / `select`(远程,keyWords) / `select_noremote`(本地,options) / `radio` / `checkbox` / `switch` / `datetime` / `date` / `daterange` / `cron` / `upload` / `label` / `SimpleSelect` / `SimpleTreeSelect`

## 核心 API (api/list.js)

```javascript
import { getSomeRecords, editOneNode, delOneOrManyNodes, changeNodeOrder } from '@/api/list'

getSomeRecords({ keyWords: 'Table', pageInfo: { page: 1, size: 10 },
  searchKey: { name: 'x' }, reg: { name: '≈' }, andor: 'and',
  sort: { properties: 'Id', direction: 'DESC' } })

editOneNode('Table', { id: null, ...fields })  // id=null 新增，有值 编辑
delOneOrManyNodes('Table', [1, 2, 3])
```

- 后端地址: `http://127.0.0.1:8111`，`/api` 前缀 Vite 代理转发
- Token 自动携带（Cookie `Admin-Token`），keyWord 参数自动 RSA 加密

## 审核框架

```javascript
// AUDIT_STATUS: SAVE=-1(待提交)  SUBMIT=0(待审核)  PASS=1(通过)  NOTPASS=2(不通过)  BACK=3(退回)
import CONSTANT from '@/utils/constant'

import { useVerifyFilter } from '@/utils/useVerifyFilter'
import { buildVerifySearchWords } from '@/utils/verify'
const { clientFilterFn } = useVerifyFilter()
const initSearchWords = buildVerifySearchWords()  // isAudit IN (0,1,2,3) + 时间过滤
```

**关键陷阱**: `verifyUserId` 格式为 `"Id1|Id2|Id3"`，必须用 `isUserIdInVerifyUserId()` 精确匹配，不能用 `includes`（后端 LIKE 会误匹配）。

## 文件上传（核心规则）

**上传顺序**: 先 `editOneNode` 保存主记录获取 `relId`，再调用 `uploadRef.value.handleUpload(userId, relId, 2)`。

**Dialog 内文件选择**: `el-upload` 在 `el-dialog` 内点击无反应 → 改用原生 `<input type="file" ref="fileInputRef" style="display:none">` + `fileInputRef.click()`。

**文件下载**: `fileAPI.downloadFile(id)` → presigned URL → `window.open`（不走代理，速度快）。

## 关键常量

```javascript
import CONSTANT from '@/utils/constant'
// ROLE_TABLE (基于 sys_role.id):
//   SUPER_ADMIN=1, SCHOOL_TEACHER=2, STUDENT=3, DEPARTMENT_ADMIN=13,
//   ACADEMIC_AFFAIRS_ADMIN=14, SCHOOL_ADMIN=15, COMPANY_TUTOR=18, COMPANY_ADMIN=19
//
// USER_JOB_CODE (基于 base_job_position.jobCode): 岗位 code 字符串
// 注意: ROLE_TABLE 和 USER_JOB_CODE 含义不同，勿混用
//
// SEARCH_OPERATOR: EQ='=' NE='!=' LIKE='≈' IN='()' GT='>' LT='<' GE='>=' LE='<=' RANGE='<=>'
```

**字段约定**: 学号列统一用 `tableColumnName: 'studentAccount'`（不是 `account`），放在 `studentName` 后面。

## 自定义指令

| 指令 | 用法 |
|------|------|
| `v-permission` | `v-permission="['admin']"` |
| `v-adaptive` | `v-adaptive="{ bottomOffset: 50 }"` 表格自适应高度 |
| `v-dialogDrag` | `v-dialogDrag="dialogRef"` 对话框可拖拽 |

## 状态管理

```javascript
import { useStore } from 'vuex'
const store = useStore()
const userInfo = computed(() => store.getters.userInfo)
const roles = computed(() => store.getters.roles)
const isSuperAdmin = computed(() => roles.value.some(r => r.name === '超级管理员'))
```

## Skills（任务型操作）

| Skill | 触发场景 |
|-------|---------|
| `/create-crud-page` | 创建新 CRUD 页面 |
| `/create-audit-page` | 创建审核页面 |
| `/create-assignment-page` | 创建安排/分配页面 |
| `/add-file-upload` | 添加文件上传功能 |
| `/code-review` | 代码审查 |
| `/frontend-test` | 前端测试 |

## 详细文档（按需查阅）

- API 模块参考: `.claude/docs/api-reference.md`
- 常量完整定义: `.claude/docs/constants.md`
- Composables 参考: `.claude/docs/composables.md`
- 问题排查: `.claude/docs/troubleshooting.md`
- 实习记录/打卡模块: `.claude/docs/internship-record.md`
- 实习流程/安排/岗位模块: `.claude/docs/internship-process.md`
