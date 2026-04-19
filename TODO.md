# StuApplyPost 多选岗位改造计划

## 一、现状梳理

### 核心假设（已失效）
原代码基于"一个学生只能选一个岗位"的假设，整个页面围绕 `currentSelectedPost: ref(null)` 单值运转：
- `hasApplication = !!currentSelectedPost` 决定页面处于"浏览模式"还是"已报名模式"
- 两种模式查询完全不同的视图（全部岗位 vs 学生自己的记录）
- `buildSearchKey` 根据 `hasApplication` 切换查询条件

### API 兼容性
`stuSelPost(studentId, oldPostId, newPostId)` 的设计天然兼容多选：
- 新增报名：`stuSelPost(studentId, 0, newPostId)` — oldPostId=0 表示不撤销任何旧岗位
- 撤回报名：`stuSelPost(studentId, postId, 0)` — newPostId=0 表示不新增
- 后端已做原子并发保护（CONC-01/02），无需前端额外处理

---

## 二、新设计逻辑

### Tab 结构
类似 `ReviewInternshipReport` 的"全部/已提交/未提交"，新增：

```
[ 可选 ]  [ 已选 (N) ]
```

- **可选 tab**：查询 `ViewVerifyProcessInternshipPostMerge`（所有审核通过岗位），过滤掉：
  1. 已报满的岗位（`nowPersonNum >= allPersonNum`）
  2. 学生已有有效报名的岗位（`selectedPostIds` 中的 `internshipPostId`）
  - 按钮：报名（submit）

- **已选 tab**：查询 `ViewVerifyProcessRelStuInternshipPostMerge`（学生自己的报名记录），过滤掉：
  - `isAudit` 为 BACK / NOTPASS 的记录（这些视为失效，对应岗位会重新出现在"可选"中）
  - 按钮：查看进度（visible），行级：岗位详情（rightOperate）

### "同一岗位不可以选两次"的实现
用一个 Set 维护当前有效报名的岗位 ID：
```
selectedPostIds = new Set(
  selectedPosts（SAVE/SUBMIT/PASS 的报名记录）.map(p => p.internshipPostId)
)
```
"可选" tab 的 `clientFilterFn` 额外排除 `selectedPostIds` 中的 ID，即可保证不显示已报名岗位。

---

## 三、潜在逻辑漏洞排查

### 漏洞 1：BACK / NOTPASS 状态的岗位能否重新报名？
- **结论**：可以。`selectedPostIds` 只含 SAVE/SUBMIT/PASS，BACK/NOTPASS 的岗位 ID 不在其中，因此这些岗位会重新出现在"可选" tab。
- **前提**：后端 `stuSelPost` 在 oldPostId=0 时不检查是否已有历史记录（只做新增）。**需后端确认**（见第六节）。

### 漏洞 2：stuSelPost 的 oldPostId 在多选场景下的语义
- 原逻辑：旧选 → 新选时，oldPostId 会减少旧岗位的 `nowPersonNum`。
- 新逻辑：只做新增（oldPostId=0）或只做撤回（newPostId=0），两者不同时发生。
- **结论**：无问题，API 行为与原来一致。

### 漏洞 3：撤回报名后的状态同步
- 撤回某个具体岗位后，需要从 `selectedPosts` 中移除该条记录（不是清空整个数组）。
- 当前 `handleRollbackSuccess` 做 `currentSelectedPost.value = null`，改造后需重新查询 `selectedPosts`。
- 撤回后停留在"已选" tab（不自动跳回"可选"），让用户自主切换。

### 漏洞 4：rollbackButton 只对 NO_VERIFY 自动通过的记录显示
- `show: (rowData) => rowData?.isAudit === PASS && rowData?.verifyTypeId === NO_VERIFY`
- 这是业务规则（只有无需审核才能自主撤回），不受多选改造影响，保持不变。

### 漏洞 5：tab 切换时数据刷新时机
- `activeTab` 变化 → `buildSearchKey` 和 `defaultDTLProps.keyWord` 响应式变化，但 `BaseList` 未必自动重新请求。
- **解决**：`watch(activeTab)` 里显式调用 `headerPageRef.value?.updateSearchWordsAndRefresh()`。

### 漏洞 6：InternshipPostHeaderPage 没有透传 #left 插槽
- Tab 按钮若放在 BaseList 表头左侧，需要 `InternshipPostHeaderPage` 向内透传 `#left` 插槽，否则无法注入。
- **解决（采用）**：把 tab 按钮放在 `InternshipPostHeaderPage` 上方，作为独立的一行卡片，不修改 `InternshipPostHeaderPage`，避免影响其他页面。

### 漏洞 7：项目切换后 selectedPosts 的时效性
- 切换实习项目时，必须先清空 `selectedPosts`，再异步查询新项目数据。
- 否则 `selectedPostIds` 仍是上一个项目的数据，"可选" tab 会错误过滤其他项目的岗位。

### 漏洞 8：报名成功后的并发更新顺序
- 必须先重新查询 `selectedPosts`（更新 Set），再刷新表格。
- 顺序反了会导致刚报名的岗位在"可选" tab 短暂闪现。
- **解决**：报名成功后完整重查（非乐观更新），再调 `updateSearchWordsAndRefresh()`。

---

## 四、修改计划（仅涉及 StuApplyPost.vue）

### Step 1 — 状态改造

```javascript
// 删除
const currentSelectedPost = ref(null)
const hasApplication = computed(() => !!currentSelectedPost.value)

// 新增
const selectedPosts = ref([])                          // 有效报名列表（SAVE/SUBMIT/PASS）
const activeTab = ref('available')                     // 'available' | 'applied'
const selectedPostIds = computed(() =>
  new Set(selectedPosts.value.map(p => p.internshipPostId))
)
const hasApplication = computed(() => selectedPosts.value.length > 0)  // 仅用于 tab 计数
```

### Step 2 — querySelectedPost → querySelectedPosts

```javascript
// 旧：返回单条或 null
async function querySelectedPost(internshipId, studentId) { ... }

// 新：返回全部有效报名数组（SAVE/SUBMIT/PASS）
async function querySelectedPosts(internshipId, studentId) {
  const response = await listAPI.getSomeRecords({
    keyWords: 'ViewVerifyProcessRelStuInternshipPostMerge',
    searchKey: { internshipId, studentId },
  })
  const dataList = response?.data?.content || response?.data || []
  const ACTIVE = [CONSTANT.AUDIT_STATUS.SAVE, CONSTANT.AUDIT_STATUS.SUBMIT, CONSTANT.AUDIT_STATUS.PASS]
  return dataList.filter(r => ACTIVE.includes(r.isAudit))
}
```

### Step 3 — handleProjectSelected 改造

```javascript
async function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title
  selectedPosts.value = []                                     // 先清空
  if (internship?.internshipId || internship?.id) {
    const id = internship.internshipId || internship.id
    selectedPosts.value = await querySelectedPosts(id, userInfo.value?.id)
  }
  await headerPageRef.value?.updateSearchWordsAndRefresh?.()   // 总是刷新
}
```

### Step 4 — buildSearchKey 改造

```javascript
function buildSearchKey(baseSearchKey) {
  if (activeTab.value === 'applied') {
    return { internshipId: baseSearchKey.internshipId, studentId: userInfo.value?.id }
  }
  return { ...baseSearchKey, isAudit: CONSTANT.AUDIT_STATUS.PASS }
}
```

### Step 5 — clientFilterFn 改造

```javascript
// "可选" tab：排除满员 + 排除已选（新增 selectedPostIds 过滤）
function filterAvailablePosts(dataList) {
  return dataList.filter(row =>
    (row.nowPersonNum || 0) < (row.allPersonNum || 0) &&
    !selectedPostIds.value.has(row.internshipPostId)
  )
}
// "已选" tab：filterActiveApplications 逻辑不变
```

### Step 6 — defaultDTLProps 改造

```javascript
// 所有 hasApplication → activeTab.value === 'applied'
const applied = activeTab.value === 'applied'
// keyWord、columns、buttons、clientFilterFn 全部依此切换（原结构不变，仅改判断条件）
```

### Step 7 — handleApply 改造

```javascript
async function handleApply(row) {
  // ... 确认弹窗、满员检查不变 ...
  const response = await otherAPI.stuSelPost(userInfo.value?.id, 0, newPostId)
  if (response?.message === 'successful') {
    ElMessage.success('报名成功')
    const id = currentInternship.value?.internshipId || currentInternship.value?.id
    selectedPosts.value = await querySelectedPosts(id, userInfo.value?.id)  // 重新查询
    await headerPageRef.value?.updateSearchWordsAndRefresh?.()
  }
}
```

### Step 8 — handleRollbackSuccess 改造

```javascript
async function handleRollbackSuccess() {
  const id = currentInternship.value?.internshipId || currentInternship.value?.id
  selectedPosts.value = await querySelectedPosts(id, userInfo.value?.id)
  await headerPageRef.value?.updateSearchWordsAndRefresh?.()
}
```

### Step 9 — tab 切换监听

```javascript
watch(activeTab, () => {
  headerPageRef.value?.updateSearchWordsAndRefresh?.()
})
```

### Step 10 — 模板改造

```vue
<!-- 新增：InternshipPostHeaderPage 上方的 tab 行 -->
<el-card shadow="never" class="tab-card">
  <el-radio-group v-model="activeTab">
    <el-radio-button value="available">可选</el-radio-button>
    <el-radio-button value="applied">已选（{{ selectedPosts.length }}）</el-radio-button>
  </el-radio-group>
</el-card>

<!-- rightOperate 条件：hasApplication → activeTab === 'applied' -->
<template v-if="activeTab === 'applied'" #rightOperate="{ row }">
  <el-button type="info" size="small" title="岗位详情" @click="handleViewPostDetail(row)">
    <el-icon><InfoFilled /></el-icon>
  </el-button>
</template>
```

---

## 五、不需要修改的部分

| 内容 | 原因 |
|------|------|
| `stuSelPost` API 签名 | 兼容多选，无需改动 |
| `rollbackButton` 的 show/action 逻辑 | 业务规则不变 |
| `DlgPostDetail` | 只展示详情，与选几个无关 |
| `DlgVerifyProgress` | 与选几个无关 |
| `InternshipPostHeaderPage` | 采用外置 tab 方案，不改此组件 |
| `filterActiveApplications` 逻辑 | 过滤条件不变 |
| 专业 / 实习项目 ID 加载逻辑 | 与选几个无关 |

---

## 六、已解决的后端确认问题

**问题**：BACK/NOTPASS 后能否再次报名同一岗位？

**✅ 已确认可以，后端已上线修复。**

- 原设计存在缺陷：BACK/NOTPASS 时只减 `nowPersonNum`，`RelStuInternshipPost` 记录不删，
  重选同一岗位会产生重复活跃行。
- 修复后：BACK/NOTPASS 时同一事务内软删除对应的 `MainVerifyProcess` 和 `RelStuInternshipPost` 记录，
  学生之后调 `stuSelPost(oldPostId=0, newPostId=X)` 时旧记录已不存在，可干净重新占位。
- **前端无需额外处理**，按原计划实现即可：BACK/NOTPASS 的 `internshipPostId` 不纳入
  `selectedPostIds`，该岗位自动重现在"可选" tab。

> 注：之前误写为"CONC-08"，实为对编号的误解——CONC-08 是 `main_diary` 的唯一约束，与岗位无关。
> 本问题的根源是 `RelStuInternshipPost` 的 BACK/NOTPASS 流程缺少软删除步骤，现已修复。
