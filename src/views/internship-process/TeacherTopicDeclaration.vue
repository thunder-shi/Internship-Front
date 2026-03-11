<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'老师申报题目'"
    :no-project-message="'当前没有可申报题目的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_DECLARE_TOPIC"
    @append-click="handleAppendClick"
    @edit-click="handleEditClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleSubmitClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgTopicDetail ref="dlgTopicDetailRef" :current-internship="currentInternship" @close-dialog="handleTopicDetailClose" @success="handleTopicDetailSuccess" />
      <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId" :process-info="currentRow" key-words="ViewVerifyProcessRelTeacherStudent" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTopicDetail from './components/DlgTopicDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';

defineOptions({
  name: 'TeacherTopicDeclaration',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);
const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});

const titleObj = reactive({
  mainTitle: '老师申报题目',
});

const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value ?? null);

const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value ?? false);

// 统一获取审核状态，兼容 isAudit / is_audit
function getAuditStatus(row) {
  if (!row) return null;
  return row.isAudit ?? row.is_audit ?? null;
}

function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey,
    teacherId: userInfo.value?.id,
  };
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
  },
  // 将视图中的 is_audit 归一到 isAudit，便于状态列与按钮条件统一判断
  clientFilterFn: (rows) =>
    Array.isArray(rows)
      ? rows.map((r) => ({
          ...r,
          isAudit: r.isAudit ?? r.is_audit ?? r.isAudit,
        }))
      : rows,
  enableAuditStatusCustom: true,
  defaultDTHProps: {
    buttonProps: {
      update: { show: true },
      create: { show: true, disabled: !currentInternship.value || !currentInternship.value.internshipId },
      delete: { show: true },
      visible: { show: true, type: 'primary', name: '查看进度' },
      submit: { show: true, name: '提交', type: 'warning' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    buttonCondition: {
      update: (row) => {
        const isAudit = getAuditStatus(row);
        return isAudit === null || isAudit === undefined || isAudit === CONSTANT.AUDIT_STATUS.SAVE || isAudit === CONSTANT.AUDIT_STATUS.BACK;
      },
      submit: (row) => getAuditStatus(row) === CONSTANT.AUDIT_STATUS.SAVE,
    },
    keyWord: { edit: 'RelTeacherStudent', view: 'ViewRelTeacherStudent' },
    allTableColumns: [
      { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 2, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      { id: 3, showName: '创建人', tableColumnName: 'teacherName', sortable: true },
      { id: 4, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
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
  const isAudit = getAuditStatus(row);
  const editable = isAudit === null || isAudit === undefined ||
    isAudit === CONSTANT.AUDIT_STATUS.SAVE || isAudit === CONSTANT.AUDIT_STATUS.BACK;
  if (!editable) {
    ElMessage.warning('已提交或已审核，不可修改');
    return;
  }
  dlgTopicDetailRef.value?.showDialog(true, {}, row, currentInternship.value);
}

async function handleSubmitClick(row) {
  const isAudit = getAuditStatus(row);
  if (isAudit !== CONSTANT.AUDIT_STATUS.SAVE) {
    ElMessage.warning('该记录已提交，不能再次提交');
    return;
  }
  try {
    await ElMessageBox.confirm('提交后将进入审核流程，信息将不可修改，确定提交吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  // ViewRelTeacherStudent 需提供 verifyProcessId（或 verify_process_id）用于提交审核
  const verifyProcessId = row.verifyProcessId ?? row.verify_process_id;
  if (verifyProcessId == null) {
    ElMessage.warning('无法获取审核记录，请稍后重试');
    return;
  }
  const node = {
    id: verifyProcessId,
    isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
    tableName: 'RelTeacherStudent',
  };
  if (row.processId != null) node.processId = row.processId;
  if (row.id != null) node.relationId = row.id;
  if (row.createUserId != null) node.createUserId = row.createUserId;
  try {
    const res = await internshipProcessAPI.auditProcess(node);
    if (res?.message === 'successful') {
      ElMessage.success(`提交成功，${CONSTANT.AUDIT_STATUS.SUBMITNAME}`);
      headerPageRef.value?.baseListRef?.initDataList?.(true);
    } else {
      ElMessage.error(res?.message || '提交失败');
    }
  } catch (e) {
    console.error('提交失败:', e);
    ElMessage.error('提交失败');
  }
}

async function handleDeleteClick(rows) {
  const list = Array.isArray(rows) ? rows : [rows];
  if (!list.length) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }
  const invalid = list.filter((r) => getAuditStatus(r) !== CONSTANT.AUDIT_STATUS.SAVE);
  if (invalid.length > 0) {
    ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的记录`);
    return;
  }
  const ids = list.map((r) => r.id).filter((id) => id != null);
  if (!ids.length) return;
  try {
    const res = await listAPI.delOneOrManyNodes('RelTeacherStudent', ids);
    if (res?.message === 'successful') {
      ElMessage.success('删除成功');
      headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      ElMessage.error(res?.message || '删除失败');
    }
  } catch (e) {
    console.error('删除失败:', e);
    ElMessage.error('删除失败');
  }
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  // 查看进度时传 process-info：id 为审核记录 id（供展示），relationId 为题目 id，保证只查当前题目的审核记录，与实习计划一致
  if (row) {
    const verifyId = row.verifyProcessId ?? row.verify_process_id;
    const topicId = row.id; // ViewRelTeacherStudent 的 id 即题目(RelTeacherStudent) id
    currentRow.value = {
      ...row,
      id: verifyId ?? row.id,
      relationId: row.relationId ?? topicId,
    };
  } else {
    currentRow.value = {};
  }
  showProgressDialog.value = true;
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
