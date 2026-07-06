# /code-review

对项目代码进行审查，检查常见问题并提出改进建议。

## 使用方式

```
/code-review [文件路径或目录]
```

示例：
- `/code-review src/views/internship-process/StuApplyPost.vue`
- `/code-review src/views/internship-process/` （审查整个目录）

## 执行步骤

1. **确定审查范围**：
   - 如指定了文件/目录，审查该范围
   - 如未指定，审查最近的 git 变更：`git diff --name-only HEAD~5`

2. **读取目标文件**，按以下维度逐项检查：

### 检查项

#### A. 项目规范一致性
- [ ] 是否使用了正确的模板继承（BaseList / InternshipPostHeaderPage / AssignmentPage）
- [ ] `defineOptions({ name })` 是否与文件名一致
- [ ] keyWord 的 edit/view 是否正确对应后端表名/视图名
- [ ] 审核状态是否使用 `CONSTANT.AUDIT_STATUS.*` 常量而非硬编码
- [ ] 搜索操作符是否使用 `CONSTANT.SEARCH_OPERATOR.*` 常量
- [ ] 角色判断是否使用 `CONSTANT.ROLE_TABLE.*` 常量

#### B. 审核流程正确性
- [ ] 审核页是否使用了 `useVerifyFilter` 的 `clientFilterFn`（避免 verifyUserId 误匹配）
- [ ] 审核页的 initSearchWords 是否调用了 `buildVerifySearchWords()`
- [ ] 审核页的 `keyWord.edit` 是否为 `MainVerifyProcess`
- [ ] 审核页的 `keyWord.view` 是否使用 Merge View
- [ ] 提交逻辑是否正确处理了 `VERIFY_LEVEL.NO_VERIFY`（无需审核直接通过）

#### C. 安全性
- [ ] 是否存在 XSS 风险（v-html 使用未经过滤的用户输入）
- [ ] 敏感信息是否暴露在前端代码中
- [ ] API 请求是否正确携带 Token

#### D. 性能
- [ ] 是否有不必要的全量数据加载（应使用分页）
- [ ] computed 属性是否有副作用
- [ ] 是否有内存泄漏风险（未清理的定时器、事件监听）
- [ ] 是否有 N+1 查询（for 循环内逐条发请求，应改用 IN 批量查询）

#### E. 代码质量
- [ ] 是否有重复代码可提取为 composable 或公共组件
- [ ] 组件 props 是否有类型校验
- [ ] 是否有未处理的异步错误（缺少 try-catch 或 .catch）
- [ ] 是否有未使用的导入或变量
- [ ] 批量操作是否有静默失败（for 循环内无 try-catch，单条失败会中断整批且无提示）
- [ ] 批量操作失败时是否收集失败记录并给出明细提示（而非仅"操作失败"）

#### F. 业务语义陷阱
- [ ] 校内实习 `_approved` 是否使用了 `ViewVerifyProcessRelTitleStudentMerge.isAllVerified`，而不是 `ViewRelTitleTeacherStudent.isAudit`（后者是导师课题授权状态，不是学生选题审核状态）
- [ ] 导入接口失败是否从 `error.response.data.message` 读取行级错误原因，并提示「所有数据已回滚」（后端为全有或全无语义）
- [ ] 导出接口 5xx 时是否有 catch 块阻断下载（避免空文件或触发浏览器下载失败）

3. **输出审查报告**：按严重程度分级（严重/警告/建议），给出具体文件位置和修复建议。

## 输出格式

```markdown
## 代码审查报告

### 严重问题
- **[文件:行号]** 问题描述
  - 修复建议: ...

### 警告
- **[文件:行号]** 问题描述
  - 修复建议: ...

### 建议
- **[文件:行号]** 问题描述
  - 改进方向: ...

### 总结
- 审查文件数: X
- 严重问题: X 个
- 警告: X 个
- 建议: X 个
```

## 注意事项

- 只报告实际存在的问题，不要过度建议重构
- 优先关注功能正确性和安全性，其次是性能和代码风格
- 对于审核流程相关代码要格外注意 verifyUserId 的精确匹配问题
- 不要建议添加不必要的注释、类型注解或文档
