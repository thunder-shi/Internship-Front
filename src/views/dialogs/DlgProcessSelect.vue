<template>
  <SimpleDialog
    ref="simpleDialogRef"
    :default-props="defaultProps"
    :simpledialog-confirm="confirm"
  />
</template>

<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue';
import SimpleDialog from '@/components/SimpleDialog.vue';

const props = defineProps({
  internshipTypeId: { type: Number, default: null } // 从父组件传入的 internshipTypeId
});

const emit = defineEmits(['update-record', 'close-dialog']);

const simpleDialogRef = ref(null);

const defaultProps = reactive({
  labelWidth: '100px',
  keyWord: ' ', // 不需要自动保存，设置为空字符串
  autoSaveClose: false, // 自定义保存逻辑，不自动关闭
  formItems: [
    { name: '流程模板', field: 'processTypeId', type: 'select', keyWords: 'BaseProcessType', placeholder: '请选择流程模板' },
    { name: '审核要求', field: 'verifyTypeId', type: 'select', keyWords: 'BaseVerifyType', placeholder: '请选择审核要求' },
    { name: '一审角色', field: 'verifyFirstRoleId', type: 'select', keyWords: 'SysRole', placeholder: '请选择审核角色' },
    { name: '二审角色', field: 'verifySecondeRoleId', type: 'select', keyWords: 'SysRole', placeholder: '请选择审核角色' },
    { name: '三审角色', field: 'verifyThirdRoleId', type: 'select', keyWords: 'SysRole', placeholder: '请选择审核角色' },
    { name: '四审角色', field: 'verifyFourthRoleId', type: 'select', keyWords: 'SysRole', placeholder: '请选择审核角色' },
    { name: '五审角色', field: 'verifyFifthRoleId', type: 'select', keyWords: 'SysRole', placeholder: '请选择审核角色' },
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

function showDialog(val, formData = {}) {
  // 根据是否有 id 来判断是新增还是编辑，更新标题
  const isEdit = formData && formData.id != null && formData.id !== 0;
  defaultProps.defaultDBProps.dlgTitle = isEdit ? '编辑流程' : '新增流程';
  simpleDialogRef.value?.showDialog(val, formData);
}

async function confirm(option, type, form) {
  // 将 internshipTypeId 添加到表单数据中
  const saveData = {
    ...form,
    internshipTypeId: props.internshipTypeId
  };
  // 触发更新事件，将完整的表单数据传递给父组件
  emit('update-record', saveData);
  // 关闭对话框
  if (type === 'stop') {
    simpleDialogRef.value?.showDialog(false, form);
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

