# TODO

> 来源：后端变更通知（2026-04-16）+ 代码审查结果

---

## P0 — 阻断性问题

- [x] **[后端变更 #4] 批量导入错误提示适配全有或全无语义**
  - `DlgBatchImport.vue` catch 块改为从 `error.response.data.message` 读取行级错误原因，拼接「所有数据已回滚」提示；`request.js` 对 importInfo 接口关闭拦截器的通用 toast，避免重复提示

- [x] **[后端变更 #5] 导出接口 5xx 拦截，不触发下载**
  - `DataTableHeader.vue` `_exportData` catch 块改为 `ElMessage.error('导出失败，请重试')`；`request.js` 对 exportInfo 接口关闭拦截器 toast

- [x] **[后端变更 #6] 角色保存接口禁止传 null**
  - `DlgUserInfo.vue` `confirmMore` 改为 `form.roleIds || []`

---

## P1 — 功能/正确性问题

- [x] **[代码审查] `DlgTopicStudentAssign` N+1 查询**
  - `loadAssignedStudentIds` 改为单次 IN 查询 `RelTitleStudent`，消除 N+1

- [x] **[代码审查] `IntInternshipCollegeStats` 统计接口缺少错误处理**
  - `fetchCollegeStats` 加 try-catch，异常时返回空结构并提示

- [x] **[代码审查] `DlgTopicStudentAssign` 客户端过滤破坏分页**
  - `fetchAvailableStudents` 将姓名/学号过滤条件传入后端 `searchKey`，移除客户端过滤

- [ ] **[后端变更 #2] 注册页面密码强度校验**
  - 当前 Register 页面已注释掉，暂不适用；若注册功能恢复，需加客户端校验（大写+小写+数字+特殊字符+长度≥8）并处理 400 `"弱密码"` 错误

- [x] **[代码审查] 校内实习 `_approved` 判断逻辑修复**
  - 后端确认：`ViewRelTitleTeacherStudent.isAudit` 来自 `RelTitleTeacher`（导师课题授权），不是学生选题审核状态，语义错误
  - 改为并行查 `ViewVerifyProcessRelTitleStudentMerge`，建立 `relationId → isAllVerified` 映射，`_approved: intVerifyMap.get(relTitleStudentId) ?? false`

---

## P2 — 代码质量问题

- [x] **[代码审查] `api/internshipProcess.js` 无用 import**
  - 删除了 `getEncryptKeyWord` 和 `CONSTANT` 两行 import

- [x] **[代码审查] 批量审核静默失败**
  - `DlgBatchReviewDiary.vue` 改为收集失败学生姓名并提示「X 条成功，Y 条失败（姓名列表）」

- [ ] **[后端变更 #3] 检查 `departmentName` 硬编码绕过逻辑**
  - 已全局搜索，未发现绕过逻辑；`store/modules/user.js` 中从 `BaseDepartment` 直接查询 name 是独立逻辑，不受后端 Bug 影响，无需修改

---

## P3 — 体验优化

- [x] **[代码审查] 统计页 subTitle 暴露内部 ID**
  - `IntInternshipCollegeStats.vue` subTitle 改为「统计范围：全校 / 本学院 / 按左侧部门树所选节点」

- [x] **[代码审查] `DlgTopicStudentAssign` setTimeout 时序脆弱**
  - 确认 `DlgBasic` 的 `@open-dialog` 已绑定到 `el-dialog @opened`（动画完成后触发），移除了 `nextTick + setTimeout(80)` 包裹层

---

## 待确认（需与后端/产品对齐）

- [x] **[后端变更 #1] `/common/**` 权限收紧 — 已确认无影响，关闭**
  - 路由守卫确保所有文件操作页面均在登录后访问，不存在未登录触发文件接口的场景
  - presigned URL 10 分钟有效期属行业惯例，可接受

- [ ] **[代码审查] `useVerifyFilter` 新增 NOTPASS 过滤行为**
  - `useVerifyFilter.js:44-45` 新增「审核不通过时 verifyUserId 中的用户可见」规则
  - 需确认业务规则已与后端/产品对齐，确认后更新 CLAUDE.md
