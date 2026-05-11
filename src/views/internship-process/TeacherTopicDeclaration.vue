<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'老师申报题目'"
    :no-project-message="'当前没有可申报题目的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_DECLARE_TOPIC"
    @append-click="handleAppendClick"
    @edit-click="handleEditClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleSubmitClick"
    @more2-click="handleBatchSubmitClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgTopicDetail ref="dlgTopicDetailRef" :current-internship="currentInternship" @close-dialog="handleTopicDetailClose" @success="handleTopicDetailSuccess" />
      <!-- 审核进度查看（仿照实习计划制定） -->
      <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId" :process-info="currentRow" key-words="ViewVerifyProcessRelTitleTeacher" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, unref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTopicDetail from './components/DlgTopicDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { useProcessWindowProjectSelectKeys } from '@/utils/useProcessWindowProjectSelectKeys';
import { useAssignmentActions } from '@/utils/useAssignmentActions';
import listAPI from '@/api/list';
import { runSubmitAllByQuery } from '@/utils/submitAllByQuery';

defineOptions({
  name: 'TeacherTopicDeclaration',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);
const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
const { projectSelectSearchKey, projectSelectRegKey } = useProcessWindowProjectSelectKeys(
  userInfo,
  true
);
const { getVerifyRoleName } = useVerifyFilter();

const { handleBatchSubmitClick } = useAssignmentActions(() =>
  headerPageRef.value?.baseListRef?.initDataList?.(true)
);

const titleObj = reactive({
  mainTitle: '老师申报题目',
});

const currentInternship = computed(() => unref(headerPageRef.value?.currentInternship) ?? null);

const isMore1Disabled = computed(() => Boolean(unref(headerPageRef.value?.isMore1Disabled)));

function buildSearchKey(baseSearchKey) {
  return {
    internshipId: baseSearchKey.internshipId,
    teacherId: userInfo.value?.id,
  };
}

function resolveIsLimitValue(row) {
  const rawList = [
    row?.is_limit,
    row?.isLimit,
    row?.title_is_limit,
    row?.titleIsLimit,
    row?.rel_title_is_limit,
    row?.relTitleIsLimit,
    row?.limit_flag,
    row?.limitFlag,
  ];

  const normalized = rawList
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map((v) => {
      if (v === '是') return 1;
      if (v === '否') return 0;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    })
    .filter((v) => v !== null);

  // 兼容 Merge 视图字段冲突：只要任一来源为 1，就认为是限选
  if (normalized.includes(1)) return 1;
  if (normalized.includes(0)) return 0;
  return null;
}

function clientFilterFn(list) {
  if (!Array.isArray(list)) return list || [];
  return list.map((row) => {
    const isLimitValue = resolveIsLimitValue(row);
    return {
      ...row,
      isLimit: isLimitValue,
      is_limit: isLimitValue,
      isLimitText: isLimitValue === 1 ? '是' : (isLimitValue === 0 ? '否' : '--'),
    };
  });
}

function resolveCurrentInternshipId() {
  const cur = currentInternship.value || {};
  const raw = cur.internshipId ?? cur.id ?? cur.mainInternshipId ?? cur.main_internship_id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function handleSubmitAllTeacherTopics({ initDataList } = {}) {
  const internshipId = resolveCurrentInternshipId();
  const teacherId = Number(userInfo.value?.id || 0);

  await runSubmitAllByQuery(
    {
      guard: () => {
        if (!internshipId) {
          ElMessage.warning('请先选择实习项目');
          return false;
        }
        if (!teacherId) {
          ElMessage.warning('未获取到登录教师信息，请重新登录后再试');
          return false;
        }
        return true;
      },
      keyWords: 'ViewVerifyProcessRelTitleTeacherMerge',
      searchKey: {
        internshipId,
        teacherId,
        tableName: 'RelTitleTeacher',
        isAudit: `${CONSTANT.AUDIT_STATUS.SAVE},${CONSTANT.AUDIT_STATUS.BACK}`,
      },
      reg: {
        internshipId: '=',
        teacherId: '=',
        tableName: '=',
        isAudit: CONSTANT.SEARCH_OPERATOR.IN,
      },
      filterRows: (row) => {
        const isAudit = Number(row?.isAudit ?? row?.is_audit);
        const verifyProcessId = Number(row?.id ?? row?.verifyProcessId ?? row?.verify_process_id);
        return (
          verifyProcessId > 0 &&
          (isAudit === CONSTANT.AUDIT_STATUS.SAVE || isAudit === CONSTANT.AUDIT_STATUS.BACK)
        );
      },
      mapNode: (row) => ({
        id: row.id ?? row?.verifyProcessId ?? row?.verify_process_id,
        isAudit:
          (row?.verifyTypeId ?? row?.verify_type_id) == CONSTANT.VERIFY_LEVEL.NO_VERIFY
            ? CONSTANT.AUDIT_STATUS.PASS
            : CONSTANT.AUDIT_STATUS.SUBMIT,
      }),
      buildConfirmText: (n) => `确定提交当前项目下全部 ${n} 条待提交题目吗？`,
    },
    {
      initDataList: async (force) => {
        await (initDataList || headerPageRef.value?.baseListRef?.initDataList)?.(force ?? true);
      },
    }
  );
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
  },
  clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: {
      update: { show: true },
      create: { show: true, disabled: !currentInternship.value || !currentInternship.value.internshipId },
      delete: { show: true },
      visible: { show: true, type: 'primary', name: '查看进度' },
      submit: { show: true, name: '提交', type: 'warning' },
      more2: { show: true, name: '批量提交', type: 'primary' },
      more5: {
        show: true,
        name: '全部提交',
        type: 'warning',
        submitAll: { handler: handleSubmitAllTeacherTopics },
      },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    buttonCondition: {
      submit: (row) => {
        const isAudit = row?.isAudit ?? row?.is_audit;
        return isAudit === CONSTANT.AUDIT_STATUS.SAVE || isAudit === CONSTANT.AUDIT_STATUS.BACK ||
          (isAudit === CONSTANT.AUDIT_STATUS.PASS && row?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY);
      },
    },
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTitleTeacherMerge' },
    allTableColumns: [
      { id: 1, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
      { id: 2, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 3, showName: '题目详情', tableColumnName: 'remarks', sortable:true},
      { id: 4, showName: '是否限选', tableColumnName: 'isLimitText', sortable: false },
      //{ id: 2, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      //{ id: 3, showName: '创建人', tableColumnName: 'teacherName', sortable: true },
      
      { id: 5, showName: '状态', tableColumnName: 'customize-status' },
    ],
  },
  defaultDBIProps: {},
}));  

function handleProjectSelected(internship, title) {
  if (title) {
    titleObj.mainTitle = title;
  }
}

function handleAppendClick(cur) {
  if (!cur?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgTopicDetailRef.value?.showDialog(true, {}, null, cur);
}

function handleEditClick(row) {
  const editable = row.isAudit === null || row.isAudit === undefined ||
    row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row.isAudit === CONSTANT.AUDIT_STATUS.BACK;
  const relationId = row?.relationId ?? row?.relation_id ?? row?.id;
  const topicRow = { ...row, id: relationId };
  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, currentInternship.value, !editable);
}

async function handleSubmitClick(row) {
  // 自动通过的记录：提供退回选项
  if (row.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
      row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    try {
      await ElMessageBox.confirm('该记录为自动通过，是否退回以重新编辑？', '提示', {
        confirmButtonText: '退回', cancelButtonText: '取消', type: 'warning',
      });
    } catch { return; }
    try {
      const res = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id, isAudit: CONSTANT.AUDIT_STATUS.SAVE, reason: null, verifyUserName: null, verifyUserId: null,
      });
      if (res?.message === 'successful') {
        ElMessage.success('退回成功，可以修改后重新提交');
        headerPageRef.value?.baseListRef?.initDataList?.(true);
      } else {
        ElMessage.error(res?.message || '退回失败');
      }
    } catch (e) { console.error('退回失败:', e); }
    return;
  }
  if (row.isAudit !== CONSTANT.AUDIT_STATUS.SAVE && row.isAudit !== CONSTANT.AUDIT_STATUS.BACK) {
    ElMessage.warning('该记录已提交或已审核，不能再次提交');
    return;
  }
  const STATUS =
    row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.AUDIT_STATUS.PASS
      : CONSTANT.AUDIT_STATUS.SUBMIT;
  updateVerifyProcess(row.id, STATUS);
}

async function handleDeleteClick(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }
  const invalid = list.filter((r) => r.isAudit !== CONSTANT.AUDIT_STATUS.SAVE);
  if (invalid.length > 0) {
    ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的记录`);
    return;
  }
  try {
    // Merge view: row.id = VP ID, row.relationId = business record ID
    const verifyProcessIds = list.map((r) => r.id).filter(Boolean);
    const relationIds = list.map((r) => r.relationId).filter(Boolean);

    if (verifyProcessIds.length > 0) {
      const res = await listAPI.delOneOrManyNodes('MainVerifyProcess', verifyProcessIds);
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '删除流程记录失败');
        return;
      }
    }
    if (relationIds.length > 0) {
      const res = await listAPI.delOneOrManyNodes('RelTitleTeacher', relationIds);
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '删除记录失败');
        return;
      }
    }
    ElMessage.success('删除成功');
    headerPageRef.value?.baseListRef?.initDataList?.(true);
  } catch (e) {
    console.error('删除失败:', e);
    ElMessage.error('删除失败');
  }
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  const relationId = row?.relationId ?? row?.relation_id ?? row?.id;
  currentRow.value = row ? { ...row, relationId } : {};
  showProgressDialog.value = true;
}

async function updateVerifyProcess(id, isAudit) {
  try {
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', { id, isAudit });
    if (resInfo && resInfo.message === 'successful') {
      ElMessage.success('提交成功');
      headerPageRef.value?.baseListRef?.initDataList?.(true);
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
    }
  } catch (error) {
    console.error('更新审核状态失败:', error);
  }
}

function handleTopicDetailClose() {}

function handleTopicDetailSuccess() {
  headerPageRef.value?.baseListRef?.initDataList?.(true);
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh?.(),
});
</script>
