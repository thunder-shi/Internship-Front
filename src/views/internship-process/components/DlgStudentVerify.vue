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
        <!-- 审核选项和理由 -->
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
import { ref, reactive, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import _ from 'lodash';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { normalizeFormForDisplay } from '@/utils/common';

const emit = defineEmits(['update-record', 'close-dialog']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const dataTableList = ref(null);
const auditTableList = ref(null);
const activeTab = ref('basic');

// 退回模式：当打开已通过的记录时，仅允许"退回"操作
const isRecallMode = ref(false);

const defaultProps = reactive({
  form: {},
  width: '40%',
  dlgTitle: '学生实习项目安排审核',
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

// 审核记录的 DataTableList 配置
const auditTableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0,
  sortStr: { properties: 'id', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: {
    searchKey: { processId: form.processId },
  },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: false,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: { edit: 'ViewVerifyProcessInternship', view: 'ViewVerifyProcessInternship' },
    buttonProps: { buttonGroup: { show: false } },
    allTableColumns: [
      { id: 1, showName: '发送人', theOrder: 1, tableColumnName: 'createUserName', sortable: false },
      { id: 2, showName: '审核人', theOrder: 2, tableColumnName: 'verifyUserName', sortable: false },
      { id: 3, showName: '审核时间', theOrder: 3, tableColumnName: 'updateTime', sortable: false },
      { id: 4, showName: '审核状态', theOrder: 4, tableColumnName: 'isAudit', sortable: false },
      { id: 5, showName: '审核理由', theOrder: 5, tableColumnName: 'reason', sortable: false },
    ],
  },
});

// 审核结果对应的文本映射
const auditResultTextMap = {
  [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
  [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
  [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
};

async function loadAuditRecords() {
  if (!form.processId) {
    return;
  }
  auditTableListProps.initSearchWords.searchKey = {
    processId: form.processId,
  };
  await nextTick();
  auditTableList.value?.initDataList(true);
}

watch(
  () => form.auditResult,
  (newVal) => {
    if (newVal !== null && newVal !== undefined) {
      form.auditReason = auditResultTextMap[newVal] || '';
    }
  }
);

watch(
  form,
  () => {
    verifyValid(false);
  },
  { deep: true }
);

function verifyValid(showMessage = true) {
  const panelRef = formPanelRef.value;
  if (!panelRef || !dlgBasicRef.value) return;
  nextTick(() => {
    if (panelRef && dlgBasicRef.value) {
      if (showMessage) {
        panelRef
          .validate((valid) => {
            dlgBasicRef.value.validate = !valid;
          })
          .catch(() => {
            dlgBasicRef.value.validate = true;
          });
      } else {
        const rules = formRules;
        const fields = Object.keys(rules);
        let hasError = false;

        fields.forEach((field) => {
          const ruleArray = rules[field];
          if (Array.isArray(ruleArray)) {
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
          }
        });
        dlgBasicRef.value.validate = hasError;
      }
    }
  });
}

// 从 ViewRelProcessInternship 加载审核角色配置
async function loadVerifyRoleIds(processId) {
  if (!processId) {
    return;
  }

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: processId },
    });

    if (res && res.data && res.data.content && res.data.content.length > 0) {
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

  isRecallMode.value = formData?.isAudit === CONSTANT.AUDIT_STATUS.PASS;
  if (isRecallMode.value) {
    defaultProps.dlgTitle = '退回已通过的学生实习安排';
    form.auditResult = CONSTANT.AUDIT_STATUS.BACK;
    form.auditReason = CONSTANT.AUDIT_STATUS.BACKNAME;
  } else {
    defaultProps.dlgTitle = '学生实习项目安排审核';
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');

  await nextTick();

  formPanelRef.value?.clearValidate();

  if (formData && formData.id != null && formData.id !== 0) {
    verifyValid(false);

    const loadPromises = [
      loadVerifyRoleIds(form.processId),
      loadAuditRecords(),
    ];

    await Promise.all(loadPromises);

    dataTableList.value?.initDataList(true);
  } else {
    dlgBasicRef.value.validate = true;
  }
}

async function confirm(_option, type) {
  if (!formPanelRef.value) {
    return;
  }

  try {
    await formPanelRef.value.validate();
  } catch (error) {
    ElMessage.warning('请填写完整的审核信息');
    return;
  }

  const userInfoStore = store.getters.userInfo;
  const verifyUserId = userInfoStore?.id;

  if (!verifyUserId) {
    ElMessage.error('无法获取当前用户信息，请重新登录');
    return;
  }

  if (!form.id) {
    ElMessage.error('缺少主键ID，无法保存');
    return;
  }

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
      const resultText = {
        [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
        [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
        [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
      }[form.auditResult] || '未知';

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

function openDialog(_row) {}

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

