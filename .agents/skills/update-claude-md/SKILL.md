# /update-Codex-md

扫描当前代码实际状态，更新各层 AGENTS.md 和 docs/ 文档，确保文档与代码同步。

## 使用方式

```
/update-Codex-md
```

## 文档结构

```
.Codex/
  AGENTS.md                 # 主文档（核心约定、BaseList 模式、全局常量摘要）
  docs/
    api-reference.md        # 所有 API 模块详细说明
    constants.md            # 完整常量定义（ROLE_TABLE、PROCESS_TYPE 等）
    composables.md          # Composables 参考表
    troubleshooting.md      # 问题排查手册
    internship-record.md    # 日志/打卡模块专属（_approved 陷阱、DlgSubmitDiary）
    internship-process.md   # 流程/安排/审核/岗位模块专属
```

## 执行步骤

1. **扫描项目结构**，收集当前状态：

```
src/api/*.js
src/components/**/*.vue
src/views/**/*.vue
src/views/internship-process/config/*.js
src/views/internship-process/components/*.vue
src/views/internship-record/components/*.vue
src/views/master-page/*.vue
src/views/dialogs/*.vue
src/utils/*.js
src/store/modules/*.js
src/assets/css/*.scss
src/assets/icons/svg/*.svg
src/directive/**/index.js
```

2. **读取关键源文件**获取最新定义：

```
src/utils/constant.js               → 所有常量
src/api/internshipProcess.js        → 流程 API 导出
src/api/diary.js                    → 日志 API 导出
src/api/file.js                     → 文件操作 API
src/utils/verify.js                 → 审核工具函数
src/utils/use*.js                   → 所有 composables
src/utils/internshipStatsDepartment.js
```

3. **与各层文档对比**，生成差异报告：

```markdown
## 文档更新预览

### .Codex/AGENTS.md
- (如有全局约定变化)

### .Codex/docs/constants.md
- PROCESS_TYPE 新增: XXX_TYPE
- ROLE_TABLE 无变化

### .Codex/docs/api-reference.md
- internshipProcess.js 新增: xxx()

### .Codex/docs/composables.md
- 新增 useXxx.js

### src/views/internship-record/AGENTS.md
- _approved 逻辑变化（如有）

### src/views/internship-process/AGENTS.md
- 新增页面: XxxPage.vue
```

4. **用户确认后**执行更新，各文件职责：

| 文件 | 更新内容 |
|------|---------|
| `.Codex/AGENTS.md` | 项目结构概述（如目录有增减）；全局关键常量摘要；核心 API 用法 |
| `.Codex/docs/constants.md` | ROLE_TABLE、USER_JOB_CODE、PROCESS_TYPE、VERIFY_LEVEL、SEARCH_OPERATOR 完整定义 |
| `.Codex/docs/api-reference.md` | 各 API 模块函数列表（internshipProcess / diary / file 等）；统计模块说明 |
| `.Codex/docs/composables.md` | 所有 composables 表格（文件名、导出、说明） |
| `.Codex/docs/troubleshooting.md` | 新出现的已知问题和解决方案 |
| `.Codex/docs/internship-record.md` | _approved 逻辑、DlgSubmitDiary 文件上传规则 |
| `.Codex/docs/internship-process.md` | 安排/审核/岗位模块架构变化 |

## 更新原则

- **只更新可自动检测的部分**：函数列表、常量定义、架构图
- **不修改手写内容**：关键陷阱说明、设计决策背景等由人工维护的内容保持原样
- **先报告再修改**：先展示差异报告并获得确认，再执行写入
- **各层文档只写对应范围**：不要把模块细节写进主 AGENTS.md，不要把全局约定分散到模块文档

## 触发场景

| 变更类型 | 需要更新的文件 |
|----------|--------------|
| constant.js 变更 | `docs/constants.md` + 主 AGENTS.md 摘要行 |
| 新增 API 函数 | `docs/api-reference.md` |
| 新增 composable | `docs/composables.md` |
| internship-record/ 逻辑变化 | `src/views/internship-record/AGENTS.md` |
| internship-process/ 架构变化 | `src/views/internship-process/AGENTS.md` |
| 新增全局约定/陷阱 | 主 `.Codex/AGENTS.md` |
| 新增已知问题解决方案 | `docs/troubleshooting.md` |
