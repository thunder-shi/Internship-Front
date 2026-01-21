<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" :dlgbasic-confirm="confirm" @close-dialog="onCloseDialog" @open-dialog="openDialog">
    <template #mainForm>
      <div class="dlg-content-wrapper">
        <!-- 上半部分：基本信息表单 -->
        <div class="form-section">
          <FormItemsforDialog ref="formItemsRef" :form="form" :form-items="formItems" :form-rules="formRules" label-width="100px" @simple-select-change="onSimpleSelectChange" @tree-select-change="onTreeSelectChange" />
        </div>

        <!-- 下半部分：数据列表 -->
        <div class="table-section">
          <DataTableList ref="dataTableList" :default-props="tableListProps" @append-click="handleTableAppend" @edit-click="handleTableEdit" @after-init-data="handleAfterInitData" />
        </div>
      </div>
    </template>
  </DlgBasic>
  <!-- 流程选择窗口 -->
  <DlgProcessSelect ref="dlgProcessSelect" :internship-type-id="form.id" @update-record="handleProcessSelectSave" />
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
import listAPI from '@/api/list';

const emit = defineEmits(['update-record', 'close-dialog']);

const store = useStore();
const dlgBasicRef = ref(null);
const formItemsRef = ref(null);
const dataTableList = ref(null);
const dlgProcessSelect = ref(null);
const formPanelRef = computed(() => formItemsRef.value?.formPanelRef);

const form = reactive({});
const keyWord = ref('BaseInternshipType');
const processList = ref([]);

const defaultProps = reactive({
  form: {},
  width: '50%',
  dlgTitle: '编辑/查看',
  footButtons: {
    cancel: { show: true, name: '取 消', type: '' },
    confirm: { show: true, name: '保 存', type: 'primary' }
  },
  someFlags: {
    noFooter: false,
    autoMax: true,  // 默认最大化
    needMaxBtn: true,  // 显示最大化按钮
    needValidate: true,
    validate: true,
    needVerifyUpdate: true
  }
});

const formItems = [
  { name: '学校院系', field: 'universityId', type: 'cascader', searchKeys: { typeName: "学校" }, keyWords: 'ViewBaseDepartment' },
  { name: '模板类型', field: 'intTypeId', type: 'select', keyWords: 'BaseIntType' },
  { name: '模板编码', field: 'code', type: 'input' },
  { name: '模板名称', field: 'name', type: 'input' },
  { name: '模板说明', field: 'remarks', type: 'textarea' }
];

const formRules = {
  name: [{ required: true, message: '模板名称不能为空', trigger: 'blur' }]
};

// DataTableList 的配置
const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 0, // 隐藏分页后不需要预留空间
  sortStr: { properties: 'theOrder', direction: 'ASC' },  // 按照 theOrder 排序
  pageInfo: { page: 1, size: 100 }, // 设置较大的页面大小，确保所有数据在一页显示
  initSearchWords: {
    // 初始查询条件：只显示当前实习类型相关的流程
    searchKey: {}
  },
  someFlags: {
    operateShow: true,
    checkFlag: true,
    showPage: false, // 隐藏分页组件
    autoInit: false  // 初始时不自动加载数据，等基本信息保存后再加载
  },
  defaultDTHProps: {
    keyWord: { edit: 'RelProcessInternshipType', view: 'ViewRelProcessInternshipType' },
    buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true }, up: { show: true }, down: { show: true } },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false }
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
    // 清空 form 的所有属性
    const formKeys = Object.keys(form);
    formKeys.forEach(key => {
      delete form[key];
    });
    // 赋值新数据
    Object.assign(form, formData);
  }

  // 设置 DataTableList 的过滤条件：只显示当前实习类型相关的流程
  if (formData && formData.id != null && formData.id !== 0) {
    // 编辑模式：设置过滤条件为 internshipTypeId = form.id
    tableListProps.initSearchWords.searchKey = { internshipTypeId: formData.id };
  } else {
    // 新增模式：清空过滤条件，避免后端查询错误
    tableListProps.initSearchWords.searchKey = {};
  }
  // 打开对话框
  dlgBasicRef.value?.showDialog(val, form, 'edit');
  // 设置按钮状态
  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.id != null && formData.id !== 0) {
      // 编辑模式，检查表单是否有必填项未填
      verifyValid(false);
      // 如果有 id，则加载流程列表数据
      setTimeout(() => { dataTableList.value?.initDataList(true); }, 200);
    } else {
      // 新增模式，按钮禁用
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
    const rules = formRules;
    const fields = Object.keys(rules);
    let hasError = false;

    fields.forEach((field) => {
      const ruleArray = rules[field];
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

async function confirm(option, type) {
  // 编辑模式下验证是否包含"实习计划制定"流程
  if (form.id != null && form.id !== 0) {
    const createProcess = processList.value.find(
      (p) => p.processTypeName === '实习计划制定'
    );
    if (!createProcess) {
      ElMessage.warning('流程列表中必须包含"实习计划制定"流程');
      throw new Error('缺少实习计划制定流程');
    }
  }

  const userId = store.getters.userInfo?.id;
  const resInfo = await dlgAPI.commonSubmitDlg(formPanelRef.value, form, keyWord.value, 'edit', false, false, userId);
  if (resInfo && resInfo.message === 'successful') {
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

function onSimpleSelectChange(val, field, options) {
  form[field] = val;
}

function onTreeSelectChange(val, field, node) {
  form[field] = val;
}

// DataTableList 的事件处理
function handleAfterInitData(data) {
  processList.value = data || [];
}

function handleTableAppend() {
  // 表格新增按钮点击事件，打开流程选择窗口
  // 只有在编辑模式下（有 id）才能添加流程
  if (form.id != null && form.id !== 0) {
    dlgProcessSelect.value?.showDialog(true, {});
  } else {
    ElMessage.warning('请先保存基本信息后再添加流程');
  }
}

// 处理流程选择窗口的保存
async function handleProcessSelectSave(processData) {
  // 保存流程数据到后端
  const saveData = {
    internshipTypeId: form.id, // 当前实习类型的 ID
    processTypeId: processData.processTypeId, // 流程模板 ID
    verifyTypeId: processData.verifyTypeId, // 审核要求 ID
    verifyFirstRoleId: processData.verifyFirstRoleId,
    verifySecondRoleId: processData.verifySecondRoleId,
    verifyThirdRoleId: processData.verifyThirdRoleId,
    verifyFourthRoleId: processData.verifyFourthRoleId,
    verifyFifthRoleId: processData.verifyFifthRoleId
  };

  // 如果是编辑模式，需要包含 id
  if (processData.id != null && processData.id !== 0) {
    saveData.id = processData.id;
  }

  try {
    // 直接调用 API 保存，因为表单验证已经在 DlgProcessSelect 中完成
    const resInfo = await listAPI.editOneNode('RelProcessInternshipType', saveData);

    if (resInfo && resInfo.message === 'successful') {
      const isEdit = processData.id != null && processData.id !== 0;
      ElMessage.success(isEdit ? '修改成功！' : '新增成功！');
      // 保存成功后，刷新流程列表
      dataTableList.value?.initDataList(true);
      // 关闭流程选择窗口
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
  // 表格编辑按钮点击事件，打开流程选择窗口并传入当前行数据
  // row 可能是数组（批量编辑）或单个对象（单行编辑）
  const rowData = Array.isArray(row) ? row[0] : row;
  if (rowData) {
    dlgProcessSelect.value?.showDialog(true, {
      id: rowData.id,
      processTypeId: rowData.processTypeId,
      verifyTypeId: rowData.verifyTypeId,
      verifyFirstRoleId: rowData.verifyFirstRoleId,
      verifySecondRoleId: rowData.verifySecondRoleId,
      verifyThirdRoleId: rowData.verifyThirdRoleId,
      verifyFourthRoleId: rowData.verifyFourthRoleId,
      verifyFifthRoleId: rowData.verifyFifthRoleId
    });
  }
}

// 关闭所有对话框的方法，用于组件销毁前清理
function closeAllDialogs() {
  // 关闭流程选择对话框
  dlgProcessSelect.value?.showDialog?.(false, {});
  // 关闭主对话框
  dlgBasicRef.value?.showDialog?.(false, {});
}

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  closeAllDialogs();
});

defineExpose({
  showDialog,
  closeAllDialogs
});
</script>

