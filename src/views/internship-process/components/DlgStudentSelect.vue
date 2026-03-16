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
        <div class="teacher-select-layout">
          <!-- 左侧：单位部门树 -->
          <section class="teacher-select-aside">
            <DataTree
              v-if="visible"
              ref="dataTreeRef"
              :default-props="treeProps"
              @node-click="handleNodeClick"
            />
          </section>
          <!-- 右侧：学生列表 -->
          <section class="teacher-select-main">
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
import { ref, computed, watch, reactive, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import listAPI from '@/api/list';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgBasic from '@/components/DlgBasic.vue';
import internshipProcessAPI from '@/api/internshipProcess';
import constant from '@/utils/constant';
import otherAPI from '@/api/other';

defineOptions({
  name: 'DlgStudentSelect',
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 当前实习项目 ID，确认时会与勾选的 userId 一起写入 RelIntershipUser */
  currentInternship: { type: Object, default: null },
  /** 是否显示表格上方的搜索/筛选栏（搜索框、刷新、列展示等按钮），默认 true */
  showSearchBar: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'success']);
const store = useStore();

// 获取用户信息
const userInfo = computed(() => store.getters.userInfo || {});

const dlgBasicRef = ref(null);
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

// DlgBasic 配置
const defaultProps = reactive({
  form: {},
  width: '60%',
  dlgTitle: '选择学生',
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

const dataTableListRef = ref(null);
const dataTreeRef = ref(null);
const confirmLoading = ref(false);
/** 当前选中的部门ID，用于过滤学生列表 */
const selectedDepartmentId = ref(null);
/** 跨页保留勾选：id -> row */
const selectedMap = ref(new Map());
/** 已写入 RelIntershipUser 的 userId 集合，这些行在表格中禁用勾选 */
const existingUserIds = ref(new Set());

// 树组件配置：同老师选择，按学校过滤部门
const treeProps = computed(() => {
  const searchKey = { typeCode: 'UNIVERSITY' };
  if (userInfo.value.schoolId) {
    searchKey.schoolId = userInfo.value.schoolId;
  }
  return {
    title: { mainTitle: '单位部门列表' },
    keyWord: 'ViewBaseDepartment',
    checkFlag: false,
    sort: { properties: 'theOrder', direction: 'ASC' },
    initSearchWords: {
      searchKey,
      regKey: {},
      andor: {},
    },
  };
});

// DataTableList 配置：jobId 改为 2（学生）
const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 80,
  sortStr: { properties: 'id', direction: 'DESC' },
  pageInfo: { page: 1, size: 20 },
  // 初始查询条件：按岗位类型（学生）过滤
  initSearchWords: {
    searchKey: { jobId: '2' },
    regKey: {},
    andor: {},
  },
  // 动态查询条件：用于在选择实习项目后注入 internshipId 等过滤条件
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
    keyWord: { view: 'BaseUser' },
    buttonProps: {
      search: { show: true },
    },
    allTableColumns: [
      { id: 1, showName: '姓名', tableColumnName: 'name', sortable: true },
      { id: 2, showName: '班级/单位', tableColumnName: 'departmentName', sortable: true },
      { id: 3, showName: '学号', tableColumnName: 'workId', sortable: true },
      { id: 4, showName: '手机号', tableColumnName: 'phone', sortable: true },
    ],
  },
});

/** 查询当前实习项目已关联的学生 userId，这些行将禁用勾选 */
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
    console.error('加载已选学生失败:', e);
    existingUserIds.value = new Set();
  }
}

// 使用 other.js 的 getAvailableUsersForInternship 作为 DataTableList 的数据接口
// 保持参数和返回结构与原 listAPI.getSomeRecords 一致
async function fetchAvailableStudents(params) {
  return await otherAPI.getAvailableUsersForInternship(params);
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

// 根据当前实习项目更新 nowSearchWords 中的 internshipId 过滤条件
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

function handleSelectionChange(rows) {
  const validRows = rows.filter((row) => !isExistingUserId(row.id));
  const currentPageIds = new Set();
  if (dataTableListRef.value?.dataList) {
    dataTableListRef.value.dataList.forEach((r) => {
      currentPageIds.add(r.id);
    });
  }

  currentPageIds.forEach((id) => selectedMap.value.delete(id));
  validRows.forEach((row) => {
    selectedMap.value.set(row.id, row);
  });

  const disabledRows = rows.filter((row) => isExistingUserId(row.id));
  if (disabledRows.length > 0 && dataTableListRef.value?.table) {
    setTimeout(() => {
      disabledRows.forEach((row) => {
        dataTableListRef.value.table.toggleRowSelection(row, false);
      });
    }, 0);
  }
}

function handleAfterInitData(dataList) {
  if (dataList && dataList.length > 0 && dataTableListRef.value?.table) {
    setTimeout(() => {
      dataList.forEach((row) => {
        if (isExistingUserId(row.id)) {
          dataTableListRef.value.table.toggleRowSelection(row, false);
        }
      });
    }, 100);
  }
}

function onClose() {
  selectedMap.value.clear();
  existingUserIds.value = new Set();
  selectedDepartmentId.value = null;
  dataTableListRef.value?.table?.clearSelection?.();
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
    ElMessage.warning('请至少勾选一名学生');
    return false;
  }
  const internshipId = props.currentInternship.internshipId;
  if (internshipId == null) {
    ElMessage.warning('缺少实习项目信息');
    return false;
  }
  confirmLoading.value = true;
  try {
    for (const row of list) {
      const res = await listAPI.editOneNode('RelIntershipUser', {
        userId: Number(row.id),
        internshipId: Number(internshipId),
        currentVerifyTypeId: props.currentInternship?.verifyTypeId === constant.VERIFY_LEVEL.NO_VERIFY
          ? constant.VERIFY_LEVEL.NO_VERIFY
          : constant.VERIFY_LEVEL.ONE_VERIFY,
      });
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '保存失败');
        return false;
      } else {
        const resp = await saveRelIntershipUserData(res);
        if (!resp.success) {
          ElMessage.error(resp?.message || '保存失败');
          return false;
        }
      }
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

// 保存数据到 RelIntershipUser 表并激活流程（与老师版本一致）
async function saveRelIntershipUserData(res) {
  const verifyUserIds = await internshipProcessAPI.getVerifyUserIds({
    verifyRoleId: props.currentInternship.verifyFirstRoleId,
    createUserId: store.getters.userInfo?.id,
  });
  const activateParams = {
    processId: props.currentInternship?.realId,
    relationId: res.data?.id,
    tableName: 'RelIntershipUser',
    createUserId: store.getters.userInfo?.id,
    isAudit: constant.AUDIT_STATUS.SAVE,
    verifyUserId: verifyUserIds.data,
  };
  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: {
        processId: activateParams.processId,
        relationId: activateParams.relationId,
        tableName: activateParams.tableName,
      },
    });
    const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
    if (existingRecords.length == 0) {
      const resInfo = await listAPI.editOneNode('MainVerifyProcess', activateParams);
      if (!resInfo || resInfo.message !== 'successful') {
        ElMessage.error(resInfo?.message || '保存失败');
        return { success: false };
      }
    }
    return { success: true };
  } catch (error) {
    console.error('查询 MainVerifyProcess 失败:', error);
    return { success: false };
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

// 当对话框已打开时，如果外层切换了实习项目，更新过滤条件并刷新列表
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
