<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="dlgBasicDefaultProps"
    :dlgbasic-confirm="handleConfirm"
    @close-dialog="onClose"
    @open-dialog="onOpenDialog"
  >
    <template #mainForm>
      <div class="dlg-content-wrapper">
        <div class="teacher-select-layout">
          <section class="teacher-select-aside">
            <DataTree
              v-if="visible"
              ref="dataTreeRef"
              :default-props="treeProps"
              @node-click="handleNodeClick"
            />
          </section>
          <section class="teacher-select-main">
            <DataTableList
              ref="dataTableListRef"
              :default-props="tableListProps"
              :row-class-name="getRowClassName"
              :row-selectable-fn="isRowSelectable"
              :fetch-records="fetchAvailableUsers"
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
import { ref, computed, watch, reactive, nextTick, unref } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import listAPI from '@/api/list';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgBasic from '@/components/DlgBasic.vue';
import constant from '@/utils/constant';
import otherAPI from '@/api/other';
import { saveRelIntershipUserVerifyBatch } from '@/utils/relIntershipUserSelect';

defineOptions({
  name: 'DlgIntershipUserSelectBase',
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  currentInternship: { type: Object, default: null },
  showSearchBar: { type: Boolean, default: false },
  dlgTitle: { type: String, required: true },
  /** BaseUser 岗位过滤：学生 STUDENT、校内导师 SCHOOL_TEACHER、企业导师 COMPANY_TUTOR */
  jobCode: { type: String, required: true },
  emptySelectionWarning: { type: String, required: true },
  tableColumns: { type: Array, required: true },
});

const emit = defineEmits(['update:modelValue', 'success']);
const store = useStore();

const userInfo = computed(() => store.getters.userInfo || {});

const dlgBasicRef = ref(null);
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const dlgBasicDefaultProps = ref({
  form: {},
  width: '60%',
  dlgTitle: '',
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
    validate: true,
    needVerifyUpdate: false,
  },
});

watch(
  () => props.dlgTitle,
  (t) => {
    dlgBasicDefaultProps.value.dlgTitle = t;
  },
  { immediate: true }
);

const dataTableListRef = ref(null);
const dataTreeRef = ref(null);
const confirmLoading = ref(false);
const selectedDepartmentId = ref(null);
const selectedMap = ref(new Map());
const existingUserIds = ref(new Set());

const treeProps = computed(() => {
  const searchKey = {};
  const regKey = {};
  if (userInfo.value.schoolId) {
    searchKey.schoolId = userInfo.value.schoolId;
    regKey.schoolId = constant.SEARCH_OPERATOR.EQ;
  }
  return {
    title: { mainTitle: '单位部门列表' },
    keyWord: 'ViewBaseDepartment',
    checkFlag: false,
    sort: { properties: 'theOrder', direction: 'ASC' },
    initSearchWords: {
      searchKey,
      regKey,
      andor: {},
    },
  };
});

const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 80,
  sortStr: { properties: 'id', direction: 'DESC' },
  pageInfo: { page: 1, size: 20 },
  initSearchWords: {
    searchKey: { jobCode: props.jobCode },
    regKey: {},
    andor: {},
  },
  nowSearchWords: {
    searchKey: {},
    regKey: {},
    andor: {},
  },
  someFlags: {
    operateShow: false,
    checkFlag: true,
    showPage: true,
    autoInit: false,
  },
  defaultDTHProps: {
    keyWord: { view: 'ViewBaseUser' },
    buttonProps: {
      search: { show: true },
    },
    allTableColumns: [...props.tableColumns],
  },
});

watch(
  () => props.jobCode,
  (code) => {
    if (code != null) {
      tableListProps.initSearchWords.searchKey.jobCode = code;
    }
  },
  { immediate: true }
);

watch(
  () => props.tableColumns,
  (cols) => {
    if (cols?.length) {
      tableListProps.defaultDTHProps.allTableColumns = [...cols];
    }
  },
  { deep: true, immediate: true }
);

async function loadExistingUserIds() {
  const internshipId = props.currentInternship.internshipId;
  if (internshipId == null) {
    existingUserIds.value = new Set();
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelIntershipUser',
      searchKey: { internshipId },
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    const ids = list
      .map((r) => {
        const uid = r.userId ?? r.user_id;
        return uid != null ? Number(uid) : null;
      })
      .filter((id) => id != null);
    existingUserIds.value = new Set(ids);
  } catch (e) {
    console.error('加载实习项目已关联用户失败:', e);
    existingUserIds.value = new Set();
  }
}

async function fetchAvailableUsers(params) {
  return otherAPI.getAvailableUsersForInternship(params);
}

function handleNodeClick(node) {
  selectedDepartmentId.value = node?.id || null;
  updateSearchKey();
  dataTableListRef.value?.initDataList(true);
}

function updateSearchKey() {
  const searchKey = tableListProps.initSearchWords.searchKey;
  if (selectedDepartmentId.value != null) {
    searchKey.departmentId = selectedDepartmentId.value;
  }
  tableListProps.initSearchWords.searchKey = searchKey;
  tableListProps.initSearchWords.regKey = {};
  tableListProps.initSearchWords.andor = {};
}

function updateInternshipFilter() {
  const internshipId = props.currentInternship?.internshipId;
  if (!internshipId) {
    return;
  }
  if (!tableListProps.nowSearchWords) {
    tableListProps.nowSearchWords = { searchKey: {}, regKey: {}, andor: {} };
  }
  const currentSearchKey = tableListProps.nowSearchWords.searchKey || {};
  tableListProps.nowSearchWords.searchKey = {
    ...currentSearchKey,
    internshipId,
  };
}

function isExistingUserId(id) {
  if (id == null) return false;
  return existingUserIds.value.has(Number(id)) || existingUserIds.value.has(id);
}

function isRowSelectable(row) {
  return !isExistingUserId(row?.id);
}

function getRowClassName({ row }) {
  return isExistingUserId(row.id) ? 'row-disabled' : '';
}

function normalizeRowId(id) {
  if (id == null) return null;
  const n = Number(id);
  return Number.isNaN(n) ? String(id) : n;
}

function getCurrentPageIdSet() {
  const rows = unref(dataTableListRef.value?.dataList) ?? [];
  const set = new Set();
  if (!Array.isArray(rows)) return set;
  rows.forEach((r) => {
    const k = normalizeRowId(r?.id);
    if (k != null) set.add(k);
  });
  return set;
}

function getTableRef() {
  return unref(dataTableListRef.value?.table);
}

function handleSelectionChange(rows) {
  const validRows = rows.filter((row) => !isExistingUserId(row.id));
  const currentPageIds = getCurrentPageIdSet();

  currentPageIds.forEach((id) => selectedMap.value.delete(id));
  validRows.forEach((row) => {
    const k = normalizeRowId(row.id);
    if (k != null) selectedMap.value.set(k, row);
  });

  const disabledRows = rows.filter((row) => isExistingUserId(row.id));
  const tableRef = getTableRef();
  if (disabledRows.length > 0 && tableRef) {
    setTimeout(() => {
      disabledRows.forEach((row) => {
        tableRef.toggleRowSelection(row, false);
      });
    }, 0);
  }
}

function handleAfterInitData(dataList) {
  const tableRef = getTableRef();
  if (dataList && dataList.length > 0 && tableRef) {
    setTimeout(() => {
      dataList.forEach((row) => {
        if (isExistingUserId(row.id)) {
          tableRef.toggleRowSelection(row, false);
        }
      });
    }, 100);
  }
}

function onClose() {
  selectedMap.value.clear();
  existingUserIds.value = new Set();
  selectedDepartmentId.value = null;
  getTableRef()?.clearSelection?.();
}

function onOpenDialog() {
  nextTick(() => {
    setTimeout(async () => {
      if (dataTreeRef.value) {
        dataTreeRef.value.initDataTree();
      }
      if (dataTableListRef.value) {
        if (!existingUserIds.value || existingUserIds.value.size === 0) {
          await loadExistingUserIds();
        }
        dataTableListRef.value.initDataList(true);
      }
    }, 100);
  });
}

async function handleConfirm(option, type) {
  const list = Array.from(selectedMap.value.values());
  if (!list.length) {
    ElMessage.warning(props.emptySelectionWarning);
    return false;
  }
  const internshipId = props.currentInternship.internshipId;
  if (internshipId == null) {
    ElMessage.warning('缺少实习项目信息');
    return false;
  }
  confirmLoading.value = true;
  try {
    const currentVerifyTypeId =
      props.currentInternship?.verifyTypeId === constant.VERIFY_LEVEL.NO_VERIFY
        ? constant.VERIFY_LEVEL.NO_VERIFY
        : constant.VERIFY_LEVEL.ONE_VERIFY;
    const relNodes = list.map((row) => ({
      userId: Number(row.id),
      internshipId: Number(internshipId),
      currentVerifyTypeId,
    }));
    const res = await listAPI.editManyNodes('RelIntershipUser', relNodes);
    if (!res || res.message !== 'successful') {
      ElMessage.error(res?.message || '保存失败');
      return false;
    }
    const resp = await saveRelIntershipUserVerifyBatch({
      editManyResponse: res,
      currentInternship: props.currentInternship,
      createUserId: store.getters.userInfo?.id,
    });
    if (!resp.success) {
      ElMessage.error(resp?.message || '保存失败');
      return false;
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('success');
    if (type === 'stop') {
      dlgBasicRef.value?.showDialog(false, {});
    }
    return true;
  } catch (e) {
    console.error('保存失败', e);
    ElMessage.error('保存失败');
    return false;
  } finally {
    confirmLoading.value = false;
  }
}

function showDialog(val) {
  visible.value = val;
  dlgBasicRef.value?.showDialog(val, {});
}

watch(visible, async (val) => {
  if (val) {
    selectedDepartmentId.value = null;
    await loadExistingUserIds();
    updateSearchKey();
    updateInternshipFilter();
  }
});

watch(
  () => props.currentInternship?.internshipId,
  async (newId, oldId) => {
    if (!visible.value) return;
    if (!newId || newId === oldId) return;
    await loadExistingUserIds();
    updateInternshipFilter();
    dataTableListRef.value?.initDataList(true);
  }
);

watch(
  () => props.showSearchBar,
  (val) => {
    tableListProps.defaultDTHProps.showTopButtons = val;
  },
  { immediate: true }
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

.teacher-select-layout {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.teacher-select-aside {
  flex: 0 0 auto;
  width: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.teacher-select-aside :deep(.tree-panel) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.teacher-select-aside :deep(.el-card) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.teacher-select-aside :deep(.el-card__body) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.teacher-select-aside :deep(.el-tree) {
  height: 100%;
}

.teacher-select-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.teacher-select-main :deep(.data-table-header) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.teacher-select-main :deep(.el-card) {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.teacher-select-main :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.pagination-wrap {
  margin-top: 12px;
  padding: 0 10px;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

:deep(.row-disabled) {
  color: var(--el-text-color-secondary);
  background-color: var(--el-fill-color-light);
}
</style>
