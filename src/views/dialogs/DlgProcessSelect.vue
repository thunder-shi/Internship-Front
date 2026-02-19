<template>
  <SimpleDialog ref="simpleDialogRef" :default-props="defaultProps" :simpledialog-confirm="confirm" @simple-select-change="onSimpleSelectChange" />
</template>

<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import SimpleDialog from '@/components/SimpleDialog.vue';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import moment from 'moment';
import constant from '@/utils/constant';

const props = defineProps({
  internshipTypeId: { type: Number, default: null }, // 从父组件传入的 internshipTypeId（模板用）
  internshipId: { type: Number, default: null } // 从父组件传入的 internshipId（实习项目用）
});

// 存储整行数据（ViewRelProcessInternship 或 ViewRelProcessInternshipType）
const fullRowData = ref(null);

const store = useStore();
const emit = defineEmits(['update-record', 'close-dialog']);

const simpleDialogRef = ref(null);

// 标记是否正在初始化（编辑模式打开时不清空已有值）
let isInitializing = false;

// 审核角色字段配置
const verifyRoleFields = [
  { field: 'verifyFirstRoleId', name: '一审角色', level: 2 },
  { field: 'verifySecondRoleId', name: '二审角色', level: 3 },
  { field: 'verifyThirdRoleId', name: '三审角色', level: 4 },
  { field: 'verifyFourthRoleId', name: '四审角色', level: 5 },
  { field: 'verifyFifthRoleId', name: '五审角色', level: 6 }
];

// 判断是否为实习项目模式（有 internshipId 时为实习项目，否则为模板）
const isInternshipMode = () => props.internshipId != null;

// 审核角色字段的公共配置
const verifyRoleCommonConfig = { type: 'select', keyWords: 'SysRole', placeholder: '请选择审核角色', hidden: true, autoSelect: false, searchKeys: { name: '超级管理员,--,学生' }, regKey: { name: '!()' } };

const defaultProps = reactive({
  labelWidth: '110px',
  keyWord: ' ', // 动态设置，不自动保存
  autoSaveClose: false, // 自定义保存逻辑，不自动关闭
  formItems: [
    { name: '流程模板', field: 'processTypeId', type: 'select', keyWords: 'BaseProcessType', placeholder: '请选择流程模板' },
    { name: '审核要求', field: 'verifyTypeId', type: 'select', keyWords: 'BaseVerifyType', placeholder: '请选择审核要求' },
    { name: '流程开始时间', field: 'startTime', type: 'datetime', hidden: true },
    { name: '流程结束时间', field: 'endTime', type: 'datetime', hidden: true },
    { name: '一审角色', field: 'verifyFirstRoleId', ...verifyRoleCommonConfig },
    { name: '二审角色', field: 'verifySecondRoleId', ...verifyRoleCommonConfig },
    { name: '三审角色', field: 'verifyThirdRoleId', ...verifyRoleCommonConfig },
    { name: '四审角色', field: 'verifyFourthRoleId', ...verifyRoleCommonConfig },
    { name: '五审角色', field: 'verifyFifthRoleId', ...verifyRoleCommonConfig },
  ],
  formRules: {
    processTypeId: [{ required: true, message: '请选择流程模板', trigger: 'change' }],
    verifyTypeId: [{ required: true, message: '请选择审核要求', trigger: 'change' }]
  },
  defaultDBProps: {
    width: '40%',
    dlgTitle: '新增流程', // 默认标题，会在 showDialog 中动态更新
    footButtons: {
      cancel: { show: true, name: '取 消', type: '' },
      confirm: { show: true, name: '保 存', type: 'primary' }
    }
  }
});

// 更新时间字段的显示状态和验证规则（仅在实习项目模式下显示）
function updateTimeFields(show) {
  const startTimeItem = defaultProps.formItems.find(item => item.field === 'startTime');
  const endTimeItem = defaultProps.formItems.find(item => item.field === 'endTime');

  if (startTimeItem) startTimeItem.hidden = !show;
  if (endTimeItem) endTimeItem.hidden = !show;

  if (show) {
    defaultProps.formRules.startTime = [{ required: true, message: '请选择流程开始时间', trigger: 'change' }];
    defaultProps.formRules.endTime = [{ required: true, message: '请选择流程结束时间', trigger: 'change' }];
  } else {
    delete defaultProps.formRules.startTime;
    delete defaultProps.formRules.endTime;
  }
}

// 验证流程时间（仅在实习项目模式下验证）
function validateProcessTime(form) {
  if (!isInternshipMode()) return true;

  const processStart = form.startTime ? new Date(form.startTime) : null;
  const processEnd = form.endTime ? new Date(form.endTime) : null;

  if (!processStart || !processEnd) {
    ElMessage.warning('请选择流程开始和结束时间');
    return false;
  }

  if (processStart > processEnd) {
    ElMessage.warning('流程开始时间不能晚于流程结束时间');
    return false;
  }

  return true;
}

// 根据 verifyTypeId 更新审核角色字段的显示和验证规则
// clearValues: 是否清空显示字段的值（用户主动修改时清空，初始化时保留）
function updateVerifyRoleFields(verifyTypeId, form, clearValues = true) {
  verifyRoleFields.forEach((roleConfig) => {
    const formItem = defaultProps.formItems.find(item => item.field === roleConfig.field);
    if (formItem) {
      // verifyTypeId >= level 时显示该审核角色
      const shouldShow = verifyTypeId >= roleConfig.level;
      formItem.hidden = !shouldShow;

      if (shouldShow) {
        // 显示时添加必填验证
        defaultProps.formRules[roleConfig.field] = [
          { required: true, message: `请选择${roleConfig.name}`, trigger: 'change' }
        ];
        // 只有 clearValues 为 true 时才清空值（用户主动修改审核要求时）
        if (form && clearValues) {
          form[roleConfig.field] = null;
        }
      } else {
        // 隐藏时移除验证规则，并清空字段值
        delete defaultProps.formRules[roleConfig.field];
        if (form) {
          form[roleConfig.field] = null;
        }
      }
    }
  });
}

// 监听下拉框变化
function onSimpleSelectChange(val, field, form) {
  if (field === 'verifyTypeId') {
    // 初始化时不清空已有值，用户主动修改时才清空
    updateVerifyRoleFields(val, form, !isInitializing);
  }
}

function showDialog(val, formData = {}, rowData = null) {
  // 保存整行数据
  fullRowData.value = rowData || formData;
  // 根据是否有 id 来判断是新增还是编辑，更新标题
  const isEdit = formData && formData.id != null && formData.id !== 0;
  defaultProps.defaultDBProps.dlgTitle = isEdit ? '编辑流程' : '新增流程';
  // 根据模式设置 keyWord：实习项目用 RelProcessInternship，模板用 RelProcessInternshipType
  defaultProps.keyWord = isInternshipMode() ? 'RelProcessInternship' : 'RelProcessInternshipType';
  // 更新时间字段的显示状态（仅在实习项目模式下显示）
  updateTimeFields(isInternshipMode());
  // 如果是编辑模式，根据已有的 verifyTypeId 初始化审核角色显示状态
  if (isEdit && formData.verifyTypeId) {
    // 编辑模式：设置初始化标记，防止 SimpleSelect 初始化时清空已有值
    isInitializing = true;
    updateVerifyRoleFields(formData.verifyTypeId, null, false);
  } else {
    // 新增模式，默认隐藏所有审核角色
    isInitializing = false;
    updateVerifyRoleFields(1, formData);
  }

  // 实习项目模式下，将 startTime/endTime 从 UTC 转为北京时间（UTC+8）以便表单正确显示
  if (isInternshipMode() && formData) {
    if (formData.startTime) {
      formData.startTime = moment.utc(formData.startTime).utcOffset(8).format('YYYY-MM-DD HH:mm:ss');
    }
    if (formData.endTime) {
      formData.endTime = moment.utc(formData.endTime).utcOffset(8).format('YYYY-MM-DD HH:mm:ss');
    }
  }

  simpleDialogRef.value?.showDialog(val, formData);
  // 延迟重置初始化标记，确保 SimpleSelect 初始化完成后用户修改能正常清空值
  if (isEdit) {
    setTimeout(() => { isInitializing = false; }, 500);
  }
}

async function confirm(option, type, form) {
  // 先进行表单验证
  const formPanelRef = simpleDialogRef.value?.formPanelRef;
  if (formPanelRef) {
    try {
      await formPanelRef.validate();
    } catch (error) {
      // 表单验证失败，不继续执行
      return;
    }
  }
  // 验证流程时间
  if (!validateProcessTime(form)) {
    return;
  }

  // 确保隐藏的字段值为 17
  verifyRoleFields.forEach((roleConfig) => {
    const formItem = defaultProps.formItems.find(item => item.field === roleConfig.field);
    if (formItem && formItem.hidden) {
      form[roleConfig.field] = 17;
    }
  });
  // 将 internshipTypeId 或 internshipId 添加到表单数据中
  const saveData = {
    ...form,
    internshipTypeId: props.internshipTypeId,
    internshipId: props.internshipId
  };

  // 将隐藏的审核角色字段从提交数据中移除（不传参）
  verifyRoleFields.forEach((roleConfig) => {
    const formItem = defaultProps.formItems.find(item => item.field === roleConfig.field);
    if (formItem && formItem.hidden) {
      delete saveData[roleConfig.field];
    }
  });

  // 实习项目模式下，将 startTime/endTime 从北京时间（UTC+8）转回 UTC 再保存
  if (form.startTime) {
    saveData.startTime = moment(form.startTime, 'YYYY-MM-DD HH:mm:ss').utcOffset('+08:00', true).utc().format('YYYY-MM-DD HH:mm:ss');
  }
  if (form.endTime) {
    saveData.endTime = moment(form.endTime, 'YYYY-MM-DD HH:mm:ss').utcOffset('+08:00', true).utc().format('YYYY-MM-DD HH:mm:ss');
  }
  // 根据模式确定要使用的 keyWord
  const keyWord = isInternshipMode() ? 'RelProcessInternship' : 'RelProcessInternshipType';

  try {
    // 直接调用 API 保存，等待保存完成后再关闭对话框
    const resInfo = await listAPI.editOneNode(keyWord, saveData);
    if (resInfo && resInfo.message === 'successful') {
      const isEdit = saveData.id != null && saveData.id !== 0;
      // 显示成功消息
      ElMessage.success(isEdit ? '修改成功！' : '新增成功！');
      // 激活时间范围内的流程（只有当前流程是"实习计划制定"且是实习项目模式时才执行）
      if (fullRowData.value?.processTypeCode === constant.PROCESS_TYPE.INTERNSHIP_PLAN_MAKE && keyWord === 'RelProcessInternship') {
        const activateParams = {
          processId: fullRowData.value?.id,
          relationId: saveData.internshipId,
          tableName: 'MainInternship',
          createUserId: store.getters.userInfo?.id
        };
        
        // 先查询 MainVerifyProcess 表，检查是否存在相同记录
        try {
          const queryRes = await listAPI.getSomeRecords({
            keyWords: 'MainVerifyProcess',
            searchKey: {
              processId: activateParams.processId,
              relationId: activateParams.relationId,
              tableName: activateParams.tableName
            }
          });
          // 获取查询结果
          const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
          // 如果不存在记录，才执行激活流程
          if (existingRecords.length == 0) {
            await internshipProcessAPI.activateProcess(activateParams);
          }
        } catch (error) {
          console.error('查询 MainVerifyProcess 失败:', error);
          // 查询失败时可以选择是否继续执行，这里选择不执行激活流程
        }
      }
      // 保存成功后，触发更新事件，让父组件刷新列表
      emit('update-record', saveData);
      // 关闭对话框
      if (type === 'stop') {
        simpleDialogRef.value?.showDialog(false, form);
      }
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('保存流程数据失败:', error);
  }
}

// 组件销毁前关闭对话框，防止遮罩层残留
onBeforeUnmount(() => {
  simpleDialogRef.value?.showDialog?.(false, {});
});

defineExpose({
  showDialog
});
</script>

