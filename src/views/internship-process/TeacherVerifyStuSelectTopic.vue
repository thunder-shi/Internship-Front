<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'老师审核学生自主选题'"
    :no-project-message="'当前没有可审核的学生自主选题记录'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_STUDENT_TEACHER_MATCH"
    @audit-click="handleAuditClick"
    @audit-command="handleBatchAuditCommand"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerify
        ref="dlgVerifyRef"
        dlg-title="学生自主选题审核"
        recall-title="退回已通过的学生自主选题"
        @success="handleVerifySuccess"
      />
      <DlgTopicDetail ref="dlgTopicDetailRef" :current-internship="currentInternship" />
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewVerifyProcessRelTitleStudent"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, unref } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DlgTopicDetail from '@/views/internship-process/components/DlgTopicDetail.vue';
import CONSTANT from '@/utils/constant';
import { useProcessWindowProjectSelectKeys } from '@/utils/useProcessWindowProjectSelectKeys';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords, isUserIdInVerifyUserId } from '@/utils/verify';
import { useBatchVerifyAuditDialog } from '@/utils/useBatchVerifyAuditDialog';
import listAPI from '@/api/list';

defineOptions({ name: 'TeacherVerifyStuSelectTopic' });

const store = useStore();
const headerPageRef = ref(null);
const dlgVerifyRef = ref(null);
const dlgTopicDetailRef = ref(null);

const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
/** 与题目申报审核一致：流程时间窗内项目；审核页不按专业收窄 */
const { projectSelectSearchKey, projectSelectRegKey } = useProcessWindowProjectSelectKeys(
  userInfo,
  false
);

const { getVerifyRoleName } = useVerifyFilter();
const batchAuditDialog = useBatchVerifyAuditDialog(dlgVerifyRef);
const { handleBatchAuditCommand } = batchAuditDialog;

/** 与题目申报审核一致：校/院系管理员等可看到全部待审（不必出现在 verifyUserId 里） */
const PRIVILEGED_AUDIT_ROLES = [
  CONSTANT.ROLE_TABLE.SUPER_ADMIN,
  CONSTANT.ROLE_TABLE.SCHOOL_ADMIN,
  CONSTANT.ROLE_TABLE.ACADEMIC_AFFAIRS_ADMIN,
  CONSTANT.ROLE_TABLE.DEPARTMENT_ADMIN,
  CONSTANT.ROLE_TABLE.SCHOOL_TEACHER,
];

function canBypassVerifyUserIdForSubmit() {
  const roles = store.getters.roles || [];
  return roles.some((r) => PRIVILEGED_AUDIT_ROLES.includes(r));
}

function rowAuditStatus(row) {
  const raw = row?.isAudit ?? row?.is_audit;
  if (raw === null || raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function resolveVerifyProcessId(row) {
  const candidates = [
    row?.verifyProcessId,
    row?.verify_process_id,
    row?.mainVerifyProcessId,
    row?.main_verify_process_id,
    row?.mvpId,
    row?.mvp_id,
    row?.id,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null || c === '') continue;
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function normalizeAuditRow(row) {
  if (!row || typeof row !== 'object') return row;
  const verifyProcessId = resolveVerifyProcessId(row);
  const isAudit = rowAuditStatus(row);
  const relationId =
    Number(
      row?.relationId ??
        row?.relation_id ??
        row?.relTitleStudentId ??
        row?.rel_title_student_id ??
        0
    ) || 0;
  return {
    ...row,
    id: verifyProcessId || row.id,
    verifyProcessId,
    relationId,
    relTitleStudentId: row?.relTitleStudentId ?? row?.rel_title_student_id ?? relationId,
    isAudit,
    is_audit: isAudit,
    sourceType: row?.sourceType ?? row?.source_type,
    source_type: row?.sourceType ?? row?.source_type,
    isFinal: Number(row?.isFinal ?? row?.is_final ?? 0),
    is_final: Number(row?.isFinal ?? row?.is_final ?? 0),
  };
}

function handleAuditClick(row) {
  const rows = Array.isArray(row) ? row.map(normalizeAuditRow) : row ? [normalizeAuditRow(row)] : [];
  if (!rows.length) return;

  if (
    rows.length > 1 &&
    batchAuditDialog.lastBatchAuditCommand.value === CONSTANT.AUDIT_STATUS.PASS
  ) {
    const pendingRows = rows.filter((r) => rowAuditStatus(r) === CONSTANT.AUDIT_STATUS.SUBMIT);
    const studentKeys = new Set();
    const titleKeys = new Set();
    for (const r of pendingRows) {
      const stuKey = `${r?.stuId ?? r?.stu_id ?? ''}:${r?.internshipId ?? r?.internship_id ?? ''}`;
      const titleKey = String(r?.titleId ?? r?.title_id ?? '');
      if (studentKeys.has(stuKey)) {
        ElMessage.warning('批量通过时，同一学生同一项目只能选择一条候选题目');
        return;
      }
      if (titleKey && titleKeys.has(titleKey)) {
        ElMessage.warning('批量通过时，同一题目只能最终确认给一名学生');
        return;
      }
      studentKeys.add(stuKey);
      if (titleKey) titleKeys.add(titleKey);
    }
  }

  batchAuditDialog.handleAuditClick(Array.isArray(row) ? rows : rows[0]);
}

function clientFilterFn(dataList) {
  if (!Array.isArray(dataList)) return dataList;
  const uid = store.getters.userInfo?.id;
  if (!uid) return dataList;
  const bypassSubmit = canBypassVerifyUserIdForSubmit();

  return dataList.map(normalizeAuditRow).filter((row) => {
    const sourceType = row?.sourceType ?? row?.source_type;
    if (sourceType && sourceType !== 'STUDENT_CANDIDATE') return false;
    if (row.reason && row.reason.includes('系统自动通过')) return false;

    const isAudit = rowAuditStatus(row);
    if (isAudit === CONSTANT.AUDIT_STATUS.SUBMIT) {
      return bypassSubmit || isUserIdInVerifyUserId(row.verifyUserId, uid);
    }
    if (isAudit === CONSTANT.AUDIT_STATUS.PASS && row.isAllVerified) {
      return isUserIdInVerifyUserId(row.verifyUserId, uid);
    }
    if (isAudit === CONSTANT.AUDIT_STATUS.BACK) {
      return String(row.createUserId) === String(uid);
    }
    return false;
  });
}

const titleObj = reactive({ mainTitle: '老师审核学生自主选题' });

const currentInternship = computed(() => unref(headerPageRef.value?.currentInternship) ?? null);
const isMore1Disabled = computed(() => unref(headerPageRef.value?.isMore1Disabled) ?? false);

function handleProjectSelected(_internship, title) {
  if (title) titleObj.mainTitle = title;
}

function buildSearchKey(baseSearchKey) {
  return baseSearchKey;
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: { autoInit: false },
  clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  initSearchWords: buildVerifySearchWords(),
  defaultDTHProps: {
    buttonProps: {
      audit: { show: true, showPass: true, showNotPass: true, showBack: true },
      update: { show: true, type: 'primary', name: '查看题目详情' },
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTitleStudentMerge' },
    allTableColumns: [
      { id: 1, showName: '学生姓名', tableColumnName: 'studentName', sortable: true },
      { id: 6, showName: '学号', tableColumnName: 'studentAccount', sortable: true },
      { id: 2, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 3, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
      { id: 4, showName: '当前状态', tableColumnName: 'customize-status' },
      { id: 5, showName: '审核理由', tableColumnName: 'reason', sortable: false },
    ],
  },
  defaultDBIProps: {},
}));

function resolveTopicIdFromRow(row) {
  return (
    Number(
      row?.titleId ??
        row?.title_id ??
        row?.topicId ??
        row?.topic_id ??
        row?.relTitleTeacherId ??
        row?.rel_title_teacher_id ??
        0
    ) || 0
  );
}

async function loadTopicRow(topicId) {
  if (!topicId) return null;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTitleTeacher',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: topicId },
    });
    return res?.data?.content?.[0] ?? null;
  } catch (e) {
    console.error('加载题目详情失败:', e);
    return null;
  }
}

async function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;

  const topicId = resolveTopicIdFromRow(selectedRow);
  if (!topicId) {
    ElMessage.warning('缺少题目ID，无法打开详情');
    return;
  }

  const topicRow = (await loadTopicRow(topicId)) || { id: topicId, name: selectedRow?.name, remarks: selectedRow?.remarks };
  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, currentInternship.value, true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = row ? { ...row } : {};
  showProgressDialog.value = true;
}

function handleVerifySuccess() {
  const baseList = headerPageRef.value?.baseListRef;
  baseList?.initDataList?.(true);
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
}
</script>

