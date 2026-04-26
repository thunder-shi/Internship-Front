# API 模块参考

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
fileAPI.deleteFile(fileIds)       // 支持单个 id 或数组
fileAPI.getProgressPercent()      // 当前上传进度
```

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
  initDiariesByInternship, // 批量初始化 MainDiary 占位（POST /diary/init-by-internship）
  generatePeriods,       // 生成期次（清空重建，非追加）
  savePeriod,            // 新增/编辑单条期次（id=null 新增）
  deletePeriods          // 删除期次（有已提交日志时后端返回 400）
} from '@/api/diary'
```

## api/mainSign.js

```javascript
import { submitSignAudit } from '@/api/mainSign'
// submitSignAudit(signId) — 学生打卡提交后生成审核记录（POST /main-sign/submit-audit）
```

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
