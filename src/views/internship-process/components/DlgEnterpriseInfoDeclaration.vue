<template>
  <DlgBasic
    ref="dlgBasicRef"
    :default-props="defaultProps"
    :dlgbasic-confirm="handleConfirm"
    :dlgbasic-spec-submit="handleSubmit"
    @close-dialog="handleCloseDialog"
  >
    <template #mainForm>
      <div class="enterprise-declaration-dialog">
        <el-alert
          :title="verifyConfigAlertTitle"
          :type="verifyConfigAlertType"
          :closable="false"
          class="mb-16"
        />

        <el-alert
          v-if="verifyConfigReady"
          title="说明：已配置表示审核级数、合作高校与审核角色已齐全；审核人须在合作高校（配置中的学校）下、且具备对应角色。若该校下无可用账号，提交时仍会拦截。"
          type="info"
          :closable="false"
          class="mb-16"
        />

        <el-alert
          v-if="readonlyHint"
          :title="readonlyHint"
          type="warning"
          :closable="false"
          class="mb-16"
        />

        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <el-form ref="formPanelRef" :model="form" :rules="formRules" label-width="120px">
              <el-row :gutter="16">
                <el-col :xs="24" :md="12">
                  <el-form-item label="统一社会信用代码" prop="code">
                    <el-input
                      v-model="form.code"
                      :disabled="!isEditable"
                      maxlength="50"
                      show-word-limit
                      placeholder="请输入统一社会信用代码"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="企业名称" prop="name">
                    <el-input
                      v-model="form.name"
                      :disabled="!isEditable"
                      maxlength="100"
                      show-word-limit
                      placeholder="请输入企业名称"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="联系人" prop="contactName">
                    <el-input
                      v-model="form.contactName"
                      :disabled="!isEditable"
                      maxlength="50"
                      show-word-limit
                      placeholder="请输入联系人"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="联系电话" prop="contactPhone">
                    <el-input
                      v-model="form.contactPhone"
                      :disabled="!isEditable"
                      maxlength="20"
                      show-word-limit
                      placeholder="请输入联系电话"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="联系邮箱" prop="contactEmail">
                    <el-input
                      v-model="form.contactEmail"
                      :disabled="!isEditable"
                      maxlength="100"
                      show-word-limit
                      placeholder="请输入联系邮箱"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="法人" prop="legalPerson">
                    <el-input
                      v-model="form.legalPerson"
                      :disabled="!isEditable"
                      maxlength="50"
                      show-word-limit
                      placeholder="请输入法人"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="行业" prop="industry">
                    <el-input
                      v-model="form.industry"
                      :disabled="!isEditable"
                      maxlength="100"
                      show-word-limit
                      placeholder="请输入行业"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24" :md="12">
                  <el-form-item label="企业规模" prop="companyScale">
                    <el-input
                      v-model="form.companyScale"
                      :disabled="!isEditable"
                      maxlength="100"
                      show-word-limit
                      placeholder="请输入企业规模"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24">
                  <el-form-item label="企业地址" prop="address">
                    <el-input
                      v-model="form.address"
                      :disabled="!isEditable"
                      maxlength="200"
                      show-word-limit
                      placeholder="请输入企业地址"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24">
                  <el-form-item label="经营范围" prop="businessScope">
                    <el-input
                      v-model="form.businessScope"
                      :disabled="!isEditable"
                      type="textarea"
                      :rows="3"
                      maxlength="1000"
                      show-word-limit
                      placeholder="请输入经营范围"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24">
                  <el-form-item label="企业简介" prop="introduction">
                    <el-input
                      v-model="form.introduction"
                      :disabled="!isEditable"
                      type="textarea"
                      :rows="4"
                      maxlength="2000"
                      show-word-limit
                      placeholder="请输入企业简介"
                    />
                  </el-form-item>
                </el-col>
                <el-col :xs="24">
                  <el-form-item label="备注">
                    <el-input
                      v-model="form.remarks"
                      :disabled="!isEditable"
                      type="textarea"
                      :rows="3"
                      maxlength="500"
                      show-word-limit
                      placeholder="可填写补充说明"
                    />
                  </el-form-item>
                </el-col>
              </el-row>
            </el-form>
          </el-tab-pane>

          <el-tab-pane label="附件材料" name="files">
            <div class="upload-toolbar">
              <input
                ref="fileInputRef"
                type="file"
                multiple
                :accept="acceptStr"
                style="display: none"
                @change="handleNativeFileChange"
              />
              <el-button :disabled="!isEditable" type="primary" plain @click="fileInputRef?.click()">
                选择文件
              </el-button>
              <el-button
                :disabled="!isEditable || !pendingFiles.length"
                type="primary"
                :loading="uploading"
                @click="handleUploadFiles"
              >
                上传附件
              </el-button>
              <span class="upload-tip">请先保存草稿，再上传营业执照等证明材料。</span>
              <span class="upload-tip">提交审核前至少上传 1 个附件。</span>
            </div>

            <el-progress
              v-if="uploading"
              :percentage="uploadProgress"
              :stroke-width="18"
              status="success"
              class="mb-16"
            />

            <div v-if="!totalFileCount" class="empty-text">暂无附件</div>
            <div v-else class="file-grid">
              <el-tooltip
                v-for="file in existingFiles"
                :key="`existing_${file.id}`"
                :content="file.name"
                placement="top"
                :show-after="400"
              >
                <div class="file-card">
                  <div
                    class="file-badge"
                    :style="{ background: fileBadge(file.name).bg, fontSize: badgeFontSize(fileBadge(file.name).text) }"
                  >
                    {{ fileBadge(file.name).text }}
                  </div>
                  <span class="file-card-name">{{ file.name }}</span>
                  <div class="file-card-actions">
                    <el-icon class="action-icon" title="预览" @click.stop="triggerPreview(file)"><View /></el-icon>
                    <el-icon class="action-icon" title="下载" @click.stop="triggerDownload(file)"><Download /></el-icon>
                  </div>
                  <span
                    v-if="isEditable"
                    class="file-card-remove"
                    @click.stop="deleteExistingFile(file)"
                  >
                    <el-icon><Close /></el-icon>
                  </span>
                </div>
              </el-tooltip>

              <el-tooltip
                v-for="(file, index) in pendingFiles"
                :key="`pending_${index}`"
                :content="file.name"
                placement="top"
                :show-after="400"
              >
                <div class="file-card pending-card">
                  <div
                    class="file-badge"
                    :style="{ background: fileBadge(file.name).bg, fontSize: badgeFontSize(fileBadge(file.name).text) }"
                  >
                    {{ fileBadge(file.name).text }}
                  </div>
                  <span class="file-card-name">{{ file.name }}</span>
                  <div class="file-card-pending">待上传</div>
                  <span class="file-card-remove" @click.stop="removePendingFile(index)">
                    <el-icon><Close /></el-icon>
                  </span>
                </div>
              </el-tooltip>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
  </DlgBasic>
</template>

<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue';
import { Close, Download, View } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import fileAPI from '@/api/file';
import CONSTANT from '@/utils/constant';
import { checkPhone } from '@/utils/formRules';
import { clearEnterpriseMineCache } from '@/utils/enterpriseAccess';
import { useDiaryFiles } from '@/utils/useDiaryFiles';
import {
  ENTERPRISE_TABLE_NAME,
  badgeFontSize,
  buildEnterpriseSnapshot,
  fileBadge,
  isEnterpriseVerifyConfigReady,
  normalizeDetailPayload,
  normalizeRecord,
  resolveAuditStatus,
} from '@/utils/enterpriseInfoView';

defineOptions({
  name: 'DlgEnterpriseInfoDeclaration',
});

const MAX_FILE_COUNT = 10;
const MAX_SINGLE_MB = CONSTANT.FILE_MAX_SIZE;
const MAX_SINGLE_SIZE = MAX_SINGLE_MB * 1024 * 1024;
const ALLOWED_EXTS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'zip',
  'rar',
  '7z',
];

const acceptStr = ALLOWED_EXTS.map((item) => `.${item}`).join(',');

const props = defineProps({
  verifyConfig: {
    type: Object,
    default: () => ({}),
  },
  mineData: {
    type: Object,
    default: () => ({}),
  },
  currentApproved: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['success', 'close-dialog']);

const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const fileInputRef = ref(null);
const activeTab = ref('basic');
const uploading = ref(false);
const uploadProgress = ref(0);
const uploadTimer = ref(null);
const pendingFiles = ref([]);
const currentMode = ref('append');
const currentStatus = ref(CONSTANT.AUDIT_STATUS.SAVE);

const defaultProps = reactive({
  dlgTitle: '企业信息申报',
  width: '72%',
  footButtons: {
    cancel: { show: true, name: '取消', type: '' },
    close: { show: false, name: '关闭', type: 'primary' },
    confirm: { show: true, name: '保存草稿', type: 'primary' },
    submit: { show: true, name: '提交审核', type: 'success' },
    repeatAdd: { show: false },
  },
  someFlags: {
    needValidate: false,
    needVerifyUpdate: true,
    autoMax: false,
    needMaxBtn: true,
  },
});

const form = reactive({
  enterpriseInfoId: null,
  code: '',
  name: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  legalPerson: '',
  industry: '',
  companyScale: '',
  businessScope: '',
  introduction: '',
  remarks: '',
});

const formRules = {
  code: [
    { required: true, message: '请输入统一社会信用代码', trigger: 'blur' },
    { min: 10, max: 50, message: '统一社会信用代码长度不正确', trigger: 'blur' },
  ],
  name: [{ required: true, message: '请输入企业名称', trigger: 'blur' }],
  contactName: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  contactPhone: [{ required: true, validator: checkPhone, trigger: 'blur' }],
  contactEmail: [
    { required: true, message: '请输入联系邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] },
  ],
  address: [{ required: true, message: '请输入企业地址', trigger: 'blur' }],
  legalPerson: [{ required: true, message: '请输入法人', trigger: 'blur' }],
  industry: [{ required: true, message: '请输入行业', trigger: 'blur' }],
  companyScale: [{ required: true, message: '请输入企业规模', trigger: 'blur' }],
  businessScope: [{ required: true, message: '请输入经营范围', trigger: 'blur' }],
  introduction: [{ required: true, message: '请输入企业简介', trigger: 'blur' }],
};

const {
  files: existingFiles,
  loadFiles,
  triggerDownload,
  triggerPreview,
  deleteFile: deleteExistingFile,
  reset: resetExistingFiles,
} = useDiaryFiles(ENTERPRISE_TABLE_NAME);

const isEditable = computed(() => currentMode.value !== 'view');
const totalFileCount = computed(() => existingFiles.value.length + pendingFiles.value.length);
const verifyConfigReady = computed(() => isEnterpriseVerifyConfigReady(props.verifyConfig));
const verifyConfigAlertType = computed(() => (verifyConfigReady.value ? 'info' : 'warning'));
const verifyConfigAlertTitle = computed(() => {
  if (verifyConfigReady.value) {
    return `当前审核级数：${props.verifyConfig?.verifyTypeName || '已配置'}；合作高校已维护。提交后按审核链路在高校范围内匹配审核人。`;
  }
  return '企业信息审核流程未配置或不完整（含合作高校），请联系学校管理员在「企业信息审核配置」中完成审核级数、合作高校与审核角色后再提交申请。';
});
const readonlyHint = computed(() => {
  if (isEditable.value) return '';
  if (currentStatus.value === CONSTANT.AUDIT_STATUS.SUBMIT) {
    return '当前申报记录审核中，暂不可修改。';
  }
  if (currentStatus.value === CONSTANT.AUDIT_STATUS.PASS) {
    return '当前记录已审核通过，如需变更请新建一版草稿后重新申报。';
  }
  if (currentStatus.value === CONSTANT.AUDIT_STATUS.NOTPASS) {
    return '当前记录未通过，建议新建一版草稿后重新申报。';
  }
  return '';
});

function syncDialogButtons() {
  if (isEditable.value) {
    defaultProps.footButtons.cancel.show = true;
    defaultProps.footButtons.close.show = false;
    defaultProps.footButtons.confirm.show = true;
    defaultProps.footButtons.submit.show = true;
    defaultProps.footButtons.submit.name =
      currentStatus.value === CONSTANT.AUDIT_STATUS.BACK ? '重新提交审核' : '提交审核';
  } else {
    defaultProps.footButtons.cancel.show = false;
    defaultProps.footButtons.close.show = true;
    defaultProps.footButtons.confirm.show = false;
    defaultProps.footButtons.submit.show = false;
  }
}

function fillForm(snapshot = {}) {
  form.enterpriseInfoId = snapshot.enterpriseInfoId ?? null;
  form.code = snapshot.code || '';
  form.name = snapshot.name || '';
  form.contactName = snapshot.contactName || '';
  form.contactPhone = snapshot.contactPhone || '';
  form.contactEmail = snapshot.contactEmail || '';
  form.address = snapshot.address || '';
  form.legalPerson = snapshot.legalPerson || '';
  form.industry = snapshot.industry || '';
  form.companyScale = snapshot.companyScale || '';
  form.businessScope = snapshot.businessScope || '';
  form.introduction = snapshot.introduction || '';
  form.remarks = snapshot.remarks || '';
}

function buildPayload() {
  const payload = {
    code: form.code.trim(),
    name: form.name.trim(),
    contactName: form.contactName.trim(),
    contactPhone: form.contactPhone.trim(),
    contactEmail: form.contactEmail.trim(),
    address: form.address.trim(),
    legalPerson: form.legalPerson.trim(),
    industry: form.industry.trim(),
    companyScale: form.companyScale.trim(),
    businessScope: form.businessScope.trim(),
    introduction: form.introduction.trim(),
    remarks: form.remarks.trim(),
  };
  if (form.enterpriseInfoId) {
    payload.enterpriseInfoId = form.enterpriseInfoId;
  }
  return payload;
}

function buildSubmitPayload() {
  return {
    enterpriseInfoId: form.enterpriseInfoId,
  };
}

function resetUploadProgress() {
  uploadProgress.value = 0;
  if (uploadTimer.value) {
    clearInterval(uploadTimer.value);
    uploadTimer.value = null;
  }
}

function startUploadProgress() {
  resetUploadProgress();
  uploadTimer.value = setInterval(() => {
    uploadProgress.value = fileAPI.getProgressPercent();
  }, 300);
}

async function syncExistingFiles() {
  if (form.enterpriseInfoId) {
    await loadFiles(form.enterpriseInfoId);
  } else {
    resetExistingFiles();
  }
}

async function loadRecordDetail(enterpriseInfoId, fallbackRow = {}) {
  if (!enterpriseInfoId) {
    return normalizeRecord(fallbackRow);
  }
  const res = await enterpriseInfoAPI.detail({ enterpriseInfoId });
  return normalizeDetailPayload(res?.data || {}, fallbackRow);
}

async function applyRecord(record, mode) {
  const normalized = normalizeRecord(record);
  currentStatus.value = resolveAuditStatus(normalized);
  currentMode.value = mode;
  syncDialogButtons();
  fillForm(buildEnterpriseSnapshot(normalized, props.mineData || {}));
  await syncExistingFiles();
  dlgBasicRef.value?.cloneOldData?.();
}

async function saveDraftRequest(showMessage = true) {
  const res = await enterpriseInfoAPI.saveDraft(buildPayload());
  if (res?.message !== 'successful') {
    return false;
  }

  const savedRecord = normalizeDetailPayload(res?.data || {}, buildPayload());
  currentMode.value = 'edit';
  currentStatus.value = resolveAuditStatus(savedRecord);
  syncDialogButtons();
  fillForm(buildEnterpriseSnapshot(savedRecord, props.mineData || {}));
  await syncExistingFiles();
  clearEnterpriseMineCache();
  dlgBasicRef.value?.cloneOldData?.();

  if (showMessage) {
    ElMessage.success('草稿保存成功');
  }
  emit('success');
  return true;
}

function validateFile(file) {
  const ext = file.name?.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTS.includes(ext)) {
    ElMessage.warning(`不支持 .${ext} 格式`);
    return false;
  }
  if (file.size > MAX_SINGLE_SIZE) {
    ElMessage.warning(`附件“${file.name}”超过 ${MAX_SINGLE_MB}MB，请重新选择`);
    return false;
  }
  if (totalFileCount.value >= MAX_FILE_COUNT) {
    ElMessage.warning(`最多上传 ${MAX_FILE_COUNT} 个附件`);
    return false;
  }
  const exists = existingFiles.value.some((item) => item.name === file.name);
  const queued = pendingFiles.value.some((item) => item.name === file.name && item.size === file.size);
  if (exists || queued) {
    ElMessage.warning(`附件“${file.name}”已存在`);
    return false;
  }
  return true;
}

function handleNativeFileChange(event) {
  const files = Array.from(event.target.files || []);
  files.forEach((file) => {
    if (!validateFile(file)) return;
    pendingFiles.value.push({
      name: file.name,
      size: file.size,
      raw: file,
    });
  });
  event.target.value = '';
}

function removePendingFile(index) {
  pendingFiles.value.splice(index, 1);
}

async function handleUploadFiles() {
  if (!pendingFiles.value.length) {
    ElMessage.warning('请先选择待上传的附件');
    return false;
  }

  uploading.value = true;
  startUploadProgress();
  try {
    const saved = await saveDraftRequest(false);
    if (!saved || !form.enterpriseInfoId) {
      throw new Error('草稿保存失败，附件无法上传');
    }

    const files = pendingFiles.value.map((item) => item.raw).filter(Boolean);
    await fileAPI.upload({
      files,
      relationIds: form.enterpriseInfoId,
      tableName: ENTERPRISE_TABLE_NAME,
    });

    uploadProgress.value = 100;
    pendingFiles.value = [];
    await syncExistingFiles();
    ElMessage.success('附件上传成功');
    return true;
  } catch (error) {
    console.error('企业信息附件上传失败:', error);
    ElMessage.error('附件上传失败');
    return false;
  } finally {
    uploading.value = false;
    resetUploadProgress();
  }
}

async function handleConfirm() {
  await saveDraftRequest(true);
  return false;
}

async function handleSubmit() {
  if (!verifyConfigReady.value) {
    ElMessage.warning('企业信息审核流程未配置，请联系学校管理员先完成流程配置');
    return false;
  }

  try {
    await formPanelRef.value?.validate();
  } catch {
    activeTab.value = 'basic';
    return false;
  }

  if (pendingFiles.value.length > 0) {
    const uploaded = await handleUploadFiles();
    if (!uploaded) {
      activeTab.value = 'files';
      return false;
    }
  }

  if (!existingFiles.value.length) {
    activeTab.value = 'files';
    ElMessage.warning('提交审核前请至少上传 1 个附件');
    return false;
  }

  const isBackResubmit =
    currentStatus.value === CONSTANT.AUDIT_STATUS.BACK && form.enterpriseInfoId;
  const res = isBackResubmit
    ? await enterpriseInfoAPI.resubmit(buildSubmitPayload())
    : await enterpriseInfoAPI.submit(buildSubmitPayload());

  if (res?.message !== 'successful') {
    return false;
  }

  ElMessage.success(isBackResubmit ? '重新提交成功' : '提交成功');
  clearEnterpriseMineCache();
  emit('success');
  return true;
}

async function showDialog(val, row = {}, options = {}) {
  if (!val) {
    dlgBasicRef.value?.showDialog(false, form, 'edit');
    return;
  }

  const normalizedRow = normalizeRecord(row);
  const mode = options.mode || 'append';
  const prefillSource = options.prefillSource || normalizedRow || {};

  activeTab.value = 'basic';
  pendingFiles.value = [];
  resetExistingFiles();
  currentMode.value = mode;
  currentStatus.value = resolveAuditStatus(normalizedRow);
  defaultProps.dlgTitle =
    mode === 'append' ? '新增企业信息申报' : mode === 'view' ? '查看企业信息' : '编辑企业信息';
  syncDialogButtons();

  if (mode === 'append') {
    fillForm({
      ...buildEnterpriseSnapshot(prefillSource, props.mineData || {}),
      enterpriseInfoId: null,
    });
    dlgBasicRef.value?.showDialog(true, form, 'append');
    await syncExistingFiles();
    dlgBasicRef.value?.cloneOldData?.();
    return;
  }

  dlgBasicRef.value?.showDialog(true, form, 'edit');
  const detail = await loadRecordDetail(normalizedRow.enterpriseInfoId, normalizedRow);
  await applyRecord(detail, mode);
}

function handleCloseDialog() {
  emit('close-dialog');
}

onBeforeUnmount(() => {
  resetUploadProgress();
});

defineExpose({
  showDialog,
});
</script>

<style scoped>
.enterprise-declaration-dialog {
  min-height: 460px;
}

.mb-16 {
  margin-bottom: 16px;
}

.upload-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.upload-tip,
.empty-text {
  color: #909399;
  font-size: 13px;
}

.file-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.file-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 90px;
  padding: 10px 8px 8px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}

.file-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
}

.pending-card {
  background: #fff7e6;
  border-color: #f5c06a;
}

.file-badge {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  letter-spacing: -0.5px;
  margin-bottom: 6px;
  flex-shrink: 0;
  user-select: none;
}

.file-card-name {
  font-size: 11px;
  color: #606266;
  text-align: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.file-card-pending {
  margin-top: 4px;
  font-size: 11px;
  color: #e6a23c;
}

.file-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.file-card:hover .file-card-actions {
  opacity: 1;
}

.file-card-remove {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
  cursor: pointer;
  color: #fff;
  font-size: 11px;
}

.file-card:hover .file-card-remove {
  opacity: 1;
  background: rgba(245, 108, 108, 0.85);
}

.action-icon {
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  transition: color 0.15s, background 0.15s;
}

.action-icon:hover {
  color: #409eff;
  background: #ecf5ff;
}
</style>
