<template>
  <div class="tree-list-layout">
    <section class="tree-list-aside">
      <DataTree ref="dataTreeRef" :default-props="defaultDTProps" @node-click="handleNodeClick" @ready="onTreeReady" />
    </section>
    <section class="tree-list-main">
      <!-- 列表1 -->
      <DataTableList ref="dataTableList" :default-props="defaultDTLProps" @edit-click="editClick" @append-click="appendClick" @batch-import-click="batchImportClick" />
    </section>
    <slot name="dlg">
      <!-- 简单窗口 -->
      <SimpleDialog :default-props="defaultSDProps" />
    </slot>
    <slot name="batch">
      <!-- 批量录入窗口 -->
      <DlgBatchImport ref="batchAppendDlg" :default-props="defaultDBIProps" @ex-material="exMaterial" @close-dialog="initDataList" />
    </slot>
  </div>
</template>

<script setup>
import { ref, reactive, nextTick } from 'vue';
import DataTree from '@/components/DataTree.vue';
import DataTableList from '@/components/DataTableList.vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import DlgBatchImport from '@/views/dialogs/DlgBatchImport.vue';
import { customize } from '@/utils/common';
import _ from 'lodash';

defineOptions({
  name: 'BaseTreeList',
});

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        keyWord: {},
        treeRelColName: '',
        defaultDTLProps: {
          title: {},
          defaultDTHProps: {
            tableColumns: {},
          },
        },
        defaultSDProps: {
          formItems: [],
          formRules: {},
          defaultDBProps: {},
        },
      };
    },
  },
});

const emit = defineEmits(['set-type', 'append-click', 'edit-click']);

const dataTableList = ref(null);
const dataTreeRef = ref(null);
const batchAppendDlg = ref(null);
const treeReadyHandled = ref(false);
const defaultDTProps = reactive({});
const defaultDTLProps = reactive({});
const defaultSDProps = reactive({});
const defaultDBIProps = reactive({});

_.mergeWith(defaultDTProps, props.defaultProps.defaultDTProps, customize);
_.mergeWith(defaultDTLProps, props.defaultProps.defaultDTLProps, customize);
_.mergeWith(defaultSDProps, props.defaultProps.defaultSDProps, customize);
_.mergeWith(defaultDBIProps, props.defaultProps.defaultDBIProps, customize);

// customize 会深拷贝 searchItems，导致父级异步写入的 options（如专业树）无法反映到表格；保留父组件数组引用
const parentDtl = props.defaultProps?.defaultDTLProps;
if (Array.isArray(parentDtl?.searchItems)) {
  defaultDTLProps.searchItems = parentDtl.searchItems;
}

const treeInfo = reactive({});
Object.assign(treeInfo, defaultDTLProps.treeInfo || {});
defaultDTLProps.treeInfo = treeInfo;

const initDataList = async () => {
  await dataTableList.value?.initDataList(true);
};

const isValidDepartmentId = (id) => id != null && id !== '' && id !== -1 && id !== '-1';

const selectDepartmentAndLoad = (node) => {
  if (!node || !isValidDepartmentId(node.id)) return;
  Object.assign(treeInfo, {
    treeKeyWords: defaultDTProps.keyWord,
    treeNodeId: node.id,
    treeRelColName: props.defaultProps.treeRelColName,
  });
  emit('set-type', node);
  nextTick(() => initDataList());
};

const onTreeReady = (firstNode) => {
  if (treeReadyHandled.value) return;
  treeReadyHandled.value = true;
  if (!firstNode || !isValidDepartmentId(firstNode.id)) return;
  nextTick(() => {
    dataTreeRef.value?.dataTree?.setCurrentKey?.(firstNode.id);
    selectDepartmentAndLoad(firstNode);
  });
};

function batchImportClick() {
  batchAppendDlg.value.showDialog(true);
}

const handleNodeClick = (val) => {
  if (!isValidDepartmentId(val?.id)) return;
  selectDepartmentAndLoad(val);
};

const appendClick = () => {
  emit('append-click');
};

const editClick = (row) => {
  emit('edit-click', row);
};

defineExpose({
  initDataList,
});
</script>

<style scoped>
.tree-list-layout {
  display: flex;
  gap: 12px;
}

.tree-list-aside {
  flex: 0 0 auto;
  width: auto;
  display: flex;
}

.tree-list-main {
  flex: 1;
  min-width: 0;
}
</style>
