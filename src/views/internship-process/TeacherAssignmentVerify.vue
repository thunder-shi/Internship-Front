<template>
  <div class="internship-verify-container">
    <InternshipPostHeaderPage
      ref="headerPageRef"
      :page-title="'项目指导老师审核'"
      :no-project-message="'当前没有需要审核的指导老师项目'"
      :project-select-search-key="projectSelectSearchKey"
      :project-select-reg-key="projectSelectRegKey"
      :default-d-t-l-props="defaultDTLProps"
      :build-search-key="buildSearchKey"
      :is-company-user="isCompanyUser"
      @audit-click="handleAuditClick"
      @edit-click="handleEditClick"
      @project-selected="handleProjectSelected"
    >
      <template #dialogs>
        <DlgVerify
          ref="dlgVerifyRef"
          dlg-title="项目指导老师审核"
          recall-title="退回已通过的指导老师安排"
          @success="handleVerifySuccess"
        />
        <DlgInternshipDetail ref="dlgInternshipDetail" />
      </template>
    </InternshipPostHeaderPage>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgInternshipDetail from '@/views/dialogs/DlgInternshipDetail.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { buildVerifySearchWords } from '@/utils/verify';
import moment from 'moment';

defineOptions({
  name: 'TeacherAssignmentVerify',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgVerifyRef = ref(null);
const dlgInternshipDetail = ref(null);

const roles = computed(() => store.getters.roles || []);
const isCompanyUser = computed(() =>
  roles.value.some(
    (r) => r === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || r === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  )
);

const titleObj = reactive({ mainTitle: '项目指导老师审核' });
const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value || false);
const processTypeCode = CONSTANT.PROCESS_TYPE.TEACHER_SELECT_INTERNALSHIP;

const { clientFilterFn, getVerifyRoleName } = useVerifyFilter();

const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return { processTypeCode, startTime: currentTime, endTime: currentTime };
});

const projectSelectRegKey = computed(() => ({
  startTime: CONSTANT.SEARCH_OPERATOR.LE,
  endTime: CONSTANT.SEARCH_OPERATOR.GE,
}));

function handleProjectSelected(_internship, title) {
  if (title) titleObj.mainTitle = title;
}

function buildSearchKey(baseSearchKey) {
  return {
    processTypeCode,
    internshipId: baseSearchKey.internshipId,
    tableName: 'RelIntershipUser',
  };
}

const buttonPropsComputed = computed(() => ({
  more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
  audit: { show: true, showPass: true, showNotPass: true, showBack: true },
  update: { show: true, name: '查看详情' },
}));

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: { autoInit: false },
  clientFilterFn,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  initSearchWords: buildVerifySearchWords(),
  defaultDTHProps: {
    buttonProps: buttonPropsComputed.value,
    keyWord: { edit: 'RelIntershipUser', view: 'ViewVerifyProcessRelIntershipUserMerge' },
    allTableColumns: [
      { id: 2, showName: '指导项目名称', theOrder: 2, tableColumnName: 'internshipName' },
      { id: 3, showName: '指导老师', theOrder: 3, tableColumnName: 'userName' },
      { id: 4, showName: '流程开始时间', theOrder: 4, tableColumnName: 'startTime' },
      { id: 5, showName: '流程结束时间', theOrder: 5, tableColumnName: 'endTime' },
      { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'customize-status' },
      { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' },
    ],
  },
}));

const handleVerifySuccess = () => {
  headerPageRef.value?.updateSearchWordsAndRefresh();
};

const handleAuditClick = (row) => {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) dlgVerifyRef.value?.showDialog(true, selectedRow);
};

const handleEditClick = (row) => {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow) dlgInternshipDetail.value?.showDialog(true, selectedRow);
};
</script>
