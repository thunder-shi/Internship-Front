<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生岗位申请'"
    :no-project-message="'当前没有可申请岗位的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <!-- 岗位详情对话框（查看） -->
    <template #dialogs>
      <DlgPostDetail 
        ref="dlgPostDetail" 
        :current-internship="currentInternship" 
        @close-dialog="handlePostDetailClose" 
        @success="handlePostDetailSuccess" 
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'StuApplyPost',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgPostDetail = ref(null);

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

// 创建响应式的 title 对象
const titleObj = reactive({
  mainTitle: '学生岗位申请'
});

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
    endTime: CONSTANT.SEARCH_OPERATOR.GE    // endTime >= 当前时间
  };
  // 如果用户有专业ID，添加专业过滤操作符
  if (userInfo.value?.majorId) {
    regKey.majorIds = CONSTANT.SEARCH_OPERATOR.IN;
  }
  return regKey;
});

// 按钮配置函数（包含"查看"和"实习项目选择"按钮）
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    visible: { show: true, type: 'primary', name: '查看' },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled }
  };
}

// 构建查询条件（只查询"审核通过"的岗位）
function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey,
    isAudit: CONSTANT.AUDIT_STATUS.PASS // 只查询"审核通过"状态的记录
  };
}

// 处理项目选择后的回调
function handleProjectSelected(internship, title) {
  if (title) {
    titleObj.mainTitle = title;
  }
}

// 查看按钮点击（显示岗位详情，只读模式）
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  dlgPostDetail.value?.showDialog(true, {}, row);
}

// 处理岗位详情对话框关闭
function handlePostDetailClose() {
  // 可以在这里处理关闭后的逻辑
}

// 处理岗位详情保存成功
function handlePostDetailSuccess() {
  // 刷新数据列表
  headerPageRef.value?.baseListRef?.initDataList(true);
}

// 构建 defaultDTLProps（包含按钮和列配置）
const buttonPropsComputed = computed(() => {
  return getButtonProps(currentInternship.value, isMore1Disabled.value);
});

const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: {
      autoInit: false,
    },
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPost' },
      allTableColumns: [
        { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
        { id: 2, showName: '岗位编码', tableColumnName: 'postCode', sortable: true },
        { id: 3, showName: '岗位名称', tableColumnName: 'postName', sortable: true },
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
  dlgPostDetail,
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh()
});
</script>
