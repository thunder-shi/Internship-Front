<template>
  <div class="internship-post-verify-container">
    <BaseList :default-props="defaultProps" ref="baseListRef" @more1-click="handleMore1Click" @view-click="handleViewClick" @audit-click="handleAuditClick" />
    <!-- 实习项目选择对话框 -->
    <SimpleDialog ref="projectSelectDialog" :default-props="projectSelectDialogProps" :simpledialog-confirm="handleProjectSelectConfirm" @simple-select-change="handleInternshipSelectChange" />
    <!-- 审核对话框 -->
    <DlgInternshipVerify ref="dlgInternshipVerify" @update-record="handleUpdateRecord" />
    <!-- 岗位详情对话框（用于审核） -->
    <DlgPostDetail ref="dlgPostDetail" :current-internship="currentInternship" @close-dialog="handlePostDetailClose" @success="handlePostDetailSuccess" />
    <!-- 审核进度查看对话框 -->
    <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId" :process-info="currentRow" key-words="ViewVerifyProcessInternshipPost" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, nextTick, onMounted } from 'vue';
import _ from 'lodash';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import DlgInternshipVerify from '@/views/internship-process/components/DlgInternshipVerify.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import { formatDate } from '@/utils/common';

defineOptions({
  name: 'InternshipPostVerify',
});

const baseListRef = ref(null);
const projectSelectDialog = ref(null);
const dlgInternshipVerify = ref(null);
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

// 精确检查 verifyUserId 是否包含指定的用户ID
// verifyUserId 格式是 "Id1|Id2|Id3..."，需要精确匹配，避免误匹配
// 例如：ID=3 不应该匹配 "|33|"
const isUserIdInVerifyUserId = (verifyUserId, userId) => {
  if (!verifyUserId || !userId) return false;
  const userIdStr = String(userId);
  const verifyUserIdStr = String(verifyUserId);

  // 将 verifyUserId 按 | 分割，检查是否包含精确的用户ID
  const ids = verifyUserIdStr.split('|').filter(id => id !== '');
  return ids.includes(userIdStr);
};

// 客户端过滤函数：精确过滤 verifyUserId 包含当前用户ID 的记录
const clientFilterFn = (dataList) => {
  const userId = userInfo.value?.id;

  if (!userId || !dataList || !Array.isArray(dataList)) {
    return dataList;
  }

  // 精确过滤：只保留 verifyUserId 中精确包含当前用户ID 的记录
  // 这样可以避免误匹配（如 ID=3 不会匹配 "|33|"）
  return dataList.filter(item => {
    if (!item || !item.verifyUserId) return false;
    return isUserIdInVerifyUserId(item.verifyUserId, userId);
  });
};

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
  handleSelectChange: handleSelectChange, // 添加处理函数
  formItems: [
    { 
      name: '实习项目', 
      field: 'internshipId', 
      type: 'select', 
      keyWords: 'ViewRelProcessInternship',
      changeLabel: 'internshipName', // 显示实习项目名称字段
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
      repeatAdd: { show: false }, // 隐藏"继续添加"按钮
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

  // 构建查询条件
  const searchKey = {
    internshipId: internshipId,
    isAudit: CONSTANT.AUDIT_STATUS.SUBMIT // 只查询"待审核"状态的记录（默认使用 EQ 操作符）
  };

  // 注意：verifyUserId 字段不在这里查询，因为 LIKE 查询会有误匹配问题（如 ID=3 会匹配 "|33|"）
  // verifyUserId 的精确过滤将在 clientFilterFn 中进行

  // 更新 nowSearchWords（先清空再设置，确保响应式更新）
  // 清空旧的查询条件
  Object.keys(nowSearchWords.searchKey).forEach(key => {
    delete nowSearchWords.searchKey[key];
  });
  // 设置新的查询条件
  Object.assign(nowSearchWords.searchKey, searchKey);

  // 刷新数据列表（确保响应式更新完成后再调用）
  // 使用 setTimeout 延迟，确保 DataTableList 能够检测到 nowSearchWords 的变化
  await nextTick();
  await nextTick(); // 再等待一个 tick，确保响应式更新完成
  
  setTimeout(() => {
      if (baseListRef.value) {
        try {
          baseListRef.value.initDataList(true); // 传递 true 表示手动刷新
        } catch (error) {
          console.error('updateSearchWordsAndRefresh: initDataList 调用失败', error);
        }
      } else {
        console.warn('updateSearchWordsAndRefresh: baseListRef 尚未准备好，尝试延迟重试');
        // 如果 baseListRef 还没准备好，再延迟重试
        setTimeout(() => {
          if (baseListRef.value) {
            baseListRef.value.initDataList(true); // 传递 true 表示手动刷新
          } else {
            console.error('updateSearchWordsAndRefresh: 延迟重试后 baseListRef 仍然未准备好');
          }
        }, 500);
      }
  }, 200); // 增加延迟时间到 200ms
}

// 处理实习项目选择变化
// 注意：SimpleDialog 传递的参数是 (val, field, form, options)
// 这里只保存选中的值，不更新 title（title 只在保存时更新）
function handleInternshipSelectChange(val, field, form, options) {
  if (field === 'internshipId' && options && options.length > 0) {
    // 深拷贝整个对象
    currentInternship.value = _.cloneDeep(options[0]);
  }
}

// 处理实习项目选择对话框保存
async function handleProjectSelectConfirm(option, type, form) {
  // 获取选中的实习项目信息
  // 优先使用 handleSelectChange 或 handleInternshipSelectChange 中已经保存的值
  if (!currentInternship.value && form.internshipId) {
    // 如果还没有值，尝试从选项列表中获取项目信息
    const internshipItem = projectSelectDialogProps.formItems.find(item => item.field === 'internshipId');
    if (internshipItem && internshipItem.options) {
      const selectedOption = internshipItem.options.find(opt => opt.id === form.internshipId);
      if (selectedOption) {
        // 深拷贝整个对象
        currentInternship.value = _.cloneDeep(selectedOption);
      }
    }
  }
  
  // 只有在保存时才更新标题
  if (currentInternship.value) {
    const newTitle = generateTitleWithDate(currentInternship.value);
    titleObj.mainTitle = newTitle;
    await nextTick();
  }
  
  // 更新查询条件并刷新列表
  updateSearchWordsAndRefresh();
  
  // 返回 true 表示保存成功，允许关闭对话框
  return true;
}

// 查看进度按钮点击
// 注意：DataTableList 的内置 view 按钮通过 view([scope.row]) 传入数组，需要解包
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = {
    ...row,
    // 这里可以根据需要添加其他字段
  };
  showProgressDialog.value = true;
}

// 处理审核按钮点击事件
const handleAuditClick = (row) => {
  // row 可能是数组（多选）或单个对象（单选）
  // 取第一个选中的项目进行审核
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (selectedRow && currentInternship.value) {
    // 打开 DlgPostDetail 对话框，传入审核模式标志
    dlgPostDetail.value?.showDialog(true, {}, selectedRow, true);
  }
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseListRef.value?.initDataList();
};

// 处理岗位详情对话框关闭
const handlePostDetailClose = () => {
  // 对话框关闭时的处理
};

// 处理岗位详情对话框成功事件
const handlePostDetailSuccess = () => {
  // 审核成功后刷新列表
  baseListRef.value?.initDataList();
};

// 处理 more1 按钮点击事件（实习项目选择）
async function handleMore1Click(rows) {
  // 打开对话框前，先调用 getNowInternship 接口获取数据
  try {
    const processName = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_POST_DECLARATION;
    const response = await internshipProcessAPI.getNowInternship(processName);
    
    if (response && response.data) {
      const internshipList = response.data.content || response.data || [];
      
      // 将数据设置为选择框的 options
      const internshipItem = projectSelectDialogProps.formItems.find(item => item.field === 'internshipId');
      if (internshipItem) {
        // 使用 select_noremote 类型，手动设置 options
        internshipItem.type = 'select_noremote';
        internshipItem.options = internshipList.map(item => ({
          id: item.id || item.internshipId,
          name: item.internshipName || item.name,
          startTime: item.startTime,
          endTime: item.endTime
        }));
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
  }
  
  // 打开项目选择对话框
  projectSelectDialog.value?.showDialog(true, {});
}

// 创建响应式的 title 对象
// 注意：初始值不能为空字符串，否则 hasCardTitle 会返回 false，导致 header 不显示
const titleObj = reactive({
  mainTitle: '企业岗位审核'
});

// 初始化时调用后端接口获取当前可申报的实习项目
async function initInternshipList() {
  try {
    const processName = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_POST_DECLARATION;
    const response = await internshipProcessAPI.getNowInternship(processName);
    
    if (response && response.data) {
      const internshipList = response.data.content || response.data || [];
      
      if (internshipList.length === 0) {
        // 返回0条：显示提示信息，禁用按钮
        titleObj.mainTitle = '当前没有可审核岗位的实习项目';
        isMore1Disabled.value = true;
      } else if (internshipList.length === 1) {
        // 返回1条：直接选中，深拷贝整个对象
        currentInternship.value = _.cloneDeep(internshipList[0]);
        titleObj.mainTitle = generateTitleWithDate(currentInternship.value);
        isMore1Disabled.value = false; // 确保按钮启用
        // 等待 DOM 更新和 baseListRef 准备就绪
        await nextTick();
        // 再等待一个 tick，确保 BaseList 组件已经完全初始化
        await nextTick();
        await updateSearchWordsAndRefresh();
      } else {
        // 返回多条：显示待选择
        titleObj.mainTitle = '当前实习项目：待选择';
        isMore1Disabled.value = false; // 确保按钮启用
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
    titleObj.mainTitle = '企业岗位审核';
  }
}

// 页面初始化时调用
onMounted(() => {
  initInternshipList();
});

const defaultProps = reactive({
  defaultDTLProps: {
    title: titleObj,
    someFlags: {
      autoInit: false, // 初始时不自动加载数据
    },
    nowSearchWords: nowSearchWords, // 动态查询关键字
    // 客户端过滤函数：精确过滤 verifyUserId 包含当前用户ID 的记录
    clientFilterFn: clientFilterFn,
    // 启用审核状态自定义显示
    enableAuditStatusCustom: true,
    defaultDTHProps: {
      buttonProps: computed(() => ({
        audit: { show: true, showPass: true, showNotPass: true, showBack: true },
        visible: { show: true, type: 'primary', name: '查看进度' }, // 添加查看进度按钮
        more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value }
      })),
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
