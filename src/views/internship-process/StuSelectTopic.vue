<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生选择题目'"
    :no-project-message="'当前没有可选择题目的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @view-click="handleViewClick"
    @edit-click="handleEditClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgTopicDetail
        ref="dlgTopicDetailRef"
        :current-internship="currentInternship"
        @close-dialog="handleTopicDetailClose"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTopicDetail from '@/views/internship-process/components/DlgTopicDetail.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';

defineOptions({
  name: 'StuSelectTopic',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});

const titleObj = reactive({
  mainTitle: '学生选择题目',
});

// 存储当前已选题目信息
const currentSelectedTopic = ref(null);

// 保存当前实习项目信息
const savedCurrentInternship = ref(null);

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 流程类型代码
const processTypeCode = CONSTANT.PROCESS_TYPE.INTERNAL_STUDENT_TEACHER_MATCH;

// 实习项目选择对话框的查询关键字
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

// 实习项目选择对话框的查询操作符
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

// 只查询审核通过的题目
function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey,
    isAudit: CONSTANT.AUDIT_STATUS.PASS,
  };
}

// 查询已选题目信息
async function querySelectedTopic(internshipId, studentId) {
  if (!internshipId || !studentId) return null;
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelTitleStudent',
      searchKey: {
        internshipId: internshipId,
        studentId: studentId,
      },
    });
    if (response && response.data) {
      const dataList = response.data.content || response.data || [];
      if (dataList.length > 0) return dataList[0];
    }
    return null;
  } catch (error) {
    console.error('查询已选题目失败:', error);
    return null;
  }
}

// 生成完整标题（包含已选题目信息）
async function generateFullTitle(baseTitle, internshipId, studentId) {
  if (!baseTitle) return baseTitle;
  let selectedTopicText = '无';

  if (currentSelectedTopic.value && currentSelectedTopic.value.name) {
    const teacherName = currentSelectedTopic.value.teacherName || '';
    const topicName = currentSelectedTopic.value.name || '';
    if (teacherName || topicName) {
      selectedTopicText = `${teacherName}：${topicName}`;
    }
  } else {
    const selectedTopic = await querySelectedTopic(internshipId, studentId);
    currentSelectedTopic.value = selectedTopic;
    if (selectedTopic) {
      const teacherName = selectedTopic.teacherName || '';
      const topicName = selectedTopic.name || '';
      if (teacherName || topicName) {
        selectedTopicText = `${teacherName}：${topicName}`;
      }
    }
  }

  return `${baseTitle}。已选题目：${selectedTopicText}`;
}

// 处理项目选择后的回调
async function handleProjectSelected(internship, title) {
  if (internship) savedCurrentInternship.value = internship;
  if (title) {
    if (!internship || (!internship.internshipId && !internship.id)) {
      titleObj.mainTitle = title;
      return;
    }
    const internshipId = internship.internshipId || internship.id;
    const studentId = userInfo.value?.id;
    const fullTitle = await generateFullTitle(title, internshipId, studentId);
    titleObj.mainTitle = fullTitle;
  }
}

// 查看按钮 - 只读查看题目详情
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  const relationId = row?.relationId ?? row?.relation_id ?? row?.id;
  const topicRow = { ...row, id: relationId };
  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, currentInternship.value, true);
}

// 执行选择题目操作
async function executeSelectTopic(studentId, oldTopicId, newTopicId, needConfirm = false, confirmMessage = '') {
  try {
    if (needConfirm) {
      await ElMessageBox.confirm(confirmMessage, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
    }
    const response = await otherAPI.stuSelTopic(studentId, oldTopicId, newTopicId);
    if (response && response.message === 'successful') {
      if (response.data) currentSelectedTopic.value = response.data;
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    if (error === 'cancel') return { success: false, cancelled: true };
    console.error('操作失败:', error);
    ElMessage.error('操作失败');
    return { success: false, cancelled: false };
  }
}

// 选定/取消按钮点击
async function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  const selectedTopic = currentSelectedTopic.value;
  const currentUserId = userInfo.value?.id;
  const studentId = userInfo.value?.id;
  const currentTopicId = Number(selectedRow.relationId || selectedRow.id) || 0;
  const selectedTopicId = selectedTopic ? (Number(selectedTopic.relationId || selectedTopic.id) || 0) : 0;
  let operationSuccess = false;

  // 判断0：已进入审核流程，不能修改
  if (selectedTopic) {
    const isAudit = selectedTopic.isAudit;
    if (isAudit === CONSTANT.AUDIT_STATUS.PASS || selectedTopic.createUserId !== currentUserId) {
      ElMessage.warning('题目选择已经进入审核流程，不能修改！');
      return;
    }
  }

  // 判断1：取消选择（已选题目和当前选中行一致）
  if (selectedTopic && selectedTopicId && currentTopicId && selectedTopicId === currentTopicId) {
    try {
      await ElMessageBox.confirm('确认取消该题目的选择吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
      const response = await otherAPI.stuSelTopic(studentId, selectedTopicId, 0);
      if (response && response.message === 'successful') {
        operationSuccess = true;
        currentSelectedTopic.value = null;
      }
    } catch (error) {
      return;
    }
  } else {
    // 判断2：已选题目存在，更换
    if (selectedTopic) {
      const result = await executeSelectTopic(
        studentId,
        selectedTopicId,
        currentTopicId,
        true,
        '你已经选择了题目，确定更换新的题目吗？'
      );
      if (result.cancelled) return;
      if (result.success) operationSuccess = true;
    } else {
      // 没有已选题目，直接选定
      const result = await executeSelectTopic(studentId, 0, currentTopicId, false);
      if (result.success) operationSuccess = true;
    }
  }

  // 统一刷新数据列表和标题
  if (operationSuccess) {
    ElMessage.success('操作成功');
    await headerPageRef.value?.baseListRef?.initDataList(true);
    const internshipToUse = savedCurrentInternship.value;
    if (internshipToUse) {
      const baseTitle = generateTitleWithDate(internshipToUse);
      await handleProjectSelected(internshipToUse, baseTitle);
    }
  } else {
    ElMessage.error('操作失败');
  }
}

function handleTopicDetailClose() {}

// 生成带日期的标题
function generateTitleWithDate(internship) {
  if (!internship) return '';
  const name = internship.internshipName || internship.name;
  if (!name) return '';
  const start = internship.startTime ? moment(internship.startTime).format('YYYY-MM-DD') : '';
  const end = internship.endTime ? moment(internship.endTime).format('YYYY-MM-DD') : '';
  if (start && end) {
    return `当前实习项目：${name}（${start}到${end}）`;
  }
  return `当前实习项目：${name}`;
}

// 更新标题
async function updateTitleWithSelectedTopic() {
  const internship = currentInternship.value;
  if (internship) {
    const baseTitle = generateTitleWithDate(internship);
    await handleProjectSelected(internship, baseTitle);
  }
}

watch(currentInternship, async () => {
  await updateTitleWithSelectedTopic();
}, { immediate: true });

// 按钮配置
const buttonPropsComputed = computed(() => ({
  visible: { show: true, type: 'primary', name: '查看' },
  update: { show: true, type: 'primary', name: '选定/取消' },
}));

// 判断行是否是已选题目
const getRowClassName = ({ row }) => {
  const selectedTopic = currentSelectedTopic.value;
  if (selectedTopic) {
    const selectedId = String(selectedTopic.relationId || selectedTopic.id || '');
    const rowId = String(row.relationId || row.id || '');
    if (selectedId && rowId && selectedId === rowId) {
      return 'selected-post-row';
    }
  }
  return '';
};

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: false,
  },
  enableAuditStatusCustom: true,
  rowClassName: getRowClassName,
  defaultDTHProps: {
    buttonProps: buttonPropsComputed.value,
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTitleTeacherMerge' },
    allTableColumns: [
      { id: 1, showName: '老师姓名', tableColumnName: 'teacherName', sortable: true },
      { id: 2, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 3, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  dlgTopicDetailRef,
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>

<style scoped>
:deep(.selected-post-row) {
  background-color: #e6f7ff !important;
  font-weight: bold !important;
}
:deep(.selected-post-row:hover) {
  background-color: #bae7ff !important;
}
:deep(.selected-post-row td) {
  font-weight: bold !important;
}
</style>
