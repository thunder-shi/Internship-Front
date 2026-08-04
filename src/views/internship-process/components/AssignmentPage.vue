<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="pageTitle"
    :no-project-message="noProjectMessage"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    @append-click="handleAppendClick"
    @delete-click="handleDeleteClick"
    @submit-click="handleSubmitClick"
    @view-click="handleViewClick"
    @more2-click="handleBatchSubmitClick"
    @more3-click="handleBatchAppendClick"
    @more4-click="handleImportAppendClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewRelIntershipUser"
      />
      <component
        :is="selectDialogComponent"
        ref="dlgSelectRef"
        :model-value="dlgSelectVisible"
        :current-internship="dlgSelectInternship"
        @update:model-value="dlgSelectVisible = $event"
        @success="onSelectSuccess"
      />
      <el-dialog
        v-model="batchDialogVisible"
        title="批量新增学生"
        width="420px"
        append-to-body
        :close-on-click-modal="false"
      >
        <el-form label-width="90px">
          <el-form-item label="部门选择" required>
            <SimpleTreeSelect
              v-model="selectedDepartmentIds"
              key-words="ViewBaseDepartment"
              :search-keys="departmentSearchKeys"
              :multiple="true"
              :check-strictly="false"
              :lazy="true"
              :auto-prefetch-subtree="true"
              :auto-prefetch-root-only="true"
              :auto-prefetch-max-depth="24"
              placeholder="请选择部门（可多选）"
            />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="batchDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="batchAppendLoading" @click="handleBatchDialogConfirm">
            确定
          </el-button>
        </template>
      </el-dialog>
      <el-dialog
        v-model="importDialogVisible"
        title="导入新增"
        width="480px"
        append-to-body
        :close-on-click-modal="false"
        @closed="resetImportDialog"
      >
        <div
          class="import-dropzone"
          :class="{ 'is-dragover': importDragOver }"
          @click="fileInputRef?.click()"
          @dragenter.prevent="onImportDragEnter"
          @dragover.prevent="onImportDragOver"
          @dragleave.prevent="onImportDragLeave"
          @drop.prevent="onImportDrop"
        >
          <div class="import-dropzone-title">将文件拖到此处，或<em>点击选择</em></div>
          <div class="import-file-tip" @click.stop>
            <span class="import-template-link" @click="downloadImportTemplate">下载模板</span>
            <span>仅支持 xls / xlsx，不超过 5MB</span>
          </div>
          <input
            ref="fileInputRef"
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style="display: none"
            @change="onImportFileChange"
          />
        </div>
        <div v-if="importFile" class="import-file-list">
          <div class="import-file-item">
            <div class="import-file-meta">
              <span class="import-file-name" :title="importFile.name">{{ importFile.name }}</span>
              <span class="import-file-size">{{ formatImportFileSize(importFile.size) }}</span>
            </div>
            <el-button type="danger" link @click="clearImportFile">移除</el-button>
          </div>
        </div>
        <div v-else class="import-file-empty">尚未添加文件</div>
        <template #footer>
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="importLoading" @click="handleImportDialogConfirm">
            确定
          </el-button>
        </template>
      </el-dialog>
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';
import CONSTANT from '@/utils/constant';
import otherAPI from '@/api/other';
import internshipProcessAPI from '@/api/internshipProcess';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { useAssignmentActions } from '@/utils/useAssignmentActions';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { ASSIGNMENT_KEY_WORD } from '../config/assignmentPresets';

defineOptions({
  name: 'AssignmentPage',
});

const { proxy } = getCurrentInstance();
const props = defineProps({
  /** 页面标题，如「学生实习项目安排」 */
  pageTitle: { type: String, required: true },
  /** 无项目时的提示文案 */
  noProjectMessage: { type: String, required: true },
  /** 流程类型：STUDENT_SELECT_INTERNSHIP / TEACHER_SELECT_INTERNALSHIP */
  processTypeCode: { type: String, required: true },
  /** 表格列配置，来自 assignmentPresets */
  tableColumns: { type: Array, required: true },
  /** 选择弹窗组件：DlgStudentSelect 或 DlgTeacherSelect */
  selectDialogComponent: { type: Object, required: true },
  /** 是否显示表头「批量新增」（按部门批量初始化学生名单） */
  showBatchAppend: { type: Boolean, default: true },
  /** 是否显示表头「导入新增」（Excel 导入 RelIntershipUser） */
  showImportAppend: { type: Boolean, default: false },
  /** 导入角色：student / teacher */
  importRole: { type: String, default: 'student' },
});
const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

const {
  headerPageRef,
  isCompanyUser,
  titleObj,
  isMore1Disabled,
  projectSelectSearchKey,
  projectSelectRegKey,
  buildSearchKey,
  handleProjectSelected: baseHandleProjectSelected,
} = useAssignmentPageConfig({
  processTypeCode: props.processTypeCode,
  mainTitle: props.pageTitle,
  withMajorFilter: true,
});

const currentInternship = computed(() => {
  const exposedInternship = headerPageRef.value?.currentInternship;
  // 兼容组件 expose 返回 ref 或已解包对象两种场景
  return exposedInternship?.value ?? exposedInternship ?? null;
});

const dlgSelectRef = ref(null);
const dlgSelectVisible = ref(false);
const dlgSelectInternship = ref(null);
const batchDialogVisible = ref(false);
const batchAppendLoading = ref(false);
const selectedDepartmentIds = ref([]);
const importDialogVisible = ref(false);
const importLoading = ref(false);
const importFile = ref(null);
const importDragOver = ref(false);
const fileInputRef = ref(null);
const departmentSearchKeys = computed(() => {
  const searchKey = {};
  if (userInfo.value.schoolId) {
    searchKey.schoolId = userInfo.value.schoolId;
  }
  return searchKey;
});

const {
  currentRow,
  showProgressDialog,
  handleViewClick,
  handleDeleteClick,
  handleSubmitClick,
  handleBatchSubmitClick,
} = useAssignmentActions(() => headerPageRef.value?.baseListRef?.initDataList(true));

function onSelectSuccess() {
  headerPageRef.value?.baseListRef?.initDataList(true);
}

function handleProjectSelected(internship, title) {
  baseHandleProjectSelected(internship, title);
  dlgSelectInternship.value = internship;
}

const { getVerifyRoleName } = useVerifyFilter();

/** 与列表 nowSearchWords 一致：processTypeCode + internshipId + RelIntershipUser（+ 企业 companyId） */
const submitAllAssignment = computed(() => {
  const cur = currentInternship.value;
  const searchKey = {
    processTypeCode: props.processTypeCode,
    internshipId: cur?.internshipId,
    tableName: 'RelIntershipUser',
    isAudit: String(CONSTANT.AUDIT_STATUS.SAVE),
  };
  const reg = {
    processTypeCode: '=',
    internshipId: '=',
    tableName: '=',
    isAudit: '=',
  };
  if (isCompanyUser.value && userInfo.value?.departmentId) {
    searchKey.companyId = userInfo.value.departmentId;
    reg.companyId = '=';
  }
  return {
    guard: () => {
      if (!currentInternship.value?.internshipId) {
        ElMessage.warning('请先选择实习项目');
        return false;
      }
      return true;
    },
    keyWords: ASSIGNMENT_KEY_WORD.view,
    searchKey,
    reg,
    filterRows: (row) => row.isAudit === CONSTANT.AUDIT_STATUS.SAVE,
    autoPassExtra: {},
    buildConfirmText: (n) => `确定提交当前项目下全部 ${n} 条暂存记录吗？`,
  };
});

const buttonPropsComputed = computed(() => ({
  create: {
    show: true,
    disabled: !currentInternship.value || !currentInternship.value.internshipId,
  },
  submit: { show: true },
  delete: { show: true },
  visible: { show: true, type: 'primary', name: '查看进度' },
  more2: { show: true, name: '批量提交', type: 'primary' },
  more3: {
    show: props.showBatchAppend,
    name: '批量新增',
    type: 'primary',
    disabled: !currentInternship.value || !currentInternship.value.internshipId,
  },
  more4: {
    show: props.showImportAppend,
    name: '导入新增',
    type: 'primary',
    disabled: !currentInternship.value || !currentInternship.value.internshipId,
  },
  more5: {
    show: true,
    name: '全部提交',
    type: 'warning',
    disabled: !currentInternship.value || !currentInternship.value.internshipId,
    submitAll: submitAllAssignment.value,
  },
  more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
}));

const buttonCondition = {
  update: (row) => {
    const isAudit = row?.isAudit;
    return (
      isAudit === null ||
      isAudit === undefined ||
      isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
      isAudit === CONSTANT.AUDIT_STATUS.BACK
    );
  },
};

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: { autoInit: false },
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  defaultDTHProps: {
    buttonProps: buttonPropsComputed.value,
    buttonCondition,
    keyWord: ASSIGNMENT_KEY_WORD,
    allTableColumns: props.tableColumns,
  },
  defaultDBIProps: {},
}));

function handleAppendClick(currentInternshipParam) {
  if (!currentInternshipParam?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgSelectVisible.value = true;
  dlgSelectRef.value?.showDialog(true);
}

function handleBatchAppendClick() {
  if (!currentInternship.value?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  selectedDepartmentIds.value = [];
  batchDialogVisible.value = true;
}

async function handleBatchDialogConfirm() {
  if (!Array.isArray(selectedDepartmentIds.value) || selectedDepartmentIds.value.length === 0) {
    ElMessage.warning('请至少选择一个部门');
    return;
  }
  const internshipId = Number(currentInternship.value?.internshipId);
  const processId = Number(currentInternship.value?.realId);
  const verifyRoleId = Number(currentInternship.value?.verifyFirstRoleId);
  const createUserId = Number(userInfo.value?.id);
  const currentVerifyTypeId =
    currentInternship.value?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('缺少 internshipId，无法批量新增');
    return;
  }
  if (!processId || Number.isNaN(processId)) {
    ElMessage.warning('缺少 processId，无法批量新增');
    return;
  }
  if (!createUserId || Number.isNaN(createUserId)) {
    ElMessage.warning('缺少 createUserId，无法批量新增');
    return;
  }
  const departmentId = selectedDepartmentIds.value
    .map((id) => Number(id))
    .filter((id) => !Number.isNaN(id));
  if (!departmentId.length) {
    ElMessage.warning('部门参数无效，请重新选择');
    return;
  }

  batchAppendLoading.value = true;
  try {
    const res = await otherAPI.batchInitRelIntershipUserFromAvailable({
      internshipId,
      jobCode: 'STUDENT',
      departmentId,
      processId,
      createUserId,
      verifyRoleId,
      currentVerifyTypeId,
    });
    if (!res || res.message !== 'successful') {
      ElMessage.error(res?.message || '批量新增失败');
      return;
    }
    ElMessage.success('批量新增成功');
    batchDialogVisible.value = false;
    headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('批量新增失败:', error);
    ElMessage.error('批量新增失败');
  } finally {
    batchAppendLoading.value = false;
  }
}

function handleImportAppendClick() {
  if (!currentInternship.value?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  resetImportDialog();
  importDialogVisible.value = true;
}

function resetImportDialog() {
  importFile.value = null;
  importDragOver.value = false;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
  }
}

function clearImportFile() {
  resetImportDialog();
}

function formatImportFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function setImportFile(file) {
  if (!file) {
    importFile.value = null;
    return;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['xls', 'xlsx'].includes(ext)) {
    ElMessage.error('上传文件只能是 xls/xlsx 格式');
    resetImportDialog();
    return;
  }
  if (file.size / 1024 / 1024 >= 5) {
    ElMessage.error('上传文件大小不能超过 5 MB');
    resetImportDialog();
    return;
  }
  importFile.value = file;
}

function onImportFileChange(event) {
  setImportFile(event?.target?.files?.[0]);
}

function onImportDragEnter() {
  importDragOver.value = true;
}

function onImportDragOver() {
  importDragOver.value = true;
}

function onImportDragLeave(event) {
  if (event.currentTarget?.contains?.(event.relatedTarget)) return;
  importDragOver.value = false;
}

function onImportDrop(event) {
  importDragOver.value = false;
  const file = event?.dataTransfer?.files?.[0];
  setImportFile(file);
}

async function downloadImportTemplate() {
  try {
    const content = await internshipProcessAPI.downloadRelIntershipUserImportTemplate(
      props.importRole
    );
    const fileName =
      props.importRole === 'teacher'
        ? '老师项目安排导入模板.xlsx'
        : '学生实习项目安排导入模板.xlsx';
    proxy.downloadFile(content, fileName);
  } catch (error) {
    console.error('下载模板失败:', error);
    ElMessage.error('下载模板失败');
  }
}

async function handleImportDialogConfirm() {
  if (!importFile.value) {
    ElMessage.warning('请选择 Excel 文件');
    return;
  }
  const internshipId = Number(currentInternship.value?.internshipId);
  const processId = Number(currentInternship.value?.realId);
  const verifyRoleId = Number(currentInternship.value?.verifyFirstRoleId);
  const createUserId = Number(userInfo.value?.id);
  const currentVerifyTypeId =
    currentInternship.value?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('缺少 internshipId，无法导入');
    return;
  }
  if (!processId || Number.isNaN(processId)) {
    ElMessage.warning('缺少 processId，无法导入');
    return;
  }
  if (!createUserId || Number.isNaN(createUserId)) {
    ElMessage.warning('缺少 createUserId，无法导入');
    return;
  }

  importLoading.value = true;
  try {
    const payload = {
      file: importFile.value,
      internshipId,
      processId,
      createUserId,
      role: props.importRole,
      currentVerifyTypeId,
    };
    if (verifyRoleId && !Number.isNaN(verifyRoleId)) {
      payload.verifyRoleId = verifyRoleId;
    }
    const res = await internshipProcessAPI.importRelIntershipUserByExcel(payload);
    if (!res || res.message !== 'successful') {
      ElMessage.error(res?.message || '导入失败');
      return;
    }
    const result = res.data || {};
    const created = Number(result.createdRelIntershipUserCount) || 0;
    const skipped = Number(result.skippedExistingCount) || 0;
    const failed = Number(result.failedCount) || 0;
    const total = Number(result.totalExcelRowCount) || 0;
    const failures = Array.isArray(result.failures) ? result.failures : [];
    const failureLines = failures.slice(0, 10).map((item) => {
      const row = item?.row != null ? `第${item.row}行` : '未知行';
      const account = item?.account ? `（${item.account}）` : '';
      const reason = item?.reason || '导入失败';
      return `${row}${account}：${reason}`;
    });
    const moreFail =
      failures.length > 10 ? `<div>……其余 ${failures.length - 10} 条失败未展示</div>` : '';
    const html = [
      `<div>Excel 共 ${total} 行</div>`,
      `<div>新增成功 ${created} 条</div>`,
      `<div>已存在跳过 ${skipped} 条</div>`,
      `<div>失败 ${failed} 条</div>`,
      failureLines.length
        ? `<div style="margin-top:8px;text-align:left;">失败明细：<br/>${failureLines.join('<br/>')}${moreFail}</div>`
        : '',
    ].join('');
    importDialogVisible.value = false;
    headerPageRef.value?.baseListRef?.initDataList(true);
    await ElMessageBox.alert(html, '导入结果', {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '知道了',
      type: failed > 0 ? 'warning' : 'success',
    });
  } catch (error) {
    console.error('导入失败:', error);
    const backendMsg = error?.response?.data?.message || error?.message;
    ElMessage.error(backendMsg ? `导入失败，${backendMsg}` : '导入失败');
  } finally {
    importLoading.value = false;
  }
}

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>

<style scoped>
.import-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 140px;
  padding: 20px 16px;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}
.import-dropzone:hover,
.import-dropzone.is-dragover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.import-dropzone-title {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}
.import-dropzone-title em {
  color: var(--el-color-primary);
  font-style: normal;
}
.import-file-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}
.import-template-link {
  color: var(--el-color-primary);
  cursor: pointer;
}
.import-file-list {
  margin-top: 12px;
}
.import-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: #f5f7fa;
}
.import-file-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.import-file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
  font-size: 13px;
  font-weight: 500;
}
.import-file-size {
  color: #909399;
  font-size: 12px;
}
.import-file-empty {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px dashed var(--el-border-color-lighter);
  border-radius: 6px;
  color: #c0c4cc;
  font-size: 13px;
  text-align: center;
}
</style>
