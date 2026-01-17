<template>
  <div>
    <DataTableList
      ref="dataTableList"
      :default-props="defaultProps.defaultDTLProps"
      @append-click="appendClick"
      @edit-click="editClick"
      @update-column="updateColumn"
      @delete-click="deleteClick"
      @export-click="exportClick"
      @more1-click="more1Click"
      @more2-click="more2Click"
      @after-init-data="afterInitData"
      @audit-click="auditClick"
    >
      <!--数据操作按钮类 -->
      <!-- <template #searchPanel>
      <slot name="searchPanel" />
    </template> -->
    </DataTableList>
    <slot name="dlg">
      <!-- 简单窗口 -->
      <SimpleDialog
        ref="simpleDialog"
        :default-props="defaultProps.defaultSDProps"
        :simpledialog-confirm="confirm"
        :simpledialog-submit="submit"
        @update-record="initDataList"
        @submit-more="submitMore"
        @simple-select-change="SimpleSelectChange"
        @tree-select-change="treeSelectChange"
        @confirm-click="confirmClick"
      />
    </slot>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, useAttrs, getCurrentInstance } from 'vue';
import DataTableList from '@/components/DataTableList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import { resetForm } from '@/utils/common';

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
        },
        defaultSDProps: {
          // defaultDBProps: {
          //   footButtons: { }
          // }
        },
      };
    },
  },
  baselistSpecConfirm: { type: Function, default: null },
  baselistConfirm: { type: Function, default: null },
  baselistSubmit: { type: Function, default: null },
  checkRowEdit: { type: Function, default: null },
  checkRowDelete: { type: Function, default: null },
  searchPlaceholder: { type: String, default: '请输入名称' },
});

const emit = defineEmits([
  'update-column',
  'after-init-data',
  'append-click',
  'edit-click',
  'delete-click',
  'export-click',
  'more1-click',
  'more2-click',
  'submit-more',
  'simple-select-change',
  'simple-select-init-finish',
  'tree-select-change',
  'confirm-click',
  'audit-click',
]);

const attrs = useAttrs();

const dataTableList = ref(null);
const simpleDialog = ref(null);

const form = reactive({}); // 关联form
const keyWord = reactive({ edit: '', view: '' });
const treeInfo = reactive({});
const searchName = ref('');


const initDataList = async () => {
  dataTableList.value?.initDataList();
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
// #endregion

// #region simpleDialog对应的按钮事件
const confirm = async (option, type) => {
  if (!(props.baselistConfirm && typeof props.baselistConfirm === 'function')) {
    await simpleDialog.value?._confirm(option, type);
  } else {
    await props.baselistConfirm(option, type, form);
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

const confirmClick = (formData) => {
  emit('confirm-click', formData);
};
// #endregion

// 暴露方法给父组件
defineExpose({
  initDataList,
  openDlg,
  _confirm: async(option, type, form) => {
    if (form) {
      emit('confirm-click', form);
    }
    await simpleDialog.value?._confirm(option, type, form);
    initDataList()
  },
});


</script>
