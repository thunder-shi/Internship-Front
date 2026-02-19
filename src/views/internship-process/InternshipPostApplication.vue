<template>
  <BaseList :default-props="defaultProps" ref="baseListRef" @more1-click="handleMore1Click" @append-click="handleAppendClick" />
  <!-- 实习项目选择对话框 -->
  <SimpleDialog ref="projectSelectDialog" :default-props="projectSelectDialogProps" :simpledialog-confirm="handleProjectSelectConfirm" @simple-select-change="handleInternshipSelectChange" />
  <!-- 新增岗位对话框 -->
  <DlgNewPost ref="dlgNewPost" :current-internship="currentInternship" @close-dialog="handleNewPostClose" @success="handleNewPostSuccess" />
</template>

<script setup>
import { reactive, ref, computed, nextTick, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import _ from 'lodash';
import BaseList from '@/views/master-page/BaseList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import DlgNewPost from './components/DlgNewPost.vue';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import { formatDate } from '@/utils/common';

defineOptions({
  name: 'InternshipPostApplication',
});

const baseListRef = ref(null);
const projectSelectDialog = ref(null);
const dlgNewPost = ref(null);

// 当前选中的实习项目信息（深拷贝整个对象）
const currentInternship = ref(null);

// 是否禁用"实习项目选择"按钮
const isMore1Disabled = ref(false);

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
  
  // 保存成功后，加载数据列表
  if (currentInternship.value?.id) {
    await nextTick();
    baseListRef.value?.initDataList();
  }
  
  // 返回 true 表示保存成功，允许关闭对话框
  return true;
}

// 处理新增按钮点击
function handleAppendClick() {
  if (!currentInternship.value || !currentInternship.value.id) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgNewPost.value?.showDialog(true, {});
}

// 处理新增岗位对话框关闭
function handleNewPostClose() {
  // 可以在这里处理关闭后的逻辑
}

// 处理新增岗位成功
function handleNewPostSuccess() {
  // 刷新数据列表
  baseListRef.value?.initDataList();
}

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
  mainTitle: '企业岗位申报'
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
        titleObj.mainTitle = '当前没有可申报岗位的实习项目';
        isMore1Disabled.value = true;
      } else if (internshipList.length === 1) {
        // 返回1条：直接选中，深拷贝整个对象
        currentInternship.value = _.cloneDeep(internshipList[0]);
        titleObj.mainTitle = generateTitleWithDate(currentInternship.value);
        isMore1Disabled.value = false; // 确保按钮启用
        // 加载数据列表
        await nextTick();
        baseListRef.value?.initDataList();
      } else {
        // 返回多条：显示待选择
        titleObj.mainTitle = '当前实习项目：待选择';
        isMore1Disabled.value = false; // 确保按钮启用
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
    titleObj.mainTitle = '企业岗位申报';
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
    defaultDTHProps: {
      buttonProps: computed(() => ({
        update: { show: true },
        create: { show: true, disabled: !currentInternship.value || !currentInternship.value.id },
        delete: { show: true },
        more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value }
      })),
      keyWord: { edit: 'MainInternshipPost', view: 'ViewMainInternshipPost' },
      allTableColumns: [
        { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
        { id: 2, showName: '岗位类型', tableColumnName: 'companyName', sortable: true },
        { id: 3, showName: '岗位人数', tableColumnName: 'personNum', sortable: true },
        { id: 4, showName: '申报状态', tableColumnName: 'status', sortable: true },
        { id: 5, showName: '申报时间', tableColumnName: 'applicationTime', sortable: true },
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'InternshipPostApplication',
    dlgTitle: '实习项目选择',
    formItems: [
      { name: '岗位名称', field: 'postName', type: 'input' },
      { name: '企业名称', field: 'companyId', type: 'select', keyWords: 'BaseDepartment', searchKeys: { typeId: 1 } },
      { name: '岗位人数', field: 'personNum', type: 'input' },
      { name: '岗位描述', field: 'description', type: 'textarea' },
      { name: '备注', field: 'remarks', type: 'textarea' },
    ],
    formRules: {
      postName: [{ required: true, message: '岗位名称不能为空', trigger: 'blur' }],
      companyId: [{ required: true, message: '企业名称不能为空', trigger: 'blur' }],
      personNum: [{ required: true, message: '岗位人数不能为空', trigger: 'blur' }],
    },
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'InternshipPostApplication',
  },
});
</script>
