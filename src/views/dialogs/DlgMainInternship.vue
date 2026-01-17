<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="defaultProps"
    :dlgbasic-confirm="confirm"
    :dlgbasic-spec-submit="submit"
    @close-dialog="onCloseDialog"
    @open-dialog="openDialog"
  >
    <template #mainForm>
      <div class="dlg-content-wrapper">
        <!-- 上半部分：基本信息表单 -->
        <div class="form-section">
          <FormItemsforDialog
            ref="formItemsRef"
            :form="form"
            :form-items="formItems"
            :form-rules="formRules"
            label-width="100px"
            @simple-select-change="onSimpleSelectChange"
            @cron-change="onCronChange"
          />
        </div>

        <!-- 下半部分：流程列表 -->
        <div class="table-section">
          <DataTableList
            ref="dataTableList"
            :default-props="tableListProps"
            @append-click="handleTableAppend"
            @edit-click="handleTableEdit"
            @after-init-data="handleAfterInitData"
          />
        </div>
      </div>
    </template>
  </DlgBasic>
  <!-- 流程选择窗口 -->
  <DlgProcessSelect
    ref="dlgProcessSelect"
    :internship-id="form.id"
    @update-record="handleProcessSelectSave"
  />
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgProcessSelect from '@/views/dialogs/DlgProcessSelect.vue';
import dlgAPI from '@/utils/forDialog';
import listAPI from '@/api/list';

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
    confirm: { show: true, name: '暂 存', type: 'primary' },
    submit: { show: true, name: '提 交', type: 'success' }
  },
  someFlags: {
    noFooter: false,
    autoMax: true,
    needMaxBtn: true,
    needValidate: true,
    validate: true,
    needVerifyUpdate: true
  }
});

const formItems = reactive([
  { name: '实习名称', field: 'name', type: 'input' },
  { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'ViewBaseInternshipType', sortJson: { properties: 'Id', direction: 'DESC' } },
  { name: '报告周期', field: 'cron', type: 'cron' },
  { name: '备注', field: 'remarks', type: 'textarea' }
]);

const formRules = {
  name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
  internshipTypeId: [{ required: true, message: '请选择实习模板', trigger: 'blur' }]
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
    buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true }, up: { show: true }, down: { show: true } },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false },
      { id: 3, showName: '流程开始时间', theOrder: 3, tableColumnName: 'startTime', sortable: true },
      { id: 4, showName: '流程结束时间', theOrder: 4, tableColumnName: 'endTime', sortable: true }
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
      setTimeout(() => {
        dataTableList.value?.initDataList(true);
      }, 200);
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

// 暂存（isAudit 保持不变或设为 -1）
async function confirm(option, type) {
  const userId = store.getters.userInfo?.id;
  // 暂存时保持 isAudit = -1
  if (form.isAudit === undefined || form.isAudit === null) {
    form.isAudit = -1;
  }
  const resInfo = await dlgAPI.commonSubmitDlg(
    formPanelRef.value,
    form,
    keyWord.value,
    'edit',
    false,
    false,
    userId
  );
  if (resInfo && resInfo.message === 'successful') {
    emit('update-record', form);
    if (type === 'stop') {
      dlgBasicRef.value?.showDialog(false, form);
    }
  }
}

// 提交（根据"实习项目创建"流程的审核要求决定 isAudit 值）
async function submit() {
  // 检查是否所有流程都已规定起止时间
  if (processList.value.length === 0) {
    ElMessage.warning('请至少添加一个流程');
    return;
  }

  const invalidProcess = processList.value.find(
    (p) => !p.startTime || !p.endTime
  );
  if (invalidProcess) {
    ElMessage.warning(`流程"${invalidProcess.processTypeName || '未命名'}"未设置起止时间，请先完善流程信息`);
    return;
  }

  try {
    await ElMessageBox.confirm(
      '提交后无法修改，是否确认提交？',
      '提示',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
  } catch {
    // 用户点击取消，不执行提交
    return;
  }

  const userId = store.getters.userInfo?.id;

  // 查找"实习项目创建"流程，根据审核要求决定 isAudit 值
  const createProcess = processList.value.find(
    (p) => p.processTypeName === '实习项目创建'
  );
  if (createProcess) {
    if (createProcess.verifyTypeId >= 2) {
      // 需要审核：isAudit = 0（提交未审核）
      form.isAudit = 0;
    } else {
      // 无需审核：isAudit = 1（审核通过）
      form.isAudit = 1;
    }
  }
  // 没有"实习项目创建"流程时，不传递 isAudit
  const resInfo = await dlgAPI.commonSubmitDlg(
    formPanelRef.value,
    form,
    keyWord.value,
    'edit',
    false,
    false,
    userId
  );
  if (resInfo && resInfo.message === 'successful') {
    ElMessage.success('提交成功');
    emit('update-record', form);
    dlgBasicRef.value?.showDialog(false, form);
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

function onSimpleSelectChange(val, field, options) {
  form[field] = val;
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

// 处理流程选择窗口的保存
async function handleProcessSelectSave(processData) {
  const saveData = {
    internshipId: form.id,
    processTypeId: processData.processTypeId,
    verifyTypeId: processData.verifyTypeId,
    startTime: processData.startTime,
    endTime: processData.endTime,
    verifyFirstRoleId: processData.verifyFirstRoleId,
    verifySecondRoleId: processData.verifySecondRoleId,
    verifyThirdRoleId: processData.verifyThirdRoleId,
    verifyFourthRoleId: processData.verifyFourthRoleId,
    verifyFifthRoleId: processData.verifyFifthRoleId
  };

  if (processData.id != null && processData.id !== 0) {
    saveData.id = processData.id;
  }

  try {
    const resInfo = await listAPI.editOneNode('RelProcessInternship', saveData);

    if (resInfo && resInfo.message === 'successful') {
      const isEdit = processData.id != null && processData.id !== 0;
      ElMessage.success(isEdit ? '修改成功！' : '新增成功！');
      dataTableList.value?.initDataList(true);
      dlgProcessSelect.value?.showDialog(false, {});
    } else {
      ElMessage.warning(resInfo?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存流程数据失败:', error);
    ElMessage.error('保存失败，请重试');
  }
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
