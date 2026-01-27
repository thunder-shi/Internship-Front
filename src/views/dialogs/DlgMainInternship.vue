<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" :dlgbasic-confirm="confirm" @close-dialog="onCloseDialog" @open-dialog="openDialog">
    <template #mainForm>
      <div class="dlg-content-wrapper">
        <!-- 上半部分：基本信息表单 -->
        <div class="form-section">
          <FormItemsforDialog ref="formItemsRef" :form="form" :form-items="formItems" :form-rules="formRules" label-width="100px" @cron-change="onCronChange" />
        </div>

        <!-- 下半部分：流程列表 -->
        <div class="table-section">
          <DataTableList ref="dataTableList" :default-props="tableListProps" @append-click="handleTableAppend" @edit-click="handleTableEdit" @after-init-data="handleAfterInitData" />
        </div>
      </div>
    </template>
  </DlgBasic>
  <!-- 流程选择窗口 -->
  <DlgProcessSelect ref="dlgProcessSelect" :internship-id="form.id" @update-record="handleProcessSelectSave" />
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgProcessSelect from '@/views/dialogs/DlgProcessSelect.vue';
import dlgAPI from '@/utils/forDialog';

const props = defineProps({
  userDepartmentId: { type: [Number, String], default: null },
  isSuperAdmin: { type: Boolean, default: false }
});

const emit = defineEmits(['update-record', 'close-dialog']);

const store = useStore();
const dlgBasicRef = ref(null);
const formItemsRef = ref(null);
const dataTableList = ref(null);
const dlgProcessSelect = ref(null);
const formPanelRef = computed(() => formItemsRef.value?.formPanelRef);

const form = reactive({});
const keyWord = ref('MainInternship');
const processList = ref([]);

const defaultProps = reactive({
  form: {},
  width: '60%',
  dlgTitle: '编辑实习项目',
  footButtons: {
    cancel: { show: true, name: '取 消', type: '' },
    confirm: { show: true, name: '保 存', type: 'primary' }
  },
  someFlags: {
    noFooter: false,
    autoMax: true,
    needMaxBtn: true,
    needValidate: true,
    validate: true
  }
});

const formItems = [
  { name: '实习模板', field: 'internshipTypeName', type: 'label' },
  { name: '实习名称', field: 'name', type: 'input' },
  { name: '报告周期', field: 'cron', type: 'cron' },
  { name: '备注', field: 'remarks', type: 'textarea' }
];

const formRules = {
  name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }]
};

// DataTableList 的配置
const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0,
  sortStr: { properties: 'theOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: {
    searchKey: {}
  },
  moveSearchWords: {
    searchKey: {}
  },
  someFlags: {
    operateShow: true,
    checkFlag: true,
    showPage: false,
    autoInit: false
  },
  defaultDTHProps: {
    keyWord: { edit: 'RelProcessInternship', view: 'ViewRelProcessInternship' },
    buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true } },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false },
      { id: 3, showName: '流程开始时间', theOrder: 3, tableColumnName: 'startTime', sortable: false },
      { id: 4, showName: '流程结束时间', theOrder: 4, tableColumnName: 'endTime', sortable: false }
    ]
  }
});

// 监听表单变化，更新按钮状态
watch(
  form,
  () => {
    verifyValid(false);
  },
  { deep: true }
);

function showDialog(val, formData = {}) {
  if (formData !== null) {
    const formKeys = Object.keys(form);
    formKeys.forEach(key => {
      delete form[key];
    });
    Object.assign(form, formData);
  }

  // 设置 DataTableList 的过滤条件和移动范围
  if (formData && formData.id != null && formData.id !== 0) {
    tableListProps.initSearchWords.searchKey = { internshipId: formData.id };
    tableListProps.moveSearchWords.searchKey = { internshipId: formData.id };
  } else {
    tableListProps.initSearchWords.searchKey = {};
    tableListProps.moveSearchWords.searchKey = {};
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');

  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.id != null && formData.id !== 0) {
      verifyValid(false);
      // 减少延迟时间，从 200ms 改为 100ms，提升刷新速度
      setTimeout(() => { dataTableList.value?.initDataList(true); }, 100);
    } else {
      dlgBasicRef.value.validate = true;
    }
  }, 100);
}

function verifyValid(showMessage = true) {
  const panelRef = formPanelRef.value;
  if (!panelRef || !dlgBasicRef.value) return;
  if (showMessage) {
    panelRef
      .validate((valid) => {
        dlgBasicRef.value.validate = !valid;
      })
      .catch(() => {
        dlgBasicRef.value.validate = true;
      });
  } else {
    const fields = Object.keys(formRules);
    let hasError = false;

    fields.forEach((field) => {
      const ruleArray = formRules[field];
      if (Array.isArray(ruleArray)) {
        const value = form[field];
        const requiredRule = ruleArray.find((r) => r.required === true);
        if (requiredRule) {
          if (value === undefined || value === null || value === '' ||
              (Array.isArray(value) && value.length === 0)) {
            hasError = true;
          }
        }
      }
    });

    dlgBasicRef.value.validate = hasError;
  }
}

/**
 * 保存：保存项目配置
 * 检查"实习计划制定"流程必须存在且设置了起止时间
 * 检查不通过时返回 false 阻止弹窗关闭
 */
async function confirm(option, type) {
  // 检查"实习计划制定"流程
  const planProcess = processList.value.find(
    (p) => p.processTypeName === '实习计划制定'
  );

  if (!planProcess) {
    ElMessage.warning('流程列表中必须包含"实习计划制定"流程');
    return false; // 阻止弹窗关闭
  }

  if (!planProcess.startTime || !planProcess.endTime) {
    ElMessage.warning('"实习计划制定"流程必须设置起止时间');
    return false; // 阻止弹窗关闭
  }

  const userId = store.getters.userInfo?.id;
  const resInfo = await dlgAPI.commonSubmitDlg(formPanelRef.value, form, keyWord.value, 'edit', false, false, userId);
  if (resInfo && resInfo.message === 'successful') {
    ElMessage.success('保存成功');
    emit('update-record', form);
    if (type === 'stop') {
      dlgBasicRef.value?.showDialog(false, form);
    }
  }
}

function onCloseDialog(saveType) {
  if (saveType === true) {
    emit('update-record', form);
  }
  emit('close-dialog');
}

function openDialog(row) {
  // 对话框打开时的处理
}

function onCronChange(val, field) {
  form[field] = val;
}

// DataTableList 的事件处理
function handleAfterInitData(data) {
  processList.value = data || [];
}

function handleTableAppend() {
  if (form.id != null && form.id !== 0) {
    dlgProcessSelect.value?.showDialog(true, {});
  } else {
    ElMessage.warning('请先保存基本信息后再添加流程');
  }
}

// 处理流程选择窗口的保存完成事件（数据已经在 DlgProcessSelect 中保存，这里只需要刷新列表）
function handleProcessSelectSave(processData) {
  // 数据已经在 DlgProcessSelect 中保存完成，这里只需要刷新列表
  dataTableList.value?.initDataList(true);
}

function handleTableEdit(row) {
  const rowData = Array.isArray(row) ? row[0] : row;
  if (rowData) {
    dlgProcessSelect.value?.showDialog(true, {
      id: rowData.id,
      processTypeId: rowData.processTypeId,
      verifyTypeId: rowData.verifyTypeId,
      startTime: rowData.startTime,
      endTime: rowData.endTime,
      verifyFirstRoleId: rowData.verifyFirstRoleId,
      verifySecondRoleId: rowData.verifySecondRoleId,
      verifyThirdRoleId: rowData.verifyThirdRoleId,
      verifyFourthRoleId: rowData.verifyFourthRoleId,
      verifyFifthRoleId: rowData.verifyFifthRoleId
    });
  }
}

function closeAllDialogs() {
  dlgProcessSelect.value?.showDialog?.(false, {});
  dlgBasicRef.value?.showDialog?.(false, {});
}

onBeforeUnmount(() => {
  closeAllDialogs();
});

defineExpose({
  showDialog,
  closeAllDialogs
});
</script>
