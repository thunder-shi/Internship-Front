<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="defaultProps"
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
import { computed, reactive, ref, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgBasic from '@/components/DlgBasic.vue';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';

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
const topicRowLocal = ref(null);

const defaultProps = reactive({
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
  pageInfo: { page: 1, size: 20 },
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

  // 后端接口对 name/workId 的模糊查询兼容性不稳定，这里做前端兜底过滤。
  const requestParams = {
    ...params,
    searchKey: {
      ...rawSearchKey,
    },
  };

  const response = await otherAPI.getAvailableUsersForInternship(requestParams);
  const list = response?.data?.content ?? [];
  if (!nameKeyword && !stuIdKeyword) return response;

  const filtered = list.filter((row) => {
    const rowName = String(row?.student_name ?? row?.name ?? '').toLowerCase();
    const rowStuId = String(row?.stu_id ?? row?.workId ?? row?.id ?? '');
    const matchName = !nameKeyword || rowName.includes(nameKeyword.toLowerCase());
    const matchStuId = !stuIdKeyword || rowStuId.includes(stuIdKeyword);
    return matchName && matchStuId;
  });

  return {
    ...response,
    data: {
      ...(response?.data || {}),
      content: filtered,
      totalElements: filtered.length,
      page: {
        ...(response?.data?.page || {}),
        totalElements: filtered.length,
      },
    },
  };
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
    // 后端 getAvailableUsersForInternship 强依赖 internshipId，放在主查询条件里最稳妥
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

async function loadAssignedStudentIds() {
  const internshipId = resolveInternshipId();
  if (!internshipId) {
    assignedStudentIds.value = new Set();
    return;
  }
  try {
    const titleRes = await listAPI.getSomeRecords({
      keyWords: 'RelTitleTeacher',
      searchKey: { internshipId, isLimit: 1 },
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const titleList = titleRes?.data?.content ?? titleRes?.data ?? [];
    const titleIds = titleList.map((r) => r?.id).filter((id) => id != null);
    const ids = [];
    for (const titleId of titleIds) {
      const relRes = await listAPI.getSomeRecords({
        keyWords: 'RelTitleStudent',
        searchKey: { titleId: Number(titleId) },
        pageInfo: { page: 1, size: 1 },
        sort: { properties: 'id', direction: 'DESC' },
      });
      const rel = (relRes?.data?.content ?? relRes?.data ?? [])[0];
      const stuId = rel?.stuId ?? rel?.stu_id;
      if (stuId != null) ids.push(Number(stuId));
    }
    assignedStudentIds.value = new Set(ids);
  } catch (e) {
    console.error('加载已分配题目学生失败:', e);
    assignedStudentIds.value = new Set();
  }
}

function isAssignedStudent(id) {
  if (id == null) return false;
  return assignedStudentIds.value.has(Number(id));
}

function isRowSelectable(row) {
  return !isAssignedStudent(row?.id);
}

function getRowClassName({ row }) {
  return isAssignedStudent(row?.id) ? 'row-disabled' : '';
}

function handleNodeClick(node) {
  selectedDepartmentId.value = node?.id || null;
  updateSearchKey();
  dataTableListRef.value?.initDataList(true);
}

function handleSelectionChange(rows) {
  const validRows = rows.filter((r) => !isAssignedStudent(r?.id));
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
      if (isAssignedStudent(row?.id)) {
        dataTableListRef.value.table.toggleRowSelection(row, false);
      }
    });
  }, 80);
}

function onClose() {
  selectedDepartmentId.value = null;
  selectedRow.value = null;
  assignedStudentIds.value = new Set();
  topicRowLocal.value = null;
  dataTableListRef.value?.table?.clearSelection?.();
}

function onOpenDialog() {
  nextTick(() => {
    setTimeout(async () => {
      const internshipId = resolveInternshipId();
      if (!internshipId) {
        ElMessage.warning('缺少 internshipId，无法加载学生列表');
        return;
      }
      await loadAssignedStudentIds();
      updateSearchKey();
      dataTreeRef.value?.initDataTree?.();
      dataTableListRef.value?.initDataList?.(true);
    }, 80);
  });
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
    await loadAssignedStudentIds();
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
