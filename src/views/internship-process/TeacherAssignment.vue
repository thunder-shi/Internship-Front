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
    @project-selected="handleProjectSelected"
  >
    <!-- 指导老师选择对话框 -->
    <template #dialogs>
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
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

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

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

// 创建响应式的 title 对象
const titleObj = reactive({
  mainTitle: '选择指导老师',
});

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 获取 isMore1Disabled（从 headerPageRef）
const isMore1Disabled = computed(() => {
  return headerPageRef.value?.isMore1Disabled?.value || false;
});

const processTypeCode = CONSTANT.PROCESS_TYPE.TEACHER_SELECT_INTERNALSHIP;

// 实习项目选择对话框的查询关键字（用于 getSomeRecords，包含时间条件）
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: processTypeCode,
    startTime: currentTime,
    endTime: currentTime,
  };
  // 如果用户有专业ID，添加专业过滤条件
  if (userInfo.value?.majorId) {
    searchKey.majorIds = userInfo.value.majorId;
  }
  return searchKey;
});

// 实习项目选择对话框的查询操作符（用于 getSomeRecords）
const projectSelectRegKey = computed(() => {
  const regKey = {
    startTime: CONSTANT.SEARCH_OPERATOR.LE, // startTime <= 当前时间
    endTime: CONSTANT.SEARCH_OPERATOR.GE, // endTime >= 当前时间
  };
  // 如果用户有专业ID，添加专业过滤操作符
  if (userInfo.value?.majorId) {
    regKey.majorIds = CONSTANT.SEARCH_OPERATOR.IN;
  }
  return regKey;
});

const dlgTeacherSelectRef = ref(null);
const dlgTeacherSelectVisible = ref(false);
const dlgTeacherSelectInternship = ref(null);
function onTeacherSelectSuccess() {
  headerPageRef.value?.baseListRef?.initDataList(true);
}

// 处理项目选择后的回调
function handleProjectSelected(internship, title) {
  console.log(internship);

  if (title) {
    titleObj.mainTitle = title;
  }
  dlgTeacherSelectInternship.value = internship;
}

// 按钮配置（computed）
const buttonPropsComputed = computed(() => {
  return {
    create: {
      show: true,
      disabled: !currentInternship.value || !currentInternship.value.internshipId,
    },
    submit: { show: true },
    delete: { show: true },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
  };
});

// 按钮条件配置
const buttonCondition = {
  update: (row) => {
    const isAudit = row?.isAudit;
    // 只有待提交(SAVE=-1)、审核退回(BACK=3)或未设置状态时可以修改
    return (
      isAudit === null ||
      isAudit === undefined ||
      isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
      isAudit === CONSTANT.AUDIT_STATUS.BACK
    );
  },
};

// 构建 defaultDTLProps（包含按钮和列配置）
const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: {
      autoInit: false,
    },
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      buttonCondition: buttonCondition,
      keyWord: { edit: 'RelIntershipUser', view: 'ViewRelIntershipUser' },
      allTableColumns: [
        { id: 1, showName: '指导老师', tableColumnName: 'userName', sortable: true },
        { id: 2, showName: '联系电话', tableColumnName: 'phone', sortable: true },
        { id: 3, showName: '开始时间', tableColumnName: 'startTime', sortable: true },
        { id: 4, showName: '结束时间', tableColumnName: 'endTime', sortable: true },
        { id: 4, showName: '审核要求', tableColumnName: 'currentVerifyTypeName', sortable: true },
        { id: 5, showName: '当前状态', tableColumnName: 'customize-status', sortable: true },
      ],
    },
    defaultDBIProps: {},
  };
});

function buildSearchKey(baseSearchKey) {
  console.log(baseSearchKey);
  
  return {
    // processTypeCode,
    internshipId: baseSearchKey.internshipId,
    // tableName: 'RelIntershipUser',
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

async function handleDeleteClick(rows) {
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];
  if (!rowsToDelete?.length) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }
  const ids = rowsToDelete.map((row) => row.id).filter((id) => id != null);
  if (!ids.length) return;
  try {
    const res = await listAPI.delOneOrManyNodes('RelIntershipUser', ids);
    if (res?.message === 'successful') {
      ElMessage.success('删除成功');
      headerPageRef.value?.baseListRef?.initDataList(true);
    } else {
      ElMessage.error(res?.message || '删除失败');
    }
  } catch (e) {
    console.error('删除失败:', e);
    ElMessage.error('删除失败');
  }
}

function handleSubmitClick(row) {
  if (row.isAudit != -1) {
    ElMessage.warning('该记录已提交，不能再次提交');
    return;
  }
  let STATUS, reason;
  if (row.currentVerifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    STATUS = CONSTANT.AUDIT_STATUS.PASS;
    reason = '系统自动通过';
  } else STATUS = CONSTANT.AUDIT_STATUS.SUBMIT;
  updateVerifyProcess(row.verifyProcessId, STATUS);
}

async function updateVerifyProcess(id, isAudit) {
  try {
    // 更新流程状态到 MainVerifyProcess
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: id,
      isAudit: isAudit,
    });
    if (resInfo && resInfo.message === 'successful') {
      ElMessage.success('提交成功');
      headerPageRef.value?.baseListRef?.initDataList(true);
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
      return false;
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('更新审核状态失败:', error);
    return false;
  }
}

// 暴露给父组件的方法和属性
defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>
