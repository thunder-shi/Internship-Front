# 实习记录模块 (views/internship-record/)

## 页面架构

```
UploadInternshipReport.vue  (学生端)
  └── 选择实习项目（校外/校内）→ 选择期数 → DlgSubmitDiary（提交/重提）

ReviewInternshipReport.vue  (老师端)
  └── 后端返回当前校内导师可批阅项目/期次 → 选择期数 → DlgReviewDiary / DlgBatchReviewDiary

StuInternshipSign.vue       (学生打卡)
  └── 选择已通过的校外实习岗位 → 打卡提交 → 查看历史

StuSignAudit.vue            (打卡审核)
  └── 选择岗位 → 今日打卡 / 按学生查询 → 审核（支持批量）

MainLeave.vue               (学生请假申请)
  └── 选择关联实习 → 填请假时段/原因 → 保存 / 保存并提交
      (提交后调 mainLeaveAPI.submitLeaveAudit(leaveId))

MainLeaveAudit.vue          (请假审核)
  └── useVerifyFilter + useBatchVerifyAuditDialog 套审核框架；
      DlgVerifyProgress 的 key-words 必须传 "ViewLeaveAuditFlow"，
      与默认 MainVerifyProcess 不同
```

## _approved 判断（关键陷阱）

**校外实习**: 查询 `ViewVerifyProcessRelStuInternshipPostMerge`，用 `item.isAllVerified === true` 判断。

**校内实习**: 并行查询两个视图：
- `ViewRelTitleTeacherStudent` — 提供 name/teacherName 等显示字段
- `ViewVerifyProcessRelTitleStudentMerge` — 提供 `isAllVerified`

通过 `intVerifyMap.get(item.relTitleStudentId) ?? false` 赋值。

**绝对禁止**: `ViewRelTitleTeacherStudent.isAudit` 来自 `RelTitleTeacher`（导师课题授权状态），**不是**学生选题审核状态，不能用于 `_approved` 判断。

关联键: `ViewVerifyProcessRelTitleStudentMerge.relationId` = `ViewRelTitleTeacherStudent.relTitleStudentId` = `RelTitleStudent.id`

## 其他关键设计

- **`_paramId`**: 校外用 `item.relationId`（= `rel_stu_internship_post.id` = `stuInternshipPostId`）
- **期数**: `getStudentPeriods({ stuInternshipPostId })` / `getStudentPeriods({ relTitleStudentId })`
- **MainDiary 占位**: 分配导师时后端预建占位；submit=false 表示未提交，草稿也可能带 `verifyProcessId` 和 `isAudit=-1`
- **日志批阅数据源**: `ReviewInternshipReport.vue` 使用 `/diary/review/options` 获取当前校内导师可批阅项目/期次，使用 `/diary/review/students` 获取待审学生日志；不再前端拼 `ViewRelIntershipUser` / `ViewRelTeacherStudent`
- **日志 ID 语义**: `diary.diaryId` 是 `MainDiary.id`，用于附件/AI；`diary.verifyProcessId` 是 `MainVerifyProcess.id`，用于 `auditProcess`；`diary.relationId` 兼容旧前端，等同 `diaryId`

## DlgSubmitDiary 文件上传

- 原生 `<input type="file">` + `fileInputRef.click()`（禁用 el-upload）
- 格式: pdf / office(doc/docx/xls/xlsx/ppt/pptx) / 压缩包(zip/rar/7z) / 图片 / 视频
- 限制: 最多 5 个，单个 ≤ 50MB，总计 ≤ 100MB
- 文件徽章: Office 风格（W=蓝/#2b579a，X=绿/#217346，P=橙/#d24726，PDF=红）
- 查询已上传: `SysOssFile`，条件 `{ relationIds: diaryId, tableName: 'MainDiary' }`
- 文件管理共用: `useDiaryFiles()` composable（DlgSubmitDiary + DlgReviewDiary）
