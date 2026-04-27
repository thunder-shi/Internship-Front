# 实习记录模块 (views/internship-record/)

## 页面架构

```
UploadInternshipReport.vue  (学生端)
  └── 选择实习项目（校外/校内）→ 选择期数 → DlgSubmitDiary（提交/重提）

ReviewInternshipReport.vue  (老师端)
  └── 选择实习项目 → 选择期数 → DlgReviewDiary / DlgBatchReviewDiary

StuInternshipSign.vue       (学生打卡)
  └── 选择已通过的校外实习岗位 → 打卡提交 → 查看历史

StuSignAudit.vue            (打卡审核)
  └── 选择岗位 → 今日打卡 / 按学生查询 → 审核（支持批量）
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
- **MainDiary 占位**: 分配导师时自动调用 `initDiariesByInternship({ internshipId })` 预建占位；submit=false 表示未提交
- **教师过滤**: 非超级管理员通过 `ViewRelTeacherStudent`（teacherId + internshipId）获取关联学生 ID，前端按 `stuRelationId`（校外）/ `teacherId`（校内）过滤

## DlgSubmitDiary 文件上传

- 原生 `<input type="file">` + `fileInputRef.click()`（禁用 el-upload）
- 格式: pdf / office(doc/docx/xls/xlsx/ppt/pptx) / 压缩包(zip/rar/7z) / 图片 / 视频
- 限制: 最多 5 个，单个 ≤ 50MB，总计 ≤ 100MB
- 文件徽章: Office 风格（W=蓝/#2b579a，X=绿/#217346，P=橙/#d24726，PDF=红）
- 查询已上传: `SysOssFile`，条件 `{ relationIds: diaryId, tableName: 'MainDiary' }`
- 文件管理共用: `useDiaryFiles()` composable（DlgSubmitDiary + DlgReviewDiary）
