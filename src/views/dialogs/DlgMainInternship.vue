<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" :dlgbasic-confirm="confirm" @close-dialog="onCloseDialog" @open-dialog="openDialog">
    <template #mainForm>
      <div class="dlg-main-body">
      <el-tabs v-model="activeTab" class="dlg-tabs" @tab-change="onTabChange">

        <!-- Tab 1: 基础信息 -->
        <el-tab-pane label="基础信息" name="basic">
          <FormItemsforDialog
            ref="formItemsRef"
            :form="form"
            :form-items="formItems"
            :form-rules="formRules"
            label-width="100px"
            @cron-change="onCronChange"
            @tree-select-change="onTreeSelectChange"
          />
        </el-tab-pane>

        <!-- Tab 2: 流程安排 -->
        <el-tab-pane label="流程安排" name="process">
          <div v-if="form.id" class="tab-pane-content">
            <DataTableList
              ref="dataTableList"
              :default-props="tableListProps"
              @append-click="handleTableAppend"
              @edit-click="handleTableEdit"
              @after-init-data="handleAfterInitData"
            />
          </div>
          <el-empty v-else description="请先在「基础信息」页保存项目信息后，再配置流程安排" :image-size="80" />
        </el-tab-pane>

        <!-- Tab 3: 报告周期 -->
        <el-tab-pane label="报告周期" name="period">
          <div v-if="form.id" class="period-config-section">
            <div class="period-controls">
              <div class="period-row">
                <span class="period-label">开始时间</span>
                <el-date-picker v-model="form.reportStartTime" type="date" placeholder="日志周期开始时间" value-format="YYYY-MM-DD" style="width: 240px" />
              </div>
              <div class="period-row">
                <span class="period-label">结束时间</span>
                <el-date-picker v-model="form.reportEndTime" type="date" placeholder="日志周期结束时间" value-format="YYYY-MM-DD" style="width: 240px" />
              </div>
              <div class="period-row">
                <span class="period-label">生成方式</span>
                <el-select v-model="periodConfig.mode" style="width: 150px">
                  <el-option label="按周期（cron）" value="cron" />
                  <el-option label="按期数（等分）" value="num" />
                </el-select>
                <template v-if="periodConfig.mode === 'cron'">
                  <span class="period-label" style="margin-left: 16px">报告频率</span>
                  <el-select v-model="periodConfig.cron" style="width: 150px">
                    <el-option v-for="opt in CRON_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
                  </el-select>
                </template>
                <template v-else>
                  <span class="period-label" style="margin-left: 16px">期数</span>
                  <el-input-number v-model="periodConfig.periodNum" :min="1" :precision="0" style="width: 130px" />
                </template>
              </div>
              <div class="period-generate-row">
                <el-button type="primary" :loading="generatingPeriods" @click="handleGeneratePeriods">生成期次</el-button>
                <span v-if="currentPeriodCount > 0" class="period-hint-warn">已有 {{ currentPeriodCount }} 期，请先删除后再重新生成</span>
                <span v-else class="period-hint">请先填写开始/结束时间后再生成</span>
              </div>
            </div>

            <DataTableList
              ref="periodTableList"
              :default-props="periodTableListProps"
              :fetch-records="periodFetchRecords"
              @append-click="handlePeriodAppend"
              @edit-click="handlePeriodEdit"
              @delete-click="handlePeriodDelete"
              @after-init-data="handlePeriodAfterInitData"
            />
          </div>
          <el-empty v-else description="请先在「基础信息」页保存项目信息后，再配置报告周期" :image-size="80" />
        </el-tab-pane>

      </el-tabs>
      </div>
    </template>
  </DlgBasic>

  <!-- 流程选择窗口 -->
  <DlgProcessSelect ref="dlgProcessSelect" :internship-id="form.id" @update-record="handleProcessSelectSave" />

  <!-- 期次编辑弹窗 -->
  <el-dialog
    v-model="periodEditVisible"
    :title="periodEditForm.id ? '编辑期次' : '新增期次'"
    width="420px"
    :close-on-click-modal="false"
    append-to-body
  >
    <el-form ref="periodFormRef" :model="periodEditForm" label-width="80px">
      <el-form-item
        label="开始时间"
        prop="beginTime"
        :rules="[{ required: true, message: '请选择开始时间', trigger: 'change' }]"
      >
        <el-date-picker
          v-model="periodEditForm.beginTime"
          type="date"
          placeholder="请选择开始时间"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item
        label="结束时间"
        prop="endTime"
        :rules="[{ required: true, message: '请选择结束时间', trigger: 'change' }]"
      >
        <el-date-picker
          v-model="periodEditForm.endTime"
          type="date"
          placeholder="请选择结束时间"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="periodEditVisible = false">取 消</el-button>
      <el-button type="primary" :loading="periodSaveLoading" @click="handlePeriodSave">确 定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import DlgBasic from '@/components/DlgBasic.vue';
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgProcessSelect from '@/views/dialogs/DlgProcessSelect.vue';
import dlgAPI from '@/utils/forDialog';
import listAPI from '@/api/list';
import { generatePeriods, getInternshipPeriods, savePeriod, deletePeriods } from '@/api/diary';

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
const majorList = ref([]);
const isInitializing = ref(false);
const activeTab = ref('basic');

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
  { name: '专业选择', field: 'majorIds', type: 'cascader', keyWords: 'BaseMajor', multiple: true },
  { name: '项目编号', field: 'code', type: 'input' },
  { name: '实习名称', field: 'name', type: 'input' },
  { name: '备注', field: 'remarks', type: 'textarea' }
];

const formRules = {
  name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
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

// ── 流程安排 DataTableList ────────────────────────────────────
const tableListProps = reactive({
  keyWord: {},
  title: {},
  bottomOffset: 70,
  sortStr: { properties: 'theOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 25 },
  initSearchWords: { searchKey: {} },
  moveSearchWords: { searchKey: {} },
  someFlags: { operateShow: true, checkFlag: true, showPage: false, autoInit: false },
  defaultDTHProps: {
    keyWord: { edit: 'RelProcessInternship', view: 'ViewRelProcessInternship' },
    buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true } },
    allTableColumns: [
      { id: 1, showName: '流程名称',     theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求',     theOrder: 2, tableColumnName: 'verifyTypeName',  sortable: false },
      { id: 3, showName: '流程开始时间', theOrder: 3, tableColumnName: 'startTime',       sortable: false },
      { id: 4, showName: '流程结束时间', theOrder: 4, tableColumnName: 'endTime',         sortable: false }
    ]
  }
});

// ── 报告周期 ─────────────────────────────────────────────────
const CRON_OPTIONS = [
  { label: '每日', value: '0 0 0 * * ?' },
  { label: '每周', value: '0 0 0 ? * MON' },
  { label: '每月', value: '0 0 0 1 * ?' },
];

const periodConfig = reactive({
  mode: 'cron',
  cron: '0 0 0 ? * MON',
  periodNum: null,
});

const generatingPeriods = ref(false);
const periodTableList = ref(null);
const currentPeriodCount = ref(0);

const periodTableListProps = computed(() => ({
  someFlags: { checkFlag: true, showPage: false, autoInit: true, operateShow: true },
  sortStr: { properties: 'periodIndex', direction: 'ASC' },
  defaultDTHProps: {
    keyWord: { edit: 'MainDiaryPeriod', view: 'MainDiaryPeriod' },
    buttonProps: { create: { show: true }, update: { show: true }, delete: { show: true } },
    allTableColumns: [
      { id: 1, showName: '期次',     theOrder: 1, tableColumnName: 'periodIndex' },
      { id: 2, showName: '开始时间', theOrder: 2, tableColumnName: 'beginTime'   },
      { id: 3, showName: '结束时间', theOrder: 3, tableColumnName: 'endTime'     },
    ],
  },
}));

const periodFetchRecords = computed(() => async () => {
  if (!form.id) return { data: { content: [], totalElements: 0 }, message: 'successful' };
  const res = await getInternshipPeriods({ internshipId: form.id });
  const list = res?.data || [];
  return { data: { content: list, totalElements: list.length }, message: 'successful' };
});

function handlePeriodAfterInitData(data) {
  currentPeriodCount.value = data?.length ?? 0;
}

async function handleGeneratePeriods() {
  if (!form.reportStartTime || !form.reportEndTime) {
    ElMessage.warning('请先填写日志开始时间和结束时间');
    return;
  }
  if (currentPeriodCount.value > 0) {
    ElMessage.warning('当前已有期次记录，请先删除所有期次后再重新生成');
    return;
  }
  const node = {
    internshipId: form.id,
    reportStartTime: form.reportStartTime,
    reportEndTime: form.reportEndTime,
  };
  if (periodConfig.mode === 'cron') {
    node.cron = periodConfig.cron;
  } else {
    if (!periodConfig.periodNum || periodConfig.periodNum < 1) {
      ElMessage.warning('请输入有效的期数（大于 0）');
      return;
    }
    node.periodNum = periodConfig.periodNum;
  }
  try {
    generatingPeriods.value = true;
    const res = await generatePeriods(node);
    if (res?.message !== 'successful') {
      ElMessage.error(res?.message || '生成失败');
      return;
    }
    periodTableList.value?.initDataList(true);
    ElMessage.success('期次已生成');
  } catch {
    // HTTP 错误由 axios 拦截器统一提示
  } finally {
    generatingPeriods.value = false;
  }
}

// 期次手动 CRUD
const periodEditVisible = ref(false);
const periodEditForm = reactive({ id: null, internshipId: null, beginTime: null, endTime: null });
const periodFormRef = ref(null);
const periodSaveLoading = ref(false);

function handlePeriodAppend() {
  Object.assign(periodEditForm, { id: null, internshipId: form.id, beginTime: null, endTime: null });
  periodEditVisible.value = true;
  nextTick(() => periodFormRef.value?.clearValidate());
}

function handlePeriodEdit(row) {
  const rowData = Array.isArray(row) ? row[0] : row;
  if (!rowData) return;
  Object.assign(periodEditForm, {
    id: rowData.id,
    internshipId: rowData.internshipId ?? form.id,
    beginTime: rowData.beginTime,
    endTime: rowData.endTime,
  });
  periodEditVisible.value = true;
  nextTick(() => periodFormRef.value?.clearValidate());
}

async function handlePeriodDelete(rows) {
  const ids = Array.isArray(rows) ? rows.map(item => item.id) : rows?.id ? [rows.id] : [];
  if (!ids.length) return;
  try {
    const res = await deletePeriods({ ids });
    if (res?.message === 'successful') {
      ElMessage.success('删除成功');
      periodTableList.value?.initDataList(true);
    } else {
      ElMessage.error(res?.message || '删除失败');
    }
  } catch (error) {
    console.error('删除期次失败:', error);
  }
}

async function handlePeriodSave() {
  try {
    await periodFormRef.value?.validate();
  } catch {
    return;
  }
  if (periodEditForm.beginTime >= periodEditForm.endTime) {
    ElMessage.warning('结束时间必须晚于开始时间');
    return;
  }
  periodSaveLoading.value = true;
  try {
    const res = await savePeriod({
      id: periodEditForm.id || null,
      internshipId: periodEditForm.internshipId,
      beginTime: periodEditForm.beginTime,
      endTime: periodEditForm.endTime,
    });
    if (res?.message === 'successful') {
      ElMessage.success(periodEditForm.id ? '编辑成功' : '新增成功');
      periodEditVisible.value = false;
      periodTableList.value?.initDataList(true);
    } else {
      ElMessage.error(res?.message || '保存失败');
    }
  } catch (error) {
    console.error('保存期次失败:', error);
  } finally {
    periodSaveLoading.value = false;
  }
}

// ── tab 切换 ─────────────────────────────────────────────────
function onTabChange(tabName) {
  if (!form.id) return;
  if (tabName === 'process') {
    nextTick(() => dataTableList.value?.initDataList(true));
  } else if (tabName === 'period') {
    nextTick(() => periodTableList.value?.initDataList(true));
  }
}

// ── 监听表单变化 ──────────────────────────────────────────────
watch(form, () => {
  if (!isInitializing.value) {
    verifyValid(false);
  }
}, { deep: true });

// ── showDialog ───────────────────────────────────────────────
async function showDialog(val, formData = {}) {
  isInitializing.value = true;
  activeTab.value = 'basic';

  if (formData !== null) {
    const formKeys = Object.keys(form);
    formKeys.forEach(key => { delete form[key]; });
    Object.assign(form, formData);
  }

  if (formData && formData.id != null && formData.id !== 0) {
    tableListProps.initSearchWords.searchKey = { internshipId: formData.id };
    tableListProps.moveSearchWords.searchKey = { internshipId: formData.id };
    await loadMajorIds(formData.id);
  } else {
    tableListProps.initSearchWords.searchKey = {};
    tableListProps.moveSearchWords.searchKey = {};
    form.majorIds = [];
    majorList.value = [];
  }

  dlgBasicRef.value?.showDialog(val, form, 'edit');
  isInitializing.value = false;

  setTimeout(() => {
    formPanelRef.value?.clearValidate();
    if (formData && formData.id != null && formData.id !== 0) {
      verifyValid(false);
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
    panelRef.validate((valid) => {
      dlgBasicRef.value.validate = !valid;
    }).catch(() => {
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

async function confirm(option, type) {
  if (!form.majorIds || (Array.isArray(form.majorIds) && form.majorIds.length === 0)) {
    ElMessage.warning('请选择专业');
    activeTab.value = 'basic';
    return false;
  }

  const planProcess = processList.value.find(p => p.processTypeName === '实习计划制定');
  if (!planProcess) {
    ElMessage.warning('流程列表中必须包含"实习计划制定"流程');
    activeTab.value = 'process';
    return false;
  }
  if (!planProcess.startTime || !planProcess.endTime) {
    ElMessage.warning('"实习计划制定"流程必须设置起止时间');
    activeTab.value = 'process';
    return false;
  }

  const userId = store.getters.userInfo?.id;
  const resInfo = await dlgAPI.commonSubmitDlg(formPanelRef.value, form, keyWord.value, 'edit', false, false, userId);
  if (resInfo && resInfo.message === 'successful') {
    if (resInfo.data && resInfo.data.id) {
      form.id = resInfo.data.id;
      await saveMajorIds(form.id, form.majorIds || []);
    } else if (form.id != null && form.id !== 0) {
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

function openDialog() {}

function onCronChange(val, field) {
  form[field] = val;
}

function onTreeSelectChange(val, field, node) {
  form[field] = val;
  if (field === 'majorIds') {
    majorList.value = Array.isArray(node) ? node : (node ? [node] : []);
  }
}

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

function handleProcessSelectSave() {
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
    }, rowData);
  }
}

function closeAllDialogs() {
  dlgProcessSelect.value?.showDialog?.(false, {});
  dlgBasicRef.value?.showDialog?.(false, {});
}

async function loadMajorIds(internshipId) {
  try {
    const resInfo = await listAPI.getSomeRecords({
      keyWords: 'RelInterMajor',
      pageInfo: { page: 1, size: 1000 },
      searchKey: { internshipId },
      reg: { internshipId: '=' }
    });
    const records = resInfo?.data?.records || resInfo?.data?.content || [];
    if (records.length > 0) {
      form.majorIds = records.map(item => item.majorId);
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

async function saveMajorIds(internshipId, majorIds) {
  try {
    const existingRes = await listAPI.getSomeRecords({
      keyWords: 'RelInterMajor',
      searchKey: { internshipId }
    });
    const existingRecords = existingRes?.data?.records || existingRes?.data?.content || [];
    const existingMajorIds = existingRecords.map(item => item.majorId);
    const toDelete = existingMajorIds.filter(id => !majorIds.includes(id));
    const toAdd = majorIds.filter(id => !existingMajorIds.includes(id));
    if (toDelete.length > 0) {
      const deleteIds = existingRecords
        .filter(item => toDelete.includes(item.majorId))
        .map(item => item.id);
      if (deleteIds.length > 0) {
        await listAPI.delOneOrManyNodes('RelInterMajor', deleteIds);
      }
    }
    for (const majorId of toAdd) {
      await listAPI.editOneNode('RelInterMajor', { internshipId, majorId });
    }
  } catch (error) {
    console.error('保存专业关联关系失败:', error);
    ElMessage.warning('保存专业关联关系失败');
  }
}

onBeforeUnmount(() => {
  closeAllDialogs();
});

defineExpose({ showDialog, closeAllDialogs });
</script>

<style scoped>
.dlg-main-body {
  padding: 16px 20px;
}

.dlg-tabs {
  width: 100%;
}

.dlg-tabs :deep(.el-tabs__content) {
  padding-top: 16px;
}

.tab-pane-content {
  min-height: 200px;
}

.period-config-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.period-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 12px;
}

.period-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.period-label {
  font-size: 14px;
  color: #606266;
  width: 70px;
  text-align: right;
  white-space: nowrap;
  flex-shrink: 0;
}

.period-row :deep(.el-input-number) {
  margin-left: 0;
}

.period-generate-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 4px;
}

.period-hint {
  font-size: 12px;
  color: #909399;
}

.period-hint-warn {
  font-size: 12px;
  color: #e6a23c;
}

/* 流程表格和期次表格：固定展示 6 行 */
:deep(.tab-pane-content .el-table),
:deep(.period-config-section .el-table) {
  height: 328px !important;
}
:deep(.tab-pane-content .el-table .el-table__body-wrapper),
:deep(.period-config-section .el-table .el-table__body-wrapper) {
  height: 288px !important;
  overflow-y: auto !important;
}
</style>
