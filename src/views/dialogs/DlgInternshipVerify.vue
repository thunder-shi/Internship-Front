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
        <!-- Tab 页和基本信息区域 -->
        <div class="info-wrapper">
          <el-tabs v-model="activeTab" class="audit-tabs">
            <!-- 第一页：项目基本信息 -->
            <el-tab-pane label="项目基本信息" name="basic">
              <div class="internship-info-section">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="项目名称">{{ form.name || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="所属院系">{{ form.universityName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="实习类型">{{ form.typeName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="实习模板">{{ form.internshipTypeName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="创建者">{{ form.creatorName || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="创建时间">{{ form.createTime || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="备注" :span="2">
                    <div class="remarks-content">{{ form.remarks || '-' }}</div>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </el-tab-pane>

            <!-- 第二页：项目流程信息 -->
            <el-tab-pane label="项目流程信息" name="process">
              <div class="process-section">
                <DataTableList
                  ref="dataTableList"
                  :default-props="tableListProps"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>

        <!-- 审核选项和理由 -->
        <div class="audit-section">
          <el-form-item label="审核结果" prop="auditResult" style="margin-top: 20px;">
            <el-radio-group v-model="form.auditResult">
              <el-radio :label="CONSTANT.AUDIT_STATUS.PASS">{{ CONSTANT.AUDIT_STATUS.PASSNAME }}</el-radio>
              <el-radio :label="CONSTANT.AUDIT_STATUS.NOTPASS">{{ CONSTANT.AUDIT_STATUS.NOTPASSNAME }}</el-radio>
              <el-radio :label="CONSTANT.AUDIT_STATUS.BACK">{{ CONSTANT.AUDIT_STATUS.BACKNAME }}</el-radio>
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
import { ElMessage } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import DataTableList from '@/components/DataTableList.vue';
import _ from 'lodash';
import CONSTANT from '@/utils/constant';

const emit = defineEmits(['update-record', 'close-dialog']);

const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const dataTableList = ref(null);
const activeTab = ref('basic');

const defaultProps = reactive({
  form: {},
  width: '60%',
  dlgTitle: '实习项目审核',
  
  someFlags: {
    noFooter: false,
    needValidate: true,
    validate: true,
    needVerifyUpdate: false, // 审核对话框不需要验证数据变更
  },
});

const form = reactive({
  id: null,
  name: '',
  universityName: '',
  typeName: '',
  internshipTypeName: '',
  creatorName: '',
  remarks: '',
  auditResult: null, // CONSTANT.AUDIT_STATUS.PASS: 审核通过, CONSTANT.AUDIT_STATUS.NOTPASS: 审核不通过, CONSTANT.AUDIT_STATUS.BACK: 审核退回
  auditReason: '',
});

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
    searchKey: {},
  },
  moveSearchWords: {
    searchKey: {},
  },
  someFlags: {
    operateShow: false, // 审核窗口中的流程信息只读，不显示操作按钮
    checkFlag: false,
    showPage: false,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: { edit: 'RelProcessInternship', view: 'ViewRelProcessInternship' },
    buttonProps: {
      buttonGroup: { show: false }, // 隐藏刷新和网格按钮
    },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false },
      { id: 3, showName: '流程开始时间', theOrder: 3, tableColumnName: 'startTime', sortable: false },
      { id: 4, showName: '流程结束时间', theOrder: 4, tableColumnName: 'endTime', sortable: false },
    ],
  },
  // 设置固定高度，使表格高度与基本信息区域一致
  height: 300,
});

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

function showDialog(val, formData = {}) {
  if (formData !== null) {
    const formKeys = Object.keys(form);
    formKeys.forEach((key) => {
      delete form[key];
    });
    Object.assign(form, {
      id: null,
      name: '',
      universityName: '',
      typeName: '',
      internshipTypeName: '',
      creatorName: '',
      remarks: '',
      auditResult: null,
      auditReason: '',
    });
    Object.assign(form, _.cloneDeep(formData));
  }

  // 设置 DataTableList 的过滤条件（通过 internshipId 过滤流程信息）
  if (formData && formData.id != null && formData.id !== 0) {
    tableListProps.initSearchWords.searchKey = { internshipId: formData.id };
    tableListProps.moveSearchWords.searchKey = { internshipId: formData.id };
  } else {
    tableListProps.initSearchWords.searchKey = {};
    tableListProps.moveSearchWords.searchKey = {};
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');

  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.id != null && formData.id !== 0) {
      verifyValid(false);
      // 延迟加载流程列表数据
      setTimeout(() => {
        dataTableList.value?.initDataList(true);
      }, 200);
    } else {
      dlgBasicRef.value.validate = true;
    }
  }, 100);
}

async function confirm(option, type) {
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

  // 这里可以调用审核接口
  // 例如：await auditAPI.verifyInternship(form.id, { auditResult: form.auditResult, auditReason: form.auditReason });

  // 暂时使用提示信息
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
}

function onCloseDialog(saveType) {
  if (saveType === true) {
    emit('update-record', form);
  }
  emit('close-dialog');
}

function openDialog(row) {
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
  padding-bottom: 20px; // 增加底部内边距，延伸到审核区域
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
    
    // 调整标签列和内容列的宽度比例
    .el-descriptions__label {
      width: 100px !important; // 缩小标签列宽度
      min-width: 100px;
    }
    
    .el-descriptions__content {
      width: auto !important; // 内容列自动填充剩余空间
    }
  }

  .remarks-content {
    min-height: 82px;
    line-height: 20px; // 设置行高
    display: block;
  }
}

.process-section {
  margin-bottom: 20px;
  height: 200px; // 缩短高度，避免出现垂直滚动条
  overflow: hidden;
  display: flex;
  flex-direction: column;

  // 隐藏 DataTableHeader 外层容器的边框
  :deep(> div) {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  // 隐藏所有 el-card 的边框和阴影
  :deep(.el-card) {
    height: 100% !important;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;

    .el-card__header {
      display: none !important; // 隐藏卡片头部
    }

    .el-card__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-height: 0;
      padding: 0 !important;
    }
  }

  // 设置表格高度和滚动
  :deep(.el-table) {
    height: 100% !important;
    max-height: 100% !important;
    
    .el-table__body-wrapper {
      overflow-y: auto !important;
      max-height: calc(100% - 40px) !important; // 减去表头高度
    }
  }
}

.audit-section {
  margin-top: 0;
  padding-top: 20px;
  // 移除基线
}
</style>
