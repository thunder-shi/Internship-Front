<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生实习项目安排'"
    :no-project-message="'当前没有可分配学生实习项目'"
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
    <!-- 审核进度对话框 + 学生选择对话框 -->
    <template #dialogs>
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewRelIntershipUser"
      />
      <DlgStudentSelect
        ref="dlgStudentSelectRef"
        :model-value="dlgStudentSelectVisible"
        :current-internship="dlgStudentSelectInternship"
        @update:model-value="dlgStudentSelectVisible = $event"
        @success="onStudentSelectSuccess"
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
import DlgStudentSelect from './components/DlgStudentSelect.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

defineOptions({
  name: 'StudentAssignment',
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
  mainTitle: '学生实习项目安排',
});

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 获取 isMore1Disabled（从 headerPageRef）
const isMore1Disabled = computed(() => {
  return headerPageRef.value?.isMore1Disabled?.value || false;
});

// 流程类型：学生实习项目安排
const processTypeCode = CONSTANT.PROCESS_TYPE.STUDENT_SELECT_INTERNSHIP;

// 实习项目选择对话框的查询关键字（用于 getSomeRecords，包含时间条件）
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: processTypeCode,
    startTime: currentTime,
    endTime: currentTime,
  };
  // 如果用户有专业ID，添加专业过滤条件（学生项目一般按专业分配）
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
  if (userInfo.value?.majorId) {
    regKey.majorIds = CONSTANT.SEARCH_OPERATOR.IN;
  }
  return regKey;
});

const dlgStudentSelectRef = ref(null);
const dlgStudentSelectVisible = ref(false);
const dlgStudentSelectInternship = ref(null);
// 当前操作的行数据（用于查看进度）
const currentRow = ref({});
const showProgressDialog = ref(false);
function onStudentSelectSuccess() {
  headerPageRef.value?.baseListRef?.initDataList(true);
}

// 处理项目选择后的回调
function handleProjectSelected(internship, title) {
  if (title) {
    titleObj.mainTitle = title;
  }
  dlgStudentSelectInternship.value = internship;
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
    visible: { show: true, type: 'primary', name: '查看进度' },
    more2: { show: true, name: '批量提交', type: 'primary' },
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

// 客户端过滤函数：按 relationId 聚合，只显示最新状态的记录
const clientFilterFn = (dataList) => {
  if (!Array.isArray(dataList) || dataList.length === 0) {
    return dataList;
  }

  const groupedMap = new Map();
  dataList.forEach((item) => {
    const relationId = item.relationId;
    if (relationId == null) {
      return;
    }
    if (!groupedMap.has(relationId)) {
      groupedMap.set(relationId, []);
    }
    groupedMap.get(relationId).push(item);
  });

  const result = [];
  groupedMap.forEach((records) => {
    // 按 id 降序，取最新一条
    records.sort((a, b) => (b.id || 0) - (a.id || 0));
    result.push(records[0]);
  });

  return result;
};

// 构建 defaultDTLProps（包含按钮和列配置）
const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: {
      autoInit: false,
    },
    clientFilterFn,
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      buttonCondition: buttonCondition,
      keyWord: { edit: 'RelIntershipUser', view: 'ViewRelIntershipUser' },
      allTableColumns: [
        { id: 1, showName: '学生姓名', tableColumnName: 'userName', sortable: true },
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

function handleAppendClick(currentInternshipParam) {
  if (!currentInternshipParam || !currentInternshipParam.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgStudentSelectVisible.value = true;
  dlgStudentSelectRef.value?.showDialog(true);
}

// 查看进度按钮点击（DataTableList 的 view 可能传入数组或单行）
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = row ? { ...row } : {};
  showProgressDialog.value = true;
}

// 处理删除按钮点击（与教师版相同）
async function handleDeleteClick(rows) {
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];

  if (!rowsToDelete || rowsToDelete.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }

  const invalidRows = rowsToDelete.filter((row) => {
    const isAudit = row.isAudit;
    return isAudit !== CONSTANT.AUDIT_STATUS.SAVE;
  });

  if (invalidRows.length > 0) {
    ElMessage.warning(`只能删除"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态的记录`);
    return;
  }

  try {
    const verifyProcessIds = [];
    const internshipUserIds = [];

    rowsToDelete.forEach((row) => {
      if (row.id) {
        verifyProcessIds.push(row.id);
      }
      const relIntershipUserId = row.relIntershipUserId;
      if (relIntershipUserId) {
        internshipUserIds.push(relIntershipUserId);
      }
    });

    if (verifyProcessIds.length > 0) {
      const deleteVerifyProcessRes = await listAPI.delOneOrManyNodes(
        'MainVerifyProcess',
        verifyProcessIds
      );
      if (!deleteVerifyProcessRes || deleteVerifyProcessRes.message !== 'successful') {
        ElMessage.error(deleteVerifyProcessRes?.message || '删除流程记录失败');
        return;
      }
    }

    if (internshipUserIds.length > 0) {
      const deletePostRes = await listAPI.delOneOrManyNodes('RelIntershipUser', internshipUserIds);
      if (!deletePostRes || deletePostRes.message !== 'successful') {
        ElMessage.error(deletePostRes?.message || '删除记录失败');
        return;
      }
    }
    ElMessage.success('删除成功');
    headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('删除失败:', error);
  }
}

function handleSubmitClick(row) {
  if (row.isAudit != -1) {
    ElMessage.warning('该记录已提交，不能再次提交');
    return;
  }
  let STATUS;
  if (row.currentVerifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    STATUS = CONSTANT.AUDIT_STATUS.PASS;
  } else STATUS = CONSTANT.AUDIT_STATUS.SUBMIT;
  updateVerifyProcess(row.id, STATUS);
}

// 批量提交：只提交选中行中 isAudit 为 -1 的记录
async function handleBatchSubmitClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  if (!rowsArray.length) {
    ElMessage.warning('请先勾选需要提交的记录');
    return;
  }

  const pendingRows = rowsArray.filter((row) => row && row.isAudit === CONSTANT.AUDIT_STATUS.SAVE);
  if (!pendingRows.length) {
    ElMessage.warning(`选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可以提交的记录`);
    return;
  }

  let successCount = 0;
  for (const row of pendingRows) {
    let STATUS;
    if (row.currentVerifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
      STATUS = CONSTANT.AUDIT_STATUS.PASS;
    } else {
      STATUS = CONSTANT.AUDIT_STATUS.SUBMIT;
    }
    const ok = await updateVerifyProcess(row.id, STATUS, false);
    if (ok) {
      successCount += 1;
    }
  }

  if (successCount > 0) {
    ElMessage.success(`批量提交完成，共成功提交 ${successCount} 条记录`);
  }
}

async function updateVerifyProcess(id, isAudit, messageVisible = true) {
  try {
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: id,
      isAudit: isAudit,
    });
    if (resInfo && resInfo.message === 'successful') {
      if (messageVisible) {
        ElMessage.success('提交成功');
      }
      headerPageRef.value?.baseListRef?.initDataList(true);
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
      return false;
    }
  } catch (error) {
    console.error('更新审核状态失败:', error);
    return false;
  }
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>
