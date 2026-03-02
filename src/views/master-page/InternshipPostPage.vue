<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="pageTitle"
    :no-project-message="noProjectMessage"
    :pending-select-message="pendingSelectMessage"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    @append-click="handleAppendClick"
    @edit-click="handleEditClick"
    @delete-click="handleDeleteClick"
    @audit-click="handleAuditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <!-- 岗位详情对话框（新增/编辑/审核） -->
    <template #dialogs>
      <DlgPostDetail 
        ref="dlgPostDetail" 
        :current-internship="currentInternship" 
        @close-dialog="handlePostDetailClose" 
        @success="handlePostDetailSuccess" 
      />
      <!-- 审核进度查看对话框 -->
      <DlgVerifyProgress 
        v-model="showProgressDialog" 
        :main-internship-id="currentRow.internshipId" 
        :process-info="currentRow" 
        key-words="ViewVerifyProcessInternshipPost" 
      />
      <!-- 审核对话框（仅审核页面使用） -->
      <slot name="audit-dialog"></slot>
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';

const props = defineProps({
  // 页面标题
  pageTitle: {
    type: String,
    required: true
  },
  // 无项目时的提示信息
  noProjectMessage: {
    type: String,
    required: true
  },
  // 待选择时的提示信息
  pendingSelectMessage: {
    type: String,
    default: '当前实习项目：待选择'
  },
  // 按钮配置（computed 函数）
  buttonPropsFn: {
    type: Function,
    required: true
  },
  // 按钮条件配置
  buttonCondition: {
    type: Object,
    default: () => ({})
  },
  // 查询条件构建函数（用于添加额外的查询条件，如 isAudit）
  buildSearchKey: {
    type: Function,
    default: (baseSearchKey) => baseSearchKey
  },
  // 客户端过滤函数
  clientFilterFn: {
    type: Function,
    default: null
  },
  // 是否是企业用户（用于查询条件）
  isCompanyUser: {
    type: Boolean,
    default: false
  },
  // 流程类型代码（用于获取实习项目列表）
  processTypeCode: {
    type: String,
    default: () => CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_POST_DECLARATION
  },
  // 表格列配置
  tableColumns: {
    type: Array,
    default: () => [
      { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
      { id: 2, showName: '岗位编码', tableColumnName: 'internshipPostCode', sortable: true },
      { id: 3, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
      { id: 4, showName: '岗位人数', tableColumnName: 'allPersonNum', sortable: true },
      { id: 5, showName: '创建人', tableColumnName: 'createUserName' },
      { id: 6, showName: '状态', tableColumnName: 'customize-status' }
    ]
  }
});

const emit = defineEmits([
  'append-click',
  'edit-click',
  'delete-click',
  'audit-click',
  'post-detail-close',
  'post-detail-success'
]);

const headerPageRef = ref(null);
const dlgPostDetail = ref(null);

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// 创建响应式的 title 对象
const titleObj = reactive({
  mainTitle: props.pageTitle
});

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 获取 isMore1Disabled（从 headerPageRef）
const isMore1Disabled = computed(() => {
  return headerPageRef.value?.isMore1Disabled?.value || false;
});

// 实习项目选择对话框的查询关键字（用于 getSomeRecords，包含时间条件）
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  return {
    processTypeCode: props.processTypeCode,
    startTime: currentTime,
    endTime: currentTime
  };
});

// 实习项目选择对话框的查询操作符（用于 getSomeRecords）
const projectSelectRegKey = computed(() => ({
  startTime: CONSTANT.SEARCH_OPERATOR.LE, // startTime <= 当前时间
  endTime: CONSTANT.SEARCH_OPERATOR.GE    // endTime >= 当前时间
}));

// 处理项目选择后的回调
function handleProjectSelected(internship, title) {
  if (title) {
    titleObj.mainTitle = title;
  }
}

// 处理新增按钮点击（转发给父组件）
function handleAppendClick(currentInternship) {
  emit('append-click', currentInternship);
}

// 处理修改按钮点击（转发给父组件）
function handleEditClick(row) {
  emit('edit-click', row);
}

// 处理删除按钮点击（转发给父组件）
function handleDeleteClick(rows) {
  emit('delete-click', rows);
}

// 处理审核按钮点击（转发给父组件）
function handleAuditClick(row) {
  emit('audit-click', row);
}

// 查看进度按钮点击
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = {
    ...row,
  };
  showProgressDialog.value = true;
}

// 处理岗位详情对话框关闭
function handlePostDetailClose() {
  emit('post-detail-close');
}

// 处理岗位详情保存成功
function handlePostDetailSuccess() {
  emit('post-detail-success');
  // 刷新数据列表
  headerPageRef.value?.baseListRef?.initDataList(true);
}

// 构建 defaultDTLProps（包含按钮和列配置）
// 注意：buttonProps 需要是响应式的，所以使用 computed 包装
const buttonPropsComputed = computed(() => {
  return props.buttonPropsFn(currentInternship.value, isMore1Disabled.value);
});

const defaultDTLProps = computed(() => {
  return {
    title: titleObj,
    someFlags: {
      autoInit: false,
    },
    clientFilterFn: props.clientFilterFn,
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: buttonPropsComputed.value,
      buttonCondition: props.buttonCondition,
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPost' },
      allTableColumns: props.tableColumns,
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
