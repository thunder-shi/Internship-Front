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
const majorList = ref([]); // 存储已选择的专业列表
const isInitializing = ref(false); // 标记是否正在初始化，避免触发"已修改"状态

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
  { name: '专业选择', field: 'majorIds', type: 'cascader', keyWords: 'BaseMajor', multiple: true },
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
    // 如果正在初始化，不触发验证（避免误判为数据已修改）
    if (!isInitializing.value) {
      verifyValid(false);
    }
  },
  { deep: true }
);

async function showDialog(val, formData = {}) {
  // 标记开始初始化
  isInitializing.value = true;
  
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
    // 在打开对话框前先加载专业数据，避免组件初始化后再设置值导致重复加载
    await loadMajorIds(formData.id);
  } else {
    // 新增模式：清空过滤条件，避免后端查询错误
    tableListProps.initSearchWords.searchKey = {};
    // 清空专业选择
    form.majorIds = [];
    majorList.value = [];
  }
  
  // 打开对话框
  dlgBasicRef.value?.showDialog(val, form, 'edit');
  
  // 标记初始化完成
  isInitializing.value = false;
  
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
    // 保存基本信息成功后，保存专业关联关系
    if (resInfo.data && resInfo.data.id) {
      // 更新 form.id（新增时后端会返回 id）
      form.id = resInfo.data.id;
      await saveMajorIds(form.id, form.majorIds || []);
    } else if (form.id != null && form.id !== 0) {
      // 编辑模式，直接保存专业关联关系
      await saveMajorIds(form.id, form.majorIds || []);
    }
    
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
  // 如果是专业选择字段，更新专业列表
  if (field === 'majorIds') {
    majorList.value = options || [];
  }
}

function onTreeSelectChange(val, field, node) {
  form[field] = val;
  // 如果是专业选择字段，更新专业列表
  if (field === 'majorIds') {
    // node 参数在多选模式下是 checkedNodes 数组
    majorList.value = Array.isArray(node) ? node : (node ? [node] : []);
  }
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
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('保存流程数据失败:', error);
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

// 加载已选择的专业ID列表
async function loadMajorIds(internshipTypeId) {
  try {
    // 查询关联表，获取当前实习类型关联的所有专业
    const resInfo = await listAPI.getSomeRecords({
      keyWords: 'RelInterTypeMajor',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { internshipTypeId: internshipTypeId },
      reg: { internshipTypeId: '=' }
    });

    // 注意：后端返回的数据结构可能是 data.content 而不是 data.records
    const records = resInfo?.data?.records || resInfo?.data?.content || [];
    
    if (records && records.length > 0) {
      // 提取所有专业ID（后端返回的字段名是 majorId）
      const majorIds = records.map(item => item.majorId);
      
      // 在初始化期间设置值，不会触发"已修改"状态
      form.majorIds = majorIds;
      majorList.value = records;
    } else {
      form.majorIds = [];
      majorList.value = [];
    }
  } catch (error) {
    console.error('加载专业数据失败:', error);
    form.majorIds = [];
    majorList.value = [];
  }
}

// 保存专业关联关系
async function saveMajorIds(internshipTypeId, majorIds) {
  try {
    // 先查询现有的关联关系
    const existingRes = await listAPI.getSomeRecords({
      keyWords: 'RelInterTypeMajor',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { internshipTypeId: internshipTypeId },
      reg: { internshipTypeId: '=' }
    });

    // 支持 data.records 和 data.content 两种数据结构
    const existingRecords = existingRes?.data?.records || existingRes?.data?.content || [];
    const existingMajorIds = existingRecords.map(item => item.majorId);
    
    // 需要删除的专业ID（存在于数据库但不在新列表中）
    const toDelete = existingMajorIds.filter(id => !majorIds.includes(id));
    
    // 需要新增的专业ID（存在于新列表但不在数据库中）
    const toAdd = majorIds.filter(id => !existingMajorIds.includes(id));

    // 删除不再关联的专业
    if (toDelete.length > 0) {
      const deleteIds = existingRecords
        .filter(item => toDelete.includes(item.majorId))
        .map(item => item.id);
      
      if (deleteIds.length > 0) {
        await listAPI.delOneOrManyNodes('RelInterTypeMajor', deleteIds);
      }
    }

    // 新增关联的专业
    for (const majorId of toAdd) {
      const saveData = {
        internshipTypeId: internshipTypeId,
        majorId: majorId
      };
      await listAPI.editOneNode('RelInterTypeMajor', saveData);
    }
  } catch (error) {
    console.error('保存专业关联关系失败:', error);
    ElMessage.warning('保存专业关联关系失败');
  }
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

