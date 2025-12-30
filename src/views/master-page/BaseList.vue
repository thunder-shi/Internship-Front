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
        @update-record="initDataList"
        @submit-more="submitMore"
        @simple-select-change="SimpleSelectChange"
        @simple-select-init-finish="simpleSelectInitFinish"
      />
    </slot>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, useAttrs } from 'vue';
import DataTableList from '@/components/DataTableList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import { resetForm } from '@/utils/common';

defineOptions({
  name: 'BaseList',
});

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
]);

const attrs = useAttrs();

const dataTableList = ref(null);
const simpleDialog = ref(null);

const form = reactive({}); // 关联form
const keyWord = reactive({ edit: '', view: '' });
const treeInfo = reactive({});
const searchName = ref('');
const thisEvents = ref('');
onMounted(() => {
  // 获取所有事件监听器
  thisEvents.value = Object.keys(attrs).filter((key) => key.startsWith('on'));
});

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

const appendClick = async () => {
  if (attrs['onAppend-click'] || attrs['onAppendClick']) {
    emit('append-click');
  } else {
    Object.assign(form, resetForm(form));
    simpleDialog.value?.showDialog(true, form);
  }
};

const editClick = async (row) => {
  if (!attrs['onEdit-click'] && !attrs['onEditClick']) {
    openDlg('edit', row);
  } else {
    emit('edit-click', row);
  }
};

const simpleSelectInitFinish = async (field, options) => {
  emit('simple-select-init-finish', field, options);
};

const deleteClick = async (row) => {
  if (attrs['onDelete-click'] || attrs['onDeleteClick']) {
    emit('delete-click', row);
  } else {
    dataTableList.value?._deleteClick(row);
  }
};

// 导出按钮
const _exportClick = async () => {
  await dataTableList.value?._exportClick();
};

const exportClick = async () => {
  if (attrs['onExport-click'] || attrs['onExportClick']) {
    emit('export-click');
  } else {
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
// #endregion

// #region simpleDialog对应的按钮事件
const confirm = async (option, type) => {
  if (!(props.baselistConfirm && typeof props.baselistConfirm === 'function')) {
    await simpleDialog.value?._confirm(option, type);
  } else {
    await props.baselistConfirm(option, type, form);
  }
};

const submitMore = (row) => {
  emit('submit-more', row);
};

const openDlg = (option, row) => {
  if (row != null) {
    Object.assign(form, { ...row });
  } else {
    Object.assign(form, resetForm(form));
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
// #endregion

// 暴露方法给父组件
defineExpose({
  initDataList,
  openDlg,
  _confirm: (option, type, form) => {
    simpleDialog.value?._confirm(option, type, form);
  },
});
</script>
