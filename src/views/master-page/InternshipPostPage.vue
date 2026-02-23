<template>
  <div class="internship-post-page-container">
    <BaseList 
      :default-props="defaultProps" 
      ref="baseListRef" 
      @more1-click="handleMore1Click" 
      @view-click="handleViewClick"
      @append-click="handleAppendClick"
      @edit-click="handleEditClick"
      @delete-click="handleDeleteClick"
      @audit-click="handleAuditClick"
    />
    <!-- 实习项目选择对话框 -->
    <SimpleDialog 
      ref="projectSelectDialog" 
      :default-props="projectSelectDialogProps" 
      :simpledialog-confirm="handleProjectSelectConfirm" 
      @simple-select-change="handleInternshipSelectChange" 
    />
    <!-- 岗位详情对话框（新增/编辑/审核） -->
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
  </div>
</template>

<script setup>
import { reactive, ref, computed, nextTick, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import _ from 'lodash';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import { formatDate } from '@/utils/common';

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

const baseListRef = ref(null);
const projectSelectDialog = ref(null);
const dlgPostDetail = ref(null);

// Vuex store
const store = useStore();

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// 当前选中的实习项目信息（深拷贝整个对象）
const currentInternship = ref(null);

// 是否禁用"实习项目选择"按钮
const isMore1Disabled = ref(false);

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

// 查询关键字（nowSearchWords）
const nowSearchWords = reactive({
  searchKey: {},
  regKey: {},
  andor: {}
});

// 处理 select_noremote 类型的选择变化
function handleSelectChange(item, val, form) {
  if (item.field === 'internshipId' && val) {
    // 从 options 中找到选中的项，深拷贝整个对象
    const selectedOption = item.options?.find(opt => opt.id === val);
    if (selectedOption) {
      currentInternship.value = _.cloneDeep(selectedOption);
    }
  }
}

// 实习项目选择对话框配置
const projectSelectDialogProps = reactive({
  keyWord: 'ProjectSelect',
  dlgTitle: '实习项目选择',
  handleSelectChange: handleSelectChange,
  formItems: [
    { 
      name: '实习项目', 
      field: 'internshipId', 
      type: 'select', 
      keyWords: 'ViewRelProcessInternship',
      changeLabel: 'internshipName',
      searchKeys: {
        processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_POST_DECLARATION
      }
    },
  ],
  formRules: {
    internshipId: [{ required: true, message: '请选择实习项目', trigger: 'change' }],
  },
  defaultDBProps: {
    footButtons: {
      repeatAdd: { show: false },
    },
  },
});

// 生成带日期的标题
function generateTitleWithDate(internship) {
  if (!internship) return '';
  const name = internship.internshipName || internship.name;
  if (!name) return '';
  const start = formatDate(internship.startTime);
  const end = formatDate(internship.endTime);
  if (start && end) {
    return `当前实习项目：${name}（${start}到${end}）`;
  }
  return `当前实习项目：${name}`;
}

// 更新查询条件并刷新列表
async function updateSearchWordsAndRefresh() {
  // 获取实习项目的 internshipId
  const internshipId = currentInternship.value?.internshipId;
  
  if (!internshipId) {
    console.warn('updateSearchWordsAndRefresh: 没有找到实习项目 ID', currentInternship.value);
    return;
  }

  // 构建基础查询条件
  const baseSearchKey = {
    internshipId: internshipId
  };

  // 如果是企业用户，添加 createUserId 条件
  if (props.isCompanyUser && userInfo.value?.id) {
    baseSearchKey.createUserId = userInfo.value.id;
  }

  // 使用传入的 buildSearchKey 函数构建最终查询条件
  const searchKey = props.buildSearchKey(baseSearchKey);

  // 更新 nowSearchWords（直接重新赋值整个对象，确保响应式更新）
  nowSearchWords.searchKey = { ...searchKey };
  
  // 等待响应式更新完成（多等待几个 tick，确保 computed 能检测到变化）
  await nextTick();
  await nextTick();
  
  // 刷新数据列表
  if (baseListRef.value) {
    try {
      await baseListRef.value.initDataList(true);
    } catch (error) {
      console.error('updateSearchWordsAndRefresh: initDataList 调用失败', error);
    }
  } else {
    console.warn('updateSearchWordsAndRefresh: baseListRef 尚未准备好');
    setTimeout(async () => {
      if (baseListRef.value) {
        try {
          await baseListRef.value.initDataList(true);
        } catch (error) {
          console.error('updateSearchWordsAndRefresh: 延迟重试后 initDataList 调用失败', error);
        }
      } else {
        console.error('updateSearchWordsAndRefresh: 延迟重试后 baseListRef 仍然未准备好');
      }
    }, 300);
  }
}

// 处理实习项目选择变化
function handleInternshipSelectChange(val, field, form, options) {
  if (field === 'internshipId' && options && options.length > 0) {
    const selectedOption = options[0];
    currentInternship.value = _.cloneDeep({
      ...selectedOption,
      internshipId: selectedOption.internshipId || selectedOption.id
    });
  }
}

// 处理实习项目选择对话框保存
async function handleProjectSelectConfirm(option, type, form) {
  // 获取选中的实习项目信息
  if (!currentInternship.value && form.internshipId) {
    const internshipItem = projectSelectDialogProps.formItems.find(item => item.field === 'internshipId');
    if (internshipItem && internshipItem.options) {
      const selectedOption = internshipItem.options.find(opt => opt.id === form.internshipId || opt.internshipId === form.internshipId);
      if (selectedOption) {
        currentInternship.value = _.cloneDeep({
          ...selectedOption,
          internshipId: selectedOption.internshipId || selectedOption.id,
          processId: selectedOption.processId || selectedOption.id
        });
      }
    }
  }
  
  // 只有在保存时才更新标题
  if (currentInternship.value) {
    const newTitle = generateTitleWithDate(currentInternship.value);
    titleObj.mainTitle = newTitle;
    await nextTick();
  }
  
  // 更新查询条件并刷新列表（等待刷新完成）
  await updateSearchWordsAndRefresh();
  
  // 返回 true 表示保存成功，允许关闭对话框
  return true;
}

// 处理新增按钮点击（转发给父组件）
function handleAppendClick() {
  emit('append-click', currentInternship.value);
}

// 处理修改按钮点击（转发给父组件）
function handleEditClick(row) {
  emit('edit-click', row, currentInternship.value);
}

// 处理删除按钮点击（转发给父组件）
function handleDeleteClick(rows) {
  emit('delete-click', rows);
}

// 处理审核按钮点击（转发给父组件）
function handleAuditClick(row) {
  emit('audit-click', row, currentInternship.value);
}

// 处理岗位详情对话框关闭
function handlePostDetailClose() {
  emit('post-detail-close');
}

// 处理岗位详情保存成功
function handlePostDetailSuccess() {
  emit('post-detail-success');
  // 刷新数据列表
  baseListRef.value?.initDataList(true);
}

// 查看进度按钮点击
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = {
    ...row,
  };
  showProgressDialog.value = true;
}

// 处理 more1 按钮点击事件（实习项目选择）
async function handleMore1Click(rows) {
  try {
    const processName = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_POST_DECLARATION;
    const response = await internshipProcessAPI.getNowInternship(processName);
    
    if (response && response.data) {
      const internshipList = response.data.content || response.data || [];
      
      const internshipItem = projectSelectDialogProps.formItems.find(item => item.field === 'internshipId');
      if (internshipItem) {
        internshipItem.type = 'select_noremote';
        internshipItem.options = internshipList.map(item => {
          const internshipId = item.internshipId;
          const processId = item.id;
          return {
            id: internshipId,
            internshipId: internshipId,
            processId: processId,
            name: item.internshipName || item.name,
            internshipName: item.internshipName || item.name,
            startTime: item.startTime,
            endTime: item.endTime
          };
        });
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
  }
  
  projectSelectDialog.value?.showDialog(true, {});
}

// 创建响应式的 title 对象
const titleObj = reactive({
  mainTitle: props.pageTitle
});

// 初始化时调用后端接口获取当前可申报的实习项目
async function initInternshipList() {
  try {
    const processName = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_POST_DECLARATION;
    const response = await internshipProcessAPI.getNowInternship(processName);
    
    if (response && response.data) {
      const internshipList = response.data.content || response.data || [];
      
      if (internshipList.length === 0) {
        titleObj.mainTitle = props.noProjectMessage;
        isMore1Disabled.value = true;
      } else if (internshipList.length === 1) {
        const item = internshipList[0];
        currentInternship.value = _.cloneDeep({
          ...item,
          internshipId: item.internshipId || item.id,
          processId: item.id
        });
        titleObj.mainTitle = generateTitleWithDate(currentInternship.value);
        isMore1Disabled.value = false;
        await nextTick();
        await nextTick();
        await updateSearchWordsAndRefresh();
      } else {
        titleObj.mainTitle = props.pendingSelectMessage;
        isMore1Disabled.value = false;
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
    titleObj.mainTitle = props.pageTitle;
  }
}

// 页面初始化时调用
onMounted(() => {
  initInternshipList();
});

// 暴露给父组件的方法和属性
defineExpose({
  baseListRef,
  dlgPostDetail,
  currentInternship,
  updateSearchWordsAndRefresh
});

const defaultProps = reactive({
  defaultDTLProps: {
    title: titleObj,
    someFlags: {
      autoInit: false,
    },
    nowSearchWords: nowSearchWords,
    clientFilterFn: props.clientFilterFn,
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: computed(() => props.buttonPropsFn(currentInternship.value, isMore1Disabled.value)),
      buttonCondition: props.buttonCondition,
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPost' },
      allTableColumns: [
        { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
        { id: 2, showName: '岗位编码', tableColumnName: 'postCode', sortable: true },
        { id: 3, showName: '岗位名称', tableColumnName: 'postName', sortable: true },
        { id: 4, showName: '岗位人数', tableColumnName: 'allPersonNum', sortable: true },
        { id: 5, showName: '创建人', tableColumnName: 'createUserName' },
        { id: 6, showName: '状态', tableColumnName: 'customize-status' }
      ],
    },
    defaultDBIProps: {},
  }
});
</script>
