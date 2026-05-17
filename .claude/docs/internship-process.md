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

学生选题状态流: 提交 → 老师审核 → 通过/不通过
- 不通过后 `acknowledgeRejectedTitleSelection` 清理记录，学生可重新选
- 老师可显式调 `confirmStudentTopicSelection`（`auditProcess` 通过时后端也会自动触发）

## 终止学生实习模块

```
StudentInternshipTermination.vue       (学生/管理端发起终止)
StudentInternshipTerminationVerify.vue (审核端)
  └── components/DlgInternshipTerminationDetail.vue  详情/审核弹窗
```

- 流程类型: `PROCESS_TYPE.STUDENT_INTERNSHIP_TERMINATION`
- API: `terminationAPI.{ listCandidates, create, resubmit, audit, detail, cancel }`（见 api-reference）
- 候选过滤维度（前端）: `internshipMode`（INTERNAL/EXTERNAL）+ `internshipStatus`（ACTIVE/TERMINATING/TERMINATED）

## 企业信息模块（MainEnterpriseInfo）

```
EnterpriseInfoDeclaration.vue   企业管理员/导师申报（BaseList + DlgEnterpriseInfoDeclaration）
EnterpriseInfoAudit.vue         审核（DlgEnterpriseInfoDetail）
EnterpriseInfoQuery.vue         查询（DlgEnterpriseInfoDetail，含历史版本）
EnterpriseInfoVerifyConfig.vue  审核流配置（VERIFY_LEVEL + verifyFirst..Fifth RoleId + schoolId）
```

- 表名常量: `ENTERPRISE_TABLE_NAME = 'MainEnterpriseInfo'`
- 资格闸门: 校外实习相关入口须先调用 `ensureEnterpriseAccess(store)`（缓存 `/enterpriseInfo/mine`），未通过返回提示
- 「当前有效通过版」: `currentApproved` 由后端 `resolveEffectiveApprovedRecord` 解析；行级 `effectiveCurrent` 字段需用 `resolveEffectiveCurrent(record)` 判断（undefined 不能当 false）
- 审核流配置就绪条件: `isEnterpriseVerifyConfigReady({ verifyTypeId, verifyFirstRoleId..., schoolId })`，`schoolId` 是合作高校根部门 id，不是企业树根

## 自主实习（校外虚拟岗位）

- 常量: `CONSTANT.SELF_INTERNSHIP.POST_CODE = 'SELF_INTERNSHIP'`，`POST_NAME = '自主实习'`，`UNLIMITED = -1`
- 后端建校外项目时幂等创建一条 `code=SELF_INTERNSHIP` 的 `MainInternshipPost` 虚拟岗位；前端可调 `createSelfInternshipPost(internshipId)` 兜底
- 学生提交: `applySelfInternship({ internshipId, selfCompanyName, selfPostName, selfAddress, selfRemarks })`
  - 同项目同学生已有 SAVE/SUBMIT/PASS/BACK → 后端返回 400（前端按 message 提示）
  - NOTPASS → 后端原地覆盖（`created:false`），旧附件已清空需重传
- 附件 `tableName='RelStuInternshipPost'`，业务字段以 `self_*` 前缀写入该表
