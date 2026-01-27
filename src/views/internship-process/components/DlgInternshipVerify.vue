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
                  <span class="audit-header-item">审核人</span>
                  <span class="audit-header-item">审核时间</span>
                  <span class="audit-header-item">审核状态</span>
                  <span class="audit-header-item">审核理由</span>
                </div>
                <div v-for="(record, index) in auditRecords" :key="index" class="audit-record-row">
                  <span class="audit-record-item">{{ record.verifyUserName || '-' }}</span>
                  <span class="audit-record-item">{{ formatAuditTime(record.verifyTime || record.updateTime) }}</span>
                  <span class="audit-record-item">{{ formatAuditStatus(record.isAudit) }}</span>
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
import { ref, reactive, watch, nextTick, computed } from 'vue';
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

// 格式化审核时间
const formatAuditTime = (time) => {
  if (!time) {
    return '-';
  }
  return moment(time).format('YYYY-MM-DD HH:mm:ss');
};

// 获取审核记录列表（目前从 form 中获取，后续可以扩展为从其他地方加载多条记录）
const auditRecords = computed(() => {
  const records = [];
  
  // 如果 form 中有审核信息，添加到记录中
  if (form.verifyUserName || form.verifyTime || form.updateTime || form.isAudit !== null || form.reason) {
    records.push({
      verifyUserName: form.verifyUserName || '',
      verifyTime: form.verifyTime || form.updateTime || '',
      isAudit: form.isAudit,
      reason: form.reason || '',
    });
  }
  
  return records;
});

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
      verifyUserName: '',
      verifyTime: '',
      updateTime: '',
      isAudit: null,
      reason: '',
      relationId: null,
      createUserId: null,
      internshipId: null,
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

  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.id != null && formData.id !== 0) {
      verifyValid(false);
      // 延迟加载流程列表数据
      setTimeout(() => { dataTableList.value?.initDataList(true); }, 200);
    } else {
      dlgBasicRef.value.validate = true;
    }
  }, 100);
}

// 获取当前审核级别（1-5）- 通过查询同一 relationId 的已通过记录数来确定
async function getCurrentAuditLevel() {
  if (!form.relationId) return 1;

  try {
    // 查询同一 relationId 的所有记录
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyInternshipPlanProcess',
      pageInfo: { page: 1, size: 100 },
      searchKey: { relationId: form.relationId },
      reg: { relationId: '=' },
      sort: { properties: 'id', direction: 'ASC' }
    });

    if (res && res.data && res.data.content) {
      // 统计已通过的记录数
      const passedCount = res.data.content.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS).length;
      // 当前级别 = 已通过数 + 1
      return passedCount + 1;
    }
  } catch (error) {
    console.error('获取当前审核级别失败:', error);
  }
  return 1;
}

// 获取下一级审核的角色ID
function getNextLevelRoleId(currentLevel) {
  const roleIds = [
    form.verifyFirstRoleId,
    form.verifySecondRoleId,
    form.verifyThirdRoleId,
    form.verifyFourthRoleId,
    form.verifyFifthRoleId
  ];

  // 返回下一级的角色ID（如果存在）
  if (currentLevel < roleIds.length && roleIds[currentLevel]) {
    return roleIds[currentLevel];
  }
  return null;
}

// 根据角色ID获取用户ID列表
async function getUserIdsByRoleId(roleId) {
  if (!roleId) return null;

  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewUserRoleDetail',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { roleId: roleId },
      reg: { roleId: '=' },
      sort: { properties: 'id', direction: 'ASC' }
    });

    if (res && res.data && res.data.content && res.data.content.length > 0) {
      // 将用户ID组合成 "id1|id2|id3" 格式
      const userIds = res.data.content.map(item => item.userId).filter(id => id);
      return userIds.join('|');
    }
    return null;
  } catch (error) {
    console.error('获取下一级审核人失败:', error);
    return null;
  }
}

// 创建下一级审核记录
async function createNextLevelAuditRecord(nextRoleId) {
  // 获取下一级审核人的用户ID
  const nextVerifyUserIds = await getUserIdsByRoleId(nextRoleId);

  if (!nextVerifyUserIds) {
    console.warn('未找到下一级审核人');
    return false;
  }

  // 创建新的审核记录
  const newRecord = {
    relationId: form.relationId,
    verifyUserId: nextVerifyUserIds,
    isAudit: CONSTANT.AUDIT_STATUS.SUBMIT, // 待审核
    createUserId: form.createUserId,
  };

  try {
    const res = await listAPI.editOneNode('MainVerifyProcess', newRecord);
    if (res && res.message === 'successful') {
      return true;
    }
    console.error('创建下一级审核记录失败:', res?.message);
    return false;
  } catch (error) {
    console.error('创建下一级审核记录失败:', error);
    return false;
  }
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
  const saveData = {
    id: form.id,
    isAudit: form.auditResult,
    reason: form.auditReason,
    verifyUserId: verifyUserId,
  };

  try {
    // 调用 editOneNode 接口保存到 MainVerifyProcess 表
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', saveData);

    if (resInfo && resInfo.message === 'successful') {
      const resultText = {
        [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
        [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
        [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
      }[form.auditResult] || '未知';

      // 如果审核通过，检查是否有下一级审核
      if (form.auditResult === CONSTANT.AUDIT_STATUS.PASS) {
        const currentLevel = await getCurrentAuditLevel();
        const nextRoleId = getNextLevelRoleId(currentLevel);

        if (nextRoleId) {
          // 有下一级审核，创建新记录
          const created = await createNextLevelAuditRecord(nextRoleId);
          if (created) {
            ElMessage.success(`${resultText}，已进入下一级审核`);
          } else {
            ElMessage.warning(`${resultText}，但创建下一级审核记录失败`);
          }
        } else {
          // 没有下一级，审核完成
          ElMessage.success(`审核完成：${resultText}`);
        }
      } else {
        ElMessage.success(`审核完成：${resultText}`);
      }

      // 触发更新记录事件，刷新列表
      emit('update-record', form);
      if (type === 'stop') {
        dlgBasicRef.value?.showDialog(false, form);
      }
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存审核数据失败:', error);
    ElMessage.error('保存失败，请重试');
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
    grid-template-columns: 1fr 1fr 1fr 2fr;
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
    grid-template-columns: 1fr 1fr 1fr 2fr;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    line-height: 24px;

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
