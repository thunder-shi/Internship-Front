<template>
  <DlgBasic ref="dlgBasicRef" v-model:default-props="defaultProps" :dlgbasic-confirm="confirm" :dlgbasic-spec-submit="handleSubmit" @close-dialog="onCloseDialog" @open-dialog="openDialog">
    <template #mainForm>
      <div class="dlg-content-wrapper">
        <!-- 上半部分：基本信息表单 -->
        <div class="form-section">
          <FormItemsforDialog ref="formItemsRef" :form="form" :form-items="formItems" :form-rules="formRules" label-width="100px" @cron-change="onCronChange" @tree-select-change="onTreeSelectChange" />
        </div>

        <!-- 下半部分：流程列表 -->
        <div class="table-section">
          <DataTableList ref="dataTableList" :default-props="tableListProps" @append-click="handleTableAppend" @edit-click="handleTableEdit" @after-init-data="handleAfterInitData" />
        </div>
      </div>
    </template>
  </DlgBasic>
  <!-- 流程选择窗口 -->
  <DlgProcessSelect ref="dlgProcessSelect" :internship-id="form.internshipId" @update-record="handleProcessSelectSave" />
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgProcessSelect from '@/views/dialogs/DlgProcessSelect.vue';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';

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
const majorList = ref([]); // 存储已选择的专业列表
const isInitializing = ref(false); // 标记是否正在初始化，避免触发"已修改"状态

const defaultProps = reactive({
  form: {},
  width: '60%',
  dlgTitle: '编辑实习项目',
  footButtons: {
    cancel: { show: true, name: '取 消', type: '' },
    confirm: { show: true, name: '保 存', type: 'primary' },
    submit: { show: true, name: '提 交', type: 'success' }
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
  { name: '专业选择', field: 'majorIds', type: 'cascader', keyWords: 'BaseMajor', multiple: true },
  { name: '项目编号', field: 'internshipCode', type: 'input' },
  { name: '实习名称', field: 'internshipName', type: 'input' },
  // { name: '报告周期', field: 'cron', type: 'cron' },
  { name: '备注', field: 'internshipRemarks', type: 'textarea' }
];

const formRules = {
  internshipName: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
  majorIds: [
    { 
      required: true, 
      message: '请选择专业', 
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          callback(new Error('请选择专业'));
        } else {
          callback();
        }
      }
    }
  ]
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
  someFlags: { operateShow: true, checkFlag: true, showPage: false, autoInit: false },
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
watch( form, () => {
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
    const formKeys = Object.keys(form);
    formKeys.forEach(key => {
      delete form[key];
    });
    Object.assign(form, formData);
    // 保存 processId（用于提交时更新 MainVerifyProcess 表）
    if (formData.processId != null) {
      form.processId = formData.processId;
    }
  }

  // 判断是否允许修改：只有 SAVE(-1) 或 BACK(3) 状态才能修改
  const canEdit = formData.isAudit === CONSTANT.AUDIT_STATUS.SAVE || formData.isAudit === CONSTANT.AUDIT_STATUS.BACK;
  
  // 根据审核状态控制按钮显示
  defaultProps.footButtons.confirm.show = canEdit;
  defaultProps.footButtons.submit.show = canEdit;
  tableListProps.defaultDTHProps.showTopButtons = canEdit;
  tableListProps.someFlags.operateShow = canEdit;

  // 设置 DataTableList 的过滤条件和移动范围
  if (formData && formData.internshipId != null && formData.internshipId !== 0) {
    tableListProps.initSearchWords.searchKey = { internshipId: formData.internshipId };
    tableListProps.moveSearchWords.searchKey = { internshipId: formData.internshipId };
    // 在打开对话框前先加载专业数据，避免组件初始化后再设置值导致重复加载
    await loadMajorIds(formData.internshipId);
  } else {
    tableListProps.initSearchWords.searchKey = {};
    tableListProps.moveSearchWords.searchKey = {};
    // 清空专业选择
    form.majorIds = [];
    majorList.value = [];
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');
  
  // 标记初始化完成
  isInitializing.value = false;

  // 等待 DOM 更新后执行后续操作
  await nextTick();
  
  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.internshipId != null && formData.internshipId !== 0) {
      verifyValid(false);
      // 延迟加载数据列表，确保组件已完全初始化
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
 * 验证表单数据
 * @returns {Boolean} - 返回 true 表示验证通过，false 表示验证失败
 */
function validateFormData() {
  // 检查专业选择
  if (!form.majorIds || (Array.isArray(form.majorIds) && form.majorIds.length === 0)) {
    ElMessage.warning('请选择专业');
    return false;
  }

  // 检查"实习计划制定"流程
  const planProcess = processList.value.find((p) => p.processTypeName === '实习计划制定');
  if (!planProcess) {
    ElMessage.warning('流程列表中必须包含"实习计划制定"流程');
    return false;
  }

  if (!planProcess.startTime || !planProcess.endTime) {
    ElMessage.warning('"实习计划制定"流程必须设置起止时间');
    return false;
  }

  return true;
}

/**
 * 保存实习项目数据和专业关联关系
 * @param {String} successMessage - 成功提示消息
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
async function saveInternshipAndMajors(successMessage) {
  // 先保存 MainInternship 表
  const saveSuccess = await saveInternshipData(form, successMessage);
  if (!saveSuccess) {
    return false;
  }

  // 保存专业关联关系
  if (form.internshipId != null && form.internshipId !== 0) {
    await saveMajorIds(form.internshipId, form.majorIds || []);
  }

  return true;
}

/**
 * 保存：保存项目配置
 * 检查"实习计划制定"流程必须存在且设置了起止时间
 * 检查不通过时返回 false 阻止弹窗关闭
 */
async function confirm(option, type) {
  // 验证表单数据
  if (!validateFormData()) {
    return false; // 阻止弹窗关闭
  }

  // 保存数据
  const saveSuccess = await saveInternshipAndMajors('保存成功');
  if (!saveSuccess) {
    return false; // 保存失败，阻止关闭对话框
  }

  emit('update-record', form);
  if (type === 'stop') {
    dlgBasicRef.value?.showDialog(false, form);
  }
  return true; // 返回 true 表示保存成功，允许关闭对话框
}

/**
 * 保存数据到 MainInternship 表
 * @param {Object} formData - 表单数据
 * @param {String} successMessage - 成功提示消息
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
async function saveInternshipData(formData, successMessage) {
  try {
    // 创建保存数据对象，只包含需要的字段
    const saveData = {
      id: formData.internshipId,
      code: formData.internshipCode,
      name: formData.internshipName,
      remarks: formData.internshipRemarks
    };
    
    const mainInternshipRes = await listAPI.editOneNode('MainInternship', saveData);
    if (mainInternshipRes && mainInternshipRes.message === 'successful') {
      ElMessage.success(successMessage);
      return true; // 返回 true 表示成功
    } else {
      ElMessage.warning(mainInternshipRes?.message || '保存失败');
      return false;
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('保存失败:', error);
    return false;
  }
}

/**
 * 更新 MainVerifyProcess 表的审核状态
 * 只有"提交"操作才会调用此函数
 * @param {Number} id - MainVerifyProcess 表的主键
 * @param {Number} isAudit - 审核状态（0: 提交待审核）
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
async function updateVerifyProcess(id, isAudit) {
  try {
    // 更新流程状态到 MainVerifyProcess
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: id, 
      isAudit: isAudit
    });
    if (resInfo && resInfo.message === 'successful') {
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
      return false;
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('更新审核状态失败:', error);
    return false;
  }
}

/**
 * 提交：提交审核
 * isAudit = 0（提交待审核）
 * 先保存 MainInternship 表，然后更新 MainVerifyProcess 表的审核状态
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
async function handleSubmit() {
  // 验证表单数据
  if (!validateFormData()) {
    return false;
  }
  // 保存数据
  const saveSuccess = await saveInternshipAndMajors(`提交成功，${CONSTANT.AUDIT_STATUS.SUBMITNAME}`);
  if (!saveSuccess) {
    return false;
  }
  // 然后更新 MainVerifyProcess 表的审核状态
  if (form.id != null && form.id !== 0) {
    const updateSuccess = await updateVerifyProcess(form.id, CONSTANT.AUDIT_STATUS.SUBMIT);
    if (updateSuccess) {
      emit('update-record', form);
      // 提交成功后关闭对话框
      dlgBasicRef.value?.showDialog(false, form);
      return true; // 返回 true 表示成功
    }
    return false;
  } else {
    ElMessage.warning('缺少流程ID，无法提交审核');
    return false;
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
  if (form.internshipId != null && form.internshipId !== 0) {
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
    // 传递表单数据和整行数据（ViewRelProcessInternship）
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
    }, rowData); // 传递整行数据作为第三个参数
  }
}

function closeAllDialogs() {
  dlgProcessSelect.value?.showDialog?.(false, {});
  dlgBasicRef.value?.showDialog?.(false, {});
}

// 加载已选择的专业ID列表
async function loadMajorIds(internshipId) {
  try {
    // 查询关联表，获取当前实习项目关联的所有专业
    const resInfo = await listAPI.getSomeRecords({
      keyWords: 'RelInterMajor',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { internshipId: internshipId },
      reg: { internshipId: '=' }
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
async function saveMajorIds(internshipId, majorIds) {
  try {
    // 先查询现有的关联关系
    const existingRes = await listAPI.getSomeRecords({
      keyWords: 'RelInterMajor',      
      searchKey: { internshipId: internshipId }
      // reg: { internshipId: '=' }
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
        await listAPI.delOneOrManyNodes('RelInterMajor', deleteIds);
      }
    }

    // 新增关联的专业
    for (const majorId of toAdd) {
      const saveData = {
        internshipId: internshipId,
        majorId: majorId
      };
      await listAPI.editOneNode('RelInterMajor', saveData);
    }
  } catch (error) {
    console.error('保存专业关联关系失败:', error);
    ElMessage.warning('保存专业关联关系失败');
  }
}

onBeforeUnmount(() => {
  closeAllDialogs();
});

defineExpose({
  showDialog,
  closeAllDialogs
});
</script>
