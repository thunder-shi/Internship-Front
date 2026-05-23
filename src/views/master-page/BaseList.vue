<template>
  <div>
    <DataTableList ref="dataTableList" :default-props="defaultProps.defaultDTLProps" :button-condition="buttonCondition"
      :fetch-records="fetchRecords"
      :client-filter-fn="clientFilterFn" :enable-audit-status-custom="enableAuditStatusCustom"
      :get-verify-role-name="getVerifyRoleName" @append-click="appendClick" @edit-click="editClick"
      @view-click="viewClick" @update-column="updateColumn" @delete-click="deleteClick" @export-click="exportClick"
      @more1-click="more1Click" @more2-click="more2Click" @more3-click="more3Click" @more4-click="more4Click" @more5-click="more5Click" @after-init-data="afterInitData" @audit-click="auditClick"
      @audit-command="auditCommand" @submit-click="submitClick">
      <!--数据操作按钮类 -->
      <!-- <template #searchPanel>
      <slot name="searchPanel" />
    </template> -->
      <!-- 传递自定义列的插槽 -->
      <template v-for="(_, slotName) in $slots" :key="slotName" #[slotName]="slotProps">
        <slot :name="slotName" v-bind="slotProps" />
      </template>
    </DataTableList>
    <slot name="dlg">
      <!-- 简单窗口 -->
      <SimpleDialog ref="simpleDialog" :default-props="defaultProps.defaultSDProps" :simpledialog-confirm="confirm"
        :simpledialog-submit="submit" @update-record="handleUpdateRecord" @submit-more="submitMore"
        @simple-select-change="SimpleSelectChange" @tree-select-change="treeSelectChange"
        @confirm-click="confirmClick">
        <template v-if="$slots.dlgBottom" #bottomItems="slotProps">
          <slot name="dlgBottom" v-bind="slotProps" />
        </template>
      </SimpleDialog>
    </slot>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, useAttrs, getCurrentInstance } from 'vue';
import DataTableList from '@/components/DataTableList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import { resetForm } from '@/utils/common';
import { runSubmitAllByQuery } from '@/utils/submitAllByQuery';

defineOptions({
  name: 'BaseList',
});

// 获取组件实例(用于判断事件监听)
const instance = getCurrentInstance();

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        keyWord: {},
        defaultDTLProps: {
          title: {},
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
          defaultDTHProps: {
            allTableColumns: {},
            buttonProps: {},
          },
          // 按钮条件配置：控制各按钮在不同行数据条件下的显示/隐藏
          buttonCondition: undefined,
          // 客户端过滤函数：在数据加载后进行前端过滤
          clientFilterFn: undefined,
          // 是否启用审核状态自定义显示（用于 customize-status 列）
          enableAuditStatusCustom: false,
          // 审核状态自定义显示函数：返回当前审核级别的角色名称
          getVerifyRoleName: undefined,
        },
        defaultSDProps: {
          // defaultDBProps: {
          //   footButtons: { }
          // }
        },
      };
    },
  },
  // 向后兼容：保留单独的 props，但优先使用 defaultProps 中的值
  buttonCondition: {
    type: Object,
    default: () => ({})
  },
  baselistSpecConfirm: { type: Function, default: null },
  baselistConfirm: { type: Function, default: null },
  baselistSubmit: { type: Function, default: null },
  checkRowEdit: { type: Function, default: null },
  checkRowDelete: { type: Function, default: null },
  searchPlaceholder: { type: String, default: '请输入名称' },
  // 向后兼容：保留单独的 props，但优先使用 defaultProps 中的值
  clientFilterFn: { type: Function, default: null },
  // 向后兼容：保留单独的 props，但优先使用 defaultProps 中的值
  enableAuditStatusCustom: { type: Boolean, default: false },
  // 向后兼容：保留单独的 props，但优先使用 defaultProps 中的值
  getVerifyRoleName: { type: Function, default: null },
});

const emit = defineEmits([
  'update-column',
  'after-init-data',
  'append-click',
  'edit-click',
  'view-click',
  'delete-click',
  'export-click',
  'more1-click',
  'more2-click',
  'more3-click',
  'more4-click',
  'more5-click',
  'submit-more',
  'simple-select-change',
  'simple-select-init-finish',
  'tree-select-change',
  'confirm-click',
  'audit-click',
  'audit-command',
  'update-record',
]);

const attrs = useAttrs();

const dataTableList = ref(null);
const simpleDialog = ref(null);

const form = reactive({}); // 关联form
const keyWord = reactive({ edit: '', view: '' });
const treeInfo = reactive({});
const searchName = ref('');

// 从 defaultProps 中读取属性，如果没有则使用单独的 props（向后兼容）
const buttonCondition = computed(() => {
  return props.defaultProps?.defaultDTLProps?.buttonCondition !== undefined
    ? props.defaultProps.defaultDTLProps.buttonCondition
    : props.buttonCondition;
});

const clientFilterFn = computed(() => {
  return props.defaultProps?.defaultDTLProps?.clientFilterFn !== undefined
    ? props.defaultProps.defaultDTLProps.clientFilterFn
    : props.clientFilterFn;
});

const enableAuditStatusCustom = computed(() => {
  return props.defaultProps?.defaultDTLProps?.enableAuditStatusCustom !== undefined
    ? props.defaultProps.defaultDTLProps.enableAuditStatusCustom
    : props.enableAuditStatusCustom;
});

const getVerifyRoleName = computed(() => {
  return props.defaultProps?.defaultDTLProps?.getVerifyRoleName !== undefined
    ? props.defaultProps.defaultDTLProps.getVerifyRoleName
    : props.getVerifyRoleName;
});

const fetchRecords = computed(() => {
  return props.defaultProps?.defaultDTLProps?.fetchRecords || null;
});


const initDataList = async (manual = false) => {
  dataTableList.value?.initDataList(manual);
};

// 当前行的改变
const updateColumn = (val) => {
  emit('update-column', val);
};

const afterInitData = (dataList) => {
  emit('after-init-data', dataList);
};

// #region  DataList对应按钮事件
const searchClick = () => {
  // this.regKey = { name: '≈' }
  // this.searchKey = { name: this.searchName }
  // // 父子组件传递数据不及时的问题
  // setTimeout(() => { initDataList() }, 500)
};

// 辅助方法:判断是否有指定事件的监听器
const hasListener = (eventName) => {
  // 将事件名转换为驼峰形式，例如: append-click -> onAppendClick
  const camelCaseName = 'on' + eventName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^[a-z]/, letter => letter.toUpperCase());

  // 检查 vnode.props 中是否存在对应的事件监听器
  return instance?.vnode?.props?.[camelCaseName] !== undefined;
};

// 核心处理方法(内置默认逻辑)
const appendClick = () => {
  // 步骤1:判断父组件是否监听了"append-click" 事件
  if (hasListener('append-click')) {
    // 有监听器:只触发事件,交给父组件处理,不执行默认逻辑
    emit('append-click');
  } else {
    // 无监听器:执行子组件默认逻辑
    Object.assign(form, resetForm(form));
    simpleDialog.value?.showDialog(true, form);
  }
};

const editClick = async (row) => {
  // 检查是否可编辑
  if (props.checkRowEdit && typeof props.checkRowEdit === 'function') {
    if (!props.checkRowEdit(row)) {
      return;
    }
  }
  if (hasListener('edit-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('edit-click', row);
  } else {
    // 无监听器:执行默认逻辑
    openDlg('edit', row);
  }
};

// 查看按钮点击
const viewClick = async (row) => {
  if (hasListener('view-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('view-click', row);
  } else {
    // 无监听器:执行默认逻辑（以只读方式打开编辑窗口）
    openDlg('view', row);
  }
};

// 提交按钮点击
const submitClick = async (row) => {
  emit('submit-click', row);
};

const treeSelectChange = async (val, field, form, node) => {
  emit('tree-select-change', val, field, form, node);
};

const deleteClick = async (row) => {
  // 检查是否可删除
  if (props.checkRowDelete && typeof props.checkRowDelete === 'function') {
    if (!props.checkRowDelete(row)) {
      return;
    }
  }
  if (hasListener('delete-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('delete-click', row);
  } else {
    // 无监听器:执行默认逻辑
    dataTableList.value?._deleteClick(row);
  }
};

// 导出按钮
const _exportClick = async () => {
  await dataTableList.value?._exportClick();
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

// 更多内容1
const more1Click = async (row) => {
  emit('more1-click', row);
};

// 更多内容2
const more2Click = async (row) => {
  emit('more2-click', row);
};

const buttonPropsNode = () => props.defaultProps?.defaultDTLProps?.defaultDTHProps?.buttonProps ?? {};

/** moreN.submitAll：函数 | { handler } | { keyWords, ... }；已消费则不再 emit */
async function tryConsumeSubmitAll(row, submitAllRaw) {
  if (submitAllRaw == null) return false;
  if (typeof submitAllRaw === 'function') {
    await submitAllRaw({ selectedRows: row, initDataList });
    return true;
  }
  if (typeof submitAllRaw === 'object' && typeof submitAllRaw.handler === 'function') {
    await submitAllRaw.handler({ selectedRows: row, initDataList });
    return true;
  }
  if (typeof submitAllRaw === 'object' && submitAllRaw.keyWords) {
    try {
      await runSubmitAllByQuery(submitAllRaw, { initDataList });
    } catch (e) {
      if (e !== 'cancel') console.error('全部提交失败:', e);
    }
    return true;
  }
  return false;
}

// 更多内容3
const more3Click = async (row) => {
  emit('more3-click', row);
};

// 更多内容4
const more4Click = async (row) => {
  emit('more4-click', row);
};

// 更多内容5（全部提交：仅 more5 支持 submitAll）
const more5Click = async (row) => {
  if (await tryConsumeSubmitAll(row, buttonPropsNode().more5?.submitAll)) return;
  emit('more5-click', row);
};

// 审核按钮点击
const auditClick = async (row) => {
  if (hasListener('audit-click')) {
    // 有监听器:只触发事件,交给父组件处理
    emit('audit-click', row);
  } else {
    // 无监听器:可以执行默认逻辑（如果需要）
    // 暂时不做任何处理，由父组件处理
  }
};

// 顶部批量审核命令（来自 DataTableHeader）
// command 为审核结果（PASS / NOTPASS / BACK 等），rows 为当前选中的行列表
const auditCommand = async (command, rows) => {
  emit('audit-command', command, rows);
};
// #endregion

// #region simpleDialog对应的按钮事件
const confirm = async (option, type) => {
  if (!(props.baselistConfirm && typeof props.baselistConfirm === 'function')) {
    return await simpleDialog.value?._confirm(option, type);
  } else {
    // 从 SimpleDialog 获取实际的表单数据
    const dialogForm = simpleDialog.value?.form || form;
    return await props.baselistConfirm(option, type, dialogForm);
  }
};

// 提交按钮处理
const submit = async () => {
  if (props.baselistSubmit && typeof props.baselistSubmit === 'function') {
    await props.baselistSubmit(form);
  } else {
    // 默认提交逻辑
    await simpleDialog.value?._confirm('append', 'stop', form);
  }
};

const submitMore = (row) => {
  emit('submit-more', row);
};

const handleUpdateRecord = (form) => {
  // 先刷新列表（手动刷新）
  initDataList(true);
  // 然后触发事件给父组件
  emit('update-record', form);
};

const openDlg = (option, row) => {
  if (option === 'append') {
    // 新增模式：先重置 form，清除所有已有属性
    resetForm(form);
    // 如果传入了初始数据（如默认值），则合并进去
    if (row != null) {
      Object.assign(form, { ...row });
    }
  } else if (option === 'edit') {
    // 编辑模式：直接赋值编辑数据
    if (row != null) {
      Object.assign(form, { ...row });
    }
  } else {
    // 其他情况：根据 row 是否为 null 判断
    if (row != null) {
      Object.assign(form, { ...row });
    } else {
      Object.assign(form, resetForm(form));
    }
  }
  // if (option == null) {
  //   option = this.dialog.option
  // }
  if (option === 'edit') {
    // this.dialog = { title: '编辑', option: 'edit', show: true }
    // Object.assign(this.dialog, { title: '编辑', option: 'edit' })
  } else if (option === 'append') {
    // Object.assign(this.dialog, { title: '新增', option: 'append' })
  }
  simpleDialog.value?.showDialog(true, form);
};

const SimpleSelectChange = (val, field, form, options) => {
  emit('simple-select-change', val, field, form, options);
};

const confirmClick = async (formData) => {
  // 检查是否有 confirm-click 事件监听器
  if (hasListener('confirm-click')) {
    // 获取事件监听器并调用，如果是Promise则等待
    const handlers = instance?.vnode?.props?.onConfirmClick;
    if (handlers) {
      const handlerArray = Array.isArray(handlers) ? handlers : [handlers];
      for (const handler of handlerArray) {
        const result = handler(formData);
        if (result && typeof result.then === 'function') {
          await result; // 如果是Promise，等待完成
        }
      }
    }
  } else {
    // 如果没有监听器，直接emit（向后兼容）
    emit('confirm-click', formData);
  }
};
// #endregion

// 暴露方法给父组件
defineExpose({
  initDataList,
  openDlg,
  _confirm: async (option, type, form) => {
    if (form) {
      emit('confirm-click', form);
    }
    try {
      await simpleDialog.value?._confirm(option, type, form);
      // 只有成功时才刷新列表（手动刷新）
      initDataList(true);
      return true;
    } catch (error) {
      // 如果失败，不刷新列表
      throw error;
    }
  },
});


</script>
