# 实习流程模块 (views/internship-process/)

## 实习安排模块架构

```
AssignmentPage.vue (通用安排组件)
    ├── StudentAssignment.vue     - 学生实习项目安排
    └── TeacherAssignment.vue     - 指导老师安排

AssignmentVerifyPage.vue (通用审核组件)
    ├── StudentAssignmentVerify.vue
    └── TeacherAssignmentVerify.vue

TutorAssignmentBase.vue → TutorAssignmentVerifyPage.vue
    ├── EnterpriseTutorAssignment/Verify.vue   (校外企业导师)
    └── InternalTutorAssignment/Verify.vue     (校内导师)
```

配置预设: `config/assignmentPresets.js`、`config/tutorAssignmentVerifyPresets.js`

## 企业岗位管理架构

```
InternshipPostHeaderPage.vue (master-page/)  ← 项目选择 + BaseList
  └── InternshipPostPage.vue                 ← + DlgPostDetail + DlgVerifyProgress
      ├── InternshipPostApplication.vue      (企业岗位申报，企业管理员/导师)
      └── InternshipPostVerify.vue           (企业岗位审核)
  └── StuApplyPost.vue / StuApplyPostVerify.vue (学生报名及审核)
```

## 角色权限

- **企业管理员/企业导师** (`ROLE_TABLE.COMPANY_ADMIN / COMPANY_TUTOR`): 申报岗位
- **审核人员**: `useVerifyFilter` 过滤
- **学生** (`ROLE_TABLE.STUDENT`): 浏览和报名

## 关键 Composables

```javascript
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig'
import { useAssignmentActions } from '@/utils/useAssignmentActions'
import { useBatchVerifyAuditDialog } from '@/utils/useBatchVerifyAuditDialog'
import { useProcessWindowProjectSelectKeys } from '@/utils/useProcessWindowProjectSelectKeys'
```

## 选题模块

```
TeacherTopicDeclaration.vue       - 老师申报题目
TeacherTopicDeclarationVerify.vue - 老师申报题目审核
TeacherVerifyStuSelectTopic.vue   - 老师审核学生选题
TeacherAssignStuTitle.vue         - 老师给学生分配题目
StuSelectTopic.vue                - 学生选题
```

学生选题状态流: 提交 → 老师审核 → 通过/不通过（不通过后 `acknowledgeRejectedTitleSelection` 清理记录，学生可重新选）
