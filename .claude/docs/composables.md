# Composables 参考 (utils/)

| 文件 | 导出 | 说明 |
|------|------|------|
| `verify.js` | `isUserIdInVerifyUserId(verifyUserId, userId)` `buildVerifySearchWords()` `ROLE_NAME_FIELDS` `ROLE_ID_FIELDS` | 审核纯函数。verifyUserId 格式 "Id1\|Id2\|Id3"，必须精确匹配 |
| `useVerifyFilter.js` | `useVerifyFilter()` → `{ clientFilterFn, getVerifyRoleName }` | Merge View 审核过滤（待审核/通过/不通过/退回 四种规则） |
| `useAssignmentPageConfig.js` | `useAssignmentPageConfig(options)` | 安排/审核页面公共配置（项目选择、搜索条件、角色判断） |
| `useAssignmentActions.js` | `useAssignmentActions(getRefreshFn)` → `{ currentRow, showProgressDialog, handleViewClick, handleDeleteClick, handleSubmitClick, handleBatchSubmitClick }` | 安排页面公共操作逻辑 |
| `useBatchVerifyAuditDialog.js` | `useBatchVerifyAuditDialog(dlgVerifyRef)` → `{ lastBatchAuditCommand, handleBatchAuditCommand, handleAuditClick }` | 批量审核对话框（单条直接打开，多条按预选类型筛行后打开） |
| `useProcessWindowProjectSelectKeys.js` | `useProcessWindowProjectSelectKeys(userInfo, withMajorFilter?)` → `{ projectSelectSearchKey, projectSelectRegKey }` | 实习项目时间窗口查询条件（startTime≤now≤endTime） |
| `internshipStatsDepartment.js` | `isInternshipStatsSchoolScopeUser` `isInternshipStatsDepartmentAdmin` `canViewInternshipCollegeStats` `resolveCollegeScopeDepartmentId` `fetchSchoolRootDepartmentId` `fetchDepartmentSubtreeRootRow` | 实习统计部门权限判断与部门树工具 |
| `useDiaryFiles.js` | `useDiaryFiles()` → `{ files, filesLoading, loadFiles, triggerDownload, deleteFile, reset }` | 日志附件管理（DlgSubmitDiary / DlgReviewDiary 共用） |
| `relIntershipUserSelect.js` | 实习用户选择相关工具 | 供 DlgIntershipUserSelectBase 使用 |

## clientFilterFn 过滤规则（useVerifyFilter）

适配 Merge View（后端已按 processId 分组，每条只有一条最新记录）：

- **待审核(0)**: 当前用户在 verifyUserId 中
- **全部通过(1) + isAllVerified**: 最终级审核人可见（用于退回操作）
- **审核不通过(2)**: 当前用户在 verifyUserId 中
- **退回(3)**: 创建人可见
- 自动排除 reason 含"系统自动通过"的记录
