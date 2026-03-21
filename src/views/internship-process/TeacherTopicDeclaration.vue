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
      <!-- 审核进度查看（仿照实习计划制定） -->
      <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId" :process-info="currentRow" key-words="ViewVerifyProcessRelTitleTeacher" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTopicDetail from './components/DlgTopicDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';

defineOptions({
  name: 'TeacherTopicDeclaration',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);
const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
const { getVerifyRoleName } = useVerifyFilter();

const titleObj = reactive({
  mainTitle: '老师申报题目',
});

const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value ?? null);

const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value ?? false);

function buildSearchKey(baseSearchKey) {
  return {
    internshipId: baseSearchKey.internshipId,
    teacherId: userInfo.value?.id,
  };
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
  },
  enableAuditStatusCustom: true,
  getVerifyRoleName,
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
      submit: (row) => {
        const isAudit = row?.isAudit ?? row?.is_audit;
        return isAudit === CONSTANT.AUDIT_STATUS.SAVE || isAudit === CONSTANT.AUDIT_STATUS.BACK;
      },
    },
    keyWord: { edit: 'RelTitleTeacher', view: 'ViewRelTitleTeacher' },
    allTableColumns: [
      { id: 1, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
      { id: 2, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 3, showName: '题目详情', tableColumnName: 'remarks', sortable:true},
      //{ id: 2, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      //{ id: 3, showName: '创建人', tableColumnName: 'teacherName', sortable: true },
      
      { id: 3, showName: '状态', tableColumnName: 'customize-status' },
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

function handleSubmitClick(row) {
  if (row.isAudit !== CONSTANT.AUDIT_STATUS.SAVE && row.isAudit !== CONSTANT.AUDIT_STATUS.BACK) {
    ElMessage.warning('该记录已提交或已审核，不能再次提交');
    return;
  }
  const STATUS =
    row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.AUDIT_STATUS.PASS
      : CONSTANT.AUDIT_STATUS.SUBMIT;
  updateVerifyProcess(row, STATUS);
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
    const verifyProcessIds = list
      .map((r) => r?.verifyProcessId ?? r?.verify_process_id)
      .filter(Boolean);
    const relationIds = list
      .map((r) => r?.relationId ?? r?.relation_id ?? r?.id)
      .filter(Boolean);

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

async function resolveVerifyProcessId(row) {
  const directId = row?.verifyProcessId ?? row?.verify_process_id;
  if (directId != null) return directId;

  const relationId = row?.relationId ?? row?.relation_id ?? row?.id;
  if (relationId == null) return null;

  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: {
        relationId,
        tableName: 'RelTitleTeacher',
      },
      pageInfo: { page: 1, size: 1 },
    });
    const records = queryRes?.data?.records || queryRes?.data?.content || [];
    return records[0]?.id ?? null;
  } catch (error) {
    console.error('查询流程记录失败:', error);
    return null;
  }
}

async function updateVerifyProcess(row, isAudit) {
  try {
    const id = await resolveVerifyProcessId(row);
    if (id == null) {
      ElMessage.warning('未找到流程记录，暂时不能提交');
      return;
    }
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
