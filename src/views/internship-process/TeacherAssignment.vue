<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'选择指导老师'"
    :no-project-message="'当前没有可选择指导老师的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    @append-click="handleAppendClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleSubmitClick"
    @view-click="handleViewClick"
    @more2-click="handleBatchSubmitClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewRelIntershipUser"
      />
      <DlgTeacherSelect
        ref="dlgTeacherSelectRef"
        :model-value="dlgTeacherSelectVisible"
        :current-internship="dlgTeacherSelectInternship"
        @update:model-value="dlgTeacherSelectVisible = $event"
        @success="onTeacherSelectSuccess"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTeacherSelect from './components/DlgTeacherSelect.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { useAssignmentActions } from '@/utils/useAssignmentActions';

defineOptions({
  name: 'TeacherAssignment',
});

const store = useStore();
const headerPageRef = ref(null);
const roles = computed(() => store.getters.roles || []);
const isCompanyUser = computed(() =>
  roles.value.some(
    (r) => r === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || r === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  )
);

const userInfo = computed(() => store.getters.userInfo || {});

const titleObj = reactive({ mainTitle: '选择指导老师' });

const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

const isMore1Disabled = computed(() => {
  return headerPageRef.value?.isMore1Disabled?.value || false;
});

const processTypeCode = CONSTANT.PROCESS_TYPE.TEACHER_SELECT_INTERNALSHIP;

const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: processTypeCode,
    startTime: currentTime,
    endTime: currentTime,
  };
  if (userInfo.value?.majorId) {
    searchKey.majorIds = userInfo.value.majorId;
  }
  return searchKey;
});

const projectSelectRegKey = computed(() => {
  const regKey = {
    startTime: CONSTANT.SEARCH_OPERATOR.LE,
    endTime: CONSTANT.SEARCH_OPERATOR.GE,
  };
  if (userInfo.value?.majorId) {
    regKey.majorIds = CONSTANT.SEARCH_OPERATOR.IN;
  }
  return regKey;
});

const dlgTeacherSelectRef = ref(null);
const dlgTeacherSelectVisible = ref(false);
const dlgTeacherSelectInternship = ref(null);

// 公共操作逻辑
const {
  currentRow,
  showProgressDialog,
  handleViewClick,
  handleDeleteClick,
  handleSubmitClick,
  handleBatchSubmitClick,
} = useAssignmentActions(() => headerPageRef.value?.baseListRef?.initDataList(true));

function onTeacherSelectSuccess() {
  headerPageRef.value?.baseListRef?.initDataList(true);
}

function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title;
  dlgTeacherSelectInternship.value = internship;
}

const { getVerifyRoleName } = useVerifyFilter();

const buttonPropsComputed = computed(() => {
  return {
    create: {
      show: true,
      disabled: !currentInternship.value || !currentInternship.value.internshipId,
    },
    submit: { show: true },
    delete: { show: true },
    visible: { show: true, type: 'primary', name: '查看进度' },
    more2: { show: true, name: '批量提交', type: 'primary' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
  };
});

const buttonCondition = {
  update: (row) => {
    const isAudit = row?.isAudit;
    return (
      isAudit === null ||
      isAudit === undefined ||
      isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
      isAudit === CONSTANT.AUDIT_STATUS.BACK
    );
  },
};

const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: { autoInit: false },
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      buttonCondition: buttonCondition,
      keyWord: { edit: 'RelIntershipUser', view: 'ViewVerifyProcessRelIntershipUserMerge' },
      allTableColumns: [
        { id: 1, showName: '指导老师', tableColumnName: 'userName', sortable: true },
        { id: 2, showName: '联系电话', tableColumnName: 'phone', sortable: true },
        { id: 3, showName: '开始时间', tableColumnName: 'startTime', sortable: true },
        { id: 4, showName: '结束时间', tableColumnName: 'endTime', sortable: true },
        { id: 5, showName: '当前状态', tableColumnName: 'customize-status', sortable: true },
      ],
    },
    defaultDBIProps: {},
  };
});

function buildSearchKey(baseSearchKey) {
  return {
    processTypeCode,
    internshipId: baseSearchKey.internshipId,
    tableName: 'RelIntershipUser',
  };
}

function handleAppendClick(currentInternship) {
  if (!currentInternship || !currentInternship.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgTeacherSelectVisible.value = true;
  dlgTeacherSelectRef.value?.showDialog(true);
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>
