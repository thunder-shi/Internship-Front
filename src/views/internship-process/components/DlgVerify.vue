<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="defaultProps"
    :dlgbasic-confirm="confirm"
    @close-dialog="onCloseDialog"
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

        <!-- 可选：项目详情 Tab 页 -->
        <div v-if="showProjectInfo || processViewName || auditRecordsViewName" class="info-wrapper">
          <el-tabs v-model="activeTab" class="audit-tabs">
            <el-tab-pane v-if="showProjectInfo" label="项目基本信息" name="basic">
              <div class="internship-info-section">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="所属专业">{{ form.majorNames }}</el-descriptions-item>
                  <el-descriptions-item label="实习类型">{{ form.intTypeName }}</el-descriptions-item>
                  <el-descriptions-item label="实习编码">{{ form.internshipCode }}</el-descriptions-item>
                  <el-descriptions-item label="实习名称">{{ form.internshipName }}</el-descriptions-item>
                  <el-descriptions-item label="实习计划">
                    <div class="remarks-content">{{ form.internshipRemarks }}</div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-tab-pane>

            <el-tab-pane v-if="processViewName" label="项目流程信息" name="process">
              <DataTableList ref="processTableRef" :default-props="processTableProps" />
            </el-tab-pane>

            <el-tab-pane v-if="auditRecordsViewName" label="当前审核情况" name="audit">
              <DataTableList ref="auditTableRef" :default-props="auditTableProps" />
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-form>
    </template>
  </DlgBasic>
</template>

<script setup>
/**
 * 通用审核对话框
 *
 * 合并了原 DlgInternshipVerify、DlgUnifiedVerify、DlgVerify 三个组件：
 * - 所有审核页面统一使用此组件
 * - 已通过的记录自动进入退回模式（仅显示"退回"选项）
 * - 通过 props 控制是否显示项目详情 Tab 页
 */
import { ref, reactive, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import DataTableList from '@/components/DataTableList.vue';
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
  /** 是否显示项目基本信息 Tab */
  showProjectInfo: {
    type: Boolean,
    default: false,
  },
  /** 流程列表视图名称（传入则显示流程 Tab） */
  processViewName: {
    type: String,
    default: '',
  },
  /** 审核记录视图名称（传入则显示审核记录 Tab） */
  auditRecordsViewName: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['success', 'close-dialog']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const processTableRef = ref(null);
const auditTableRef = ref(null);
const activeTab = ref('basic');
/** 批量审核时的待审核行列表，为空表示单条审核 */
const batchRows = ref([]);

const hasTabs = !!(props.showProjectInfo || props.processViewName || props.auditRecordsViewName);

const isRecallMode = ref(false);

const defaultProps = reactive({
  form: {},
  width: hasTabs ? '60%' : '40%',
  dlgTitle: props.dlgTitle,
  someFlags: {
    noFooter: false,
    needValidate: true,
    validate: true,
    needVerifyUpdate: false,
    needMaxBtn: true,
    autoMax: false,
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

// ---------- 可选 Tab 页的 DataTableList 配置 ----------

const processTableProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0,
  sortStr: { properties: 'theOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: { searchKey: {} },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: false,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: { edit: 'RelProcessInternship', view: props.processViewName || 'ViewRelProcessInternship' },
    buttonProps: { buttonGroup: { show: false } },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false },
      { id: 3, showName: '流程开始时间', theOrder: 3, tableColumnName: 'startTime', sortable: false },
      { id: 4, showName: '流程结束时间', theOrder: 4, tableColumnName: 'endTime', sortable: false },
    ],
  },
});

const auditTableProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0,
  sortStr: { properties: 'id', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: { searchKey: {} },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: false,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: {
      edit: props.auditRecordsViewName || 'ViewVerifyProcessInternship',
      view: props.auditRecordsViewName || 'ViewVerifyProcessInternship',
    },
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

// ---------- 表单监听 ----------

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

// ---------- 校验 ----------

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

// ---------- 加载审核角色配置 ----------

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

// ---------- 加载审核记录（Tab 页） ----------

async function loadAuditRecords() {
  if (!props.auditRecordsViewName || !form.processId) return;
  auditTableProps.initSearchWords.searchKey = { processId: form.processId };
  await nextTick();
  auditTableRef.value?.initDataList(true);
}

// ---------- 对话框操作 ----------

/**
 * @param {boolean} val - 是否打开
 * @param {Object} formData - 当前行数据（单条时为该行，批量时为首行用于展示/退回模式判断）
 * @param {Array} [batchRowsParam] - 批量审核时的所有行；传入且 length>0 时为批量模式
 * @param {number} [initialAuditResult] - 预选审核结果（来自下拉选择：PASS/NOTPASS/BACK），仅非退回模式生效
 */
async function showDialog(val, formData = {}, batchRowsParam = [], initialAuditResult = null) {
  batchRows.value = Array.isArray(batchRowsParam) && batchRowsParam.length > 0 ? batchRowsParam : [];

  if (formData !== null) {
    const formKeys = Object.keys(form);
    formKeys.forEach((key) => delete form[key]);
    const clonedData = _.cloneDeep(formData);
    const normalizedData = normalizeFormForDisplay(clonedData);
    Object.assign(form, normalizedData);
  }

  // 已通过的记录进入退回模式
  isRecallMode.value = formData?.isAudit === CONSTANT.AUDIT_STATUS.PASS;
  if (isRecallMode.value) {
    defaultProps.dlgTitle = batchRows.value.length > 0
      ? `${props.recallTitle}（已选 ${batchRows.value.length} 条）`
      : props.recallTitle;
    form.auditResult = CONSTANT.AUDIT_STATUS.BACK;
    form.auditReason = CONSTANT.AUDIT_STATUS.BACKNAME;
  } else {
    defaultProps.dlgTitle = batchRows.value.length > 0
      ? `${props.dlgTitle}（已选 ${batchRows.value.length} 条）`
      : props.dlgTitle;
    if (initialAuditResult != null && auditResultTextMap[initialAuditResult] !== undefined) {
      form.auditResult = initialAuditResult;
      form.auditReason = auditResultTextMap[initialAuditResult];
    }
  }

  // 设置流程 Tab 的过滤条件
  if (props.processViewName && formData?.internshipId) {
    processTableProps.initSearchWords.searchKey = { internshipId: formData.internshipId };
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');

  await nextTick();
  formPanelRef.value?.clearValidate();

  if (formData && formData.id != null && formData.id !== 0) {
    verifyValid(false);

    // 加载审核角色配置 + 可选 Tab 数据
    const loadPromises = [loadVerifyRoleIds(form.processId)];
    if (props.auditRecordsViewName) loadPromises.push(loadAuditRecords());
    await Promise.all(loadPromises);

    if (props.processViewName) {
      processTableRef.value?.initDataList(true);
    }
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

  const rowsToSubmit = batchRows.value.length > 0 ? batchRows.value : [form];
  const hasInvalidId = rowsToSubmit.some((r) => !r?.id && r?.id !== 0);
  if (hasInvalidId) {
    ElMessage.error('缺少主键ID，无法保存');
    return;
  }

  // 退回已通过的流程需二次确认
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

  const isAudit = form.auditResult;
  const reason = form.auditReason;
  const verifyUserIdInt = parseInt(verifyUserId, 10);

  try {
    const items = rowsToSubmit.map((row) => ({
      id: row.id,
      isAudit,
      reason,
      verifyUserId: verifyUserIdInt,
    }));
    const payload = items.length === 1 ? items[0] : items;
    const resInfo = await internshipProcessAPI.auditProcess(payload);
    if (!resInfo || resInfo.message !== 'successful') {
      ElMessage.warning(resInfo?.message || '审核保存失败');
      return;
    }

    const resultText = auditResultTextMap[form.auditResult] || '未知';
    if (rowsToSubmit.length > 1) {
      ElMessage.success(`批量审核完成：${resultText}，共 ${rowsToSubmit.length} 条`);
    } else {
      ElMessage.success(`审核完成：${resultText}`);
    }

    emit('success', form);
    if (type === 'stop') {
      dlgBasicRef.value?.showDialog(false, form);
    }
    batchRows.value = [];
  } catch (error) {
    console.error('保存审核数据失败:', error);
    ElMessage.error('保存审核数据失败');
  }
}

function onCloseDialog(saveType) {
  if (saveType === true) {
    emit('success', form);
  }
  emit('close-dialog');
}

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

.info-wrapper {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 0;
}

.audit-tabs {
  margin-bottom: 0;
}

.internship-info-section {
  margin-bottom: 0;
  padding: 0;
  background-color: transparent;

  :deep(.el-descriptions) {
    background-color: #fff;
    table-layout: auto;

    .el-descriptions__table {
      width: 100%;
    }

    .el-descriptions__label {
      width: 1% !important;
      min-width: 0;
      white-space: nowrap;
      padding-right: 12px;
    }

    .el-descriptions__content {
      width: auto !important;
    }
  }

  .remarks-content {
    min-height: 82px;
    line-height: 20px;
    display: block;
  }
}
</style>
