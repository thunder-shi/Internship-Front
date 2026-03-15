<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="defaultProps"
    :dlgbasic-confirm="confirm"
    @close-dialog="onCloseDialog"
    @open-dialog="openDialog"
  >
    <template #mainForm>
      <el-form
        ref="formPanelRef"
        :rules="formRules"
        :model="form"
        label-suffix=":"
        label-width="120px"
      >
        <div class="audit-section-top">
          <el-form-item label="审核结果" prop="auditResult">
            <el-radio-group v-model="form.auditResult">
              <el-radio v-if="!isRecallMode" :label="CONSTANT.AUDIT_STATUS.PASS">
                {{ CONSTANT.AUDIT_STATUS.PASSNAME }}
              </el-radio>
              <el-radio v-if="!isRecallMode" :label="CONSTANT.AUDIT_STATUS.NOTPASS">
                {{ CONSTANT.AUDIT_STATUS.NOTPASSNAME }}
              </el-radio>
              <el-radio :label="CONSTANT.AUDIT_STATUS.BACK">
                {{ CONSTANT.AUDIT_STATUS.BACKNAME }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="审核理由" prop="auditReason">
            <el-input
              v-model="form.auditReason"
              type="textarea"
              :rows="4"
              placeholder="请输入审核理由"
              :maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </div>
      </el-form>
    </template>
  </DlgBasic>
</template>

<script setup>
/**
 * 通用审核对话框
 *
 * 适用于学生实习安排审核、指导老师审核等无需 Tab 页的审核场景。
 * 通过 props 控制对话框标题和退回模式标题等差异化文案。
 */
import { ref, reactive, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import _ from 'lodash';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { normalizeFormForDisplay } from '@/utils/common';

const props = defineProps({
  /** 对话框标题 */
  dlgTitle: {
    type: String,
    default: '审核',
  },
  /** 退回模式下的对话框标题 */
  recallTitle: {
    type: String,
    default: '退回已通过的记录',
  },
});

const emit = defineEmits(['update-record', 'close-dialog']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);

const isRecallMode = ref(false);

const defaultProps = reactive({
  form: {},
  width: '40%',
  dlgTitle: props.dlgTitle,
  someFlags: {
    noFooter: false,
    needValidate: true,
    validate: true,
    needVerifyUpdate: false,
    needMaxBtn: true,
  },
});

const form = reactive({});

const formRules = {
  auditResult: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
  auditReason: [{ required: true, message: '请输入审核理由', trigger: 'blur' }],
};

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
      form.auditReason = auditResultTextMap[newVal] || '';
    }
  },
);

// 监听表单变化，更新按钮验证状态
watch(
  form,
  () => {
    verifyValid(false);
  },
  { deep: true },
);

/**
 * 校验表单并更新 DlgBasic 的确认按钮状态
 *
 * @param {boolean} showMessage - 是否在校验失败时显示错误提示
 */
function verifyValid(showMessage = true) {
  const panelRef = formPanelRef.value;
  if (!panelRef || !dlgBasicRef.value) return;

  nextTick(() => {
    if (!panelRef || !dlgBasicRef.value) return;

    if (showMessage) {
      panelRef
        .validate((valid) => {
          dlgBasicRef.value.validate = !valid;
        })
        .catch(() => {
          dlgBasicRef.value.validate = true;
        });
    } else {
      // 静默校验：手动检查 required 规则但不触发 UI 错误提示
      const fields = Object.keys(formRules);
      let hasError = false;

      fields.forEach((field) => {
        const ruleArray = formRules[field];
        if (!Array.isArray(ruleArray)) return;

        const value = form[field];
        const requiredRule = ruleArray.find((r) => r.required === true);
        if (requiredRule) {
          if (
            value === undefined ||
            value === null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0)
          ) {
            hasError = true;
          }
        }
      });
      dlgBasicRef.value.validate = hasError;
    }
  });
}

/** 从 ViewRelProcessInternship 加载审核角色配置 */
async function loadVerifyRoleIds(processId) {
  if (!processId) return;

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: processId },
    });

    if (res?.data?.content?.length > 0) {
      const processInfo = res.data.content[0];

      if (processInfo.verifyTypeId) form.verifyTypeId = processInfo.verifyTypeId;
      if (processInfo.currentVerifyTypeId) form.currentVerifyTypeId = processInfo.currentVerifyTypeId;
      if (processInfo.verifyFirstRoleId) form.verifyFirstRoleId = processInfo.verifyFirstRoleId;
      if (processInfo.verifySecondRoleId) form.verifySecondRoleId = processInfo.verifySecondRoleId;
      if (processInfo.verifyThirdRoleId) form.verifyThirdRoleId = processInfo.verifyThirdRoleId;
      if (processInfo.verifyFourthRoleId) form.verifyFourthRoleId = processInfo.verifyFourthRoleId;
      if (processInfo.verifyFifthRoleId) form.verifyFifthRoleId = processInfo.verifyFifthRoleId;
    }
  } catch (error) {
    console.error('加载审核角色配置失败:', error);
  }
}

async function showDialog(val, formData = {}) {
  if (formData !== null) {
    const formKeys = Object.keys(form);
    formKeys.forEach((key) => {
      delete form[key];
    });
    const clonedData = _.cloneDeep(formData);
    const normalizedData = normalizeFormForDisplay(clonedData);
    Object.assign(form, normalizedData);
  }

  // 检测退回模式：已通过的记录只允许退回操作
  isRecallMode.value = formData?.isAudit === CONSTANT.AUDIT_STATUS.PASS;
  if (isRecallMode.value) {
    defaultProps.dlgTitle = props.recallTitle;
    form.auditResult = CONSTANT.AUDIT_STATUS.BACK;
    form.auditReason = CONSTANT.AUDIT_STATUS.BACKNAME;
  } else {
    defaultProps.dlgTitle = props.dlgTitle;
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');

  await nextTick();

  formPanelRef.value?.clearValidate();

  if (formData && formData.id != null && formData.id !== 0) {
    verifyValid(false);
    await loadVerifyRoleIds(form.processId);
  } else {
    dlgBasicRef.value.validate = true;
  }
}

async function confirm(_option, type) {
  if (!formPanelRef.value) return;

  try {
    await formPanelRef.value.validate();
  } catch {
    ElMessage.warning('请填写完整的审核信息');
    return;
  }

  const userInfo = store.getters.userInfo;
  const verifyUserId = userInfo?.id;

  if (!verifyUserId) {
    ElMessage.error('无法获取当前用户信息，请重新登录');
    return;
  }

  if (!form.id) {
    ElMessage.error('缺少主键ID，无法保存');
    return;
  }

  // 退回已通过的流程时，弹出二次确认
  if (isRecallMode.value) {
    try {
      await ElMessageBox.confirm('当前流程已经审核完毕，确定退回吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
  }

  const saveData = {
    id: form.id,
    isAudit: form.auditResult,
    reason: form.auditReason,
    verifyUserId: parseInt(verifyUserId, 10),
  };

  try {
    const resInfo = await internshipProcessAPI.auditProcess(saveData);

    if (resInfo && resInfo.message === 'successful') {
      const resultText = auditResultTextMap[form.auditResult] || '未知';
      ElMessage.success(`审核完成：${resultText}`);
      emit('update-record', form);
      if (type === 'stop') {
        dlgBasicRef.value?.showDialog(false, form);
      }
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存审核数据失败:', error);
  }
}

function onCloseDialog(saveType) {
  if (saveType === true) {
    emit('update-record', form);
  }
  emit('close-dialog');
}

function openDialog() {}

function closeAllDialogs() {
  dlgBasicRef.value?.showDialog?.(false, {});
}

defineExpose({
  showDialog,
  closeAllDialogs,
});
</script>

<style lang="scss" scoped>
.audit-section-top {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}
</style>
