<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="defaultProps"
    :dlgbasic-confirm="confirm"
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
            @tree-select-change="onTreeSelectChange"
          />
        </div>
        
        <!-- 下半部分：数据列表 -->
        <div class="table-section">
          <DataTableList
            ref="dataTableList"
            :default-props="tableListProps"
            @append-click="handleTableAppend"
            @edit-click="handleTableEdit"
            @delete-click="handleTableDelete"
          />
        </div>
      </div>
    </template>
  </DlgBasic>
  <!-- 流程选择窗口 -->
  <DlgProcessSelect
    ref="dlgProcessSelect"
    @update-record="handleProcessSelectSave"
  />
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgProcessSelect from '@/views/dialogs/DlgProcessSelect.vue';
import dlgAPI from '@/utils/forDialog';

const emit = defineEmits(['update-record', 'close-dialog']);

const store = useStore();
const dlgBasicRef = ref(null);
const formItemsRef = ref(null);
const dataTableList = ref(null);
const dlgProcessSelect = ref(null);
const formPanelRef = computed(() => formItemsRef.value?.formPanelRef);

const form = reactive({});
const keyWord = ref('BaseInternshipType');

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
  bottomOffset: 0,
  sortStr: { properties: 'Id', direction: 'DESC' },
  someFlags: {
    operateShow: true,
    checkFlag: true,
    showPage: true,
    autoInit: false  // 初始时不自动加载数据，等基本信息保存后再加载
  },
  defaultDTHProps: {
    buttonProps: {
      create: { show: true },  // 新增按钮
      update: { show: true },  // 修改按钮
      delete: { show: true }   // 删除按钮
    },
    allTableColumns: [
      // 列配置稍后添加
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
  // 打开对话框
  dlgBasicRef.value?.showDialog(val, form, 'edit');
  // 设置按钮状态
  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.id != null && formData.id !== 0) {
      // 编辑模式，检查表单是否有必填项未填
      verifyValid(false);
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
  const userId = store.getters.userInfo?.id;
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
function handleTableAppend() {
  // 表格新增按钮点击事件，打开流程选择窗口
  dlgProcessSelect.value?.showDialog(true, {});
}

// 处理流程选择窗口的保存
function handleProcessSelectSave(processData) {
  // 这里可以处理保存流程数据的逻辑
  // 例如：将流程数据添加到表格中
  console.log('流程数据:', processData);
  // TODO: 实现保存流程数据到表格的逻辑
}

function handleTableEdit(row) {
  // 表格编辑按钮点击事件
  // 可以在这里打开子对话框编辑行数据
}

function handleTableDelete(row) {
  // 表格删除按钮点击事件
  // 可以在这里删除行数据
}

defineExpose({
  showDialog
});
</script>

