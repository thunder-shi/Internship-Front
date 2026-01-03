<template>
  <DataTableHeader
    ref="dataTBLMother"
    v-model:selected-columns="selectedColumns"
    :default-props="defaultProps.defaultDTHProps"
    @init-click="refreshInit"
    @show-search="showSearchPanel"
    @append-click="appendClick"
    @edit-click="editClick"
    @delete-click="deleteClick"
    @export-click="exportClick"
    @more1-click="more1Click"
    @more2-click="more2Click"
    @upload-finish="uploadFinish"
  >
    <template #searchPanel>
      <!-- v-model="searchName" -->
      <slot name="searchPanel"
        ><BtnSearch
          :search-name="searchName"
          :placeholder="searchPlaceholder"
          :no-advanced-search="noAdvancedSearch"
          :search-items="searchItems"
          @search-click="searchClick"
          @advanced-search-click="advancedSearchClick"
      /></slot>
    </template>
    <template #body>
      <!--列表展示-->
      <el-card shadow="never" :class="{ 'no-header': !hasCardTitle }">
        <template #header>
          <template v-if="hasCardTitle">
            <slot name="cardTitle" />
            <template v-if="title">
              <span>{{ title.mainTitle }}</span>
              <span v-if="title.subTitle"
                >&nbsp;|&nbsp;<strong>{{ title.subTitle || '全部' }}</strong></span
              >
            </template>
          </template>
        </template>
        <el-table
          ref="table"
          v-adaptive="{ bottomOffset }"
          v-loading="loading"
          border
          height="100%"
          :data="dataList"
          row-key="id"
          highlight-current-rows
          @current-change="handleColumnChange"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <el-table-column
            v-if="checkFlag"
            fixed
            :reserve-selection="true"
            type="selection"
            width="55"
          />
          <el-table-column v-else fixed width="55">
            <template #default="scope">
              <el-radio v-model="tableRadio" :label="scope.row"><i /></el-radio>
            </template>
          </el-table-column>
          <el-table-column
            v-for="(item, index) in tableColumnItem"
            :key="index"
            :show-overflow-tooltip="true"
            :prop="item.tableColumnName"
            :label="item.showName"
            :width="item.width"
            :sortable="item.sortable ? 'custom' : false"
          >
            <template #default="scope">
              <!-- 特殊列格式 -->
              <div v-if="item.tableColumnName.endsWith('Time')">
                {{ filterDateTime(scope.row[item.tableColumnName]) }}
              </div>
              <!-- 列表自定义显示的内容 tableColumnName 必须以 customize- 开头 -->
              <slot
                v-else-if="item.tableColumnName.startsWith('customize-')"
                :name="item.tableColumnName.replace('customize-', '')"
                :row="scope.row"
              />
              <div v-else>{{ scope.row[item.tableColumnName] || '--' }}</div>
            </template>
          </el-table-column>
          <el-table-column v-if="operateShow" fixed="right" label="操作" :width="operateWidth">
            <template #default="scope">
              <!--查看and编辑and删除-->
              <el-button
                v-if="button?.visible?.show"
                :type="button.visible.type"
                size="small"
                :title="button.visible.name"
                @click="view([scope.row])"
              >
                <svg-icon icon-class="axt-view" />
              </el-button>
              <el-button
                v-if="button?.update?.show"
                :type="button.update.type"
                size="small"
                :title="button.update.name"
                @click="editClick(scope.row)"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <!--列表数据右方的操作按钮-->
              <slot name="rightOperate" :row="scope.row" />
              <el-button
                v-if="button?.delete?.show"
                :type="button.delete.type"
                size="small"
                :title="button.delete.name"
                @click="remove([scope.row])"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
              <el-button
                v-if="button?.up?.show"
                :type="button.up.type"
                size="small"
                :loading="buttonLoading.up"
                :title="button.up.name"
                @click="move(scope.row, true)"
              >
                <el-icon><Top /></el-icon>
              </el-button>
              <el-button
                v-if="button?.down?.show"
                :type="button.down.type"
                size="small"
                :loading="buttonLoading.down"
                :title="button.down.name"
                @click="move(scope.row, false)"
              >
                <el-icon><Bottom /></el-icon>
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <v-page
          v-if="showPage"
          align="center"
          :total="totalSize"
          :current-page="pageInfo.page"
          :page-size="pageInfo.size"
          :page-sizes="pageInfo.sizes"
          :selected-columns="selectedColumns"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </el-card>
    </template>
  </DataTableHeader>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, useAttrs, useSlots, nextTick, getCurrentInstance } from 'vue';
import { Edit, Delete, Top, Bottom, Position, Check } from '@element-plus/icons-vue';
import DataTableHeader from '@/components/DataTableHeader.vue';
import listAPI from '@/api/list';
import BtnSearch from '@/components/BtnSearch.vue';
import VPage from '@/components/Pagination.vue';
import moment from 'moment';
import adaptive from '@/directive/el-table';
import CONSTANT from '@/utils/constant';
import _ from 'lodash';
import '@/assets/css/table.scss';

defineOptions({
  name: 'DataTableList',
});

// 过滤器函数
const filterDateTime = (val) => {
  if (!val) {
    return '--';
  } else {
    return moment(val).format('YYYY-MM-DD HH:mm');
  }
};

const props = defineProps({
  defaultProps: {
    // 注意这里的默认值没有用，必须在create中再设置
    type: Object,
    default: () => {
      return {
        keyWord: {},
        title: { mainTile: '', subTitle: '' },
        bottomOffset: 0,
        sortStr: { properties: 'Id', direction: 'DESC' }, // 排序方法
        treeInfo: {},
        someFlags: {
          operateShow: true, // 最右边的按钮操作面板是否出现
          checkFlag: true, // 是否出现最左边的checkBox
          showPage: true, // 是否显示底部翻页
          autoInit: true, // 初始时是否显示数据
        },
        initSearchWords: {
          // 初始时查询的三个关键词
          searchKey: {},
          regKey: {},
          andor: {},
        },
        nowSearchWords: {
          // 变化查询的三个关键词
          searchKey: {},
          regKey: {},
          andor: {},
        },
        moveSearchWords: {
          // 用于上移下移时候的查询字
          moveSearchKey: {},
          moveRegKey: {},
        },
        searchPanel: {
          name: '',
          placeholder: '',
        },
        defaultDTHProps: {
          // defaultDTHProps中的所有对象属性
        },
      };
    },
  },
});

const emit = defineEmits([
  'after-init-data',
  'total-size',
  'append-click',
  'edit-click',
  'delete-click',
  'export-click',
  'more1-click',
  'more2-click',
  'upload-finish',
  'update-column',
  'view-click',
  'spec-remove',
  'spec-move',
]);

const attrs = useAttrs();
const slots = useSlots();

// refs
const dataTBLMother = ref(null);
const table = ref(null);

// 响应式数据
const usedSearchWords = reactive({
  // 最终使用查询的三个关键词
  searchKey: {},
  regKey: {},
  andor: {},
});
const selectedColumns = ref([]);
const dataList = ref([]);
// 支持通过 defaultProps 设置初始的 pageInfo
const pageInfo = reactive(
  props.defaultProps.pageInfo 
    ? { ...props.defaultProps.pageInfo } 
    : { page: 1, size: 25 }
);
const totalSize = ref(0);
const loading = ref(false);
const buttonLoading = reactive({ up: false, down: false });
const tableRadio = ref(null);
// 列表中的字体颜色
const redArr = ref([]);
const greenArr = ref([]);
const blueArr = ref([]);
const yellowArr = ref([]);
const operateWidth = ref(60);
const isPageInit = ref(false);

// 获取组件实例(用于判断事件监听)
const instance = getCurrentInstance();

// 辅助方法:判断是否有指定事件的监听器
const hasListener = (eventName) => {
  // 将事件名转换为驼峰形式，例如: export-click -> onExportClick
  const camelCaseName = 'on' + eventName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, letter => letter.toUpperCase());
  
  // 检查 vnode.props 中是否存在对应的事件监听器
  return instance?.vnode?.props?.[camelCaseName] !== undefined;
};

// computed
const keyWord = computed(() => {
  return dataTBLMother.value?.keyWord;
});

const title = computed(() => {
  return props.defaultProps.title ? props.defaultProps.title : null;
});

// 判断是否有卡片标题（用于控制是否显示 header）
const hasCardTitle = computed(() => {
  // 检查是否有 cardTitle slot
  if (slots.cardTitle) {
    return true;
  }
  // 检查是否有 title 且有内容
  if (title.value && (title.value.mainTitle || title.value.subTitle)) {
    return true;
  }
  return false;
});

const button = computed(() => {
  return dataTBLMother.value?.button;
});

// 从 DataTableHeader 获取 tableColumnItem
const tableColumnItem = computed(() => {
  return dataTBLMother.value?.tableColumnItem || [];
});

const operateShow = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'operateShow')) {
      return props.defaultProps.someFlags.operateShow;
    }
  }
  return true;
});

const checkFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'checkFlag')) {
      return props.defaultProps.someFlags.checkFlag;
    }
  }
  return true;
});

const noAdvancedSearch = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'noAdvancedSearch')) {
      return props.defaultProps.someFlags.noAdvancedSearch;
    }
  }
  return true;
});

const showPage = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'showPage')) {
      return props.defaultProps.someFlags.showPage;
    }
  }
  return true;
});

const autoInit = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'autoInit')) {
      return props.defaultProps.someFlags.autoInit;
    }
  }
  return true;
});

const bottomOffset = computed(() => {
  return props.defaultProps.bottomOffset ? props.defaultProps.bottomOffset : 0;
});

const searchItems = computed(() => {
  return props.defaultProps.searchItems ? props.defaultProps.searchItems : [];
});

const sortStr = computed(() => {
  return props.defaultProps.sortStr
    ? props.defaultProps.sortStr
    : { properties: 'Id', direction: 'DESC' };
});

const initSearchWords = computed(() => {
  return props.defaultProps.initSearchWords ? props.defaultProps.initSearchWords : {};
});

const nowSearchWords = computed(() => {
  return props.defaultProps.nowSearchWords ? props.defaultProps.nowSearchWords : {};
});

const moveSearchWords = computed(() => {
  return props.defaultProps.moveSearchWords ? props.defaultProps.moveSearchWords : {};
});

const treeInfo = computed(() => {
  return props.defaultProps.treeInfo ? props.defaultProps.treeInfo : {};
});

const searchName = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'searchPanel')) {
    return props.defaultProps.searchPanel.name ? props.defaultProps.searchPanel.name : '';
  }
  return '';
});

const searchPlaceholder = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'searchPanel')) {
    return props.defaultProps.searchPanel.placeholder
      ? props.defaultProps.searchPanel.placeholder
      : '请输入名称';
  }
  return '请输入名称';
});

// watch
watch(autoInit, (val) => {
  if (val) {
    setTimeout(() => {
      initDataList();
    }, 500);
  }
});

// 监听 nowSearchWords 变化，但不使用 immediate，避免和 onMounted 重复请求
watch(
  nowSearchWords,
  (val, oldVal) => {
    // 跳过初始化时的调用（oldVal 为 undefined 时说明是初始化）
    if (oldVal === undefined) return;
    if (autoInit.value) {
      setTimeout(() => {
        initDataList();
      }, 500);
    }
  },
  { deep: true }
);

// 监听 tableColumnItem 的变化，确保列能正确显示
watch(
  () => dataTBLMother.value?.tableColumnItem,
  (newVal) => {
    if (newVal && newVal.length > 0) {
      // 触发响应式更新
      nextTick(() => {
        // 确保表格能正确渲染列
      });
    }
  },
  { deep: true, immediate: true }
);

// mounted
onMounted(() => {

  nextTick(() => {
    // 计算显示的按钮数量
    let num = 0;
    const arr = [
      button.value?.visible?.show,
      button.value?.update?.show,
      button.value?.delete?.show,
      button.value?.up?.show,
      button.value?.down?.show,
    ];
    num = arr.reduce((acc, cur) => {
      acc = cur ? acc + 1 : acc;
      return acc;
    }, 0);
    // 根据实际测量的按钮数量直接设置宽度
    let width = 0;
    if (num === 5) {
      width = 160;
    } else if (num === 4) {
      width = 130;
    } else if (num === 3) {
      width = 105;
    } else if (num === 2) {
      width = 78;
    } else if (num === 1) {
      width = 55;
    } else {
      // 没有按钮时，只显示列标题
      width = 50;
    }
    operateWidth.value = width;
    // 延迟初始化数据
    setTimeout(() => {
      initDataList();
    }, 500);
  });
});

// methods 转换为普通函数
// #region initDataList
const getUsedSearchWords = () => {
  usedSearchWords.searchKey = {};
  usedSearchWords.regKey = {};
  usedSearchWords.andor = {};

  if (
    Object.prototype.hasOwnProperty.call(initSearchWords.value, 'searchKey') &&
    Object.keys(initSearchWords.value.searchKey).length !== 0
  ) {
    usedSearchWords.searchKey = _.cloneDeep(initSearchWords.value.searchKey);
    if (
      Object.prototype.hasOwnProperty.call(initSearchWords.value, 'regKey') &&
      Object.keys(initSearchWords.value.regKey).length !== 0
    ) {
      usedSearchWords.regKey = _.cloneDeep(initSearchWords.value.regKey);
    }
    if (
      Object.prototype.hasOwnProperty.call(initSearchWords.value, 'andor') &&
      Object.keys(initSearchWords.value.andor).length !== 0
    ) {
      usedSearchWords.andor = _.cloneDeep(initSearchWords.value.andor);
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(nowSearchWords.value, 'searchKey') &&
    Object.keys(nowSearchWords.value.searchKey).length !== 0
  ) {
    usedSearchWords.searchKey = _.merge(
      nowSearchWords.value.searchKey,
      initSearchWords.value.searchKey
    );
    if (
      Object.prototype.hasOwnProperty.call(nowSearchWords.value, 'regKey') &&
      Object.keys(nowSearchWords.value.regKey).length !== 0
    ) {
      usedSearchWords.regKey = _.merge(nowSearchWords.value.regKey, initSearchWords.value.regKey);
    }
    if (
      Object.prototype.hasOwnProperty.call(nowSearchWords.value, 'andor') &&
      Object.keys(nowSearchWords.value.andor).length !== 0
    ) {
      usedSearchWords.andor = _.merge(nowSearchWords.value.andor, initSearchWords.value.andor);
    }
  }
};

const _initDataList = async () => {
  loading.value = true;
  try {
    if (selectedColumns.value.length > 0 && !isPageInit.value) {
      selectedColumns.value = selectedColumns.value.slice(0, 0);
      table.value?.clearSelection();
    }
    // 每次刷新前，都应该拼一下usedSearchWords
    getUsedSearchWords();
    let resp;
    try {
      if (JSON.stringify(treeInfo.value) === '{}') {
        resp = await listAPI.getSomeRecords({
          keyWords: keyWord.value?.view,
          pageInfo: pageInfo,
          treeInfo: null,
          searchKey: usedSearchWords.searchKey,
          sort: sortStr.value,
          reg: usedSearchWords.regKey,
          andor: usedSearchWords.andor,
        });
      } else {
        resp = await listAPI.getSomeRecords({
          keyWords: keyWord.value?.view,
          pageInfo: pageInfo,
          treeInfo: treeInfo.value,
          searchKey: usedSearchWords.searchKey,
          sort: sortStr.value,
          reg: usedSearchWords.regKey,
          andor: usedSearchWords.andor,
        });
      }
    } catch (error) {
      console.log(error);
      loading.value = false;
      return;
    }

    if (!resp || !resp.data) {
      loading.value = false;
      return;
    }

    // 过滤掉空行（null、undefined 或空对象）
    const filteredContent = (resp.data.content || []).filter((item) => {
      // 过滤掉 null、undefined
      if (!item || typeof item !== 'object') return false;
      // 过滤掉空对象（没有任何有效属性）
      const keys = Object.keys(item);
      if (keys.length === 0) return false;
      // 过滤掉只有 id 且 id 为 null/undefined 的对象
      if (keys.length === 1 && keys[0] === 'id' && (item.id === null || item.id === undefined))
        return false;
      // 过滤掉所有属性值都为空的对象（除了 id）
      const hasValidData = keys.some((key) => {
        if (key === 'id') return true; // id 可以为空
        const value = item[key];
        return value !== null && value !== undefined && value !== '';
      });
      return hasValidData;
    });

    dataList.value = _.cloneDeep(filteredContent);
    totalSize.value =
      filteredContent.length > 0 ? resp.data.totalElements || filteredContent.length : 0;
    emit('after-init-data', dataList.value);
    emit('total-size', totalSize.value);
  } catch (error) {
    console.log(error);
    loading.value = false;
  }
  loading.value = false;
};

const initDataList = async (manual = false) => {
  // manual: 手动刷新按钮
  if (autoInit.value || manual) {
    await _initDataList();
  }
};
// #endregion

const showSearchPanel = (flag) => {
  // Vue 3 不需要 $forceUpdate，响应式系统会自动更新
};

// #region 按钮相关
// 按钮新增
const appendClick = async () => {
  emit('append-click');
};

// 按钮修改
const editClick = async (row) => {
  emit('edit-click', row);
};

// #region 按钮删除
// 删除主函数
const _deleteClick = async (row) => {
  const ids = row.map((e) => e.id);
  await listAPI.delOneOrManyNodes(keyWord.value?.edit, ids);
  _deleteSuccess(ids.length, row);
};

// 删除成功后的处理
const _deleteSuccess = async (num, row) => {
  const { ElMessage } = await import('element-plus');
  ElMessage.success('删除成功！');
  emit('delete-finish-click', row);
  // 避免删除最后出现分页空白bug
  if ((totalSize.value - num) % pageInfo.size === 0 && pageInfo.page > 1) {
    pageInfo.page--;
  }
  table.value?.clearSelection();
  initDataList(true); // 传递 true 确保即使 autoInit 为 false 也会刷新
};

const uploadFinish = () => {
  initDataList();
};

// 导出按钮
const _exportClick = async () => {
  await dataTBLMother.value?._exportData();
};

const exportClick = async () => {
  if (hasListener('export-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('export-click');
  } else {
    // 无监听器:执行默认逻辑
    await _exportClick();
  }
};

// 删除按钮
const deleteClick = async (row) => {
  if (hasListener('delete-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('delete-click', row);
  } else {
    // 无监听器:执行默认逻辑
    _deleteClick(row);
  }
};

// 直接点删除时的弹框提示，调用上一层的函数
const remove = (row) => {
  if (!hasListener('spec-remove')) {
    // 无监听器:执行默认逻辑
    dataTBLMother.value?.remove(row);
  } else {
    // 有监听器:只触发事件,交给父组件处理
    emit('spec-remove', row);
  }
};
// #endregion

// #region 上移下移
const _move = async (row, up) => {
  try {
    await listAPI.changeNodeOrder(
      keyWord.value?.edit,
      row.id,
      up,
      moveSearchWords.value.searchKey,
      moveSearchWords.value.regKey
    );
    await initDataList();
    const { ElMessage } = await import('element-plus');
    ElMessage.success('移动成功！');
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

// 节点上下移
const move = async (row, up) => {
  if (up) {
    buttonLoading.up = true;
  } else {
    buttonLoading.down = true;
  }
  if (!hasListener('spec-move')) {
    // 无监听器:执行默认逻辑
    await _move(row, up);
  } else {
    // 有监听器:只触发事件,交给父组件处理
    emit('spec-move', row, up);
  }
  if (up) {
    buttonLoading.up = false;
  } else {
    buttonLoading.down = false;
  }
};
// #endregion

// 按钮查询
const searchClick = (searchInfo) => {
  const searchKey = {};
  const regKey = {};
  if (typeof searchName.value === 'string') {
    searchKey[searchName.value] = searchInfo;
    regKey[searchName.value] = CONSTANT.SEARCH_OPERATOR.LIKE;
  }
  // 注意：nowSearchWords 是 computed，不能直接修改，需要通过 props 修改
  // 这里需要根据实际需求调整
  setTimeout(() => {
    initDataList();
  }, 500);
};

const advancedSearchClick = (searchInfo) => {
  const searchKey = {};
  const regKey = {};
  const keys = Object.keys(searchInfo);
  for (let i = 0; i < keys.length; i++) {
    const item = searchItems.value.filter((item) => item.field === keys[i]);
    if (item.length > 0) {
      if (item[0].type === 'input') {
        searchKey[keys[i]] = searchInfo[keys[i]];
        regKey[keys[i]] = CONSTANT.SEARCH_OPERATOR.LIKE;
      } else if (item[0].type === 'select') {
        searchKey[keys[i]] = searchInfo[keys[i]];
      } else if (item[0].type === 'date') {
        searchKey[keys[i]] = { beginDate: searchInfo[keys[i]][0], endDate: searchInfo[keys[i]][1] };
        regKey[keys[i]] = CONSTANT.SEARCH_OPERATOR.RANGE;
      }
    }
  }
  // 注意：nowSearchWords 是 computed，不能直接修改
  setTimeout(() => {
    initDataList();
  }, 500);
};

// 更多内容1
const more1Click = async (row) => {
  emit('more1-click', row);
};

// 更多内容2
const more2Click = async (row) => {
  emit('more2-click', row);
};
// #endregion

// 刷新操作
const refreshInit = () => {
  // 注意：nowSearchWords 是 computed，不能直接修改
  initDataList();
};

// 自定义排序
const handleSortChange = (column) => {
  if (sortStr.value) {
    sortStr.value.properties = column.prop;
    if (column.order === 'ascending') {
      sortStr.value.direction = 'ASC';
    } else {
      sortStr.value.direction = 'DESC';
    }
  }
  setTimeout(() => {
    initDataList();
  }, 500);
};

// 监听点击某一行事件
const handleColumnChange = (val) => {
  if (!checkFlag.value) {
    tableRadio.value = val;
    selectedColumns.value = [val];
  }
  emit('update-column', val);
};

// 监听选中的事件
const handleSelectionChange = (selection) => {
  selectedColumns.value = selection;
};

// 查看节点
const view = async (val) => {
  emit('view-click', val);
};

// 改变页码
const handleSizeChange = async (val) => {
  pageInfo.size = val;
  isPageInit.value = true;
  await initDataList();
  isPageInit.value = false;
};

const handleCurrentChange = async (val) => {
  pageInfo.page = val;
  isPageInit.value = true;
  await initDataList();
  isPageInit.value = false;
};

// 暴露方法给父组件
defineExpose({
  initDataList,
  _deleteClick,
});
</script>
