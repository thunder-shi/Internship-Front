<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'教师分配'"
    :no-project-message="'当前没有可分配教师的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @view-click="handleViewClick"
    @edit-click="handleEditClick"
    @project-selected="handleProjectSelected"
  >
    <!-- 对话框插槽 -->
    <template #dialogs>
      <!-- 可以在这里添加其他对话框组件 -->
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'TeacherAssignment',
});

const store = useStore();
const headerPageRef = ref(null);

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

// 创建响应式的 title 对象
const titleObj = reactive({
  mainTitle: '教师分配'
});

// 保存当前实习项目信息（避免在操作过程中值丢失）
const savedCurrentInternship = ref(null);

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 获取 isMore1Disabled（从 headerPageRef）
const isMore1Disabled = computed(() => {
  return headerPageRef.value?.isMore1Disabled?.value || false;
});

// 流程类型代码（用于获取实习项目列表）
const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELECT_POST;

// 实习项目选择对话框的查询关键字（用于 getSomeRecords，包含时间条件）
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: processTypeCode,
    startTime: currentTime,
    endTime: currentTime
  };
  return searchKey;
});

// 实习项目选择对话框的查询操作符（用于 getSomeRecords）
const projectSelectRegKey = computed(() => {
  return {
    startTime: CONSTANT.SEARCH_OPERATOR.LE, // startTime <= 当前时间
    endTime: CONSTANT.SEARCH_OPERATOR.GE    // endTime >= 当前时间
  };
});

// 构建查询条件
function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey
  };
}

// 处理项目选择后的回调
async function handleProjectSelected(internship, title) {
  // 保存实习项目信息
  if (internship) {
    savedCurrentInternship.value = internship;
  }
  
  if (title) {
    titleObj.mainTitle = title;
  }
}

// 查看按钮点击
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  // TODO: 实现查看功能
  ElMessage.info('查看功能待实现');
}

// 编辑按钮点击
function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  // TODO: 实现编辑功能
  ElMessage.info('编辑功能待实现');
}

// 生成带日期的标题（辅助函数）
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
async function updateTitleWithSelectedPost() {
  const internship = currentInternship.value;
  if (internship) {
    const baseTitle = generateTitleWithDate(internship);
    await handleProjectSelected(internship, baseTitle);
  }
}

// 监听当前实习项目变化，更新标题
watch(currentInternship, async () => {
  await updateTitleWithSelectedPost();
}, { immediate: true });

// 构建 defaultDTLProps（包含按钮和列配置）
const buttonPropsComputed = computed(() => {
  return {
    visible: { show: true, type: 'primary', name: '查看' },
    update: { show: true, type: 'primary', name: '分配' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value }
  };
});

const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: {
      autoInit: false,
      checkFlag: false, // 设置为单选模式
    },
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPost' },
      allTableColumns: [
        { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
        { id: 2, showName: '岗位编码', tableColumnName: 'internshipPostCode', sortable: true },
        { id: 3, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
        { id: 4, showName: '岗位总人数', tableColumnName: 'allPersonNum', sortable: true },
        { id: 5, showName: '已选人数', tableColumnName: 'nowPersonNum' }
      ],
    },
    defaultDBIProps: {},
  };
});

// 暴露给父组件的方法和属性
defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh()
});
</script>

<style scoped>
</style>
