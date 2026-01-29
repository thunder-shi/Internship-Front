<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" :dlgbasic-confirm="confirm" @close-dialog="onCloseDialog" @open-dialog="openDialog">
    <template #mainForm>
      <el-form ref="formPanelRef" :rules="formRules" :model="form" label-suffix=":" label-width="120px">
        <!-- 审核选项和理由（在 tab 页上方） -->
        <div class="audit-section-top">
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
        </div>

        <!-- Tab 页和基本信息区域 -->
        <div class="info-wrapper">
          <el-tabs v-model="activeTab" class="audit-tabs">
            <!-- 第一页：项目基本信息 -->
            <el-tab-pane label="项目基本信息" name="basic">
              <div class="internship-info-section">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="项目名称">{{ form.internshipName || '-' }}</el-descriptions-item>
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
                <DataTableList ref="dataTableList" :default-props="tableListProps" />
              </div>
            </el-tab-pane>

            <!-- 第三页：当前审核情况 -->
            <el-tab-pane label="当前审核情况" name="audit">
              <div class="audit-info-section">
                <div class="audit-header">
                  <span class="audit-header-item">审核级别</span>
                  <span class="audit-header-item">审核人</span>
                  <span class="audit-header-item">审核时间</span>
                  <span class="audit-header-item">审核状态</span>
                  <span class="audit-header-item">审核理由</span>
                </div>
                <div v-for="(record, index) in auditRecords" :key="record.id || index" class="audit-record-row">
                  <span class="audit-record-item">第{{ index + 1 }}级</span>
                  <span class="audit-record-item">{{ record.verifyUserName || '-' }}</span>
                  <span class="audit-record-item">{{ formatAuditTime(record.updateTime) }}</span>
                  <span class="audit-record-item">
                    <el-tag :type="getAuditStatusTagType(record.isAudit)" size="small">
                      {{ formatAuditStatus(record.isAudit) }}
                    </el-tag>
                  </span>
                  <span class="audit-record-item">{{ record.reason || '-' }}</span>
                </div>
                <div v-if="!auditRecords || auditRecords.length === 0" class="audit-empty">
                  暂无审核记录
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-form>
    </template>
  </DlgBasic>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import DataTableList from '@/components/DataTableList.vue';
import _ from 'lodash';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import moment from 'moment';

const emit = defineEmits(['update-record', 'close-dialog']);

const store = useStore();
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
    autoMax: true, // 初始打开时最大化
    needMaxBtn: true, // 显示最大化按钮
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
  // 审核相关信息
  verifyUserName: '',
  verifyTime: '',
  updateTime: '',
  isAudit: null,
  reason: '',
  // 流程关联信息
  relationId: null,
  createUserId: null,
  internshipId: null,
  // 审核级别信息
  verifyTypeId: null,        // 需要的审核级别（如 3 表示二级审核）
  currentVerifyTypeId: null, // 当前审核进度
  // 各级审核角色ID
  verifyFirstRoleId: null,
  verifySecondRoleId: null,
  verifyThirdRoleId: null,
  verifyFourthRoleId: null,
  verifyFifthRoleId: null,
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

// 格式化审核状态
const formatAuditStatus = (isAudit) => {
  if (isAudit === null || isAudit === undefined) {
    return '-';
  }
  switch (isAudit) {
    case CONSTANT.AUDIT_STATUS.SAVE:
      return CONSTANT.AUDIT_STATUS.SAVENAME;
    case CONSTANT.AUDIT_STATUS.SUBMIT:
      return CONSTANT.AUDIT_STATUS.SUBMITNAME;
    case CONSTANT.AUDIT_STATUS.PASS:
      return CONSTANT.AUDIT_STATUS.PASSNAME;
    case CONSTANT.AUDIT_STATUS.NOTPASS:
      return CONSTANT.AUDIT_STATUS.NOTPASSNAME;
    case CONSTANT.AUDIT_STATUS.BACK:
      return CONSTANT.AUDIT_STATUS.BACKNAME;
    default:
      return '-';
  }
};

// 获取审核状态对应的标签类型
const getAuditStatusTagType = (isAudit) => {
  switch (isAudit) {
    case CONSTANT.AUDIT_STATUS.PASS:
      return 'success';
    case CONSTANT.AUDIT_STATUS.NOTPASS:
      return 'danger';
    case CONSTANT.AUDIT_STATUS.BACK:
      return 'info';
    case CONSTANT.AUDIT_STATUS.SUBMIT:
      return 'warning';
    default:
      return 'info';
  }
};

// 格式化审核时间
const formatAuditTime = (time) => {
  if (!time) {
    return '-';
  }
  return moment(time).format('YYYY-MM-DD HH:mm:ss');
};

// 审核记录列表
const auditRecords = ref([]);

// 加载审核记录
async function loadAuditRecords() {
  if (!form.relationId) {
    auditRecords.value = [];
    return;
  }

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyInternshipPlanProcess',
      pageInfo: { page: 1, size: 100 },
      searchKey: { relationId: form.relationId },
      reg: { relationId: '=' },
      sort: { properties: 'id', direction: 'ASC' }
    });

    if (res && res.data && res.data.content) {
      // 只显示已完成审核的记录（非待审核状态）
      auditRecords.value = res.data.content.filter(r =>
        r.isAudit === CONSTANT.AUDIT_STATUS.PASS ||
        r.isAudit === CONSTANT.AUDIT_STATUS.NOTPASS ||
        r.isAudit === CONSTANT.AUDIT_STATUS.BACK
      );
    } else {
      auditRecords.value = [];
    }
  } catch (error) {
    console.error('加载审核记录失败:', error);
    auditRecords.value = [];
  }
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
async function loadVerifyRoleIds(relationId) {
  if (!relationId) {
    console.log('relationId 为空，无法加载角色配置');
    return;
  }

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: relationId },
      reg: { id: '=' },
      sort: { properties: 'id', direction: 'ASC' }
    });

    console.log('=== 加载审核角色配置 ===');
    console.log('relationId:', relationId);
    console.log('查询结果:', res);

    if (res && res.data && res.data.content && res.data.content.length > 0) {
      const processInfo = res.data.content[0];
      console.log('流程信息:', processInfo);

      // 更新 form 中的审核级别信息
      if (processInfo.verifyTypeId) form.verifyTypeId = processInfo.verifyTypeId;
      if (processInfo.currentVerifyTypeId) form.currentVerifyTypeId = processInfo.currentVerifyTypeId;

      // 更新 form 中的角色ID
      if (processInfo.verifyFirstRoleId) form.verifyFirstRoleId = processInfo.verifyFirstRoleId;
      if (processInfo.verifySecondRoleId) form.verifySecondRoleId = processInfo.verifySecondRoleId;
      if (processInfo.verifyThirdRoleId) form.verifyThirdRoleId = processInfo.verifyThirdRoleId;
      if (processInfo.verifyFourthRoleId) form.verifyFourthRoleId = processInfo.verifyFourthRoleId;
      if (processInfo.verifyFifthRoleId) form.verifyFifthRoleId = processInfo.verifyFifthRoleId;

      console.log('审核配置已更新:', {
        verifyTypeId: form.verifyTypeId,
        currentVerifyTypeId: form.currentVerifyTypeId,
        verifyFirstRoleId: form.verifyFirstRoleId,
        verifySecondRoleId: form.verifySecondRoleId,
        verifyThirdRoleId: form.verifyThirdRoleId,
        verifyFourthRoleId: form.verifyFourthRoleId,
        verifyFifthRoleId: form.verifyFifthRoleId
      });
    } else {
      console.warn('未查询到流程配置数据');
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
      verifyUserName: '',
      verifyTime: '',
      updateTime: '',
      isAudit: null,
      reason: '',
      relationId: null,
      createUserId: null,
      internshipId: null,
      verifyTypeId: null,
      currentVerifyTypeId: null,
      verifyFirstRoleId: null,
      verifySecondRoleId: null,
      verifyThirdRoleId: null,
      verifyFourthRoleId: null,
      verifyFifthRoleId: null,
    });
    Object.assign(form, _.cloneDeep(formData));
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
    console.log('=== 开始加载对话框数据 ===');
    console.log('relationId:', form.relationId);

    const loadPromises = [
      loadVerifyRoleIds(form.relationId),  // 加载审核角色配置（用于显示）
      loadAuditRecords()                    // 加载审核记录
    ];

    await Promise.all(loadPromises);

    // 加载流程列表
    dataTableList.value?.initDataList(true);

    console.log('=== 对话框数据加载完成 ===');
    console.log('verifyTypeId:', form.verifyTypeId);
    console.log('currentVerifyTypeId:', form.currentVerifyTypeId);
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

  // 构建保存数据对象
  // 注意：verifyUserId 必须是整数类型，否则后端 join BaseUser 时会失败
  const saveData = {
    id: form.id,
    isAudit: form.auditResult,
    reason: form.auditReason,
    verifyUserId: parseInt(verifyUserId, 10), // 保存实际审核人ID（整数类型）
  };

  console.log('=== 审核保存调试 ===');
  console.log('当前用户信息:', userInfo);
  console.log('保存数据:', saveData);

  try {
    // 调用 editOneNode 接口保存到 MainVerifyProcess 表
    // 后端会自动处理多级审核逻辑（创建下一级审核记录、更新 currentVerifyTypeId）
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', saveData);

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

.audit-section-top {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
}

.audit-info-section {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;

  .audit-header {
    display: grid;
    grid-template-columns: 80px 100px 160px 100px 1fr;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 2px solid #e4e7ed;
    font-weight: 600;
    color: #303133;
    background-color: #f5f7fa;

    .audit-header-item {
      padding: 0 8px;
    }
  }

  .audit-record-row {
    display: grid;
    grid-template-columns: 80px 100px 160px 100px 1fr;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    line-height: 24px;
    align-items: center;

    &:last-child {
      border-bottom: none;
    }

    .audit-record-item {
      padding: 0 8px;
      color: #606266;
      word-break: break-word;
    }
  }

  .audit-empty {
    padding: 40px 0;
    text-align: center;
    color: #909399;
  }
}
</style>
