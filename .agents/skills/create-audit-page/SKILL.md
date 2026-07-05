# /create-audit-page

创建带审核流程的页面（申报页 + 审核页），基于 InternshipPostHeaderPage 模板。

## 使用方式

```
/create-audit-page <功能名称> <processTypeCode>
```

示例：`/create-audit-page 企业岗位 EXTERNAL_ENTERPRISE_POST_DECLARATION`

## 执行步骤

1. **确认参数**：向用户确认以下信息：
   - 功能名称（中文，如"企业岗位"）
   - processTypeCode（对应 `CONSTANT.PROCESS_TYPE` 中的值）
   - 申报页面名称和审核页面名称
   - 表名（edit）和 Merge View 视图名（view）
   - 表格列定义
   - 是否需要自定义详情对话框

2. **创建申报页面**（如 `XxxApplication.vue`）：

```vue
<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'{{ 功能名称 }}申报'"
    :no-project-message="'当前没有可申报的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    :process-type-code="processTypeCode"
    @append-click="handleAppendClick"
    @edit-click="handleEditClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleSubmitClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <!-- 审核进度对话框 -->
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="{{ Merge View 名 }}"
      />
      <!-- 可选：自定义详情对话框 -->
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import { useAssignmentActions } from '@/utils/useAssignmentActions';

defineOptions({ name: '{{ 页面组件名 }}' });

const headerPageRef = ref(null);
const store = useStore();
const processTypeCode = CONSTANT.PROCESS_TYPE.{{ processTypeCode }};

const roles = computed(() => store.getters.roles || []);
const isCompanyUser = computed(() =>
  roles.value.some(r => r === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || r === CONSTANT.ROLE_TABLE.COMPANY_TUTOR)
);

// 项目选择条件
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return { processTypeCode, startTime: currentTime, endTime: currentTime };
});
const projectSelectRegKey = computed(() => ({
  startTime: CONSTANT.SEARCH_OPERATOR.LE,
  endTime: CONSTANT.SEARCH_OPERATOR.GE,
}));

// 表格配置
const defaultDTLProps = computed(() => ({
  defaultDTHProps: {
    keyWord: { edit: '{{ 表名 }}', view: '{{ 视图名 }}' },
    buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true } },
    allTableColumns: [
      // {{ 表格列 }}
    ],
  },
}));

function buildSearchKey(baseSearchKey) {
  return { processTypeCode, internshipId: baseSearchKey.internshipId };
}

// 操作逻辑
const { currentRow, showProgressDialog, handleViewClick, handleDeleteClick,
        handleSubmitClick, handleBatchSubmitClick } = useAssignmentActions(
  () => headerPageRef.value?.baseListRef?.initDataList(true)
);

function handleProjectSelected() {}
function handleAppendClick() { /* 打开新增对话框 */ }
function handleEditClick(row) { /* 打开编辑对话框 */ }
</script>
```

3. **创建审核页面**（如 `XxxVerify.vue`）：

```vue
<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'{{ 功能名称 }}审核'"
    :no-project-message="'当前没有需要审核的记录'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    @audit-click="handleAuditClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerify ref="dlgVerifyRef" @success="handleVerifySuccess" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { ref, computed } from 'vue';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';

defineOptions({ name: '{{ 审核页面组件名 }}' });

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

const defaultDTLProps = computed(() => ({
  clientFilterFn,
  getVerifyRoleName,
  enableAuditStatusCustom: true,
  initSearchWords: buildVerifySearchWords(),
  defaultDTHProps: {
    keyWord: { edit: 'MainVerifyProcess', view: '{{ 审核 Merge View 名 }}' },
    allTableColumns: [
      // {{ 审核页表格列 }}
    ],
  },
}));
</script>
```

4. **提醒用户**：在后端菜单管理中配置路由和权限。

## 关键依赖

- `useVerifyFilter` - 审核页的客户端过滤（按 verifyUserId 精确匹配）
- `useAssignmentActions` - 申报页的删除/提交/批量提交操作
- `buildVerifySearchWords` - 构建审核页标准查询条件（isAudit + 时间范围）
- `DlgVerify` - 通用审核对话框（审核结果+理由）
- `DlgVerifyProgress` - 审核进度时间线

## 注意事项

- 审核页的 `keyWord.edit` 通常是 `MainVerifyProcess`（操作审核流程表）
- 审核页的 `keyWord.view` 使用 Merge View（后端聚合视图，每个 processId 仅一条最新记录）
- `clientFilterFn` 必须用于审核页，因为后端 LIKE 查询 verifyUserId 会产生误匹配
- 审核状态使用 `CONSTANT.AUDIT_STATUS` 常量，不要硬编码数字
