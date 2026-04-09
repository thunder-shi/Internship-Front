<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'题目申报审核'"
    :no-project-message="'当前没有可审核题目的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
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
        key-words="ViewVerifyProcessRelTitleTeacher"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DlgTopicDetail from './components/DlgTopicDetail.vue';
import CONSTANT from '@/utils/constant';
import { useProcessWindowProjectSelectKeys } from '@/utils/useProcessWindowProjectSelectKeys';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';
import { useBatchVerifyAuditDialog } from '@/utils/useBatchVerifyAuditDialog';
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
/** 与实习安排审核页一致：仅按流程时间窗筛选，不按专业收窄 */
const { projectSelectSearchKey, projectSelectRegKey } = useProcessWindowProjectSelectKeys(
  userInfo,
  false
);
const titleObj = reactive({ mainTitle: '题目申报审核' });

const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value ?? null);
const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value ?? false);

const { clientFilterFn: verifyClientFilterFn, getVerifyRoleName } = useVerifyFilter();

const { handleBatchAuditCommand, handleAuditClick } = useBatchVerifyAuditDialog(dlgVerifyRef);

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

  if (normalized.includes(1)) return 1;
  if (normalized.includes(0)) return 0;
  return null;
}

function clientFilterFn(dataList) {
  const filtered = verifyClientFilterFn(dataList);
  if (!Array.isArray(filtered)) return filtered || [];
  return filtered.map((row) => {
    const isLimitValue = resolveIsLimitValue(row);
    return {
      ...row,
      isLimit: isLimitValue,
      is_limit: isLimitValue,
      isLimitText: isLimitValue === 1 ? '是' : (isLimitValue === 0 ? '否' : '--'),
    };
  });
}

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
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTitleTeacherMerge' },
    allTableColumns: [
      { id: 1, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
      { id: 2, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
      { id: 3, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 4, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
      { id: 5, showName: '是否限选', tableColumnName: 'isLimitText', sortable: false },
      { id: 6, showName: '状态', tableColumnName: 'customize-status' },
    ],
  },
  defaultDBIProps: {},
}));

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
      keyWords: 'ViewRelTitleTeacher',
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

function handleVerifySuccess() {
  const baseList = headerPageRef.value?.baseListRef;
  baseList?.initDataList?.(true);
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
}
</script>
