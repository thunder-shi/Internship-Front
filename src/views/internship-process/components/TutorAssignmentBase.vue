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
    @append-click="handleBatchSubmitClick"
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
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { computed, reactive, ref, unref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import { useAssignmentPageConfig } from '@/utils/useAssignmentPageConfig';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import { initDiariesByInternship } from '@/api/diary';

const props = defineProps({
  processTypeCode: { type: String, required: true },
  pageTitle: { type: String, required: true },
  noProjectMessage: { type: String, required: true },
  pendingSelectMessage: { type: String, default: '当前实习项目：待选择' },
  mainTitle: { type: String, required: true },
  initSearchWords: { type: Object, required: true },
  progressKeyWords: { type: String, default: 'ViewVerifyProcessRelTeacherStudent' },

  systemAssignMode: {
    type: String,
    default: 'manual', // 'manual' | 'autoOnEmpty'
    validator: (v) => ['manual', 'autoOnEmpty'].includes(v),
  },
  tutorAssignKind: { type: Number, default: null }, // Enterprise=2；Internal 默认不传

  // submit 按钮行条件，满足则可提交
  submitRowCondition: { type: Function, default: null },

  /** 选择项目后、刷新表格前的初始化逻辑（可选） */
  beforeRefreshOnProjectSelected: { type: Function, default: null },
});

defineOptions({
  name: 'TutorAssignmentBase',
});

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
  return row?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
    ? CONSTANT.AUDIT_STATUS.PASS
    : CONSTANT.AUDIT_STATUS.SUBMIT;
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
  // 该接口仅用于“分配校内导师”，企业导师页面不执行系统分配接口
  if (props.tutorAssignKind === 2) {
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
    if (props.tutorAssignKind != null) payload.tutorAssignKind = props.tutorAssignKind;

    const res = await internshipProcessAPI.initTeacherStudentByInternshipId(payload);
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '系统分配失败');
      return;
    }

    ElMessage.success('系统分配成功');
    await headerPageRef.value?.baseListRef?.initDataList(true);
    try {
      await initDiariesByInternship({ internshipId });
    } catch {}
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
    const relId = manualAssignTargetRow.value?.relTeaStuId;
    if (!relId) {
      ElMessage.warning('当前记录缺少关系ID');
      return;
    }
    manualAssignSubmitting.value = true;
    try {
      const res = await listAPI.editOneNode('RelTeacherStudent', {
        id: relId,
        teacherId: manualAssignForm.teacherId,
      });
      if (!res || res.message !== 'successful') {
        ElMessage.warning(res?.message || '分配老师失败');
        return;
      }
      ElMessage.success('分配老师成功');
      manualAssignDialogVisible.value = false;
      await headerPageRef.value?.baseListRef?.initDataList(true);
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
    keyWord: { edit: 'RelTeacherStudent', view: 'ViewVerifyProcessRelTeacherStudentMerge' },
    buttonProps: {
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
      create: { show: false, name: '批量提交', type: 'primary' },
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
});
</script>

<style scoped>
.manual-assign-form {
  padding-right: 8px;
}

.w-100 {
  width: 100%;
}
</style>
