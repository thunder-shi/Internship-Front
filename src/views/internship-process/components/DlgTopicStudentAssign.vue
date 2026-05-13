<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="dlgBasicProps"
    :dlgbasic-confirm="handleConfirm"
    @close-dialog="onClose"
    @open-dialog="onOpenDialog"
  >
    <template #mainForm>
      <div class="dlg-content-wrapper">
        <div class="select-layout">
          <section class="select-aside">
            <DataTree
              v-if="visible"
              ref="dataTreeRef"
              :default-props="treeProps"
              @node-click="handleNodeClick"
            />
          </section>
          <section class="select-main">
            <DataTableList
              ref="dataTableListRef"
              :default-props="tableListProps"
              :row-class-name="getRowClassName"
              :row-selectable-fn="isRowSelectable"
              :fetch-records="fetchAvailableStudents"
              @selection-change="handleSelectionChange"
              @after-init-data="handleAfterInitData"
            />
          </section>
        </div>
      </div>
    </template>
  </DlgBasic>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgBasic from '@/components/DlgBasic.vue';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'DlgTopicStudentAssign',
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  currentInternship: { type: Object, default: null },
});

const emit = defineEmits(['update:modelValue', 'confirm']);
const store = useStore();
const userInfo = computed(() => store.getters.userInfo || {});

const dlgBasicRef = ref(null);
const dataTreeRef = ref(null);
const dataTableListRef = ref(null);

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const selectedDepartmentId = ref(null);
const selectedRow = ref(null);
const assignedStudentIds = ref(new Set());
const approvedSelectionStudentIds = ref(new Set());
/** 已在「学生实习项目安排」中选过当前实习项目的学生用户 id（与 RelIntershipUser / ViewRelIntershipUser 一致） */
const arrangedStudentIds = ref(new Set());
const topicRowLocal = ref(null);

let dlgBasicProps = reactive({
  form: {},
  width: '60%',
  dlgTitle: '指定学生',
  footButtons: {
    cancel: { show: true, name: '取消', type: '' },
    confirm: { show: true, name: '确定', type: 'primary' },
    repeatAdd: { show: false },
  },
  someFlags: {
    noFooter: false,
    autoMax: true,
    needMaxBtn: true,
    needValidate: false,
    validate: false,
  },
});

const treeProps = computed(() => {
  const searchKey = { typeCode: 'UNIVERSITY' };
  if (userInfo.value.schoolId) searchKey.schoolId = userInfo.value.schoolId;
  return {
    title: { mainTitle: '单位部门列表' },
    keyWord: 'ViewBaseDepartment',
    checkFlag: false,
    sort: { properties: 'theOrder', direction: 'ASC' },
    initSearchWords: { searchKey, regKey: {}, andor: {} },
  };
});

const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 80,
  sortStr: { properties: 'id', direction: 'DESC' },
  pageInfo: { page: 1, size: 25 },
  initSearchWords: {
    searchKey: { jobCode: 'STUDENT' },
    regKey: {},
    andor: {},
  },
  nowSearchWords: {
    searchKey: {},
    regKey: {},
    andor: {},
  },
  searchPanel: {
    name: 'student_name',
    placeholder: '请输入学生姓名',
  },
  searchItems: [
    { name: '学生姓名', field: 'student_name', type: 'input', placeholder: '请输入学生姓名' },
    { name: '学号', field: 'stu_id', type: 'input', placeholder: '请输入学号' },
  ],
  someFlags: {
    operateShow: false,
    checkFlag: true,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: false,
  },
  defaultDTHProps: {
    keyWord: { view: 'BaseUser' },
    buttonProps: { search: { show: true } },
    allTableColumns: [
      { id: 1, showName: '姓名', tableColumnName: 'name', sortable: true },
      { id: 2, showName: '班级/单位', tableColumnName: 'departmentName', sortable: true },
      { id: 3, showName: '学号', tableColumnName: 'workId', sortable: true },
      { id: 4, showName: '手机号', tableColumnName: 'phone', sortable: true },
    ],
  },
});

async function fetchAvailableStudents(params) {
  const rawSearchKey = params?.searchKey || {};
  const nameKeyword = String(rawSearchKey?.student_name ?? rawSearchKey?.name ?? '').trim();
  const stuIdKeyword = String(rawSearchKey?.stu_id ?? rawSearchKey?.workId ?? '').trim();

  const idNums = [...arrangedStudentIds.value].filter(
    (id) => id != null && !Number.isNaN(Number(id))
  );
  if (idNums.length === 0) {
    return {
      data: {
        content: [],
        totalElements: 0,
        page: { ...(params?.pageInfo || {}), totalElements: 0 },
      },
    };
  }

  const searchKey = {
    jobId: String(rawSearchKey.jobId ?? tableListProps.initSearchWords.searchKey.jobId ?? '2'),
    id: idNums.join(','),
  };
  if (rawSearchKey.departmentId != null) {
    searchKey.departmentId = rawSearchKey.departmentId;
  }
  if (nameKeyword) searchKey.name = nameKeyword;
  if (stuIdKeyword) searchKey.workId = stuIdKeyword;

  const reg = { ...(params?.reg || {}), id: '()' };
  if (nameKeyword) reg.name = CONSTANT.SEARCH_OPERATOR.LIKE;
  if (stuIdKeyword) reg.workId = CONSTANT.SEARCH_OPERATOR.LIKE;

  return listAPI.getSomeRecords({
    keyWords: 'BaseUser',
    pageInfo: params?.pageInfo,
    treeInfo: params?.treeInfo,
    searchKey,
    sort: params?.sort,
    reg,
    andor: params?.andor,
  });
}

function resolveInternshipId() {
  return topicRowLocal.value?.internshipId ??
    topicRowLocal.value?.internship_id ??
    props.currentInternship?.internshipId ??
    props.currentInternship?.id ??
    props.currentInternship?.mainInternshipId ??
    props.currentInternship?.main_internship_id ??
    null;
}

function updateSearchKey() {
  const internshipId = resolveInternshipId();
  const searchKey = { ...tableListProps.initSearchWords.searchKey };
  if (internshipId != null) {
    // 与 fetch 内 loadArrangedStudentIds 一致；保留在 searchKey 便于列表刷新时上下文一致
    searchKey.internshipId = internshipId;
  } else {
    delete searchKey.internshipId;
  }
  if (selectedDepartmentId.value != null) {
    searchKey.departmentId = selectedDepartmentId.value;
  } else {
    delete searchKey.departmentId;
  }
  tableListProps.initSearchWords.searchKey = searchKey;

  if (!tableListProps.nowSearchWords) {
    tableListProps.nowSearchWords = { searchKey: {}, regKey: {}, andor: {} };
  }
  tableListProps.nowSearchWords.searchKey = {
    ...(tableListProps.nowSearchWords.searchKey || {}),
    internshipId,
  };
}

async function loadArrangedStudentIds() {
  const internshipId = resolveInternshipId();
  arrangedStudentIds.value = new Set();
  if (!internshipId) return;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelIntershipUser',
      searchKey: { internshipId },
      pageInfo: { page: 1, size: 5000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    const ids = new Set();
    for (const r of list) {
      const uid = r.userId ?? r.user_id ?? r.stuId ?? r.stu_id;
      if (uid != null) ids.add(Number(uid));
    }
    arrangedStudentIds.value = ids;
  } catch (e) {
    console.error('加载实习项目已安排学生失败:', e);
    arrangedStudentIds.value = new Set();
  }
}

async function loadAssignedStudentIds() {
  const internshipId = resolveInternshipId();
  if (!internshipId) {
    assignedStudentIds.value = new Set();
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTitleTeacherStudent',
      searchKey: { internshipId },
      pageInfo: { page: 1, size: 5000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    const ids = [];
    for (const row of list) {
      const stuId = row?.stuId ?? row?.stu_id ?? row?.studentId ?? row?.student_id;
      if (stuId != null) ids.push(Number(stuId));
    }
    assignedStudentIds.value = new Set(ids);
  } catch (e) {
    console.error('加载正式占用题目的学生失败:', e);
    assignedStudentIds.value = new Set();
  }
}

async function loadApprovedSelectionStudentIds() {
  const internshipId = resolveInternshipId();
  approvedSelectionStudentIds.value = new Set();
  if (!internshipId) return;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTitleTeacherStudent',
      searchKey: { internshipId },
      pageInfo: { page: 1, size: 5000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    const ids = new Set();
    for (const row of list) {
      const uid = row?.stuId ?? row?.stu_id ?? row?.studentId ?? row?.student_id;
      if (uid != null) ids.add(Number(uid));
    }
    approvedSelectionStudentIds.value = ids;
  } catch (e) {
    console.error('加载最终确认选题学生失败:', e);
    approvedSelectionStudentIds.value = new Set();
  }
}

function isAssignedStudent(id) {
  if (id == null) return false;
  return assignedStudentIds.value.has(Number(id));
}

function isApprovedSelectionStudent(id) {
  if (id == null) return false;
  return approvedSelectionStudentIds.value.has(Number(id));
}

function isRowSelectable(row) {
  return !isAssignedStudent(row?.id) && !isApprovedSelectionStudent(row?.id);
}

function getRowClassName({ row }) {
  return isAssignedStudent(row?.id) || isApprovedSelectionStudent(row?.id) ? 'row-disabled' : '';
}

function handleNodeClick(node) {
  selectedDepartmentId.value = node?.id || null;
  updateSearchKey();
  dataTableListRef.value?.initDataList(true);
}

function handleSelectionChange(rows) {
  const validRows = rows.filter((r) => !isAssignedStudent(r?.id) && !isApprovedSelectionStudent(r?.id));
  const latest = validRows.length > 0 ? validRows[validRows.length - 1] : null;
  selectedRow.value = latest;

  if (validRows.length > 1 && dataTableListRef.value?.table) {
    setTimeout(() => {
      validRows.slice(0, -1).forEach((row) => dataTableListRef.value.table.toggleRowSelection(row, false));
    }, 0);
  }
}

function handleAfterInitData(dataList) {
  if (!Array.isArray(dataList) || dataList.length === 0 || !dataTableListRef.value?.table) return;
  setTimeout(() => {
    dataList.forEach((row) => {
      if (isAssignedStudent(row?.id) || isApprovedSelectionStudent(row?.id)) {
        dataTableListRef.value.table.toggleRowSelection(row, false);
      }
    });
  }, 80);
}

function onClose() {
  selectedDepartmentId.value = null;
  selectedRow.value = null;
  assignedStudentIds.value = new Set();
  approvedSelectionStudentIds.value = new Set();
  arrangedStudentIds.value = new Set();
  topicRowLocal.value = null;
  dataTableListRef.value?.table?.clearSelection?.();
}

async function onOpenDialog() {
  const internshipId = resolveInternshipId();
  if (!internshipId) {
    ElMessage.warning('缺少 internshipId，无法加载学生列表');
    return;
  }
  await Promise.all([loadAssignedStudentIds(), loadArrangedStudentIds(), loadApprovedSelectionStudentIds()]);
  updateSearchKey();
  dataTreeRef.value?.initDataTree?.();
  dataTableListRef.value?.initDataList?.(true);
}

async function handleConfirm() {
  if (!selectedRow.value) {
    ElMessage.warning('请先选择一名学生');
    return false;
  }
  emit('confirm', selectedRow.value);
  visible.value = false;
  return true;
}

function showDialog(val = true, topicRow = null) {
  topicRowLocal.value = topicRow || null;
  visible.value = val;
  dlgBasicRef.value?.showDialog?.(val, {});
}

watch(
  () => (props.currentInternship?.internshipId ?? props.currentInternship?.id),
  async (newId, oldId) => {
    if (!visible.value) return;
    if (!newId || newId === oldId) return;
    await Promise.all([loadAssignedStudentIds(), loadArrangedStudentIds(), loadApprovedSelectionStudentIds()]);
    updateSearchKey();
    dataTableListRef.value?.initDataList?.(true);
  }
);

defineExpose({
  showDialog,
});
</script>

<style scoped>
.dlg-content-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.select-layout {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.select-aside {
  width: auto;
  min-height: 0;
  overflow: hidden;
}

.select-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

:deep(.row-disabled) {
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
}
</style>
