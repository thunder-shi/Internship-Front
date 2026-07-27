<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="pageTitle"
    :no-project-message="noProjectMessage"
    :pending-select-message="pendingSelectMessage"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="isCompanyUser"
    :process-type-code="processTypeCode"
    :before-refresh-on-project-selected="beforeRefreshOnProjectSelected"
    @project-selected="handleProjectSelectedWrap"
    @append-click="handleAppendClick"
    @submit-click="handleRowSubmitClick"
    @more2-click="handleBatchSubmitClick"
    @more3-click="handleSystemAssign"
    @more4-click="handleManualAssign"
    @after-init-data="handleListAfterInit"
    @view-click="handleViewClick"
  >
    <template #rightOperate="{ row }">
      <slot name="rightOperate" :row="row" />
    </template>
    <template #dialogs>
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        :key-words="progressKeyWords"
      />
      <slot name="dialogsExtra" />
      <el-dialog
        v-model="manualAssignDialogVisible"
        title="手动分配"
        width="620px"
        destroy-on-close
      >
        <el-form label-width="120px" class="manual-assign-form">
          <el-form-item label="选择老师部门" required>
            <el-cascader
              v-model="manualAssignForm.teacherDeptPath"
              class="w-100"
              :options="departmentOptions"
              :props="departmentCascaderProps"
              clearable
              filterable
              @change="onTeacherDeptChange"
            />
          </el-form-item>
          <el-form-item label="选择老师" required>
            <el-select
              v-model="manualAssignForm.teacherId"
              class="w-100"
              placeholder="请选择老师"
              :disabled="!teacherOptions.length"
              filterable
              clearable
            >
              <el-option
                v-for="teacher in teacherOptions"
                :key="teacher.id"
                :label="teacher.name"
                :value="teacher.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item v-if="!manualAssignTeacherOnly" label="选择学生部门" required>
            <el-cascader
              v-model="manualAssignForm.studentDeptPath"
              class="w-100"
              :options="departmentOptions"
              :props="departmentCascaderProps"
              clearable
              filterable
              @change="onStudentDeptChange"
            />
          </el-form-item>
          <el-form-item v-if="!manualAssignTeacherOnly" label="选择学生" required>
            <el-select
              v-model="manualAssignForm.studentIds"
              class="w-100"
              placeholder="请选择学生（可多选）"
              :disabled="!studentOptions.length"
              filterable
              clearable
              multiple
            >
              <el-option
                v-for="student in studentOptions"
                :key="student.id"
                :label="student.name"
                :value="student.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="manualAssignDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="manualAssignSubmitting" @click="confirmManualAssign">
            确定
          </el-button>
        </template>
      </el-dialog>
      <el-dialog
        v-model="importAssignDialogVisible"
        title="导入分配"
        width="480px"
        append-to-body
        :close-on-click-modal="false"
        @closed="resetImportAssignDialog"
      >
        <div
          class="import-dropzone"
          :class="{ 'is-dragover': importAssignDragOver }"
          @click="importAssignFileInputRef?.click()"
          @dragenter.prevent="onImportAssignDragEnter"
          @dragover.prevent="onImportAssignDragOver"
          @dragleave.prevent="onImportAssignDragLeave"
          @drop.prevent="onImportAssignDrop"
        >
          <div class="import-dropzone-title">将文件拖到此处，或<em>点击选择</em></div>
          <div class="import-file-tip" @click.stop>
            <span class="import-template-link" @click="downloadImportAssignTemplate">下载模板</span>
            <span>仅支持 xls / xlsx，不超过 5MB</span>
          </div>
          <input
            ref="importAssignFileInputRef"
            type="file"
            accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            style="display: none"
            @change="onImportAssignFileChange"
          />
        </div>
        <div v-if="importAssignFile" class="import-file-list">
          <div class="import-file-item">
            <div class="import-file-meta">
              <span class="import-file-name" :title="importAssignFile.name">{{
                importAssignFile.name
              }}</span>
              <span class="import-file-size">{{ formatImportFileSize(importAssignFile.size) }}</span>
            </div>
            <el-button type="danger" link @click="clearImportAssignFile">移除</el-button>
          </div>
        </div>
        <div v-else class="import-file-empty">尚未添加文件</div>
        <template #footer>
          <el-button @click="importAssignDialogVisible = false">取消</el-button>
          <el-button
            type="primary"
            :loading="importAssignLoading"
            @click="handleImportAssignConfirm"
          >
            确定
          </el-button>
        </template>
      </el-dialog>
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { computed, getCurrentInstance, reactive, ref, unref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { initDiariesByInternship } from '@/api/diary';
import { runSubmitAllByQuery } from '@/utils/submitAllByQuery';

const props = defineProps({
  processTypeCode: { type: String, required: true },
  pageTitle: { type: String, required: true },
  noProjectMessage: { type: String, required: true },
  pendingSelectMessage: { type: String, default: '当前实习项目：待选择' },
  mainTitle: { type: String, required: true },
  /** 列表视图：校内 ViewVerifyProcessRelIntTeacherStudentMerge / 企业 ViewVerifyProcessRelEntTeacherStudentMerge */
  listKeyWord: {
    type: Object,
    required: true,
    validator: (v) => v && typeof v.edit === 'string' && typeof v.view === 'string',
  },
  /** 已废弃：改由 listKeyWord 对应的后端视图区分数据；仅在与 nowSearchWords 合并时仍可传 */
  initSearchWords: {
    type: Object,
    default: () => ({ searchKey: {}, regKey: {}, andor: {} }),
  },
  progressKeyWords: { type: String, default: 'ViewVerifyProcessRelTeacherStudent' },

  systemAssignMode: {
    type: String,
    default: 'manual', // 'manual' | 'autoOnEmpty'
    validator: (v) => ['manual', 'autoOnEmpty'].includes(v),
  },

  // submit 按钮行条件，满足则可提交
  submitRowCondition: { type: Function, default: null },

  /** 选择项目后、刷新表格前的初始化逻辑（可选） */
  beforeRefreshOnProjectSelected: { type: Function, default: null },

  /** listAssignableTeachers 的岗位筛选：校内 SCHOOL_TEACHER / 企业 COMPANY_TUTOR */
  assignableTeacherJobCode: {
    type: String,
    default: () => CONSTANT.USER_JOB_CODE.SCHOOL_TEACHER,
  },

  /** 是否显示表头「导入分配」 */
  showImportAssign: { type: Boolean, default: false },
});

defineOptions({
  name: 'TutorAssignmentBase',
});

const { proxy } = getCurrentInstance();
const store = useStore();
const { getVerifyRoleName } = useVerifyFilter();

const autoAssignLocked = ref(false);
const assigning = ref(false);
const manualAssignSubmitting = ref(false);
const manualAssignDialogVisible = ref(false);
const departmentOptions = ref([]);
const teacherOptions = ref([]);
const studentOptions = ref([]);
const manualAssignTargetRow = ref(null);
const manualAssignTeacherOnly = ref(false);
const importAssignDialogVisible = ref(false);
const importAssignLoading = ref(false);
const importAssignFile = ref(null);
const importAssignDragOver = ref(false);
const importAssignFileInputRef = ref(null);
const departmentCascaderProps = {
  value: 'id',
  label: 'name',
  children: 'children',
  checkStrictly: true,
  emitPath: true,
};
const manualAssignForm = reactive({
  teacherDeptPath: [],
  teacherId: null,
  studentDeptPath: [],
  studentIds: [],
});

const showProgressDialog = ref(false);
const currentRow = reactive({});

const {
  headerPageRef,
  isCompanyUser,
  titleObj,
  projectSelectSearchKey,
  projectSelectRegKey,
  isMore1Disabled,
  handleProjectSelected,
  buildSearchKey: baseBuildSearchKey,
} = useAssignmentPageConfig({
  processTypeCode: props.processTypeCode,
  mainTitle: props.mainTitle,
  withMajorFilter: false,
});

const buildSearchKey = (baseSearchKey) => {
  return {
    ...baseBuildSearchKey(baseSearchKey),
    internshipId: baseSearchKey?.internshipId,
    tableName: 'RelTeacherStudent',
  };
};

function handleProjectSelectedWrap(internship, title) {
  if (props.systemAssignMode === 'autoOnEmpty') {
    autoAssignLocked.value = false;
  }
  handleProjectSelected(internship, title);
}

function getSubmitStatus(row) {
  return row?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY;
}

/**
 * 全量 /diary/init-by-internship 会大事务改 main_verify_process，易锁等待。
 * 系统分配 / 手动分配 / Excel 导入后端已 ensureDiaryEntries，勿再调。
 * 仅「行内只改老师」（editOneNode，未走分配接口）时补一次，用于刷新日志审核人。
 */
async function initDiaryPlaceholders(internshipId) {
  try {
    await initDiariesByInternship({ internshipId });
  } catch (error) {
    console.error('初始化日志占位失败:', error);
  }
}

async function updateVerifyProcessStatus(rows, isBatch = false) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  const pendingRows = rowsArray.filter((row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE);
  const allowedRows = props.submitRowCondition
    ? pendingRows.filter((row) => props.submitRowCondition(row))
    : pendingRows;

  if (!pendingRows.length) {
    ElMessage.warning(
      isBatch
        ? `选中的记录中没有"${CONSTANT.AUDIT_STATUS.SAVENAME}"状态可以提交的记录`
        : '该记录已提交，不能再次提交'
    );
    return;
  }
  if (pendingRows.length > 0 && allowedRows.length === 0) {
    ElMessage.warning(isBatch ? '选中的记录不满足提交条件' : '当前记录不满足提交条件');
    return;
  }

  if (isBatch && pendingRows.length > allowedRows.length) {
    ElMessage.warning(`已跳过 ${pendingRows.length - allowedRows.length} 条不满足提交条件的记录`);
  }

  try {
    const nodes = allowedRows.map((row) => ({
      id: row.id,
      isAudit: getSubmitStatus(row),
    }));
    const resInfo = await listAPI.editManyNodes('MainVerifyProcess', nodes);
    if (resInfo && resInfo.message === 'successful') {
      ElMessage.success(isBatch ? `批量提交完成，共成功提交 ${nodes.length} 条记录` : '提交成功');
      await headerPageRef.value?.baseListRef?.initDataList(true);
    } else {
      ElMessage.warning(
        resInfo?.message || (isBatch ? '批量更新审核状态失败' : '更新审核状态失败')
      );
    }
  } catch (error) {
    console.error(isBatch ? '批量提交失败:' : '提交失败:', error);
    ElMessage.error(isBatch ? '批量提交失败' : '提交失败');
  }
}

function handleRowSubmitClick(row) {
  void updateVerifyProcessStatus(row, false);
}

function handleBatchSubmitClick(rows) {
  void updateVerifyProcessStatus(rows, true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  Object.keys(currentRow).forEach((k) => delete currentRow[k]);
  Object.assign(currentRow, row ? { ...row } : {});
  showProgressDialog.value = true;
}

async function runSystemAssign() {
  // 仅「分配校内导师」等 manual 页展示系统分配按钮；企业导师 autoOnEmpty 不走此接口
  if (props.systemAssignMode !== 'manual') {
    return;
  }

  const cur = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  const processId = Number(cur?.processId ?? cur?.realId ?? cur?.id);
  const createUserId = Number(store.getters.userInfo?.id);
  const verifyRoleId = cur?.verifyFirstRoleId;
  const currentVerifyTypeId =
    cur?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;

  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('请先选择实习项目后再进行系统分配');
    return;
  }
  if (!processId || Number.isNaN(processId)) {
    ElMessage.warning('当前实习项目缺少流程信息，无法系统分配');
    return;
  }
  if (assigning.value) return;
  assigning.value = true;

  try {
    const verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
      // 部分业务（如企业导师分配）需要基于当前实习项目获取审核人
      internshipId,
    });
    const verifyUserId = verifyResp?.data ?? verifyResp;

    const payload = {
      internshipId,
      processId,
      createUserId,
      verifyUserId,
      currentVerifyTypeId,
    };

    const res = await internshipProcessAPI.initTeacherStudentByInternshipId(payload);
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '系统分配失败');
      return;
    }

    ElMessage.success('系统分配成功');
    await headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('系统分配失败:', error);
    ElMessage.error('系统分配失败');
  } finally {
    assigning.value = false;
  }
}

function handleSystemAssign() {
  void runSystemAssign();
}

function getLastCascaderValue(path) {
  if (!Array.isArray(path) || path.length === 0) return null;
  return path[path.length - 1];
}

function buildDepartmentTree(flatList) {
  const nodeMap = new Map();
  const roots = [];
  flatList.forEach((item) => {
    nodeMap.set(item.id, {
      id: item.id,
      name: item.name || item.departmentName || `部门${item.id}`,
      children: [],
    });
  });
  flatList.forEach((item) => {
    const node = nodeMap.get(item.id);
    const parentId = item.parentId ?? item.pid ?? item.parentDepartmentId;
    if (parentId != null && parentId !== '' && nodeMap.has(parentId)) {
      nodeMap.get(parentId).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

async function loadDepartmentOptions() {
  if (departmentOptions.value.length) return;
  const res = await listAPI.getSomeRecords({
    keyWords: 'BaseDepartment',
    pageInfo: { page: 1, size: 5000 },
    sort: { properties: 'id', direction: 'ASC' },
  });
  const list = res?.data?.content || res?.data || [];
  departmentOptions.value = buildDepartmentTree(list);
}

function pickFirstNonEmpty(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function mapAssignableUserOptions(list, role) {
  const map = new Map();
  list.forEach((row) => {
    const id = pickFirstNonEmpty(row, [
      'userId',
      'id',
      role === 'teacher' ? 'teacherId' : 'studentId',
    ]);
    const name = pickFirstNonEmpty(row, [
      'userName',
      'name',
      role === 'teacher' ? 'teacherName' : 'studentName',
    ]);
    if (id == null || !name) return;
    if (!map.has(id)) map.set(id, { id, name });
  });
  return Array.from(map.values());
}

async function loadRoleOptionsByDepartment(role, departmentId) {
  const cur = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('请先选择实习项目');
    return [];
  }
  if (!departmentId) return [];
  const payload = { internshipId, departmentId };
  if (role === 'teacher' && props.assignableTeacherJobCode) {
    payload.jobCode = props.assignableTeacherJobCode;
  }
  const res =
    role === 'teacher'
      ? await internshipProcessAPI.listAssignableTeachers(payload)
      : await internshipProcessAPI.listAssignableStudents(payload);
  const list = res?.data?.rows || res?.data?.content || res?.data || [];
  return mapAssignableUserOptions(list, role);
}

function resetManualAssignForm() {
  manualAssignForm.teacherDeptPath = [];
  manualAssignForm.teacherId = null;
  manualAssignForm.studentDeptPath = [];
  manualAssignForm.studentIds = [];
  teacherOptions.value = [];
  studentOptions.value = [];
}

function buildDepartmentPathById(targetId) {
  const normalizedTargetId = Number(targetId);
  if (!normalizedTargetId || !departmentOptions.value.length) return [];
  const path = [];
  const dfs = (nodes, currentPath) => {
    for (const node of nodes) {
      const nextPath = [...currentPath, node.id];
      if (Number(node.id) === normalizedTargetId) {
        path.push(...nextPath);
        return true;
      }
      if (Array.isArray(node.children) && node.children.length && dfs(node.children, nextPath)) {
        return true;
      }
    }
    return false;
  };
  dfs(departmentOptions.value, []);
  return path;
}

async function preloadManualAssignRow(row) {
  if (!row) return;
  const studentDepartmentId = pickFirstNonEmpty(row, [
    'studentDepartmentId',
    'studentDeptId',
    'departmentId',
  ]);
  const teacherDepartmentId = pickFirstNonEmpty(row, ['teacherDepartmentId', 'teacherDeptId']);
  const studentId = pickFirstNonEmpty(row, ['studentId']);
  const teacherId = pickFirstNonEmpty(row, ['teacherId']);

  if (teacherDepartmentId) {
    manualAssignForm.teacherDeptPath = buildDepartmentPathById(teacherDepartmentId);
    teacherOptions.value = await loadRoleOptionsByDepartment('teacher', teacherDepartmentId);
    manualAssignForm.teacherId =
      teacherId && teacherOptions.value.some((item) => String(item.id) === String(teacherId))
        ? teacherId
        : null;
  }

  if (studentDepartmentId) {
    manualAssignForm.studentDeptPath = buildDepartmentPathById(studentDepartmentId);
    studentOptions.value = await loadRoleOptionsByDepartment('student', studentDepartmentId);
    if (studentId && studentOptions.value.some((item) => String(item.id) === String(studentId))) {
      manualAssignForm.studentIds = [studentId];
    }
  }
}

async function openManualAssignDialog(row = null, options = {}) {
  try {
    await loadDepartmentOptions();
    resetManualAssignForm();
    manualAssignTargetRow.value = row || null;
    manualAssignTeacherOnly.value = options.teacherOnly === true;
    if (row) {
      await preloadManualAssignRow(row);
    }
    manualAssignDialogVisible.value = true;
  } catch (error) {
    console.error('打开手动分配弹窗失败:', error);
    ElMessage.error('打开手动分配弹窗失败');
  }
}

async function handleManualAssign(row) {
  await openManualAssignDialog(Array.isArray(row) ? null : row, { teacherOnly: false });
}

function handleAppendClick() {
  if (props.showImportAssign) {
    handleImportAssignClick();
    return;
  }
  handleBatchSubmitClick();
}

function handleImportAssignClick() {
  const cur = unref(headerPageRef.value?.currentInternship);
  if (!cur?.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  resetImportAssignDialog();
  importAssignDialogVisible.value = true;
}

function resetImportAssignDialog() {
  importAssignFile.value = null;
  importAssignDragOver.value = false;
  if (importAssignFileInputRef.value) {
    importAssignFileInputRef.value.value = '';
  }
}

function clearImportAssignFile() {
  resetImportAssignDialog();
}

function formatImportFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function setImportAssignFile(file) {
  if (!file) {
    importAssignFile.value = null;
    return;
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['xls', 'xlsx'].includes(ext)) {
    ElMessage.error('上传文件只能是 xls/xlsx 格式');
    resetImportAssignDialog();
    return;
  }
  if (file.size / 1024 / 1024 >= 5) {
    ElMessage.error('上传文件大小不能超过 5 MB');
    resetImportAssignDialog();
    return;
  }
  importAssignFile.value = file;
}

function onImportAssignFileChange(event) {
  setImportAssignFile(event?.target?.files?.[0]);
}

function onImportAssignDragEnter() {
  importAssignDragOver.value = true;
}

function onImportAssignDragOver() {
  importAssignDragOver.value = true;
}

function onImportAssignDragLeave(event) {
  if (event.currentTarget?.contains?.(event.relatedTarget)) return;
  importAssignDragOver.value = false;
}

function onImportAssignDrop(event) {
  importAssignDragOver.value = false;
  setImportAssignFile(event?.dataTransfer?.files?.[0]);
}

async function downloadImportAssignTemplate() {
  try {
    const content =
      await internshipProcessAPI.downloadManualAssignTeacherStudentImportTemplate();
    proxy.downloadFile(content, '手动分配导入模板.xlsx');
  } catch (error) {
    console.error('下载模板失败:', error);
    ElMessage.error('下载模板失败');
  }
}

async function handleImportAssignConfirm() {
  if (!importAssignFile.value) {
    ElMessage.warning('请选择 Excel 文件');
    return;
  }
  const cur = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  const processId = Number(cur?.processId ?? cur?.realId ?? cur?.id);
  const createUserId = Number(store.getters.userInfo?.id);
  const verifyRoleId = Number(cur?.verifyFirstRoleId);
  const currentVerifyTypeId =
    cur?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
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

  importAssignLoading.value = true;
  try {
    const payload = {
      file: importAssignFile.value,
      internshipId,
      processId,
      createUserId,
      currentVerifyTypeId,
    };
    if (verifyRoleId && !Number.isNaN(verifyRoleId)) {
      payload.verifyRoleId = verifyRoleId;
    }
    const res = await internshipProcessAPI.importManualAssignTeacherStudentByExcel(payload);
    if (!res || res.message !== 'successful') {
      ElMessage.error(res?.message || '导入分配失败');
      return;
    }
    const result = res.data || {};
    const created = Number(
      result.createdRelTeacherStudentCount ??
        result.createdCount ??
        result.createdRelIntershipUserCount
    );
    const skipped = Number(result.skippedExistingCount);
    const failed = Number(result.failedCount);
    const total = Number(result.totalExcelRowCount);
    const failures = Array.isArray(result.failures) ? result.failures : [];
    importAssignDialogVisible.value = false;
    await headerPageRef.value?.baseListRef?.initDataList(true);
    // 后端 import/manualAssign 已建日志桩，不再调全量 init-by-internship（易锁 main_verify_process）
    if (
      !Number.isNaN(created) ||
      !Number.isNaN(skipped) ||
      !Number.isNaN(failed) ||
      !Number.isNaN(total) ||
      failures.length
    ) {
      const failureLines = failures.slice(0, 10).map((item) => {
        const row = item?.row != null ? `第${item.row}行` : '未知行';
        const account = item?.account ? `（${item.account}）` : '';
        const reason = item?.reason || '导入失败';
        return `${row}${account}：${reason}`;
      });
      const moreFail =
        failures.length > 10 ? `<div>……其余 ${failures.length - 10} 条失败未展示</div>` : '';
      const html = [
        !Number.isNaN(total) ? `<div>Excel 共 ${total} 行</div>` : '',
        !Number.isNaN(created) ? `<div>新增成功 ${created} 条</div>` : '',
        !Number.isNaN(skipped) ? `<div>已存在跳过 ${skipped} 条</div>` : '',
        !Number.isNaN(failed) ? `<div>失败 ${failed || 0} 条</div>` : '',
        failureLines.length
          ? `<div style="margin-top:8px;text-align:left;">失败明细：<br/>${failureLines.join('<br/>')}${moreFail}</div>`
          : '',
      ]
        .filter(Boolean)
        .join('');
      await ElMessageBox.alert(html || '导入分配成功', '导入结果', {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '知道了',
        type: failed > 0 ? 'warning' : 'success',
      });
    } else {
      ElMessage.success('导入分配成功');
    }
  } catch (error) {
    console.error('导入分配失败:', error);
    const backendMsg = error?.response?.data?.message || error?.message;
    ElMessage.error(backendMsg ? `导入分配失败，${backendMsg}` : '导入分配失败');
  } finally {
    importAssignLoading.value = false;
  }
}

async function onTeacherDeptChange(path) {
  manualAssignForm.teacherId = null;
  const departmentId = getLastCascaderValue(path);
  try {
    teacherOptions.value = await loadRoleOptionsByDepartment('teacher', departmentId);
  } catch (error) {
    console.error('加载可选老师失败:', error);
    teacherOptions.value = [];
    ElMessage.error('加载可选老师失败');
  }
}

async function onStudentDeptChange(path) {
  manualAssignForm.studentIds = [];
  const departmentId = getLastCascaderValue(path);
  try {
    studentOptions.value = await loadRoleOptionsByDepartment('student', departmentId);
  } catch (error) {
    console.error('加载可选学生失败:', error);
    studentOptions.value = [];
    ElMessage.error('加载可选学生失败');
  }
}

async function confirmManualAssign() {
  const teacherDepartmentId = getLastCascaderValue(manualAssignForm.teacherDeptPath);
  const studentDepartmentId = getLastCascaderValue(manualAssignForm.studentDeptPath);
  if (!teacherDepartmentId) {
    ElMessage.warning('请选择老师部门');
    return;
  }
  if (!manualAssignForm.teacherId) {
    ElMessage.warning('请选择老师');
    return;
  }
  if (!manualAssignTeacherOnly.value && !studentDepartmentId) {
    ElMessage.warning('请选择学生部门');
    return;
  }
  if (!manualAssignTeacherOnly.value && !manualAssignForm.studentIds.length) {
    ElMessage.warning('请选择学生');
    return;
  }
  if (manualAssignTeacherOnly.value) {
    const relId = pickFirstNonEmpty(manualAssignTargetRow.value, [
      'relTeaStuId',
      'relationId',
      'relTeacherStudentId',
    ]);
    const mainRowId = manualAssignTargetRow.value?.id;
    if (!relId) {
      ElMessage.warning('当前记录缺少关系ID');
      return;
    }
    if (!mainRowId) {
      ElMessage.warning('当前记录缺少流程ID');
      return;
    }
    const cur = unref(headerPageRef.value?.currentInternship);
    const internshipId = Number(cur?.internshipId ?? cur?.id);
    const createUserId = Number(store.getters.userInfo?.id);
    const verifyRoleId = cur?.verifyFirstRoleId;
    if (!internshipId || Number.isNaN(internshipId)) {
      ElMessage.warning('请先选择实习项目');
      return;
    }
    if (!createUserId || Number.isNaN(createUserId)) {
      ElMessage.warning('无法获取当前用户信息');
      return;
    }
    manualAssignSubmitting.value = true;
    try {
      const verifyResp = await internshipProcessAPI.getVerifyUserIds({
        verifyRoleId,
        createUserId,
        internshipId,
      });
      const verifyUserId = verifyResp?.data ?? verifyResp;
      const res = await listAPI.editOneNode('RelTeacherStudent', {
        id: relId,
        teacherId: manualAssignForm.teacherId,
      });
      if (!res || res.message !== 'successful') {
        ElMessage.warning(res?.message || '分配老师失败');
        return;
      }
      const resMvp = await listAPI.editOneNode('MainVerifyProcess', {
        id: mainRowId,
        createUserId,
        verifyUserId,
      });
      if (!resMvp || resMvp.message !== 'successful') {
        ElMessage.warning(resMvp?.message || '更新审核流程失败');
        return;
      }
      ElMessage.success('分配老师成功');
      manualAssignDialogVisible.value = false;
      await headerPageRef.value?.baseListRef?.initDataList(true);
      await initDiaryPlaceholders(internshipId);
    } catch (error) {
      console.error('分配老师失败:', error);
      ElMessage.error('分配老师失败');
    } finally {
      manualAssignSubmitting.value = false;
    }
    return;
  }
  const cur = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  const processId = Number(cur?.processId ?? cur?.realId ?? cur?.id);
  const createUserId = Number(store.getters.userInfo?.id);
  const verifyRoleId = cur?.verifyFirstRoleId;
  const currentVerifyTypeId =
    cur?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  if (!processId || Number.isNaN(processId)) {
    ElMessage.warning('当前实习项目缺少流程信息');
    return;
  }
  if (!createUserId || Number.isNaN(createUserId)) {
    ElMessage.warning('无法获取当前用户信息');
    return;
  }

  manualAssignSubmitting.value = true;
  try {
    const verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
      internshipId,
    });
    const verifyUserId = verifyResp?.data ?? verifyResp;
    const targetStudentIds = manualAssignTeacherOnly.value
      ? [pickFirstNonEmpty(manualAssignTargetRow.value, ['studentId'])]
      : [...manualAssignForm.studentIds];
    if (!targetStudentIds.length || targetStudentIds[0] == null || targetStudentIds[0] === '') {
      ElMessage.warning('当前记录缺少学生信息');
      return;
    }
    const payload = {
      internshipId,
      processId,
      createUserId,
      verifyUserId,
      teacherId: manualAssignForm.teacherId,
      studentIds: targetStudentIds,
      currentVerifyTypeId,
    };
    const res = await internshipProcessAPI.manualAssignTeacherStudent(payload);
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '手动分配失败');
      return;
    }
    ElMessage.success('手动分配成功');
    manualAssignDialogVisible.value = false;
    await headerPageRef.value?.baseListRef?.initDataList(true);
  } catch (error) {
    console.error('手动分配失败:', error);
    ElMessage.error('手动分配失败');
  } finally {
    manualAssignSubmitting.value = false;
  }
}

async function handleListAfterInit(dataList) {
  if (props.systemAssignMode !== 'autoOnEmpty') return;
  if (!Array.isArray(dataList) || dataList.length > 0) return;
  if (autoAssignLocked.value) return;
  const cur = unref(headerPageRef.value?.currentInternship);
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  if (!internshipId || Number.isNaN(internshipId)) return;
  autoAssignLocked.value = true;
  await runSystemAssign();
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  enableAuditStatusCustom: true,
  getVerifyRoleName,
  someFlags: { autoInit: false, checkFlag: true },
  initSearchWords: props.initSearchWords,
  defaultDTHProps: {
    keyWord: props.listKeyWord,
    buttonProps: {
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
      create: props.showImportAssign
        ? {
            show: true,
            name: '导入分配',
            type: 'primary',
          }
        : { show: false, name: '批量提交', type: 'primary' },
      submit: { show: true, name: '提交', type: 'warning' },
      visible: { show: true, type: 'primary', name: '查看进度' },
      more3:
        props.systemAssignMode === 'manual'
          ? {
              show: true,
              name: '系统分配',
              type: 'warning',
              disabled: assigning.value,
            }
          : { show: false },
      more4:
        props.systemAssignMode === 'manual'
          ? {
              show: true,
              name: '手动分配',
              type: 'primary',
              disabled: assigning.value,
            }
          : { show: false },
      more2: {
        show: true,
        name: '批量提交',
        type: 'primary',
      },
      more5: {
        show: true,
        name: '全部提交',
        type: 'warning',
        disabled: assigning.value,
        submitAll: async ({ initDataList }) => {
          const cur = unref(headerPageRef.value?.currentInternship);
          if (!cur?.internshipId) {
            ElMessage.warning('请先选择实习项目');
            return;
          }
          const searchKey = {
            processTypeCode: props.processTypeCode,
            internshipId: cur.internshipId,
            tableName: 'RelTeacherStudent',
          };
          const reg = {
            processTypeCode: '=',
            internshipId: '=',
            tableName: '=',
          };
          if (isCompanyUser.value && store.getters.userInfo?.departmentId) {
            searchKey.companyId = store.getters.userInfo.departmentId;
            reg.companyId = '=';
          }
          await runSubmitAllByQuery(
            {
              keyWords: props.listKeyWord.view,
              searchKey,
              reg,
              filterRows: (row) =>
                row.isAudit === CONSTANT.AUDIT_STATUS.SAVE &&
                (!props.submitRowCondition || props.submitRowCondition(row)),
              mapNode: (row) => ({
                id: row.id,
                isAudit: row.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY,
              }),
              buildConfirmText: (n) => `确定提交全部 ${n} 条可提交记录吗？`,
            },
            { initDataList }
          );
        },
      },
    },
    buttonCondition: {
      submit: props.submitRowCondition || ((row) => row?.isAudit === CONSTANT.AUDIT_STATUS.SAVE),
    },
    allTableColumns: [
      { id: 1, showName: '教师名称', tableColumnName: 'teacherName', sortable: true },
      { id: 1, showName: '学生名称', tableColumnName: 'studentName', sortable: true },
      { id: 6, showName: '学号', tableColumnName: 'studentAccount', sortable: true },
      { id: 2, showName: '实习岗位', tableColumnName: 'internshipPostName', sortable: true },
      { id: 3, showName: '实习项目', tableColumnName: 'internshipName', sortable: true },
      { id: 4, showName: '状态', tableColumnName: 'customize-status', sortable: true },
    ],
  },
  defaultDBIProps: {},
}));

defineExpose({
  refreshList: () => headerPageRef.value?.baseListRef?.initDataList(true),
  openManualAssignDialog,
  getCurrentInternship: () => unref(headerPageRef.value?.currentInternship),
});
</script>

<style scoped>
.manual-assign-form {
  padding-right: 8px;
}

.w-100 {
  width: 100%;
}
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
  transition: border-color 0.2s, background-color 0.2s;
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
