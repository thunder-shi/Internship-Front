<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" :dlgbasic-confirm="confirm" @close-dialog="onCloseDialog" @open-dialog="openDialog">
    <template #mainForm>
      <el-form ref="formPanelRef" :rules="formRules" :model="form" label-suffix=":" label-width="120px">
        <!-- 审核选项和理由（在 tab 页上方） -->
        <div class="audit-section-top">
          <el-form-item label="审核结果" prop="auditResult">
            <el-radio-group v-model="form.auditResult">
              <el-radio v-if="!isRecallMode" :label="CONSTANT.AUDIT_STATUS.PASS">{{ CONSTANT.AUDIT_STATUS.PASSNAME }}</el-radio>
              <el-radio v-if="!isRecallMode" :label="CONSTANT.AUDIT_STATUS.NOTPASS">{{ CONSTANT.AUDIT_STATUS.NOTPASSNAME }}</el-radio>
              <el-radio :label="CONSTANT.AUDIT_STATUS.BACK">{{ CONSTANT.AUDIT_STATUS.BACKNAME }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="审核理由" prop="auditReason">
            <el-input v-model="form.auditReason" type="textarea" :rows="4" placeholder="请输入审核理由" :maxlength="500" show-word-limit />
          </el-form-item>
        </div>

        <!-- Tab 页和基本信息区域 -->
        <div class="info-wrapper">
          <el-tabs v-model="activeTab" class="audit-tabs">
            <!-- 第一页：项目基本信息 -->
            <el-tab-pane label="项目基本信息" name="basic">
              <div class="internship-info-section">
                <el-descriptions :column="1" border>
                  <!-- <el-descriptions-item label="实习模板">{{ form.internshipTypeName }}</el-descriptions-item> -->
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

            <!-- 第二页：项目流程信息 -->
            <el-tab-pane label="项目流程信息" name="process">
                <DataTableList ref="dataTableList" :default-props="tableListProps" />
            </el-tab-pane>

            <!-- 第三页：当前审核情况 -->
            <el-tab-pane label="当前审核情况" name="audit">
              <DataTableList ref="auditTableList" :default-props="auditTableListProps" />
            </el-tab-pane>
          </el-tabs>
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
import DataTableList from '@/components/DataTableList.vue';
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
  width: '60%',
  dlgTitle: '实习项目审核',

  someFlags: {
    noFooter: false,
    needValidate: true,
    validate: true,
    needVerifyUpdate: false, // 审核对话框不需要验证数据变更
    autoMax: true, // 初始打开时最大化
    needMaxBtn: true, // 显示最大化按钮
  },
});

const form = reactive({});

const formRules = {
  auditResult: [{ required: true, message: '请选择审核结果', trigger: 'change' }],
  auditReason: [{ required: true, message: '请输入审核理由', trigger: 'blur' }],
};

// DataTableList 的配置（用于显示流程信息）
const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0,
  sortStr: { properties: 'theOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: {
    searchKey: {internshipId: form.internshipId},
  },
  someFlags: {
    operateShow: false, // 审核窗口中的流程信息只读，不显示操作按钮
    checkFlag: false,
    showPage: false,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: { edit: 'RelProcessInternship', view: 'ViewRelProcessInternship' },
    buttonProps: { buttonGroup: { show: false } }, // 隐藏刷新和网格按钮
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false },
      { id: 3, showName: '流程开始时间', theOrder: 3, tableColumnName: 'startTime', sortable: false },
      { id: 4, showName: '流程结束时间', theOrder: 4, tableColumnName: 'endTime', sortable: false },
    ],
  }
});

// 审核记录的 DataTableList 配置
const auditTableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0,
  sortStr: { properties: 'id', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: {
    searchKey: { processId: form.processId }
  },
  someFlags: {
    operateShow: false, // 审核窗口中的审核记录只读，不显示操作按钮
    checkFlag: false,
    showPage: false,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: { edit: 'ViewVerifyProcessInternship', view: 'ViewVerifyProcessInternship' },
    buttonProps: { buttonGroup: { show: false } }, // 隐藏刷新和网格按钮
    allTableColumns: [
      { id: 1, showName: '发送人', theOrder: 1, tableColumnName: 'createUserName', sortable: false },
      { id: 2, showName: '审核人', theOrder: 2, tableColumnName: 'verifyUserName', sortable: false },
      { id: 3, showName: '审核时间', theOrder: 3, tableColumnName: 'updateTime', sortable: false },
      { id: 4, showName: '审核状态', theOrder: 4, tableColumnName: 'isAudit', sortable: false },
      { id: 5, showName: '审核理由', theOrder: 5, tableColumnName: 'reason', sortable: false },
    ],
  }
});

// 审核结果对应的文本映射
const auditResultTextMap = {
  [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
  [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
  [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
};


// 加载审核记录
async function loadAuditRecords() {
  if (!form.processId) {
    return;
  }

  // 更新审核记录表格的搜索条件
  auditTableListProps.initSearchWords.searchKey = { 
    processId: form.processId
  };
  
  // 初始化审核记录表格
  await nextTick();
  auditTableList.value?.initDataList(true);
}

// 监听审核结果变化，自动填充审核理由
watch(
  () => form.auditResult,
  (newVal) => {
    if (newVal !== null && newVal !== undefined) {
      // 当审核结果变化时，自动填充对应的文本到审核理由
      form.auditReason = auditResultTextMap[newVal] || '';
    }
  }
);

// 监听表单变化，更新按钮状态
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
        // 手动检查规则但不显示错误
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

// 从 RelProcessInternship 加载审核角色配置和审核级别信息（用于显示）
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

      // 更新 form 中的审核级别信息
      if (processInfo.verifyTypeId) form.verifyTypeId = processInfo.verifyTypeId;
      if (processInfo.currentVerifyTypeId) form.currentVerifyTypeId = processInfo.currentVerifyTypeId;

      // 更新 form 中的角色ID（排除旧版占位值 17，0 和 null 视为未设置）
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
    // 清空 form 的所有现有字段
    const formKeys = Object.keys(form);
    formKeys.forEach((key) => {
      delete form[key];
    });
    // 先深拷贝 formData，保留所有字段
    const clonedData = _.cloneDeep(formData);

    // 规范化显示字段：将字符串类型的空值替换为 '-'
    const normalizedData = normalizeFormForDisplay(clonedData);

    // 直接将规范化后的数据赋值给 form，保留所有字段
    Object.assign(form, normalizedData);
  }

  // 检测退回模式：已通过的记录只允许退回操作
  isRecallMode.value = formData?.isAudit === CONSTANT.AUDIT_STATUS.PASS;
  if (isRecallMode.value) {
    defaultProps.dlgTitle = '退回已通过的实习计划';
    // 预设退回选项和理由
    form.auditResult = CONSTANT.AUDIT_STATUS.BACK;
    form.auditReason = CONSTANT.AUDIT_STATUS.BACKNAME;
  } else {
    defaultProps.dlgTitle = '实习项目审核';
  }

  // 设置 DataTableList 的过滤条件（通过 internshipId 过滤流程信息）
  if (formData && formData.id != null && formData.id !== 0) {
    tableListProps.initSearchWords.searchKey = { internshipId: formData.internshipId };
  } else {
    tableListProps.initSearchWords.searchKey = {};
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');

  // 等待 DOM 更新后再进行操作
  await nextTick();

  formPanelRef.value?.clearValidate();

  if (formData && formData.id != null && formData.id !== 0) {
    verifyValid(false);

    // 并行加载数据
    const loadPromises = [
      loadVerifyRoleIds(form.processId),  // 加载审核角色配置（用于显示）
      loadAuditRecords()                    // 加载审核记录
    ];

    await Promise.all(loadPromises);

    // 加载流程列表
    dataTableList.value?.initDataList(true);
  } else {
    dlgBasicRef.value.validate = true;
  }
}

async function confirm(_option, type) {
  // 验证表单
  if (!formPanelRef.value) {
    return;
  }

  try {
    await formPanelRef.value.validate();
  } catch (error) {
    ElMessage.warning('请填写完整的审核信息');
    return;
  }

  // 获取当前用户ID
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
        type: 'warning'
      });
    } catch {
      return; // 用户取消
    }
  }

  // 构建保存数据对象
  // 注意：verifyUserId 必须是整数类型，否则后端 join BaseUser 时会失败
  const saveData = {
    ...form, // 包含 form 中的所有信息（包括 id）
    isAudit: form.auditResult,
    reason: form.auditReason,
    verifyUserId: parseInt(verifyUserId, 10), // 保存实际审核人ID（整数类型）
  };

  try {
    // 调用 editOneNode 接口保存到 MainVerifyProcess 表
    // 后端会自动处理多级审核逻辑（创建下一级审核记录、更新 currentVerifyTypeId）
    const resInfo = await internshipProcessAPI.auditProcess(saveData)

    if (resInfo && resInfo.message === 'successful') {
      const resultText = {
        [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
        [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
        [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
      }[form.auditResult] || '未知';

      ElMessage.success(`审核完成：${resultText}`);

      // 触发更新记录事件，刷新列表
      emit('update-record', form);
      if (type === 'stop') {
        dlgBasicRef.value?.showDialog(false, form);
      }
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('保存审核数据失败:', error);
  }
}

function onCloseDialog(saveType) {
  if (saveType === true) {
    emit('update-record', form);
  }
  emit('close-dialog');
}

function openDialog(_row) {
  // 对话框打开时的处理
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
  background-color: transparent; // 使用父容器的背景色

  :deep(.el-descriptions) {
    background-color: #fff;
    table-layout: auto; // 使用自动表格布局，让列宽自适应内容

    // 让标签列宽度自适应内容，尽可能短
    .el-descriptions__table {
      width: 100%;
    }

    .el-descriptions__label {
      width: 1% !important; // 设置为最小宽度，让内容决定实际宽度
      min-width: 0;
      white-space: nowrap; // 防止标签文字换行
      padding-right: 12px; // 标签和内容之间的间距
    }

    // 内容列占据剩余空间
    .el-descriptions__content {
      width: auto !important;
    }
  }

  .remarks-content {
    min-height: 82px;
    line-height: 20px; // 设置行高
    display: block;
  }
}

.audit-section-top {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}
</style>
