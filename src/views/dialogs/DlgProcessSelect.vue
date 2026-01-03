<template>
  <SimpleDialog
    ref="simpleDialogRef"
    :default-props="defaultProps"
    :simpledialog-confirm="confirm"
    @update-record="handleUpdateRecord"
  />
</template>

<script setup>
import { ref, reactive } from 'vue';
import SimpleDialog from '@/components/SimpleDialog.vue';

const emit = defineEmits(['update-record', 'close-dialog']);

const simpleDialogRef = ref(null);

const defaultProps = reactive({
  labelWidth: '100px',
  keyWord: ' ', // 不需要自动保存，设置为空字符串
  autoSaveClose: false, // 自定义保存逻辑，不自动关闭
  formItems: [
    { name: '流程模板', field: 'processTypeId', type: 'select', keyWords: 'BaseProcessType', placeholder: '请选择流程模板' },
    { name: '审核要求', field: 'verifyTypeId', type: 'select', keyWords: 'BaseVerifyType', placeholder: '请选择审核要求' }
  ],
  formRules: {},
  defaultDBProps: {
    width: '40%',
    dlgTitle: '新增流程',
    footButtons: {
      cancel: { show: true, name: '取 消', type: '' },
      confirm: { show: true, name: '保 存', type: 'primary' }
    }
  }
});

function showDialog(val, formData = {}) {
  simpleDialogRef.value?.showDialog(val, formData);
}

async function confirm(option, type, form) {
  // 触发更新事件，将表单数据传递给父组件
  emit('update-record', form);
  // 关闭对话框
  if (type === 'stop') {
    simpleDialogRef.value?.showDialog(false, form);
  }
}

function handleUpdateRecord(form) {
  // 触发更新事件
  emit('update-record', form);
}

defineExpose({
  showDialog
});
</script>

