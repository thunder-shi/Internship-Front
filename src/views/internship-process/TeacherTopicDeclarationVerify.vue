<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'题目申报审核'"
    :no-project-message="'当前没有可审核题目的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_DECLARE_TOPIC"
    @audit-click="handleAuditClick"
    @audit-command="handleBatchAuditCommand"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerify ref="dlgVerifyRef" dlg-title="题目申报审核" recall-title="退回已通过的题目申报" @success="handleVerifySuccess" />
      <DlgTopicDetail ref="dlgTopicDetailRef" :current-internship="currentInternship" />
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewVerifyProcessRelTeacherStudent"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DlgTopicDetail from './components/DlgTopicDetail.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';
import internshipProcessAPI from '@/api/internshipProcess';
import listAPI from '@/api/list';

defineOptions({
  name: 'TeacherTopicDeclarationVerify',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgVerifyRef = ref(null);
const dlgTopicDetailRef = ref(null);

const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
const titleObj = reactive({ mainTitle: '题目申报审核' });

const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value ?? null);
const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value ?? false);

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title;
}

function buildSearchKey(baseSearchKey) {
  return { ...baseSearchKey };
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
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTeacherStudentMerge' },
    allTableColumns: [
      { id: 1, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
      { id: 2, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
      { id: 3, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 4, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
      { id: 5, showName: '状态', tableColumnName: 'customize-status' },
    ],
  },
  defaultDBIProps: {},
}));

function handleAuditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;
  dlgVerifyRef.value?.showDialog(true, selectedRow);
}

async function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;
  const topicId = selectedRow.relationId;
  if (topicId == null) {
    ElMessage.warning('缺少题目ID，无法打开详情');
    return;
  }

  let topicRow = {
    id: topicId,
    name: selectedRow.name,
    internshipId: selectedRow.internshipId,
    internshipName: selectedRow.internshipName,
    remarks: selectedRow.remarks,
  };

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: topicId },
    });
    const fullRow = res?.data?.content?.[0];
    if (fullRow) topicRow = { ...topicRow, ...fullRow };
  } catch (e) {
    console.error('加载题目详情失败:', e);
  }

  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, currentInternship.value, true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  currentRow.value = { ...row, relationId: row.relationId };
  showProgressDialog.value = true;
}

async function handleBatchAuditCommand(command, rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (!list.length) {
    ElMessage.warning('请先勾选要审核的记录');
    return;
  }

  const targetList = list.filter((r) => r && r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT);
  if (!targetList.length) {
    ElMessage.warning('选中的记录中没有待审核的数据');
    return;
  }

  const textMap = {
    [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
    [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
    [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
  };

  let reason;
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入审核理由（将应用于所有选中记录）：',
      '批量审核',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValue: textMap[command] || '',
      }
    );
    reason = value != null ? String(value).trim() : '';
  } catch {
    return;
  }

  if (!reason) {
    ElMessage.warning('审核理由不能为空');
    return;
  }

  const uid = userInfo.value?.id;
  if (!uid) {
    ElMessage.error('无法获取当前用户信息，请重新登录');
    return;
  }

  let successCount = 0;
  for (const row of targetList) {
    try {
      const res = await internshipProcessAPI.auditProcess({
        id: row.id,
        isAudit: command,
        reason,
        verifyUserId: parseInt(uid, 10),
      });
      if (res && res.message === 'successful') successCount += 1;
    } catch (e) {
      console.error('批量审核失败记录:', row.id, e);
    }
  }

  if (successCount > 0) {
    ElMessage.success(`批量审核完成，成功 ${successCount} 条`);
    headerPageRef.value?.baseListRef?.initDataList?.(true);
  } else {
    ElMessage.warning('批量审核未成功，请稍后重试');
  }
}

function handleVerifySuccess() {
  headerPageRef.value?.baseListRef?.initDataList?.(true);
}
</script>
