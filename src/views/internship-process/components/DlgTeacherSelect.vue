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
          <!-- 左侧：单位部门树（使用 v-if 确保对话框打开时才渲染） -->
          <section class="teacher-select-aside">
            <DataTree
              v-if="visible"
              ref="dataTreeRef"
              :default-props="treeProps"
              @node-click="handleNodeClick"
            />
          </section>
          <!-- 右侧：教师列表 -->
          <section class="teacher-select-main">
            <DataTableList
              ref="dataTableListRef"
              :default-props="tableListProps"
              :row-class-name="getRowClassName"
              :row-selectable-fn="isRowSelectable"
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
defineOptions({
  name: 'DlgTeacherSelect',
});

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** 当前实习项目 ID，确认时会与勾选的 userId 一起写入 RelIntershipUser */
  currentInternship: { type: Object, default: null },
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
  dlgTitle: '选择指导老师',
  footButtons: {
    cancel: { show: true, name: '取消', type: '' },
    confirm: { show: true, name: '确定', type: 'primary' },
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
/** 当前选中的部门ID，用于过滤教师列表 */
const selectedDepartmentId = ref(null);
/** 跨页保留勾选：id -> row */
const selectedMap = ref(new Map());
/** 已写入 RelIntershipUser 的 userId 集合，这些行在表格中禁用勾选 */
const existingUserIds = ref(new Set());

// 树组件配置（参考 User.vue，不显示"全部"节点，不使用虚拟根节点）
// 过滤条件：只显示 typeCode='UNIVERSITY' 且 schoolId 等于当前用户的 schoolId 的部门
const treeProps = computed(() => {
  const searchKey = { typeCode: 'UNIVERSITY' };
  // 获取当前用户的 schoolId
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

// DataTableList 配置（参考 BaseTreeList 的实现）
const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 80, // 设置底部偏移，确保分页能显示（包括分页组件和底部按钮的高度）
  sortStr: { properties: 'id', direction: 'DESC' },
  pageInfo: { page: 1, size: 20 },
  initSearchWords: {
    searchKey: { jobId: '3' },
    regKey: {},
    andor: {},
  },
  someFlags: {
    operateShow: false, // 不显示操作按钮
    checkFlag: true, // 显示多选框
    showPage: true, // 显示分页
    autoInit: false, // 不自动初始化，手动控制
  },
  defaultDTHProps: {
    keyWord: { view: 'BaseUser' },
    buttonProps: {
      search: { show: true },
    },
    allTableColumns: [
      { id: 1, showName: '姓名', tableColumnName: 'name', sortable: true },
      { id: 2, showName: '单位部门', tableColumnName: 'departmentName', sortable: true },
      { id: 3, showName: '工号', tableColumnName: 'workId', sortable: true },
      { id: 4, showName: '手机号', tableColumnName: 'phone', sortable: true },
    ],
  },
});

/** 查询当前实习项目已关联的指导老师 userId，这些行将禁用勾选 */
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
    console.error('加载已选老师失败:', e);
    existingUserIds.value = new Set();
  }
}

// 处理树节点点击
function handleNodeClick(node) {
  selectedDepartmentId.value = node?.id || null;
  // 更新查询条件并重新加载列表
  updateSearchKey();
  dataTableListRef.value?.initDataList(true);
}

// 更新查询条件
function updateSearchKey() {
  const searchKey = tableListProps.initSearchWords.searchKey;
  // 如果选中了部门，添加部门过滤条件
  if (selectedDepartmentId.value != null) {
    searchKey.departmentId = selectedDepartmentId.value;
  }
  tableListProps.initSearchWords.searchKey = searchKey;
  tableListProps.initSearchWords.regKey = {};
  tableListProps.initSearchWords.andor = {};
}

function isExistingUserId(id) {
  if (id == null) return false;
  return existingUserIds.value.has(Number(id)) || existingUserIds.value.has(id);
}

// 已关联（RelIntershipUser 已存在）的老师禁用勾选
function isRowSelectable(row) {
  return !isExistingUserId(row?.id);
}

/** 已禁用的行加样式 */
function getRowClassName({ row }) {
  return isExistingUserId(row.id) ? 'row-disabled' : '';
}

function handleSelectionChange(rows) {
  // DataTableList 传递的是选中的行数组
  // 需要过滤掉已禁用的行（已关联的老师）
  const validRows = rows.filter((row) => !isExistingUserId(row.id));
  // 获取当前页的所有行ID
  const currentPageIds = new Set();
  if (dataTableListRef.value?.dataList) {
    dataTableListRef.value.dataList.forEach((r) => {
      currentPageIds.add(r.id);
    });
  }

  // 清除当前页的选择
  currentPageIds.forEach((id) => selectedMap.value.delete(id));

  // 添加新选择的行
  validRows.forEach((row) => {
    selectedMap.value.set(row.id, row);
  });

  // 如果选择了已禁用的行，需要清除它们
  const disabledRows = rows.filter((row) => isExistingUserId(row.id));
  if (disabledRows.length > 0 && dataTableListRef.value?.table) {
    // 使用 nextTick 确保在 DOM 更新后清除选择
    setTimeout(() => {
      disabledRows.forEach((row) => {
        dataTableListRef.value.table.toggleRowSelection(row, false);
      });
    }, 0);
  }
}

// 数据加载完成后，清除已禁用行的选择状态
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

// 对话框打开时的回调
function onOpenDialog() {
  // 对话框完全打开后，初始化数据
  nextTick(() => {
    setTimeout(async () => {
      // 初始化树组件（v-if 确保组件已创建，onMounted 应该已经调用，但这里作为双重保险）
      if (dataTreeRef.value) {
        dataTreeRef.value.initDataTree();
      }
      // 初始化表格数据
      if (dataTableListRef.value) {
        // 双保险：确保 existingUserIds 已加载，避免禁用状态偶现不生效
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
    ElMessage.warning('请至少勾选一位指导老师');
    return false; // 返回 false 阻止关闭对话框
  }
  const internshipId = props.currentInternship.internshipId;
  if (internshipId == null) {
    ElMessage.warning('缺少实习项目信息');
    return false; // 返回 false 阻止关闭对话框
  }
  confirmLoading.value = true;
  try {
    for (const row of list) {
      const res = await listAPI.editOneNode('RelIntershipUser', {
        userId: Number(row.id),
        internshipId: Number(internshipId),
      });
      if (!res || res.message !== 'successful') {
        ElMessage.error(res?.message || '保存失败');
        return false; // 返回 false 阻止关闭对话框
      } else {
        const resp = await saveRelIntershipUserData(res);
        if (!resp.success) {
          ElMessage.error(resp?.message || '保存失败');
          return false; // 返回 false 阻止关闭对话框
        }
      }
    }
    ElMessage.success('保存成功');
    visible.value = false;
    emit('success');
    if (type === 'stop') {
      dlgBasicRef.value?.showDialog(false, {});
    }
    return true; // 返回 true 允许关闭对话框
  } catch (e) {
    console.error('保存失败', e);
    ElMessage.error('保存失败');
    return false; // 返回 false 阻止关闭对话框
  } finally {
    confirmLoading.value = false;
  }
}

// 保存数据到 RelIntershipUser 表（公共方法）
async function saveRelIntershipUserData(res) {
  const activateParams = {
    processId: props.currentInternship?.realId,
    relationId: res.data?.id, // 新增数据的返回id
    tableName: 'RelIntershipUser',
    createUserId: store.getters.userInfo?.id, // 当前操作用户的id
    isAudit: constant.AUDIT_STATUS.SAVE,
    verifyUserId: store.getters.userInfo?.id,
  };
  // 先查询 MainVerifyProcess 表，检查是否存在相同记录
  try {
    const queryRes = await listAPI.getSomeRecords({
      keyWords: 'MainVerifyProcess',
      searchKey: {
        processId: activateParams.processId,
        relationId: activateParams.relationId,
        tableName: activateParams.tableName,
      },
    });
    // 获取查询结果
    const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
    // 如果不存在记录，才执行激活流程
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

// 暴露 showDialog 方法供外部调用
function showDialog(val) {
  visible.value = val;
  dlgBasicRef.value?.showDialog(val, {});
}

watch(visible, async (val) => {
  if (val) {
    selectedDepartmentId.value = null;
    await loadExistingUserIds();
    updateSearchKey();
    // 初始化逻辑移到 onOpenDialog 中，确保对话框完全打开后再初始化
  }
});

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

/* 确保 DataTree 组件能够正确显示 */
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

/* 确保 DataTableList 能正确计算高度 */
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
