# API 模块参考

## api/list.js - 通用列表 CRUD（核心）

默认导出 `listAPI` 对象，所有 CRUD 页面（含 BaseList）都使用这个模块。

```javascript
import listAPI from '@/api/list'

listAPI.getSomeRecords({
  keyWords,      // 表/视图名（自动 RSA 加密）
  pageInfo: { page: 1, size: 10 },
  treeInfo,      // 树形可选
  searchKey,     // { field: value } —— 自动 safeStringify+RSA 加密
  reg,           // { field: SEARCH_OPERATOR.* } —— 同上
  sort,          // { properties: 'id', direction: 'DESC' }（默认）
  andor,         // 必须传对象 {}（不要传字符串 'and'）
})

listAPI.editOneNode(keyWords, node)          // id=null 新增；有 id 编辑
listAPI.editManyNodes(keyWords, nodes)       // 批量
listAPI.delOneOrManyNodes(keyWords, [1,2,3]) // 批量删除（ids 自动加密）
listAPI.changeNodeOrder(keyWords, nodeId, up, moveSearchKeys, moveRegKeys) // 上下移
```

## api/file.js - 文件操作（Minio）

前端不直接访问 Minio，全部通过后端代理：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/common/minio/upload` | POST | 上传（multipart/form-data） |
| `/common/minio/download/{id}` | GET | 获取 presigned URL |
| `/common/minio/deleteFile` | DELETE | 删除（`?ossFileIds=1,2,3`） |

```javascript
import fileAPI from '@/api/file'

fileAPI.upload({
  files: fileOrFileArray,  // File 对象或数组，key='files'
  userId,
  relIds: recordId,        // 关联记录 ID
  type: 2,                 // 1=图片，2=文件
  tabName: 'TableName'     // 可选
})

fileAPI.downloadFile(id)          // → presigned URL → window.open
fileAPI.getPreviewUrl(id)         // 返回干净 presigned URL（用于 kkFileView 在线预览）
fileAPI.deleteFile(fileIds)       // 支持单个 id 或数组
fileAPI.getProgressPercent()      // 当前上传进度
```

> `getPreviewUrl` 与 `downloadFile` 走不同后端端点（`/preview/{id}` vs `/download/{id}`）：
> preview URL 不携带 `response-content-disposition` / `response-content-type` 覆写参数，
> 否则 MinIO 返回 400，kkFileView 拉不到文件内容。

**SimpleUpload 组件**:
```vue
<SimpleUpload ref="uploadRef" v-model="form.fileList"
  :up-button-info="{ name: '上传', tooltip: '...' }"
  :file-max-size="20" :file-allowed-types="['pdf', 'docx']"
  :allow-multi-files="true" :update-status="canEdit" />
```
暴露方法: `handleUpload(userId, relId, type)` / `clearFiles()`

## api/tree.js

```javascript
import { getTree, editTreeNode, deleteTreeNode } from '@/api/tree'
```

## api/user.js

```javascript
import { login, logout, getUserInfo, updatePassword } from '@/api/user'
```

## api/role.js

```javascript
import { getRoleList, getRolePermissions, updateRolePermissions } from '@/api/role'
```

## api/importAndExport.js

```javascript
import { importData, exportData, downloadTemplate } from '@/api/importAndExport'
```

## api/internshipProcess.js

```javascript
import internshipProcessAPI from '@/api/internshipProcess'

// 流程控制
internshipProcessAPI.auditProcess(node)                    // 推进审核流程
internshipProcessAPI.activateProcess(params)               // 激活流程
internshipProcessAPI.getVerifyUserIds(params)              // 获取审核人 ID 列表

// 师生/导师分配
internshipProcessAPI.initTeacherStudentByInternshipId(params)    // 按项目初始化师生分配
internshipProcessAPI.initEnterpriseTutorByInternshipId(params)   // 初始化企业导师
internshipProcessAPI.manualAssignTeacherStudent(params)          // 手动分配师生
internshipProcessAPI.listAssignableTeachers(params)              // 可分配教师列表
internshipProcessAPI.listAssignableStudents(params)              // 可分配学生列表

// 岗位相关
internshipProcessAPI.listApprovedExternalInternshipPosts(node)         // 已通过审核的校外岗位
internshipProcessAPI.getExternalInternshipStudentPostBreakdown(node)   // 校外选岗明细

// 选题相关
internshipProcessAPI.getLatestRejectedTitleSelection(node)       // 学生最近一条不通过选题
internshipProcessAPI.acknowledgeRejectedTitleSelection(node)     // 确认后清理选题记录
internshipProcessAPI.confirmStudentTopicSelection(node)          // 老师最终确认（auditProcess 通过时也会触发）

// 自主实习（校外）
internshipProcessAPI.createSelfInternshipPost(internshipId)      // 幂等创建自主实习虚拟岗位（后端建项目时已自动调用）
internshipProcessAPI.applySelfInternship(node)
// node: { internshipId, selfCompanyName, selfPostName, selfAddress, selfRemarks }
// 返回: { relStuInternshipPostId, isAudit, verifyTypeId, created }
// 注：同项目同学生已有 SAVE/SUBMIT/PASS/BACK → 后端返回 400；NOTPASS → 原地覆盖（created:false，附件已清空需重传）

// 统计（见 docs/stats-module 部分）
internshipProcessAPI.listExternalInternshipCollegeStats(node)
internshipProcessAPI.listInternalInternshipCollegeStats(node)
internshipProcessAPI.getInternalInternshipTitleSelectionBreakdown(node)
internshipProcessAPI.listInternalInternshipTeachersNotSubmittedTopic(node)
```

## api/diary.js

```javascript
import {
  submitDiary,           // 学生提交/重新提交日志
  getStudentPeriods,     // 学生期数列表（含 diary Merge 视图）
  getInternshipPeriods,  // 实习项目总期数（老师视角）
  getPeriodStudents,     // 某期所有学生日志（老师视角）
  getDiaryReviewOptions, // 当前校内导师可批阅项目/期次（POST /diary/review/options）
  getDiaryReviewStudents,// 当前校内导师指定项目期次下可批阅日志（POST /diary/review/students）
  initDiariesByInternship, // 批量初始化 MainDiary 占位（POST /diary/init-by-internship）
  generatePeriods,       // 生成期次（清空重建，非追加）
  savePeriod,            // 新增/编辑单条期次（id=null 新增）
  deletePeriods          // 删除期次（有已提交日志时后端返回 400）
} from '@/api/diary'
```

## api/mainSign.js

```javascript
import { submitSignAudit } from '@/api/mainSign'
// submitSignAudit(signId, internshipId?)
//   学生打卡提交后生成审核记录（POST /main-sign/submit-audit）
//   internshipId 可选，传入时后端按项目维度落审核流
```

## api/mainLeave.js - 请假单

```javascript
import mainLeaveAPI, {
  saveLeave,                    // PUT /common/saveOneRecord?tblName=MainLeave  保存草稿
  submitLeaveAudit,             // POST /main-leave/submit-audit                提交审核
  getMainLeavePage,             // POST /common/getSomeRecords/MainLeave        主档分页
  getLeaveUniversalDetailsPage, // POST /common/getSomeRecords/ViewLeaveUniversalDetails
  getLeaveAuditFlowPage,        // POST /common/getSomeRecords/ViewLeaveAuditFlow
  getAuditorTodoPage,           // POST /common/getSomeRecords/ViewAuditorTodoList
  deleteLeave,                  // DELETE /common/deleteRecordByDelflag?tblName=MainLeave&id=
} from '@/api/mainLeave'
```

> `DlgVerifyProgress` 在请假场景下用 `key-words="ViewLeaveAuditFlow"`，与流程审核默认的 `MainVerifyProcess` 不同。

## api/internshipTermination.js - 终止学生实习

```javascript
import terminationAPI from '@/api/internshipTermination'

terminationAPI.listCandidates(node)  // 可被终止的实习候选列表（按学生/类型/状态筛选）
terminationAPI.create(node)          // 提交终止申请（首次）
terminationAPI.resubmit(node)        // 退回后重新提交
terminationAPI.audit(node)           // 推进终止审核流程
terminationAPI.detail(node)          // 终止单详情
terminationAPI.cancel(node)          // 撤销/取消（待审核或退回时）
```

对应 `PROCESS_TYPE.STUDENT_INTERNSHIP_TERMINATION`，页面 `StudentInternshipTermination.vue` / `StudentInternshipTerminationVerify.vue`，详情对话框 `components/DlgInternshipTerminationDetail.vue`。

## api/enterpriseInfo.js - 企业信息申报与审核

```javascript
import enterpriseInfoAPI from '@/api/enterpriseInfo'

// 企业自查 / 历史
enterpriseInfoAPI.mine()              // 含 currentApproved（resolveEffectiveApprovedRecord 解析的「当前有效通过版」）
enterpriseInfoAPI.history(node)       // searchKey 可叠加 onlyEffectiveCurrent:true
enterpriseInfoAPI.detail(node)

// 申报
enterpriseInfoAPI.saveDraft(node)
enterpriseInfoAPI.submit(node)
enterpriseInfoAPI.resubmit(node)

// 审核
enterpriseInfoAPI.auditList(node)     // searchKey: keyword / auditStatus / onlyMine / onlyEffectiveCurrent
enterpriseInfoAPI.auditDetail(node)
enterpriseInfoAPI.auditProcess(node)

// 审核流配置
enterpriseInfoAPI.getVerifyConfig()
enterpriseInfoAPI.saveVerifyConfig(node)
```

视图工具见 `utils/enterpriseInfoView.js`（详见 composables.md）；访问校外实习入口前的资格检查走 `utils/enterpriseAccess.js`。

## 实习统计相关

### 校外实习统计

```
ext-internship-stats/
  ExtInternshipCollegeStats.vue     ← 学院汇总（可按学院下钻）
    └── ExtInternshipProjectDetail.vue + Panel.vue
        └── DlgExtInternshipProjectDetail.vue
```

### 校内实习统计

```
int-internship-stats/
  IntInternshipCollegeStats.vue     ← 学院汇总（可按学院下钻）
    └── IntInternshipProjectDetail.vue + Panel.vue
        └── DlgIntInternshipProjectDetail.vue
```

### 统计权限（internshipStatsDepartment.js）

| 角色 | 统计范围 |
|------|---------|
| 超级管理员 / 校级管理员 / 教务管理员 | 全校，可下钻任意学院 |
| 院系管理员 | 仅本院 |
| 其他 | 无权限（后端返回 lackPermissions） |

```javascript
import {
  isInternshipStatsSchoolScopeUser,     // 是否有全校视角
  resolveCollegeScopeDepartmentId,       // 解析本学院 departmentId
  fetchSchoolRootDepartmentId,           // 获取学校根节点 id
  fetchDepartmentSubtreeRootRow
} from '@/utils/internshipStatsDepartment'
```
