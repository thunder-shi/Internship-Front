<template>
  <div>
    <!--搜索框-->
    <slot v-if="showSearchPanel && $slots.searchPanel" name="searchPanel" />
    <!--上方按钮插槽-->
    <div v-if="showTopButtons" class="crud-opts">
      <el-row type="flex" justify="space-between">
        <!--左侧插槽-->
        <slot v-if="$slots.left" name="left" />
        <el-button v-if="button.more1.show" :type="button.more1.type" :icon="CirclePlus"
          :disabled="button.more1.disabled" @click="more1Click(selectedColumns)">{{ button.more1.name }}</el-button>
        <el-button v-if="button.create.show" :type="button.create.type" :icon="Plus" @click="$emit('append-click')">{{
          button.create.name }}</el-button>
        <el-button v-if="button.update.show" :type="button.update.type" :icon="Edit"
          :disabled="selectedColumns.length != 1 || (selectedColumns.length === 1 && !isButtonVisible('update', selectedColumns[0]))"
          @click="edit(selectedColumns[0])">{{ button.update.name }}</el-button>
        <el-button v-if="button.delete.show" :type="button.delete.type" :icon="Delete"
          :disabled="selectedColumns.length < 1 || (selectedColumns.length > 0 && selectedColumns.some(row => !isButtonVisible('delete', row)))"
          @click="remove(selectedColumns)">{{ button.delete.name }}</el-button>
        <el-tooltip class="item" effect="dark" content="直接点击会导出当前全部内容，否则请先选择需要导出的项目后再点击。" placement="top">
          <el-button v-if="button.export.show" :type="button.export.type" :icon="Upload" @click="exportData">{{
            button.export.name }}</el-button>
        </el-tooltip>
        <el-button v-if="button.more2.show" :type="button.more2.type" :icon="Promotion"
          @click="more2Click(selectedColumns)">{{ button.more2.name }}</el-button>
        <el-button v-if="button.batchCreate.show" :icon="UploadFilled" :type="button.batchCreate.type"
          @click="handleUpload">{{ button.batchCreate.name }}</el-button>
        <div v-if="button.audit.show" style="padding-left:10px;padding-right:10px;">
          <el-dropdown ref="auditButton" split-button size="small" :type="button.audit.type"
            :disabled="selectedColumns.length < 1" @command="auditDropdownSelect"
            @click="auditDropdownClick(selectedColumns)">{{ auditButtonName }}
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-if="button.audit.showPass" :command="CONSTANT.AUDIT_STATUS.PASS">批量{{
                  CONSTANT.AUDIT_STATUS.PASSNAME }}</el-dropdown-item>
                <el-dropdown-item v-if="button.audit.showNotPass" :command="CONSTANT.AUDIT_STATUS.NOTPASS">批量{{
                  CONSTANT.AUDIT_STATUS.NOTPASSNAME }}</el-dropdown-item>
                <el-dropdown-item v-if="button.audit.showBack" :command="CONSTANT.AUDIT_STATUS.BACK">批量{{
                  CONSTANT.AUDIT_STATUS.BACKNAME }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>


      </el-row>
      <!--列表上方的业务模块插槽-->
      <slot v-if="$slots.topOperate" name="topOperate" />
      <!--右侧-->
      <slot v-if="$slots.right" name="right" />
      <el-button-group v-if="button.buttonGroup.show">
        <el-button v-if="button.search.show" :icon="Search" title="搜索" @click="showSearch" />
        <el-button :icon="Refresh" title="刷新" @click="initData" />
        <el-popover placement="bottom-end" width="100" trigger="click">
          <template #reference>
            <el-button title="选择性展示" :icon="Grid" />
          </template>
          <el-checkbox v-model="checkAll" :disabled="!indeterminate" :indeterminate="indeterminate"
            @change="handleCheckAllChange">全选</el-checkbox>
          <el-checkbox v-for="item in allTableColumns" :key="item.id" v-model="item.firstVisible" class="checkbox-item"
            @change="handleCheckSingleChange(item)">{{ item.showName }}</el-checkbox>
        </el-popover>
      </el-button-group>
    </div>
    <el-card shadow="never">
      <template v-if="slots.cardTitle" #header>
        <slot name="cardTitle" />
      </template>
      <slot name="body" />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, useAttrs, getCurrentInstance, useSlots } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';
import {
  Plus,
  Edit,
  Delete,
  Upload,
  CirclePlus,
  Promotion,
  Search,
  Refresh,
  Grid,
  UploadFilled,
} from '@element-plus/icons-vue';
import IEAPI from '@/api/importAndExport';
import { getTemplateFile, arrangeButton } from '@/utils/common';
import fileAPI from '@/api/file';
import { getTableColumns } from '@/utils/tableColumns';
import CONSTANT from '@/utils/constant';

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        keyWord: { edit: '', view: '' }, // 关键词，包括view和edit，默认edit
        buttonProps: { update: { show: false } }, // 控制树结构上方的按钮
        allTableColumns: [],
        searchPanel: false, // 初始是否出现搜索按钮
        showTopButtons: true, // 是否显示顶部按钮}}
        // defaultProps每一项和默认值无用，写清楚方便后面查询调用
      };
    },
  },
  selectedColumns: { type: Array, default: () => [] },
  // 向后兼容：保留单独的 props，但优先使用 defaultProps 中的值
  buttonCondition: {
    type: Object,
    default: () => ({})
  },
});

const emit = defineEmits([
  'update:selectedColumns',
  'append-click',
  'edit-click',
  'delete-click',
  'more1-click',
  'more2-click',
  'export-click',
  'show-search',
  'init-click',
  'upload-finish',
  'audit-click',
  'audit-command',
]);

const instance = getCurrentInstance();
const store = useStore();
const attrs = useAttrs();
const slots = useSlots();

const uploadRef = ref(null);

const fileList = ref([]);
const tableColumnItem = ref([]);
const checkAll = ref(true);
const indeterminate = ref(false);
const showSearchPanel = ref(false);
const currentAuditStatus = ref(CONSTANT.AUDIT_STATUS.PASS); // 初始状态为"批量审核通过"

// 辅助方法:判断是否有指定事件的监听器
const hasListener = (eventName) => {
  // 将事件名转换为驼峰形式，例如: export-click -> onExportClick
  const camelCaseName = 'on' + eventName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, letter => letter.toUpperCase());

  // 检查 vnode.props 中是否存在对应的事件监听器
  return instance?.vnode?.props?.[camelCaseName] !== undefined;
};

// 从 defaultProps 中读取属性，如果没有则使用单独的 props（向后兼容）
const buttonCondition = computed(() => {
  return props.defaultProps?.buttonCondition !== undefined
    ? props.defaultProps.buttonCondition
    : props.buttonCondition;
});

// computed 属性
const keyWord = computed(() => {
  const key = reactive({});
  key.edit = props.defaultProps.keyWord.edit;
  if (!Object.prototype.hasOwnProperty.call(props.defaultProps.keyWord, 'view')) {
    key.view = key.edit;
  } else {
    key.view = props.defaultProps.keyWord.view;
  }
  return key;
});

const specialExportKey = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'specialExportKey')) {
    return props.defaultProps.specialExportKey ? props.defaultProps.specialExportKey : '';
  }
  return '';
});

const searchPanel = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'searchPanel')) {
    return props.defaultProps.searchPanel;
  }
  return false;
});

const showTopButtons = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'showTopButtons')) {
    return props.defaultProps.showTopButtons;
  }
  return true;
});

const buttonProps = computed(() => {
  return props.defaultProps.buttonProps ? props.defaultProps.buttonProps : { update: { show: true }, create: { show: true }, delete: { show: true }, export: { show: true }, up: { show: true }, down: { show: true } };
});

const allTableColumns = computed(() => {
  return props.defaultProps.allTableColumns
    ? Object.values(props.defaultProps.allTableColumns)
    : getTableColumns(0);
});

const button = computed(() => {
  const btn = {
    visible: { show: false, name: '查看详情', type: 'info' },
    create: { show: false, name: '新增', type: 'primary' },
    batchCreate: { show: false, name: '批量导入', type: 'primary' },
    update: { show: false, name: '修改', type: 'info', icon: null },
    delete: { show: false, name: '删除', type: 'danger' },
    search: { show: false, name: '查询' },
    up: { show: false, name: '上移', type: 'warning' },
    down: { show: false, name: '下移', type: 'warning' },
    export: { show: false, name: '导出', type: 'warning' },
    // batchExport: { show: false, name: '全部导出', type:'warning' },
    more1: { show: false, name: '更多操作1', type: 'info' },
    more2: { show: false, name: '更多操作2', type: 'info' },
    audit: { show: false, name: '审核', type: 'danger', showPass: false, showNotPass: false, showSave: false, showBack: false },
    submit: { show: false, name: '提交', type: 'primary' },
    buttonGroup: { show: true },
  };
  return arrangeButton(buttonProps.value, btn);
});

// 审核按钮名称映射
const auditStatusNameMap = {
  [CONSTANT.AUDIT_STATUS.PASS]: `批量${CONSTANT.AUDIT_STATUS.PASSNAME}`,
  [CONSTANT.AUDIT_STATUS.NOTPASS]: `批量${CONSTANT.AUDIT_STATUS.NOTPASSNAME}`,
  [CONSTANT.AUDIT_STATUS.SAVE]: '批量打回',
  [CONSTANT.AUDIT_STATUS.BACK]: `批量${CONSTANT.AUDIT_STATUS.BACKNAME}`,
};

// 审核按钮名称
const auditButtonName = computed(() => {
  return auditStatusNameMap[currentAuditStatus.value] || button.value.audit?.name || '审核';
});


// 初始化
async function init() {
  await createDynamicTableColumns();
}

// 立即执行初始化
init();

// 当 allTableColumns 变化时（如动态切换视图模式），重新同步 tableColumnItem
watch(allTableColumns, () => {
  createDynamicTableColumns();
});
// #region 动态生成头部列
async function createDynamicTableColumns() {
  allTableColumns.value.forEach((e) => {
    if (!Object.prototype.hasOwnProperty.call(e, 'firstVisible')) {
      e.firstVisible = true;
    }
  });
  await initTBLVisibles();
}

// 动态生成和配置列
function initTBLVisibles() {
  const obj = getIndexInfo();
  const index = obj.index;
  if (index >= 0) {
    // 生成配置项显隐性
    allTableColumns.value.forEach((item, i) => {
      item.firstVisible = obj.arr[index].list[i];
    });
  }
  // 直接赋值而不是 Object.assign，确保响应性
  tableColumnItem.value = allTableColumns.value.filter((e) => e.firstVisible);
}
// #endregion

function showSearch() {
  showSearchPanel.value = !showSearchPanel.value;
  emit('show-search', showSearchPanel.value);
}

// 刷新
async function initData() {
  emit('init-click');
}

// 新增
async function append(row) {
  emit('append-click', row);
}

// 修改
async function edit(row) {
  emit('edit-click', row);
}

// 更多内容1
async function more1Click(row) {
  emit('more1-click', row);
}

// 更多内容2
async function more2Click(row) {
  emit('more2-click', row);
}

// 导入数据
async function handleUpload(para) {
  emit('upload');
}
// 删除
function remove(row) {
  if (row.length > 0) {
    ElMessageBox.confirm('此操作将删除选中行, 是否继续?', '提示', { confirmButtonText: '确定', cancelButtonText: '取消' })
      .then(async (_) => {
        emit('delete-click', row);
      })
      .catch((error) => error);
  }
}

// 审核下拉菜单选择
function auditDropdownSelect(command) {
  // 更新当前选择的审核状态
  currentAuditStatus.value = command;
  emit('audit-command', command, props.selectedColumns);
}

// 审核按钮点击
function auditDropdownClick(selectedColumns) {
  emit('audit-click', selectedColumns);
}

// 检查按钮是否应该显示（基于 buttonCondition）
function isButtonVisible(buttonName, row) {
  // 如果没有配置条件函数，默认显示
  if (!buttonCondition.value || !buttonCondition.value[buttonName]) {
    return true;
  }
  // 调用条件函数判断是否显示
  const conditionFn = buttonCondition.value[buttonName];
  if (typeof conditionFn === 'function') {
    return conditionFn(row);
  }
  return true;
}

// 导出数据
async function exportData() {
  if (hasListener('export-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('export-click');
  } else {
    // 无监听器:执行默认逻辑
    await _exportData();
  }
}

async function _exportData() {
  const loading = ElLoading.service({ text: '导出中...', lock: true });
  var key = specialExportKey.value;
  if (key.length === 0) {
    key = keyWord.value.view;
  }
  const { name } = getTemplateFile(key, '.xls');
  try {
    var content = null;
    const usedSearchWords =
      instance?.parent?.setupState?.usedSearchWords ||
      instance?.parent?.exposed?.usedSearchWords ||
      {};
    content = await IEAPI.exportInfo(
      key,
      props.selectedColumns,
      allTableColumns.value,
      usedSearchWords
    );
    instance.proxy.downloadFile(content, name);
    loading.close();
  } catch (error) {
    console.log(error);
    loading.close();
  }
}

// #region 处理显示列的部分显示或隐藏
// 全选
function handleCheckAllChange() {
  checkAll.value = true;
  allTableColumns.value.forEach((e) => {
    e.firstVisible = true;
  });
  indeterminate.value = false;
  saveTableColumns();
}

// 单个框的选择
function handleCheckSingleChange(item) {
  tableColumnItem.value = allTableColumns.value.filter((e) => e.firstVisible);
  const length = tableColumnItem.value.length;
  const totalLength = allTableColumns.value.length;
  if (length && length === totalLength) {
    checkAll.value = true;
    indeterminate.value = false;
  } else if (length && length < totalLength) {
    indeterminate.value = true;
    checkAll.value = true;
  } else {
    item.firstVisible = true;
    ElMessage.warning('至少选择一项展示');
  }
  saveTableColumns();
}

function saveTableColumns() {
  const obj = getIndexInfo();
  const index = obj.index;
  // 表头项配置显隐性数组
  const visibles = allTableColumns.value.map((e) => e.firstVisible);
  if (index >= 0) {
    obj.arr[index].list = visibles;
  } else {
    obj.arr.push({
      keywords: obj.keywords,
      userId: store.getters.userInfo.id,
      list: visibles,
    });
  }
  // 将操作设置保存至本地
  localStorage.setItem(`${obj.user}`, JSON.stringify(obj.arr));
  tableColumnItem.value = allTableColumns.value.filter((e) => e.firstVisible);
}

function getIndexInfo() {
  const obj = { keywords: '', user: '', arr: [], index: -1 };
  // obj.keywords = keyWord.value.view
  obj.keywords = instance?.parent?.uid || instance?.parent?._uid || '';
  obj.user = 'user_' + store.getters.userInfo.id;
  // 查看本地是否已经存储了该用户该张表的信息
  const savedItem = JSON.parse(localStorage.getItem(`${obj.user}`) || 'null');
  obj.arr = savedItem || [];
  obj.index = obj.arr.findIndex((item) => item.keywords === obj.keywords);
  return obj;
}
// #endregion

// 暴露方法和属性供外部调用
defineExpose({
  button,
  keyWord,
  remove,
  tableColumnItem,
});
</script>

<style scoped lang="scss">
:deep(.el-card__body) {
  padding: 0;
}

.crud-opts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.checkbox-item:nth-last-of-type(1) {
  margin-right: 30px;
}
</style>
