# /create-assignment-page

创建安排 + 审核页面对（如学生安排/学生安排审核、老师安排/老师安排审核），复用 AssignmentPage 和 AssignmentVerifyPage 通用模板。

## 使用方式

```
/create-assignment-page <功能名称> <processTypeCode> <角色类型:student|teacher>
```

示例：`/create-assignment-page 学生实习项目安排 STUDENT_SELECT_INTERNSHIP student`

## 执行步骤

1. **确认参数**：向用户确认：
   - 功能名称（如"学生实习项目安排"）
   - processTypeCode（对应 `CONSTANT.PROCESS_TYPE` 中的值）
   - 角色类型（student/teacher，决定选择对话框和表格列预设）
   - 是否需要新增表格列预设（或复用已有的）

2. **在 config/assignmentPresets.js 中添加预设**（如需新增）：

```javascript
// 参考已有预设
export const MY_COLUMNS = [
  { id: 1, showName: '姓名', tableColumnName: 'userName', sortable: true },
  { id: 2, showName: '联系电话', tableColumnName: 'phone', sortable: true },
  { id: 3, showName: '开始时间', tableColumnName: 'startTime', sortable: true },
  { id: 4, showName: '结束时间', tableColumnName: 'endTime', sortable: true },
  { id: 5, showName: '当前状态', tableColumnName: 'customize-status', sortable: true },
];

export const MY_VERIFY_COLUMNS = [
  { id: 2, showName: '项目名称', theOrder: 2, tableColumnName: 'internshipName' },
  { id: 3, showName: '姓名', theOrder: 3, tableColumnName: 'userName' },
  { id: 4, showName: '流程开始时间', theOrder: 4, tableColumnName: 'startTime' },
  { id: 5, showName: '流程结束时间', theOrder: 5, tableColumnName: 'endTime' },
  { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'customize-status' },
  { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' },
];
```

3. **创建安排页面**（极简，仅传 props）：

```vue
<template>
  <AssignmentPage
    ref="assignmentPageRef"
    page-title="{{ 功能名称 }}"
    no-project-message="当前没有可分配的实习项目"
    :process-type-code="processTypeCode"
    :table-columns="MY_COLUMNS"
    :select-dialog-component="DlgXxxSelect"
  />
</template>

<script setup>
import { ref } from 'vue';
import CONSTANT from '@/utils/constant';
import AssignmentPage from './components/AssignmentPage.vue';
import DlgXxxSelect from './components/DlgXxxSelect.vue';
import { MY_COLUMNS } from './config/assignmentPresets';

defineOptions({ name: '{{ 安排页面名 }}' });

const processTypeCode = CONSTANT.PROCESS_TYPE.{{ processTypeCode }};
const assignmentPageRef = ref(null);
</script>
```

4. **创建审核页面**（同样极简）：

```vue
<template>
  <AssignmentVerifyPage
    ref="verifyPageRef"
    page-title="{{ 功能名称 }}审核"
    no-project-message="当前没有需要审核的记录"
    :process-type-code="processTypeCode"
    :table-columns="MY_VERIFY_COLUMNS"
    dlg-title="审核"
    recall-title="退回"
  />
</template>

<script setup>
import { ref } from 'vue';
import CONSTANT from '@/utils/constant';
import AssignmentVerifyPage from './components/AssignmentVerifyPage.vue';
import { MY_VERIFY_COLUMNS } from './config/assignmentPresets';

defineOptions({ name: '{{ 审核页面名 }}' });

const processTypeCode = CONSTANT.PROCESS_TYPE.{{ processTypeCode }};
const verifyPageRef = ref(null);
</script>
```

5. **提醒用户**：在后端菜单管理中配置两个页面的路由和权限。

## 已有预设（config/assignmentPresets.js）

| 预设名 | 用途 |
|--------|------|
| `ASSIGNMENT_KEY_WORD` | 列表 keyWord（edit: RelIntershipUser, view: ViewVerifyProcessRelIntershipUserMerge） |
| `ASSIGNMENT_STUDENT_COLUMNS` | 安排页-学生表格列 |
| `ASSIGNMENT_TEACHER_COLUMNS` | 安排页-老师表格列 |
| `VERIFY_STUDENT_COLUMNS` | 审核页-学生表格列 |
| `VERIFY_TEACHER_COLUMNS` | 审核页-老师表格列 |

## 已有选择对话框

| 组件 | 用途 |
|------|------|
| `DlgStudentSelect.vue` | 学生选择（左侧部门树 + 右侧学生列表） |
| `DlgTeacherSelect.vue` | 教师选择（左侧部门树 + 右侧教师列表） |

## 关键 Composables

- `useAssignmentPageConfig` - 项目选择条件、角色判断、标题管理
- `useAssignmentActions` - 删除/提交/批量提交/查看进度
- `useVerifyFilter` - 审核页客户端过滤

## 注意事项

- AssignmentPage/AssignmentVerifyPage 已内置了所有审核逻辑，页面只需传差异化 props
- 如需自定义选择对话框，参考 DlgStudentSelect/DlgTeacherSelect 的结构（左侧 DataTree + 右侧 DataTableList）
- 安排和审核页面共用 `ASSIGNMENT_KEY_WORD`（edit: RelIntershipUser, view: Merge View）
