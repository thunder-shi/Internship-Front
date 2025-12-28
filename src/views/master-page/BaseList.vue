<template>
  <div>
    <DataTableList
      ref="dataTableList"
      :default-props="defaultProps.defaultDTLProps"
      @append-click="appendClick"
      @edit-click="editClick"
      @update-column="updateColumn"
      @delete-click="deleteClick"
      @audit-click="auditClick"
      @export-click="exportClick"
      @more1-click="more1Click"
      @more2-click="more2Click"
      @after-init-data="afterInitData"
      @view-click="viewClick"
      @self-init="selfInit"
      @batch-create="batchCreate"
      @clean-out-value="onCleanOutValue"
      @input="onInput"
    >
      <template #searchPanel>
        <slot name="searchPanel" />
      </template>
      <template #left>
        <slot name="left" />
      </template>
      <template #moreTopButtons>
        <slot name="moreTopButtons" />
      </template>
      <template #topOperate>
        <slot name="topOperate" />
      </template>
      <template #1006name="{ row }">
        <slot name="1006name" :row="row" />
      </template>
      <template
        v-for="item in defaultProps.nameList"
        :key="item"
        v-slot:[item]="{ row }"
      >
        <slot :name="item" :row="row" />
      </template>
      <template #commitStatus="{ row }">
        <slot name="commitStatus" :row="row" />
      </template>
      <template #commitTime="{ row }">
        <slot name="commitTime" :row="row" />
      </template>
      <template #rightOperate="{ row }">
        <slot name="rightOperate" :row="row" />
      </template>
      <template #rightbtn>
        <slot name="rightbtn" />
      </template>
      <template #topAlert>
        <slot name="header" />
      </template>
    </DataTableList>

    <slot name="dlg">
      <SimpleDialog
        ref="simpleDialog"
        :default-props="defaultProps.defaultSDProps"
        :simpledialog-confirm="confirm"
        :simpledialog-spec-confirm="specConfirm"
        @update-record="initDataList"
        @submit-more="submitMore"
        @simple-select-change="SimpleSelectChange"
      >
        <template #otherItems>
          <slot name="otherItems" />
        </template>
        <template #bottomItems>
          <slot name="bottomItems" />
        </template>
        <template #upItems>
          <slot name="upItems" />
        </template>
        <template #otherBtn>
          <slot name="otherBtn" />
        </template>
      </SimpleDialog>
    </slot>

    <slot name="batch">
      <DlgBatchImport
        ref="batchAppendDlg"
        :default-props="defaultProps.defaultDBIProps"
        @selfImport="selfImport"
      />
    </slot>
    <!-- 
    <slot name="view">
      <DlgView
        v-if="defaultProps.defaultSDProps && defaultProps.defaultSDProps.viewFormItems"
        ref="viewDialog"
        :form-items="defaultProps.defaultSDProps.viewFormItems"
      >
        <template #other>
          <slot name="other" />
        </template>
      </DlgView>
    </slot> -->
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, useAttrs } from "vue";
import DataTableList from "@/components/DataTableList.vue";
import SimpleDialog from "@/components/SimpleDialog.vue";
import DlgBatchImport from "@/views/dialogs/DlgBatchImport.vue";
// import DlgView from './components/DlgView.vue'
import { resetForm } from "@/utils/common";

defineOptions({
  name: "BaseList",
});

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        keyWord: {},
        defaultDTLProps: {
          title: {},
          someFlags: {
            operateShow: true,
            checkFlag: true,
            showPage: true,
            autoInit: true,
            hasOwnGet: false,
            orderList: false,
          },
          initSearchWords: {
            searchKey: {},
            regKey: {},
            andor: {},
          },
          nowSearchWords: {
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
          isAudit: false,
        },
      };
    },
  },
  baselistSpecConfirm: { type: Function, default: null },
  baselistConfirm: { type: Function, default: null },
  searchPlaceholder: { type: String, default: "请输入名称" },
});

const emit = defineEmits([
  "update-column",
  "after-init-data",
  "append-click",
  "edit-click",
  "delete-click",
  "audit-click",
  "export-click",
  "more1-click",
  "more2-click",
  "submit-more",
  "simple-select-change",
  "self-init",
  "batch-create",
  "view-click",
  "selectedColumnsChange",
  "send-click",
  "clean-out-value",
  "input",
]);

const attrs =   useAttrs();
const dataTableList = ref(null);
const simpleDialog = ref(null);
const batchAppendDlg = ref(null);

const form = reactive({});
const thisEvents = ref({});

onMounted(() => {
  thisEvents.value = attrs;
});

const selfImport = (val) => {
  emit("self-import", val);
};

const selectedColumnsChange = (val) => {
  emit("selectedColumnsChange", val);
};

const selfInit = (val, val2, searchWords) => {
  emit("self-init", val, val2, searchWords);
};

const initDataList = async () => {
  dataTableList.value?.initDataList();
};

const updateColumn = (val) => {
  emit("update-column", val);
};

const viewClick = (val) => {
  emit("view-click", val);
};

const afterInitData = (dataList) => {
  emit("after-init-data", dataList);
};

const searchClick = () => {};

const appendClick = async () => {
  if (thisEvents.value["onAppend-click"] || thisEvents.value["onAppendClick"]) {
    emit("append-click");
  } else {
    Object.assign(form, resetForm(form));
    simpleDialog.value?.showDialog(true, form);
  }
};

const editClick = async (row) => {
  if (!thisEvents.value["onEdit-click"] && !thisEvents.value["onEditClick"]) {
    openDlg("edit", row);
  } else {
    emit("edit-click", row);
  }
};

const deleteClick = async (row) => {
  if (thisEvents.value["onDelete-click"] || thisEvents.value["onDeleteClick"]) {
    emit("delete-click", row);
  } else {
    dataTableList.value?._deleteClick(row);
  }
};

const auditClick = async (row, operName) => {
  if (thisEvents.value["onAudit-click"] || thisEvents.value["onAuditClick"]) {
    emit("audit-click", row, operName);
  } else {
    dataTableList.value?._audit(row, operName);
  }
};

const _exportClick = async () => {
  await dataTableList.value?._exportClick();
};

const batchCreate = () => {
  batchAppendDlg.value?.showDialog(true, form);
};

const exportClick = async () => {
  if (thisEvents.value["onExport-click"] || thisEvents.value["onExportClick"]) {
    emit("export-click");
  } else {
    await _exportClick();
  }
};

const more1Click = async (row) => {
  emit("more1-click", row);
};

const more2Click = async (row) => {
  emit("more2-click", row);
};

const sendClick = async (row) => {
  emit("send-click", row);
};

const onInput = (val) => emit("input", val);
const onCleanOutValue = () => emit("clean-out-value");

const confirm = async (option, type) => {
  if (!(props.baselistConfirm && typeof props.baselistConfirm === "function")) {
    await simpleDialog.value?._confirm(option, type);
  } else {
    await props.baselistConfirm(option, type, form);
  }
};

const specConfirm = async (option, type) => {
  if (
    !(
      props.baselistSpecConfirm &&
      typeof props.baselistSpecConfirm === "function"
    )
  ) {
    await simpleDialog.value?._confirm(option, type);
  } else {
    await props.baselistSpecConfirm(option, type, form);
  }
};

const submitMore = (row) => {
  emit("submit-more", row);
};

const openDlg = (option, row) => {
  if (row != null) {
    Object.assign(form, { ...row });
  } else {
    Object.assign(form, resetForm(form));
  }
  simpleDialog.value?.showDialog(true, form);
};

const SimpleSelectChange = (val, field, formData, options) => {
  emit("simple-select-change", val, field, formData, options);
};

const showDialog = (val, data) => {
  simpleDialog.value?.showDialog(val, data);
};

defineExpose({
  initDataList,
  openDlg,
  showDialog,
  selectedColumnsChange,
  _confirm: (option, type, formData) => {
    simpleDialog.value?._confirm(option, type, formData);
  },
});
</script>
