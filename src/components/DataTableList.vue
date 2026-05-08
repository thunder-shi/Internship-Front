<template>
  <div
    class="data-table-list-root"
    v-loading="listAreaLoading"
    element-loading-text="加载中..."
  >
  <DataTableHeader ref="dataTBLMother" v-model:selected-columns="selectedColumns"
    :default-props="defaultDTHPropsWithButtonCondition" @init-click="refreshInit" @show-search="showSearchPanel"
    @append-click="appendClick" @edit-click="editClick" @delete-click="deleteClick" @export-click="exportClick"
    @more1-click="more1Click" @more2-click="more2Click" @more3-click="more3Click" @more4-click="more4Click" @more5-click="more5Click" @upload-finish="uploadFinish" @upload="upload"
    @audit-click="auditClick" @audit-command="auditCommand">
    <template v-if="$slots.left" #left><slot name="left" /></template>
    <template #searchPanel>
      <!-- v-model="searchName" -->
      <slot name="searchPanel">
        <BtnSearch :search-name="searchName" :placeholder="searchPlaceholder" :no-advanced-search="noAdvancedSearch"
          :search-items="searchItems" @search-click="searchClick" @advanced-search-click="advancedSearchClick" />
      </slot>
    </template>
    <template #body>
      <!--列表展示-->
      <el-card shadow="never" :class="{ 'no-header': !hasCardTitle }">
        <template #header>
          <template v-if="hasCardTitle">
            <slot name="cardTitle" />
            <template v-if="title">
              <span>{{ title.mainTitle }}</span>
              <span v-if="title.subTitle">&nbsp;|&nbsp;<strong>{{ title.subTitle || '全部' }}</strong></span>
            </template>
          </template>
        </template>
        <el-table ref="table" v-adaptive="{ bottomOffset }" border stripe height="100%" :data="dataList"
          row-key="id" highlight-current-rows :row-class-name="rowClassNameFn" @current-change="handleColumnChange"
          @selection-change="handleSelectionChange" @sort-change="handleSortChange">
          <template v-if="showSelectColumn">
            <el-table-column
              v-if="checkFlag"
              fixed
              :reserve-selection="true"
              type="selection"
              width="55"
              :selectable="rowSelectableFn || undefined"
            />
            <el-table-column v-else fixed width="55">
              <template #default="scope">
                <el-radio v-model="tableRadio" :label="scope.row.id"><i /></el-radio>
              </template>
            </el-table-column>
          </template>
          <el-table-column v-for="(item, index) in tableColumnItem" :key="index" :show-overflow-tooltip="true"
            :prop="item.tableColumnName" :label="item.showName" :width="item.width"
            :sortable="item.sortable ? 'custom' : false">
            <template #default="scope">
              <!-- 特殊列格式 -->
              <div v-if="item.tableColumnName.endsWith('Time')">
                {{ filterDateTime(scope.row[item.tableColumnName]) }}
              </div>
              <!-- cron 表达式格式化 -->
              <div v-else-if="item.tableColumnName === 'cron'">
                {{ formatCron(scope.row[item.tableColumnName]) }}
              </div>
              <!-- 审核状态显示（统一处理 isAudit、auditStatus 和 customize-status） -->
              <template
                v-else-if="(item.tableColumnName === 'isAudit' || item.tableColumnName === 'auditStatus' || (item.tableColumnName === 'customize-status' && enableAuditStatusCustom))">
                <el-tag
                  v-if="scope.row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || scope.row.isAudit === null || scope.row.isAudit === undefined"
                  type="info">{{ CONSTANT.AUDIT_STATUS.SAVENAME }}</el-tag>
                <el-tag v-else-if="scope.row.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT" type="warning"><template
                    v-if="item.tableColumnName === 'customize-status' && enableAuditStatusCustom && getVerifyRoleNameText(scope.row)">{{
                      getVerifyRoleNameText(scope.row) }}审核中</template><template v-else>{{
                      CONSTANT.AUDIT_STATUS.SUBMITNAME }}</template></el-tag>
                <el-tag v-else-if="scope.row.isAudit === CONSTANT.AUDIT_STATUS.PASS" type="success">{{
                  CONSTANT.AUDIT_STATUS.PASSNAME }}</el-tag>
                <el-tag v-else-if="scope.row.isAudit === CONSTANT.AUDIT_STATUS.NOTPASS" type="danger">{{
                  CONSTANT.AUDIT_STATUS.NOTPASSNAME }}</el-tag>
                <el-tag v-else-if="scope.row.isAudit === CONSTANT.AUDIT_STATUS.BACK" type="info">{{
                  CONSTANT.AUDIT_STATUS.BACKNAME
                }}</el-tag>
                <!-- 如果父组件提供了 status 插槽，优先使用插槽 -->
                <slot v-else name="status" :row="scope.row" />
              </template>
              <!-- 列表自定义显示的内容 tableColumnName 必须以 customize- 开头 -->
              <slot v-else-if="item.tableColumnName.startsWith('customize-')"
                :name="item.tableColumnName.replace('customize-', '')" :row="scope.row" />
              <div v-else-if="scope.row[item.tableColumnName] === null">{{ '--' }}</div>
              <div v-else>{{ scope.row[item.tableColumnName] }}</div>
            </template>
          </el-table-column>
          <el-table-column v-if="operateShow" fixed="right" label="操作" :width="operateWidth">
            <template #default="scope">
              <!--查看and编辑and删除-->
              <el-button v-if="button?.visible?.show && isButtonVisible('visible', scope.row)"
                :type="button.visible.type" size="small" :title="button.visible.name" @click="view([scope.row])">
                <svg-icon icon-class="axt-view" />
              </el-button>
              <el-button v-if="button?.update?.show && isButtonVisible('update', scope.row)" :type="button.update.type"
                size="small" :title="button.update.name" @click="editClick(scope.row)"><el-icon>
                  <component :is="updateButtonIcon" />
                </el-icon></el-button>
              <el-button v-if="button?.audit?.show && isButtonVisible('audit', scope.row)" :type="button.audit.type"
                size="small" :title="button.audit.name" :disabled="isButtonDisabled('audit', scope.row)" @click="auditClick(scope.row)">
                <svg-icon icon-class="verCode" />
              </el-button>
              <el-button v-if="button?.submit?.show && isButtonVisible('submit', scope.row)" :type="button.submit.type"
                size="small" :title="button.submit.name" @click="submitClick(scope.row)">
                <el-icon>
                  <Position />
                </el-icon>
              </el-button>
              <!--列表数据右方的操作按钮-->
              <slot name="rightOperate" :row="scope.row" />
              <el-button v-if="button?.delete?.show && isButtonVisible('delete', scope.row)" :type="button.delete.type"
                size="small" :title="button.delete.name" @click="remove([scope.row])"><el-icon>
                  <Delete />
                </el-icon></el-button>
              <el-button v-if="button?.up?.show" :type="button.up.type" size="small" :loading="buttonLoading.up"
                :title="button.up.name" @click="move(scope.row, true)"><el-icon>
                  <Top />
                </el-icon></el-button>
              <el-button v-if="button?.down?.show" :type="button.down.type" size="small" :loading="buttonLoading.down"
                :title="button.down.name" @click="move(scope.row, false)"><el-icon>
                  <Bottom />
                </el-icon></el-button>
            </template>
          </el-table-column>
        </el-table>
        <v-page v-if="showPage" align="center" :total="totalSize" :current-page="pageInfo.page"
          :page-size="pageInfo.size" :page-sizes="pageInfo.sizes" :selected-columns="selectedColumns"
          @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </el-card>
    </template>
  </DataTableHeader>
  </div>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  useAttrs,
  useSlots,
  nextTick,
  getCurrentInstance,
} from 'vue';
import { Edit, Delete, Top, Bottom, Position, InfoFilled } from '@element-plus/icons-vue';
import DataTableHeader from '@/components/DataTableHeader.vue';
import listAPI from '@/api/list';
import BtnSearch from '@/components/BtnSearch.vue';
import VPage from '@/components/Pagination.vue';
import moment from 'moment';
import adaptive from '@/directive/el-table';
import CONSTANT from '@/utils/constant';
import { formatDateTimeShort } from '@/utils/common';
import { useStore } from 'vuex';
import _ from 'lodash';
import '@/assets/css/table.scss';

defineOptions({
  name: 'DataTableList',
});

// 过滤器函数
// 使用统一的时间格式化函数
const filterDateTime = formatDateTimeShort;


const formatCron = (cron) => {
  if (!cron || cron === '--') return '--';

  const parts = cron.trim().split(/\s+/);
  // 简单的校验，至少要有 分 时 日 月 周 (5位)
  if (parts.length < 5) return cron;

  let minute, hour, day, month, weekday;

  // 处理 5位 (Linux) 或 6位/7位 (Java Quartz: 秒 分 时 日 月 周 [年])
  if (parts.length === 5) {
    [minute, hour, day, month, weekday] = parts;
  } else {
    // 6位以上，第0位是秒，跳过
    [, minute, hour, day, month, weekday] = parts;
  }

  // 格式化时间辅助函数
  const formatTime = (h, m) => {
    const hStr = String(h).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    return `${hStr}:${mStr}`;
  };

  const weekdayMap = {
    'SUN': '日', 'MON': '一', 'TUE': '二', 'WED': '三', 'THU': '四', 'FRI': '五', 'SAT': '六'
  };

  // --- 逻辑判断开始 ---

  // 1. 每天
  // 逻辑：日期和月份都是 *，星期是 ? 或 *
  if (day === '*' && month === '*' && (weekday === '*' || weekday === '?')) {
    if (hour === '*' && minute === '*') return '每分钟';
    if (hour === '*') return `每小时第${minute}分钟`;
    return `每天 ${formatTime(hour, minute)}`;
  }

  // 2. 每周
  // 逻辑：月份是 *，星期指定了具体值 (不为 * 也不为 ?)。
  // 注意：在 Java Quartz 中，如果指定星期，day 必须是 ?；但在某些简易实现中可能是 *，这里做兼容处理。
  if (month === '*' && weekday !== '*' && weekday !== '?') {
    // 处理多选情况，如 "MON,WED"
    const days = weekday.split(',').map(d => {
      // 移除可能存在的非法字符，统一转大写
      const key = d.toUpperCase();
      // 返回映射值，如果找不到则返回原始值 (防止解析出错)
      return weekdayMap[key] || d;
    }).join('、');

    return `每周${days} ${formatTime(hour, minute)}`;
  }

  // 3. 每月
  // 逻辑：日期指定了值，星期忽略 (? 或 *)
  if (day !== '*' && day !== '?' && month === '*' && (weekday === '*' || weekday === '?')) {
    return `每月${day}日 ${formatTime(hour, minute)}`;
  }

  // 4. 每年 (简单扩展，可选)
  if (month !== '*' && day !== '*' && (weekday === '*' || weekday === '?')) {
    return `每年${month}月${day}日 ${formatTime(hour, minute)}`;
  }

  // 其他复杂情况返回原始值
  return cron;
};


// 获取审核角色名称（用于审核状态显示）
const getVerifyRoleNameText = (row) => {
  if (getVerifyRoleName.value && typeof getVerifyRoleName.value === 'function') {
    return getVerifyRoleName.value(row);
  }
  // 默认逻辑：返回第一个有值的角色名
  const levels = [
    row.verifyFirstRoleName,
    row.verifySecondRoleName,
    row.verifyThirdRoleName,
    row.verifyFourthRoleName,
    row.verifyFifthRoleName
  ].filter(name => name);
  return levels[0] || '';
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
  // 按钮条件配置：控制各按钮在不同行数据条件下的显示/隐藏
  // 格式: { buttonName: (row) => boolean }
  // 例如: { update: (row) => row.isAudit === -1 || row.isAudit === 2 }
  buttonCondition: {
    type: Object,
    default: () => ({})
  },
  // 按钮禁用条件配置：控制各按钮在不同行数据条件下的禁用状态
  // 格式: { buttonName: (row) => boolean }，返回 true 表示禁用
  buttonDisabledCondition: {
    type: Object,
    default: () => ({})
  },
  // 客户端过滤函数：在数据加载后进行前端过滤
  // 格式: (dataList) => filteredDataList
  // 用于无法通过后端查询精确过滤的场景（如 verifyUserId 的精确匹配）
  clientFilterFn: {
    type: Function,
    default: null
  },
  // 自定义数据获取函数：如果传入则使用该函数替代默认的 listAPI.getSomeRecords
  // 签名要求与 listAPI.getSomeRecords 一致：async (params) => resp
  // 参数和返回结构需保持不变，方便复用现有处理逻辑
  fetchRecords: {
    type: Function,
    default: null
  },
  // 是否启用审核状态自定义显示（用于 customize-status 列）
  enableAuditStatusCustom: {
    type: Boolean,
    default: false
  },
  // 审核状态自定义显示函数：返回当前审核级别的角色名称
  // 格式: (row) => string
  // 例如: (row) => row._currentRoleName || row.verifyFirstRoleName
  getVerifyRoleName: {
    type: Function,
    default: null
  },
  // 行类名函数：用于自定义表格行的类名
  // 格式: (row, rowIndex) => string
  // 例如: (row) => row.isSelected ? 'selected-row' : ''
  rowClassName: {
    type: Function,
    default: null
  },
  // 行可选函数：用于禁用 selection 的勾选
  // ElementPlus selectable(row, index) => boolean
  rowSelectableFn: {
    type: Function,
    default: null
  }
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
  'more3-click',
  'more4-click',
  'more5-click',
  'upload-finish',
  'update-column',
  'view-click',
  'spec-remove',
  'spec-move',
  'batch-import-click',
  'audit-click',
  'audit-command',
  'submit-click',
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
  props.defaultProps.pageInfo ? { ...props.defaultProps.pageInfo } : { page: 1, size: 25 }
);
const totalSize = ref(0);
const loading = ref(false);
const store = useStore();
/** 工具栏 + 表格 + 分页：表格自身 loading 与 axios 请求遮罩（默认开启，见 request loadingMask） */
const listAreaLoading = computed(
  () => loading.value || store.getters.requestMaskCount > 0
);
const buttonLoading = reactive({ up: false, down: false });
const tableRadio = ref(null);
// 列表中的字体颜色
const redArr = ref([]);
const greenArr = ref([]);
const blueArr = ref([]);
const yellowArr = ref([]);
const operateWidth = ref(60);
const isPageInit = ref(false);
const hasCalculatedWidth = ref(false); // 标记是否已经计算过宽度（数据加载后）

// 获取组件实例(用于判断事件监听)
const instance = getCurrentInstance();

// 辅助方法:判断是否有指定事件的监听器
const hasListener = (eventName) => {
  // 将事件名转换为驼峰形式，例如: export-click -> onExportClick
  const camelCaseName =
    'on' +
    eventName
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      .replace(/^[a-z]/, (letter) => letter.toUpperCase());

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

// 从 defaultProps 中读取属性，如果没有则使用单独的 props（向后兼容）
const buttonCondition = computed(() => {
  if (props.defaultProps?.buttonCondition !== undefined) {
    return props.defaultProps.buttonCondition;
  }
  if (props.defaultProps?.defaultDTHProps?.buttonCondition !== undefined) {
    return props.defaultProps.defaultDTHProps.buttonCondition;
  }
  return props.buttonCondition;
});

const clientFilterFn = computed(() => {
  return props.defaultProps?.clientFilterFn !== undefined
    ? props.defaultProps.clientFilterFn
    : props.clientFilterFn;
});

const enableAuditStatusCustom = computed(() => {
  return props.defaultProps?.enableAuditStatusCustom !== undefined
    ? props.defaultProps.enableAuditStatusCustom
    : props.enableAuditStatusCustom;
});

const getVerifyRoleName = computed(() => {
  return props.defaultProps?.getVerifyRoleName !== undefined
    ? props.defaultProps.getVerifyRoleName
    : props.getVerifyRoleName;
});

// 行类名函数（从 defaultProps 或 props 中获取）
const rowClassNameFn = computed(() => {
  return props.defaultProps?.rowClassName !== undefined
    ? props.defaultProps.rowClassName
    : props.rowClassName;
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

// update 按钮图标：支持通过 buttonProps.update.icon 自定义，默认为 Edit（铅笔）
const updateButtonIcon = computed(() => {
  return props.defaultProps?.defaultDTHProps?.buttonProps?.update?.icon || Edit;
});

// 将 buttonCondition 合并到 defaultDTHProps 中
const defaultDTHPropsWithButtonCondition = computed(() => {
  return {
    ...props.defaultProps.defaultDTHProps,
    buttonCondition: buttonCondition.value
  };
});

// 判断按钮是否可见（基于行数据的条件判断）
const isButtonVisible = (buttonName, row) => {
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
};

// 判断按钮是否禁用（基于行数据的条件判断）
const buttonDisabledCondition = computed(() => {
  return props.defaultProps?.buttonDisabledCondition !== undefined
    ? props.defaultProps.buttonDisabledCondition
    : props.buttonDisabledCondition;
});

const isButtonDisabled = (buttonName, row) => {
  if (!buttonDisabledCondition.value || !buttonDisabledCondition.value[buttonName]) {
    return false;
  }
  const conditionFn = buttonDisabledCondition.value[buttonName];
  if (typeof conditionFn === 'function') {
    return conditionFn(row);
  }
  return false;
};

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

const showSelectColumn = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (props.defaultProps.someFlags.hideSelectColumn === true) return false;
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
    setTimeout(() => { initDataList(); }, 500);
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

// 计算操作列宽度的函数
const calculateOperateWidth = () => {
  // 计算配置的按钮数量
  let num = 0;
  const arr = [
    button.value?.visible?.show,
    button.value?.update?.show,
    button.value?.audit?.show,
    button.value?.delete?.show,
    button.value?.up?.show,
    button.value?.down?.show,
    button.value?.submit?.show,
  ];
  num = arr.reduce((acc, cur) => {
    acc = cur ? acc + 1 : acc;
    return acc;
  }, 0);

  // 检查是否有 rightOperate 插槽
  let customButtonCount = 0;
  if (slots.rightOperate) {
    // 如果有数据且表格已渲染，从 DOM 中获取实际按钮数量
    if (dataList.value && dataList.value.length > 0 && table.value && table.value.$el) {
      // 查找操作列中的按钮数量
      // 尝试多种选择器，因为表格结构可能不同
      let operateCell = null;

      // 方法1: 查找固定右侧列
      const fixedRightCells = table.value.$el.querySelectorAll('.el-table__fixed-right .el-table__cell');
      if (fixedRightCells && fixedRightCells.length > 0) {
        operateCell = fixedRightCells[fixedRightCells.length - 1]; // 取最后一个，通常是操作列
      }

      // 方法2: 如果方法1失败，查找所有操作列（通过 label="操作"）
      if (!operateCell) {
        const allCells = table.value.$el.querySelectorAll('.el-table__cell');
        for (let i = 0; i < allCells.length; i++) {
          const cell = allCells[i];
          const label = cell.querySelector('.cell')?.textContent?.trim();
          if (label === '操作') {
            // 找到操作列的表头，需要找对应的数据行单元格
            const columnIndex = Array.from(cell.parentElement.children).indexOf(cell);
            const bodyRow = table.value.$el.querySelector('.el-table__body-wrapper tbody tr');
            if (bodyRow) {
              operateCell = bodyRow.children[columnIndex];
            }
            break;
          }
        }
      }

      // 方法3: 如果还是找不到，直接查找表格中所有按钮，取第一行的按钮数量
      if (!operateCell) {
        const firstRow = table.value.$el.querySelector('.el-table__body-wrapper tbody tr');
        if (firstRow) {
          const lastCell = firstRow.lastElementChild;
          if (lastCell) {
            operateCell = lastCell;
          }
        }
      }

      if (operateCell) {
        const buttons = operateCell.querySelectorAll('.el-button');
        const totalButtons = buttons.length;
        // 减去配置的按钮数量，得到自定义按钮数量
        customButtonCount = Math.max(0, totalButtons - num);

        // 如果查询到的按钮数量小于配置按钮数量，说明DOM可能还没完全渲染，使用估算值
        if (totalButtons < num && totalButtons === 0) {
          customButtonCount = 2;
        }
      } else {
        customButtonCount = 2;
      }
    } else {
      // 如果还没有数据，估算自定义按钮数量（默认2个，因为通常会有申请和取消）
      // 实际会在数据加载后重新计算
      customButtonCount = 2;
    }
  }

  // 计算总按钮数量
  const totalButtons = num + customButtonCount;
  // 根据实际测量的按钮数量直接设置宽度
  let width = 0;
  if (totalButtons >= 7) { width = 200; }
  else if (totalButtons === 6) { width = 180; }
  else if (totalButtons === 5) { width = 160; }
  else if (totalButtons === 4) { width = 130; }
  else if (totalButtons === 3) { width = 105; }
  else if (totalButtons === 2) { width = 78; }
  else if (totalButtons === 1) { width = 55; }
  else { width = 50; } // 没有按钮时，只显示列标题
  operateWidth.value = width;
};

// mounted
onMounted(() => {
  nextTick(() => {
    // 初始计算宽度（仅估算，因为还没有数据）
    if (slots.rightOperate) {
      // 如果有自定义按钮插槽，使用估算值
      const num = 0; // 配置按钮数量
      const customButtonCount = 2; // 估算的自定义按钮数量
      const totalButtons = num + customButtonCount;
      let width = totalButtons === 2 ? 78 : 50;
      operateWidth.value = width;
    } else {
      // 没有自定义按钮，使用原来的逻辑
      calculateOperateWidth();
    }
    // 延迟初始化数据
    setTimeout(() => { initDataList(); }, 500);
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
      // 优化：直接判断对象是否为空，避免 JSON.stringify 的性能开销
      const isEmptyTreeInfo = !treeInfo.value || Object.keys(treeInfo.value).length === 0;
      const requestParams = {
        keyWords: keyWord.value?.view,
        pageInfo: pageInfo,
        treeInfo: isEmptyTreeInfo ? null : treeInfo.value,
        searchKey: usedSearchWords.searchKey,
        sort: sortStr.value,
        reg: usedSearchWords.regKey,
        andor: usedSearchWords.andor,
      };

      // 如果父组件传入了自定义接口函数，则优先使用；否则使用默认的 listAPI.getSomeRecords
      const apiFn = props.fetchRecords || listAPI.getSomeRecords;
      resp = await apiFn(requestParams);
    } catch (error) {
      console.error('_initDataList: API 调用失败:', error);
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

    // 前端排序：优化：直接对数组排序，避免深拷贝的性能开销
    let sortedContent = filteredContent;
    if (sortStr.value && sortStr.value.properties) {
      // 只在需要排序时创建新数组（避免修改原数组）
      sortedContent = [...filteredContent];
      const sortField = sortStr.value.properties;
      const sortDirection = sortStr.value.direction === 'ASC' ? 1 : -1;
      sortedContent.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (valA == null && valB == null) return 0;
        if (valA == null) return sortDirection;
        if (valB == null) return -sortDirection;
        if (valA < valB) return -sortDirection;
        if (valA > valB) return sortDirection;
        return 0;
      });
    }

    // 应用客户端过滤函数（如果有）
    if (clientFilterFn.value && typeof clientFilterFn.value === 'function') {
      sortedContent = clientFilterFn.value(sortedContent);
    }

    dataList.value = sortedContent;
    // 如果使用了客户端过滤函数，总条数按过滤后的实际显示数量计算
    if (clientFilterFn.value && typeof clientFilterFn.value === 'function') {
      totalSize.value = sortedContent.length;
    } else {
      // 使用后端返回的总记录数，而不是当前页的数据量
      // 优先使用 resp.data.page.totalElements，如果没有则使用 resp.data.totalElements，最后才使用当前页数据量
      totalSize.value = resp.data?.page?.totalElements ?? resp.data?.totalElements ?? (sortedContent.length > 0 ? sortedContent.length : 0);
    }
    emit('after-init-data', dataList.value);
    emit('total-size', totalSize.value);

    // 数据加载完成后，重新计算操作列宽度（考虑自定义按钮）
    if (slots.rightOperate && sortedContent.length > 0 && !hasCalculatedWidth.value) {
      hasCalculatedWidth.value = true;
      // 使用 setTimeout 确保表格 DOM 完全渲染（Element Plus 表格渲染需要时间）
      // 增加延迟时间，确保自定义按钮已经渲染到DOM中
      setTimeout(() => {
        calculateOperateWidth();
      }, 200);
    }
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

// 按钮提交
const submitClick = async (row) => {
  emit('submit-click', row);
};

// 按钮审核
const auditClick = async (row) => {
  emit('audit-click', row);
};

// 顶部批量审核下拉选择（来自 DataTableHeader）
// command 为审核结果（PASS / NOTPASS / BACK 等），rows 为当前选中的行列表
const auditCommand = async (command, rows) => {
  emit('audit-command', command, rows);
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
    await initDataList(true);
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
  if (!props.defaultProps.nowSearchWords) {
    props.defaultProps.nowSearchWords = { searchKey: {}, regKey: {}, andor: {} };
  }
  props.defaultProps.nowSearchWords.searchKey = {
    ...(props.defaultProps.nowSearchWords.searchKey || {}),
    ...searchKey,
  };
  props.defaultProps.nowSearchWords.regKey = {
    ...(props.defaultProps.nowSearchWords.regKey || {}),
    ...regKey,
  };
  pageInfo.page = 1;
  setTimeout(() => {
    initDataList(true);
  }, 500);
};

const advancedSearchClick = (searchInfo) => {
  if (!props.defaultProps.nowSearchWords) {
    props.defaultProps.nowSearchWords = { searchKey: {}, regKey: {}, andor: {} };
  }
  const searchKey = { ...(props.defaultProps.nowSearchWords.searchKey || {}) };
  const regKey = { ...(props.defaultProps.nowSearchWords.regKey || {}) };

  for (const item of searchItems.value) {
    const field = item.field;
    const val = searchInfo[field];
    const isEmpty =
      val === undefined ||
      val === null ||
      val === '' ||
      (Array.isArray(val) && val.length === 0);

    if (isEmpty) {
      delete searchKey[field];
      delete regKey[field];
      continue;
    }

    if (item.type === 'input') {
      searchKey[field] = val;
      regKey[field] = CONSTANT.SEARCH_OPERATOR.LIKE;
    } else if (item.type === 'select') {
      searchKey[field] = val;
      regKey[field] = CONSTANT.SEARCH_OPERATOR.EQ;
    } else if (item.type === 'cascader') {
      const path = Array.isArray(val) ? val : [];
      if (path.length > 0) {
        searchKey[field] = path[path.length - 1];
        regKey[field] = CONSTANT.SEARCH_OPERATOR.EQ;
      }
    } else if (item.type === 'date') {
      searchKey[field] = { beginDate: val[0], endDate: val[1] };
      regKey[field] = CONSTANT.SEARCH_OPERATOR.RANGE;
    }
  }

  props.defaultProps.nowSearchWords.searchKey = searchKey;
  props.defaultProps.nowSearchWords.regKey = regKey;
  pageInfo.page = 1;
  setTimeout(() => {
    initDataList(true);
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

// 更多内容3
const more3Click = async (row) => {
  emit('more3-click', row);
};

// 更多内容4
const more4Click = async (row) => {
  emit('more4-click', row);
};

// 更多内容5
const more5Click = async (row) => {
  emit('more5-click', row);
};
// #endregion

// 刷新操作
const refreshInit = () => {
  // 注意：nowSearchWords 是 computed，不能直接修改
  initDataList(true);
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
    tableRadio.value = val ? val.id : null;
    selectedColumns.value = [val];
  }
  emit('update-column', val);
};

// 监听选中的事件
const handleSelectionChange = (selection) => {
  selectedColumns.value = selection;
  emit('selection-change', selection);
};

// 查看节点
const view = async (val) => {
  emit('view-click', val);
};

// 改变页码
const handleSizeChange = async (val) => {
  pageInfo.size = val;
  isPageInit.value = true;
  // 强制手动刷新，确保在 autoInit=false 的场景（如选择弹窗）也会重新请求数据
  await initDataList(true);
  isPageInit.value = false;
};

const handleCurrentChange = async (val) => {
  pageInfo.page = val;
  isPageInit.value = true;
  // 强制手动刷新，确保在 autoInit=false 的场景（如选择弹窗）也会重新请求数据
  await initDataList(true);
  isPageInit.value = false;
};

function upload() {
  emit('batch-import-click');
}

// 暴露方法给父组件（弹窗跨页勾选需同步当前页 dataList / table 实例）
defineExpose({
  initDataList,
  _deleteClick,
  dataList,
  table,
});
</script>
