<template>
  <div class="stu-sign-audit">
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar-row">
        <div class="toolbar-left">
          <el-button type="primary" :disabled="isPostSelectDisabled" @click="openPostDialog">
            选择实习岗位
          </el-button>
          <span class="project-title" :title="postTitle">{{ postTitle }}</span>
        </div>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" class="audit-tabs" @tab-change="onTabChange">
      <el-tab-pane label="今日打卡" name="today">
        <BaseList
          v-if="selectedInternshipPostId != null"
          ref="baseListTodayRef"
          :default-props="defaultPropsToday"
          @audit-click="handleAuditClick"
          @audit-command="handleBatchAuditCommand"
        />
        <el-empty v-else description="请先选择已通过审核的实习岗位" />
      </el-tab-pane>
      <el-tab-pane label="按学生查询" name="student">
        <template v-if="selectedInternshipPostId != null">
          <div class="student-query-bar">
            <div class="student-filter-row">
              <span class="bar-label">学生</span>
              <el-select
                v-if="studentsOnSelectedPost.length > 1"
                v-model="selectedStudentId"
                class="student-select"
                filterable
                clearable
                placeholder="请选择该岗位下的学生"
              >
                <el-option
                  v-for="row in studentsOnSelectedPost"
                  :key="row.studentId"
                  :label="studentOptionLabelFromMergeRow(row)"
                  :value="row.studentId"
                />
              </el-select>
              <span v-else class="student-inline">{{ singleStudentLineText }}</span>
              <el-button type="primary" :disabled="!selectedStudentId" @click="refreshStudentList">
                查询
              </el-button>
            </div>
          </div>
          <BaseList
            v-if="selectedStudentId"
            ref="baseListStudentRef"
            :default-props="defaultPropsStudent"
            @audit-click="handleAuditClick"
            @audit-command="handleBatchAuditCommand"
          />
          <el-empty v-else description="请选择学生后点击查询加载列表" />
        </template>
        <el-empty v-else description="请先选择已通过审核的实习岗位" />
      </el-tab-pane>
    </el-tabs>

    <SimpleDialog
      ref="postSelectDialogRef"
      :default-props="postSelectDialogProps"
      :simpledialog-confirm="handlePostSelectConfirm"
      @simple-select-change="handlePostSelectChange"
    />

    <DlgVerify
      ref="dlgVerifyRef"
      dlg-title="学生打卡审核"
      recall-title="退回已通过的打卡记录"
      @success="handleVerifySuccess"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import moment from 'moment';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';
import { buildVerifySearchWords } from '@/utils/verify';
import { useVerifyFilter } from '@/utils/useVerifyFilter';

defineOptions({ name: 'StuSignAudit' });

const SIGN_AUDIT_KEY_WORD = {
  edit: 'MainVerifyProcess',
  view: 'ViewVerifyMainSignMerge',
};

const VERIFY_MAIN_SIGN_COLUMNS = [
  { id: 1, showName: '学生', theOrder: 1, tableColumnName: 'studentName' },
  { id: 2, showName: '岗位', theOrder: 2, tableColumnName: 'internshipPostName' },
  // { id: 3, showName: '类型', theOrder: 3, tableColumnName: 'type' },
  { id: 4, showName: '地址', theOrder: 4, tableColumnName: 'address' },
  { id: 5, showName: '打卡时间', theOrder: 5, tableColumnName: 'createTime' },
  { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'customize-status' },
  { id: 7, showName: '审核意见', theOrder: 7, tableColumnName: 'reason' },
];

/** 学生-实习岗位关系（含审核流程），与 StuInternshipSign 中校外岗位列表一致 */
const APPROVED_POST_MERGE_KEY = 'ViewVerifyProcessRelStuInternshipPostMerge';

const titleObj = reactive({ mainTitle: '学生打卡审核' });
const currentPost = ref(null);
/** 合并视图中审核通过的记录全集，用于按 internshipPostId 还原多名学生 */
const approvedPostMergeList = ref([]);
const selectedStudentId = ref(null);
const selectedInternshipPostId = computed(() => resolveInternshipPostId(currentPost.value));
const studentsOnSelectedPost = computed(() => {
  const pid = selectedInternshipPostId.value;
  if (pid == null) return [];
  return approvedPostMergeList.value.filter(
    (r) => String(resolveInternshipPostId(r) ?? '') === String(pid)
  );
});
const isPostSelectDisabled = ref(false);
const postSelectDialogRef = ref(null);
const activeTab = ref('today');

const baseListTodayRef = ref(null);
const baseListStudentRef = ref(null);
const dlgVerifyRef = ref(null);
const lastBatchAuditCommand = ref(null);

const nowSearchWordsToday = reactive({
  searchKey: {},
  regKey: {},
  andor: {},
});
const nowSearchWordsStudent = reactive({
  searchKey: {},
  regKey: {},
  andor: {},
});

const initSearchWordsStudent = buildVerifySearchWords();

const { getVerifyRoleName } = useVerifyFilter();

function resolveInternshipPostId(row) {
  if (!row) return null;
  const id = row.internshipPostId ?? row.postId;
  return id != null && id !== '' ? id : null;
}

function studentOptionLabelFromMergeRow(row) {
  const name = row.studentName || row.name || '';
  const acc = row.account || row.studentNo || '';
  return acc ? `${name}（${acc}）` : name || String(row.studentId ?? '');
}

const singleStudentLineText = computed(() => {
  const list = studentsOnSelectedPost.value;
  if (list.length === 1) return studentOptionLabelFromMergeRow(list[0]);
  const p = currentPost.value;
  if (!p) return '—';
  return studentOptionLabelFromMergeRow(p);
});

function syncSelectedStudentForPost() {
  const list = studentsOnSelectedPost.value;
  if (list.length === 1) {
    selectedStudentId.value = list[0].studentId ?? null;
  } else {
    selectedStudentId.value = null;
  }
}

/** 仅按打卡日期筛「今日」。勿套用 useVerifyFilter：打卡视图中 verifyUserId 可能为「系统自动通过」、isAllVerified 常为空，会被误过滤。 */
function clientFilterToday(dataList) {
  if (!Array.isArray(dataList)) return dataList;
  const today = moment().format('YYYY-MM-DD');
  return dataList.filter((r) => {
    const t = r.createTime ?? r.create_time ?? r.submitTime ?? r.signTime;
    if (!t) return false;
    return moment(t).format('YYYY-MM-DD') === today;
  });
}

const postTitle = computed(() => {
  if (!currentPost.value) return '请先选择已通过审核的实习岗位';
  return formatSelectedPostTitle(currentPost.value);
});

function formatSelectedPostTitle(row) {
  const postName = row.internshipPostName || row.postName || '';
  const proj = row.internshipName || '';
  const n = studentsOnSelectedPost.value.length;
  const parts = [];
  if (proj) parts.push(`项目：${proj}`);
  if (postName) parts.push(`岗位：${postName}`);
  if (n > 1) parts.push(`报名学生：${n} 人`);
  return parts.length ? `当前：${parts.join('；')}` : `岗位 #${resolveInternshipPostId(row)}`;
}

/** 打卡合并视图按 internshipPostId 查询；含待审/已通过/退回，前端再筛当日 */
function buildTodaySearchPayload(postId) {
  return {
    searchKey: {
      internshipPostId: postId,
      isAudit: `${CONSTANT.AUDIT_STATUS.SUBMIT},${CONSTANT.AUDIT_STATUS.PASS},${CONSTANT.AUDIT_STATUS.BACK}`,
    },
    regKey: {
      internshipPostId: '=',
      isAudit: CONSTANT.SEARCH_OPERATOR.IN,
    },
    andor: {},
  };
}

function applyPostToTodaySearch() {
  const postId = selectedInternshipPostId.value;
  if (postId == null) return;
  const p = buildTodaySearchPayload(postId);
  nowSearchWordsToday.searchKey = { ...p.searchKey };
  nowSearchWordsToday.regKey = { ...p.regKey };
  nowSearchWordsToday.andor = { ...p.andor };
}

function applyStudentSearchWords() {
  const postId = selectedInternshipPostId.value;
  const sid = selectedStudentId.value;
  if (postId == null || !sid) return;
  nowSearchWordsStudent.searchKey = {
    ...initSearchWordsStudent.searchKey,
    internshipPostId: postId,
    studentId: sid,
  };
  nowSearchWordsStudent.regKey = {
    ...initSearchWordsStudent.regKey,
    internshipPostId: '=',
    studentId: '=',
  };
  nowSearchWordsStudent.andor = { ...initSearchWordsStudent.andor };
}

function handlePostSelectChange(val, field, form, options) {
  if (field === 'internshipPostId' && options && options.length > 0) {
    currentPost.value = { ...options[0] };
    syncSelectedStudentForPost();
  }
}

const postSelectDialogProps = reactive({
  keyWord: 'ProjectSelect',
  dlgTitle: '选择实习岗位（流程已全部通过）',
  handleSelectChange: handlePostSelectChange,
  formItems: [
    {
      name: '实习岗位',
      field: 'internshipPostId',
      type: 'select',
      keyWords: APPROVED_POST_MERGE_KEY,
      changeLabel: 'internshipPostName',
    },
  ],
  formRules: {
    internshipPostId: [{ required: true, message: '请选择实习岗位', trigger: 'change' }],
  },
  defaultDBProps: {
    footButtons: {
      repeatAdd: { show: false },
    },
  },
});

const buttonPropsShared = computed(() => ({
  more1: { show: false },
  audit: { show: true, showPass: true, showNotPass: true, showBack: true },
  update: { show: false },
  create: { show: false },
  delete: { show: false },
  buttonGroup: { show: true },
}));

const defaultPropsToday = computed(() => ({
  defaultDTLProps: {
    title: titleObj,
    someFlags: { autoInit: false, checkFlag: true, showPage: false },
    pageInfo: { page: 1, size: 5000 },
    nowSearchWords: nowSearchWordsToday,
    initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
    clientFilterFn: clientFilterToday,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: buttonPropsShared.value,
      keyWord: SIGN_AUDIT_KEY_WORD,
      allTableColumns: VERIFY_MAIN_SIGN_COLUMNS,
    },
  },
}));

const defaultPropsStudent = computed(() => ({
  defaultDTLProps: {
    title: titleObj,
    someFlags: { autoInit: false, checkFlag: true, showPage: false },
    pageInfo: { page: 1, size: 5000 },
    nowSearchWords: nowSearchWordsStudent,
    initSearchWords: { searchKey: {}, regKey: {}, andor: {} },
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: buttonPropsShared.value,
      keyWord: SIGN_AUDIT_KEY_WORD,
      allTableColumns: VERIFY_MAIN_SIGN_COLUMNS,
    },
  },
}));

function approvedPostOptionLabel(item) {
  const postName = item.internshipPostName || item.postName || '';
  const proj = item.internshipName ? `${item.internshipName} — ` : '';
  const tail = postName || `岗位 #${resolveInternshipPostId(item)}`;
  return `${proj}${tail}`;
}

function isApprovedPostMergeRow(item) {
  return item.isAllVerified === true;
}

async function loadApprovedPostOptionsForDialog() {
  const response = await listAPI.getSomeRecords({
    keyWords: APPROVED_POST_MERGE_KEY,
    pageInfo: { page: 1, size: 5000 },
    sort: { properties: 'id', direction: 'DESC' },
  });
  const raw = response?.data?.content || response?.data || [];
  const approved = raw.filter(isApprovedPostMergeRow);
  approvedPostMergeList.value = approved;
  const seen = new Set();
  const uniqueByPost = [];
  approved.forEach((item) => {
    const pid = resolveInternshipPostId(item);
    if (pid == null || seen.has(pid)) return;
    seen.add(pid);
    uniqueByPost.push(item);
  });
  const fieldItem = postSelectDialogProps.formItems.find((i) => i.field === 'internshipPostId');
  if (fieldItem) {
    fieldItem.type = 'select_noremote';
    fieldItem.options = uniqueByPost.map((item) => ({
      ...item,
      realId: item.id,
      id: resolveInternshipPostId(item),
      name: approvedPostOptionLabel(item),
    }));
  }
  return uniqueByPost;
}

async function openPostDialog() {
  try {
    await loadApprovedPostOptionsForDialog();
  } catch (e) {
    console.error(e);
  }
  postSelectDialogRef.value?.showDialog(true, {});
}

async function handlePostSelectConfirm() {
  if (resolveInternshipPostId(currentPost.value) == null && postSelectDialogRef.value) {
    const form = postSelectDialogRef.value.form || {};
    const fid = form.internshipPostId;
    if (fid != null && fid !== '') {
      const fieldItem = postSelectDialogProps.formItems.find((i) => i.field === 'internshipPostId');
      const opt = fieldItem?.options?.find((o) => String(o.id) === String(fid));
      if (opt) {
        currentPost.value = { ...opt };
        syncSelectedStudentForPost();
      }
    }
  }
  if (resolveInternshipPostId(currentPost.value) == null) {
    ElMessage.warning('请选择实习岗位');
    return false;
  }
  syncSelectedStudentForPost();
  applyPostToTodaySearch();
  await nextTick();
  await nextTick();
  await baseListTodayRef.value?.initDataList?.(true);
  if (selectedStudentId.value) {
    applyStudentSearchWords();
    await nextTick();
    await baseListStudentRef.value?.initDataList?.(true);
  }
  return true;
}

function clonePostRow(item) {
  return { ...item };
}

async function initApprovedPostList() {
  try {
    const uniqueList = await loadApprovedPostOptionsForDialog();
    if (!uniqueList.length) {
      isPostSelectDisabled.value = true;
      currentPost.value = null;
      selectedStudentId.value = null;
    } else if (uniqueList.length === 1) {
      currentPost.value = clonePostRow(uniqueList[0]);
      isPostSelectDisabled.value = false;
      syncSelectedStudentForPost();
      applyPostToTodaySearch();
      await nextTick();
      await nextTick();
      await baseListTodayRef.value?.initDataList?.(true);
    } else {
      isPostSelectDisabled.value = false;
      currentPost.value = null;
      selectedStudentId.value = null;
    }
  } catch (e) {
    console.error('初始化实习岗位列表失败:', e);
  }
}

function refreshStudentList() {
  if (!selectedStudentId.value || selectedInternshipPostId.value == null) return;
  applyStudentSearchWords();
  nextTick(() => baseListStudentRef.value?.initDataList?.(true));
}

function onTabChange(name) {
  if (selectedInternshipPostId.value == null) return;
  if (name === 'today') {
    applyPostToTodaySearch();
    nextTick(() => baseListTodayRef.value?.initDataList?.(true));
  } else if (name === 'student' && selectedStudentId.value) {
    applyStudentSearchWords();
    nextTick(() => baseListStudentRef.value?.initDataList?.(true));
  }
}

function handleAuditClick(row) {
  const rows = Array.isArray(row) ? row : row ? [row] : [];
  if (rows.length === 0) return;
  if (rows.length === 1) {
    dlgVerifyRef.value?.showDialog(true, rows[0]);
    return;
  }
  const preSelected = lastBatchAuditCommand.value;
  const targetStatus =
    preSelected === CONSTANT.AUDIT_STATUS.BACK
      ? CONSTANT.AUDIT_STATUS.PASS
      : CONSTANT.AUDIT_STATUS.SUBMIT;
  const targetRows = rows.filter((r) => r && r.isAudit === targetStatus);
  if (!targetRows.length) {
    ElMessage.warning(
      preSelected === CONSTANT.AUDIT_STATUS.BACK
        ? '选中的记录中没有已通过的数据可退回'
        : '选中的记录中没有待审核的数据'
    );
    return;
  }
  dlgVerifyRef.value?.showDialog(true, targetRows[0], targetRows, preSelected);
  lastBatchAuditCommand.value = null;
}

function handleBatchAuditCommand(command) {
  lastBatchAuditCommand.value = command;
}

function handleVerifySuccess() {
  if (activeTab.value === 'today') {
    baseListTodayRef.value?.initDataList?.(true);
  } else {
    baseListStudentRef.value?.initDataList?.(true);
  }
}

onMounted(() => {
  initApprovedPostList();
});
</script>

<style scoped>
.stu-sign-audit {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-card :deep(.el-card__body) {
  padding: 12px 16px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex: 1;
}

.project-title {
  font-size: 14px;
  color: #303133;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-tabs :deep(.el-tabs__content) {
  padding-top: 12px;
}

/* 表格工具栏：批量审核等与左侧一组，刷新/列设置靠右同一行 */
.stu-sign-audit :deep(.crud-opts) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  width: 100%;
}

.stu-sign-audit :deep(.crud-opts > .el-row) {
  flex: 1 1 auto;
  min-width: 0;
}

.stu-sign-audit :deep(.crud-opts > .el-button-group) {
  flex-shrink: 0;
  margin-left: auto;
}

.student-query-bar {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.student-filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
  max-width: 720px;
}

@media (max-width: 640px) {
  .student-filter-row {
    flex-wrap: wrap;
  }
}

.student-select {
  width: 280px;
  min-width: 180px;
  flex: 1;
  max-width: 400px;
}

.student-inline {
  font-size: 14px;
  color: #303133;
  flex: 1;
  min-width: 0;
}

.bar-label {
  flex-shrink: 0;
  font-size: 14px;
  color: #606266;
}
</style>
