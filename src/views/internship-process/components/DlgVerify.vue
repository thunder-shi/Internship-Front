<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" :dlgbasic-confirm="handleAudit" @close-dialog="handleCloseDialog">
    <template #mainForm>
      <el-form ref="formPanelRef" :model="form" :rules="formRules" label-width="120px">
        <el-form-item label="审核结果" prop="auditResult">
          <el-radio-group v-model="form.auditResult">
            <el-radio :label="CONSTANT.AUDIT_STATUS.PASS">{{ CONSTANT.AUDIT_STATUS.PASSNAME }}</el-radio>
            <el-radio :label="CONSTANT.AUDIT_STATUS.NOTPASS">{{ CONSTANT.AUDIT_STATUS.NOTPASSNAME }}</el-radio>
            <el-radio :label="CONSTANT.AUDIT_STATUS.BACK">{{ CONSTANT.AUDIT_STATUS.BACKNAME }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核理由" prop="auditReason">
          <el-input v-model="form.auditReason" type="textarea" :rows="4" placeholder="请输入审核理由" :maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
    </template>
  </DlgBasic>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import { ElMessage } from 'element-plus';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';

defineOptions({
  name: 'DlgVerify',
});

const emit = defineEmits(['close-dialog', 'success']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);

// 当前行数据
const currentRowData = ref(null);

// 表单数据
const form = reactive({
  id: null,
  auditResult: null,
  auditReason: '',
});

// 表单验证规则
const formRules = {
  auditResult: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
  auditReason: [{ required: true, message: '请输入审核理由', trigger: 'blur' }],
};

// 审核结果对应的文本映射
const auditResultTextMap = {
  [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
  [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
  [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
};

// 监听审核结果变化，自动填充审核理由
watch(
  () => form.auditResult,
  (newVal) => {
    if (newVal !== null && newVal !== undefined) {
      // 当审核结果变化时，自动填充对应的文本到审核理由
      form.auditReason = auditResultTextMap[newVal] || '';
      // 更新验证状态
      updateValidateState();
    }
  }
);

// 监听审核理由变化，更新验证状态
watch(
  () => form.auditReason,
  () => {
    updateValidateState();
  }
);

// 更新验证状态（检查表单是否通过验证，不显示错误信息）
function updateValidateState() {
  if (!formPanelRef.value || !dlgBasicRef.value) return;
  
  nextTick(() => {
    if (formPanelRef.value && dlgBasicRef.value) {
      // 检查必填字段是否已填写
      const hasError = !form.auditResult || !form.auditReason;
      
      // 设置按钮状态：hasError 为 true 时禁用按钮（validate = true）
      dlgBasicRef.value.validate = hasError;
    }
  });
}

// DlgBasic 的默认配置
const defaultProps = computed(() => {
  return {
    dlgTitle: '岗位审核',
    width: '600px',
    someFlags: {
      needValidate: true, // 启用按钮的验证状态控制
    },
    footButtons: {
      confirm: { show: true, name: '审 核', type: 'primary' },
      cancel: { show: true },
    },
  };
});

// 处理审核按钮点击（作为 DlgBasic 的 confirm 回调）
async function handleAudit() {
  // 验证表单
  if (!formPanelRef.value) {
    return false;
  }

  try {
    await formPanelRef.value.validate();
  } catch (error) {
    ElMessage.warning('请填写完整的审核信息');
    return false;
  }

  // 获取当前用户ID
  const userInfo = store.getters.userInfo;
  const verifyUserId = userInfo?.id;

  if (!verifyUserId) {
    ElMessage.error('无法获取当前用户信息，请重新登录');
    return false;
  }

  if (!form.id) {
    ElMessage.error('缺少主键ID，无法保存');
    return false;
  }

  try {
    // 构建保存数据对象
    // 注意：verifyUserId 必须是整数类型，否则后端 join BaseUser 时会失败
    const saveData = {
      ...form, // 包含 form 中的所有信息（包括 id）
      isAudit: form.auditResult,
      reason: form.auditReason,
      verifyUserId: parseInt(verifyUserId, 10), // 保存实际审核人ID（整数类型）
    };

    // 调用 editOneNode 接口保存到 MainVerifyProcess 表
    // 后端会自动处理多级审核逻辑（创建下一级审核记录、更新 currentVerifyTypeId）
    const resInfo = await internshipProcessAPI.auditProcess(saveData);

    if (resInfo && resInfo.message === 'successful') {
      const resultText = {
        [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
        [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
        [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
      }[form.auditResult] || '未知';

      ElMessage.success(`审核完成：${resultText}`);

      // 触发更新记录事件，刷新列表
      emit('success', form);
      // 返回 true 表示成功，DlgBasic 会自动关闭对话框
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
      return false;
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('保存审核数据失败:', error);
    return false;
  }
}

// 处理对话框关闭
function handleCloseDialog() {
  emit('close-dialog');
}

// 显示对话框
function showDialog(val, rowData = null) {
  if (rowData) {
    currentRowData.value = rowData;
    // 将 rowData 的信息合并到 form 中（包括 id 等审核流程相关信息）
    Object.assign(form, rowData);
    form.auditResult = null;
    form.auditReason = '';
  }
  
  // 调用 DlgBasic 的 showDialog 方法
  dlgBasicRef.value?.showDialog(val, form);
  
  // 对话框打开后更新验证状态
  if (val) {
    nextTick(() => {
      updateValidateState();
    });
  }
}

// 暴露方法给父组件
defineExpose({
  showDialog,
});
</script>

<style scoped>
</style>
