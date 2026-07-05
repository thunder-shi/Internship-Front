# AGENTS.md - 实习实训系统前端项目指南

## 重要约束

- 所有操作只能在当前项目目录内进行
- 禁止访问 ~/、$HOME 或项目目录以外的任何路径

## 行为准则

> 权衡：这些准则偏向谨慎而非速度。简单任务灵活判断。

### 1. 先想再写

- 明确说出你的假设，不确定就问。
- 存在多种理解时，列出来——不要默默选一种。
- 有更简单的方案就提出来，该反驳就反驳。
- 不清楚的地方停下来，说清楚哪里不懂，问。

### 2. 简单优先

- 只写解决问题的最少代码，不做投机性扩展。
- 不加没要求的功能、抽象、灵活性、配置项。
- 不为不可能的场景写错误处理。
- 200 行能缩成 50 行就重写。
- 自问："资深工程师会觉得这过度设计了吗？" 是就简化。

### 3. 精准改动

- 只动必须动的，只清理自己制造的问题。
- 编辑现有代码时：不"改进"旁边的代码、注释或格式；不重构没坏的东西；遵循现有风格。
- 自己的改动产生废弃代码时才删除，不删原有的死代码（除非被要求）。
- 检验标准：每一行改动都能直接追溯到用户的需求。

### 4. 目标驱动

- 定义成功标准，循环验证直到达成。
- 多步任务列出简要计划，每步附验证方式。
- 强成功标准能独立推进，弱标准（"让它能跑"）会不断需要确认。

## 技术栈

| 层次 | 技术 | 版本 |
|------|------|------|
| 框架 | Vue | ^3.5.22 |
| 构建 | Vite | ^5.4.21 |
| UI 库 | Element Plus | ^2.11.4 |
| 路由 | Vue Router | ^4.6.0 |
| 状态 | Vuex + vuex-persistedstate | ^4.0.2 / ^4.1.0 |
| HTTP | Axios | ^1.12.2 |
| 样式 | Sass | ^1.93.2 |
| 时间 | moment | ^2.30.1 |

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

`api/list.js` 默认导出 `listAPI` 对象（含 `editOneNode / editManyNodes / delOneOrManyNodes / changeNodeOrder / getSomeRecords`），统一通过对象调用：

```javascript
import listAPI from '@/api/list'

listAPI.getSomeRecords({
  keyWords: 'Table', pageInfo: { page: 1, size: 10 },
  searchKey: { name: 'x' }, reg: { name: '≈' }, andor: {},
  sort: { properties: 'id', direction: 'DESC' }
})

listAPI.editOneNode('Table', { id: null, ...fields })  // id=null 新增，有值 编辑
listAPI.delOneOrManyNodes('Table', [1, 2, 3])
listAPI.editManyNodes('Table', [{ id: 1, ...}, { id: 2, ...}])
```

**`andor` 必须传对象 `{}` 而非字符串 `'and'`**（后端 SQL 解析会把字符串误当字段名拼接，详见 troubleshooting）。

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
| `v-adaptive` | `v-adaptive="{ bottomOffset: 50 }"` 表格自适应高度（`directive/el-table`） |
| `v-adaptive-card` | `el-card` 自适应高度（`directive/el-card`） |
| `v-dialogDrag` | `v-dialogDrag="{ ref: dialogRef, uid: dlgUid }"` 对话框可拖拽（`utils/forDialog.js`，`DlgBasic` 已封装） |

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
| `/update-Codex-md` | 扫描代码状态并更新本目录的 AGENTS.md / docs/* |

## 详细文档（按需查阅）

- API 模块参考: `.Codex/docs/api-reference.md`
- 常量完整定义: `.Codex/docs/constants.md`
- Composables 参考: `.Codex/docs/composables.md`
- 问题排查: `.Codex/docs/troubleshooting.md`
- 实习记录/打卡模块: `.Codex/docs/internship-record.md`
- 实习流程/安排/岗位模块: `.Codex/docs/internship-process.md`
