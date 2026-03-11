<template>
  <div class="internship-post-header-page-container">
    <BaseList :default-props="mergedDefaultProps" ref="baseListRef" @more1-click="handleMore1Click"
      @view-click="handleViewClick" @append-click="handleAppendClick" @edit-click="handleEditClick"
      @delete-click="handleDeleteClick" @audit-click="handleAuditClick" @submit-click="handleSubmitClick" />
    <!-- 实习项目选择对话框 -->
    <SimpleDialog ref="projectSelectDialog" :default-props="projectSelectDialogProps"
      :simpledialog-confirm="handleProjectSelectConfirm" @simple-select-change="handleInternshipSelectChange" />
    <!-- 其他对话框插槽 -->
    <slot name="dialogs"></slot>
  </div>
</template>

<script setup>
import { reactive, ref, computed, nextTick, onMounted } from 'vue';
import _ from 'lodash';
import { useStore } from 'vuex';
import BaseList from '@/views/master-page/BaseList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import listAPI from '@/api/list';
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
  // BaseList 的默认配置（由子组件传入，包含按钮和列配置）
  defaultDTLProps: {
    type: Object,
    required: true
  },
  // 查询条件构建函数（用于添加额外的查询条件，如 isAudit）
  buildSearchKey: {
    type: Function,
    default: (baseSearchKey) => baseSearchKey
  },
  // 是否是企业用户（用于查询条件）
  isCompanyUser: {
    type: Boolean,
    default: false
  },
  // 实习项目选择对话框的查询关键字（用于 getSomeRecords）
  projectSelectSearchKey: {
    type: Object,
    default: () => ({})
  },
  // 实习项目选择对话框的查询操作符（用于 getSomeRecords）
  projectSelectRegKey: {
    type: Object,
    default: () => ({})
  },
  // 实习项目列表的视图关键字（用于 getSomeRecords，如 ViewRelProcessInternship / ViewTeacherSelectedInternship）
  projectListKeyWords: {
    type: String,
    default: 'ViewRelProcessInternship'
  }
});

const emit = defineEmits([
  'append-click',
  'edit-click',
  'delete-click',
  'audit-click',
  'post-detail-close',
  'post-detail-success',
  'project-selected',
  'submit-click',
]);

const baseListRef = ref(null);
const projectSelectDialog = ref(null);

// Vuex store
const store = useStore();

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

// 实习项目选择对话框配置（使用子组件传入的查询关键字与 projectListKeyWords）
const projectSelectDialogProps = reactive({
  keyWord: 'ProjectSelect',
  dlgTitle: '实习项目选择',
  handleSelectChange: handleSelectChange,
  formItems: [
    {
      name: '实习项目',
      field: 'internshipId',
      type: 'select',
      keyWords: props.projectListKeyWords,
      changeLabel: 'internshipName'
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
    // 通知子组件更新标题
    emit('project-selected', currentInternship.value, newTitle);
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

// 处理提交按钮点击（转发给父组件）
function handleSubmitClick(row) {
  emit('submit-click', row);
}

// 查看进度按钮点击（转发给父组件）
function handleViewClick(rowOrArray) {
  emit('view-click', rowOrArray);
}

// 处理 more1 按钮点击事件（实习项目选择）
async function handleMore1Click(rows) {
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: props.projectListKeyWords,
      searchKey: props.projectSelectSearchKey,
      reg: props.projectSelectRegKey
    });
    if (response && response.data) {
      const internshipList = response.data.content || response.data || [];
      const internshipItem = projectSelectDialogProps.formItems.find(item => item.field === 'internshipId');
      if (internshipItem) {
        internshipItem.type = 'select_noremote';
        internshipItem.options = internshipList.map(item => ({
          ...item,
          realId: item.id,
          id: item.internshipId || item.id,
          name: item.internshipName || item.name
        }));
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
  }
  projectSelectDialog.value?.showDialog(true, {});
}

// 初始化时调用后端接口获取当前可申报的实习项目
async function initInternshipList() {
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: props.projectListKeyWords,
      searchKey: props.projectSelectSearchKey,
      reg: props.projectSelectRegKey
    });

    if (response && response.data) {
      const internshipList = response.data.content || response.data || [];

      if (internshipList.length === 0) {
        emit('project-selected', null, props.noProjectMessage);
        isMore1Disabled.value = true;
      } else if (internshipList.length === 1) {
        const item = internshipList[0];
        currentInternship.value = _.cloneDeep({
          ...item,
          internshipId: item.internshipId || item.id,
          processId: item.id
        });
        const newTitle = generateTitleWithDate(currentInternship.value);
        emit('project-selected', currentInternship.value, newTitle);
        isMore1Disabled.value = false;
        await nextTick();
        await nextTick();
        await updateSearchWordsAndRefresh();
      } else {
        emit('project-selected', null, props.pendingSelectMessage);
        isMore1Disabled.value = false;
      }
    }
  } catch (error) {
    console.error('获取实习项目列表失败:', error);
    emit('project-selected', null, props.pageTitle);
  }
}

// 页面初始化时调用
onMounted(() => {
  initInternshipList();
});

// 合并 defaultDTLProps 和 nowSearchWords
const mergedDefaultProps = computed(() => {
  // props.defaultDTLProps 已经是解包后的值（因为它是 computed prop）
  const defaultDTLPropsValue = props.defaultDTLProps;

  return {
    defaultDTLProps: {
      ...defaultDTLPropsValue,
      nowSearchWords: nowSearchWords
    }
  };
});

// 暴露给子组件的方法和属性
defineExpose({
  baseListRef,
  currentInternship,
  updateSearchWordsAndRefresh,
  isMore1Disabled
});
</script>
