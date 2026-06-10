<template>
  <div v-if="enterpriseAccessReady && !enterpriseBlocked" class="build-internship-plan-container">
    <BaseList :default-props="defaultProps" :baselist-confirm="handleConfirm" ref="baseList" @append-click="appendClick"
      @edit-click="editClick" @view-click="viewClick" @delete-click="handleDeleteClick" @submit-click="handleSubmitClick"
      @more2-click="handleBatchSubmitClick">
      <template #dlg>
        <!-- 自定义新增对话框：基本信息 + 模板流程预览 -->
        <DlgBasic ref="createDlgRef" :default-props="createDlgProps" :dlgbasic-confirm="onCreateDlgConfirm" @close-dialog="onCreateDlgClose">
          <template #mainForm>
            <div class="create-dlg-body">
              <div class="create-dlg-form">
                <FormItemsforDialog
                  ref="createFormItemsRef"
                  :form="createForm"
                  :form-items="createDlgFormItems"
                  :form-rules="createDlgFormRules"
                  label-width="100px"
                  @simple-select-change="onCreateSelectChange"
                />
              </div>
              <div class="process-inline-section">
                <div class="process-inline-title">模板流程预览</div>
                <div class="process-dtl-wrapper">
                  <DataTableList ref="processTableRef" :default-props="processTableProps" />
                </div>
              </div>
            </div>
          </template>
        </DlgBasic>
      </template>
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgInternshipDetail ref="dlgMainInternship" :user-department-id="userDepartmentId" :is-super-admin="isSuperAdmin"
      hide-submit @update-record="handleUpdateRecord" />
    <!-- 审核进度查看对话框 -->
    <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId"
      :process-info="currentRow" key-words="ViewVerifyProcessInternship" />
  </div>
  <el-card v-else-if="enterpriseAccessReady" shadow="never">
    <el-empty description="企业信息未审核通过，暂无校外实习申报资格" />
  </el-card>
</template>

<script setup>
/**
 * 实习计划制定页面
 *
 * 功能说明：
 * - 显示正在"实习计划制定"流程时间内的实习项目
 * - 项目创建者可以编辑计划信息
 * - 暂存：保存但不提交（isAudit = -1）
 * - 提交：行内提交审核（isAudit = 0），无需审核则系统自动通过
 * - 提交后显示查看进度按钮
 */
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgBasic from '@/components/DlgBasic.vue';
import DataTableList from '@/components/DataTableList.vue';
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import DlgInternshipDetail from '@/views/dialogs/DlgInternshipDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';
import treeAPI from '@/api/tree';
import { ensureEnterpriseAccess } from '@/utils/enterpriseAccess';

defineOptions({
  name: 'BuildInternshipPlan',
});

const store = useStore();
const baseList = ref(null);
const dlgMainInternship = ref(null);
const enterpriseBlocked = ref(false);
const enterpriseAccessReady = ref(false);

// 获取用户信息和角色
const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

// 判断是否是超级管理员（roles 是数字数组：role.id 列表，例如 [13] / [1]）
const isSuperAdmin = computed(() =>
  roles.value.some(r => r === CONSTANT.ROLE_TABLE.SUPER_ADMIN)
);

// 用户所属院系ID
const userDepartmentId = computed(() => userInfo.value.departmentId);

// 院系完整路径（如 "水利水电学院/计算机学院"），由 BaseDepartment 树异步组装
// store 里的 userInfo.departmentName 已被覆盖为叶子节点名（如 "计算机学院"），
// 与 Merge View 的 universityName（完整路径）格式不一致，因此需要重新组装
const departmentFullPath = ref('');

async function loadDepartmentFullPath() {
  const did = userDepartmentId.value;
  if (!did) {
    departmentFullPath.value = '';
    return;
  }
  try {
    const res = await treeAPI.getAllParentIndex('BaseDepartment', did);
    // getAllParentIndex 返回从「当前节点」到「根」的数组，反转得到根→叶
    const chain = [...(res?.data || [])].reverse();
    departmentFullPath.value = chain
      .map(n => (n?.name || '').trim())
      .filter(Boolean)
      .join('/');
  } catch (e) {
    console.warn('查询院系完整路径失败:', e);
    departmentFullPath.value = '';
  }
}

// 是否院系级用户（路径含 '/' 表示在学校根下面）；超管/校级根/无 departmentId 都不算
const isCollegeUser = computed(() =>
  !isSuperAdmin.value && departmentFullPath.value.includes('/')
);

// 计算实习模板下拉框的查询条件（非超级管理员只能选择自己院系的模板）
const templateSearchKey = computed(() => {
  if (isSuperAdmin.value) {
    return {};
  }
  if (userDepartmentId.value) {
    return { universityId: userDepartmentId.value };
  }
  return {};
});

// 列表查询条件：院系级用户按 universityName 精确匹配本院完整路径
// Merge View 未暴露 universityId/departmentId，故走 universityName 字符串精确匹配
const initSearchWords = computed(() => {
  if (!isCollegeUser.value) {
    return {};
  }
  return {
    searchKey: { universityName: departmentFullPath.value },
    regKey: { universityName: '=' },
    andor: {},
  };
});

// 全部提交时的院系范围限制（与列表过滤保持一致）
const submitAllSearchKey = computed(() => {
  const base = {
    isAudit: `${CONSTANT.AUDIT_STATUS.SAVE},${CONSTANT.AUDIT_STATUS.BACK}`,
  };
  if (isCollegeUser.value) {
    base.universityName = departmentFullPath.value;
  }
  return base;
});

const submitAllReg = computed(() => {
  const reg = { isAudit: CONSTANT.SEARCH_OPERATOR.IN };
  if (isCollegeUser.value) {
    reg.universityName = '=';
  }
  return reg;
});

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// Merge View 已按 processId 聚合，无需前端分组
const { getVerifyRoleName } = useVerifyFilter();

// ── 新增对话框（带 Tab）──────────────────────────────────────────
const createDlgRef = ref(null);
const createFormItemsRef = ref(null);
const createForm = reactive({});

// 模板流程预览表格
const processTableRef = ref(null);
const processTableInternshipTypeId = ref(null);

const createDlgFormItems = computed(() => [
  { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: { properties: 'Id', direction: 'DESC' }, searchKeys: templateSearchKey.value },
  { name: '项目编号', field: 'code', type: 'input' },
  { name: '实习名称', field: 'name', type: 'input' },
  { name: '备注', field: 'remarks', type: 'textarea' },
]);

const createDlgFormRules = {
  name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
  internshipTypeId: [{ required: true, message: '请选择实习模板', trigger: 'blur' }],
};

const processTableProps = computed(() => ({
  bottomOffset: 53,
  sortStr: { properties: 'theOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 25 },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    hideSelectColumn: true,
    showPage: true,
    autoInit: false,
    noAdvancedSearch: true,
  },
  initSearchWords: processTableInternshipTypeId.value
    ? { searchKey: { internshipTypeId: processTableInternshipTypeId.value }, regKey: { internshipTypeId: '=' }, andor: {} }
    : {},
  defaultDTHProps: {
    showTopButtons: false,
    keyWord: { view: 'ViewRelProcessInternshipType' },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName' },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName' },
    ],
  },
}));

const createDlgProps = reactive({
  dlgTitle: '新增实习项目',
  width: '55%',
  footButtons: {
    cancel: { show: true, name: '取 消', type: '' },
    confirm: { show: true, name: '新增', type: 'primary' },
    submit: { show: false },
    repeatAdd: { show: false },
  },
  someFlags: {
    autoMax: true,
    needMaxBtn: true,
    needValidate: false,
  },
});

function onCreateSelectChange(val, field) {
  if (field === 'internshipTypeId') {
    processTableInternshipTypeId.value = val || null;
    if (val) {
      nextTick(() => processTableRef.value?.initDataList(true));
    }
  }
}

// DlgBasic 确认回调：校验表单后直接调用 handleConfirm
async function onCreateDlgConfirm(option, type) {
  try {
    await createFormItemsRef.value?.formPanelRef?.validate();
  } catch {
    return false; // 校验未通过，保持对话框打开
  }
  const success = await handleConfirm(option, type, createForm);
  return success === false ? false : undefined; // false 保持打开，undefined 让 DlgBasic 自动关闭
}

function onCreateDlgClose() {
  processTableInternshipTypeId.value = null;
}

// 处理编辑按钮点击事件
// 所有状态均可打开弹窗查看，DlgInternshipDetail 内部根据 isAudit 控制按钮显隐
const editClick = (row) => {
  dlgMainInternship.value?.showDialog(true, row);
};

// 查看进度按钮点击
// 注意：DataTableList 的内置 view 按钮通过 view([scope.row]) 传入数组，需要解包
const viewClick = (rowOrArray) => {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = { ...row };
  showProgressDialog.value = true;
};

/**
 * 保存数据到 MainInternship 和 RelProcessInternship 表
 * 无论是"保存"还是"提交"，都会执行此操作
 * @param {Object} form - 表单数据
 * @param {String} successMessage - 成功提示消息
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
const saveInternshipData = async (form, successMessage) => {
  try {
    // 更新 MainInternship 表（项目编号、实习名称、备注等）
    // 注意：form.id 现在是 internshipId（MainInternship 表的主键）
    // 字段映射：表单字段名 -> 数据库字段名
    // 支持两种字段名（向后兼容）：code/name/remarks 或 internshipCode/internshipName/internshipRemarks
    const mainInternshipRes = await listAPI.editOneNode('MainInternship', {
      id: form.id, // internshipId
      code: form.code || form.internshipCode, // 优先使用新字段名，如果没有则使用旧字段名
      name: form.name || form.internshipName,
      remarks: form.remarks || form.internshipRemarks
    });
    if (mainInternshipRes && mainInternshipRes.message === 'successful') {
      ElMessage.success(successMessage);
      baseList.value?.initDataList();
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
};

/**
 * 新增项目确认函数
 * 创建项目后需要进入编辑页面配置流程列表
 * 与 BuildInternship.vue 中的实现完全一样
 *
 * 同时处理新增和编辑两种情况：
 * - option === 'append': 新增模式，使用新增逻辑
 * - option === 'edit': 编辑模式，使用暂存逻辑
 */
const handleConfirm = async (option, _type, form) => {
  // 编辑模式：使用暂存逻辑
  if (option === 'edit') {
    return await saveInternshipData(form, '暂存成功');
  }
  // 新增模式：与 BuildInternship.vue 中的实现完全一样
  try {
    await ElMessageBox.confirm('新增后，实习模板将不能修改，确定新增吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });

    const userInfo = store.getters.userInfo;
    if (userInfo && userInfo.id) {
      form.creatorId = userInfo.id;
    }
    form.studentNum = 0;

    const resInfo = await otherAPI.addNewInternship(form);
    if (resInfo && resInfo.message === 'successful') {
      ElMessage({
        message: '新增项目成功！请点击编辑按钮继续进行实习计划制定。',
        type: 'success',
        duration: 5000
      });
      baseList.value?.initDataList();
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '新增失败');
      return false;
    }
  } catch {
    return false;
  }
};

// 处理新增按钮点击事件：打开自定义的 tabbed 对话框
const appendClick = () => {
  // 重置表单
  Object.keys(createForm).forEach(k => delete createForm[k]);
  processTableInternshipTypeId.value = null;
  createDlgRef.value?.showDialog(true, {}, 'append');
  nextTick(() => {
    createFormItemsRef.value?.formPanelRef?.clearValidate();
  });
};

// 自定义删除处理
// 仅待提交状态（isAudit = -1）的项目可删除，其余状态提示
const handleDeleteClick = async (rows) => {
  const items = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (items.length === 0) return;
  const hasAuditedItem = items.some(item => item.isAudit !== CONSTANT.AUDIT_STATUS.SAVE);
  if (hasAuditedItem) {
    ElMessage.warning('仅待提交状态的项目可删除，已提交或审核中的项目无法删除');
    return;
  }
  // 提取 internshipId
  const ids = items.map(item => item.internshipId).filter(id => id != null);
  try {
    const res = await otherAPI.deleteNewInternship(ids);
    if (res?.message === 'successful') {
      ElMessage.success('删除成功');
      baseList.value?.initDataList();
    } else {
      ElMessage.error(res?.message || '删除失败');
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    // 如果拦截器没有显示（比如被 suppress），这里也不显示，避免重复
    console.error('删除失败:', error);
  }
};

// 行内提交按钮点击
const handleSubmitClick = async (row) => {
  if (!row) return;
  // 自动通过的记录：提供退回选项
  if (row.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
      row.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
    try {
      await ElMessageBox.confirm('该记录为自动通过，是否退回以重新编辑？', '提示', {
        confirmButtonText: '退回', cancelButtonText: '取消', type: 'warning',
      });
    } catch { return; }
    try {
      const res = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id,
        isAudit: CONSTANT.AUDIT_STATUS.SAVE,
        reason: null,
        verifyUserName: null,
        verifyUserId: null,
      });
      if (res?.message === 'successful') {
        ElMessage.success('退回成功，可以修改后重新提交');
        baseList.value?.initDataList();
      } else {
        ElMessage.error(res?.message || '退回失败');
      }
    } catch (e) { console.error('退回失败:', e); }
    return;
  }
  if (row.isAudit !== CONSTANT.AUDIT_STATUS.SAVE && row.isAudit !== CONSTANT.AUDIT_STATUS.BACK) {
    ElMessage.warning('该记录已提交，不能再次提交');
    return;
  }

  const isNoVerify = row.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY;
  const status = isNoVerify ? CONSTANT.AUDIT_STATUS.PASS : CONSTANT.AUDIT_STATUS.SUBMIT;
  const extraFields = isNoVerify
    ? { verifyUserName: '系统', reason: '无需审核，系统自动通过' }
    : {};

  try {
    const res = await listAPI.editOneNode('MainVerifyProcess', {
      id: row.id,
      isAudit: status,
      ...extraFields
    });
    if (res?.message === 'successful') {
      ElMessage.success(isNoVerify ? '提交成功，无需审核，已自动通过' : `提交成功，${CONSTANT.AUDIT_STATUS.SUBMITNAME}`);
      baseList.value?.initDataList();
    } else {
      ElMessage.error(res?.message || '提交失败');
    }
  } catch (error) {
    console.error('提交失败:', error);
  }
};

/** 提交单条记录的核心逻辑（供批量/全部提交复用） */
async function submitSingleRow(row) {
  const isNoVerify = row.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY;
  const status = isNoVerify ? CONSTANT.AUDIT_STATUS.PASS : CONSTANT.AUDIT_STATUS.SUBMIT;
  const extraFields = isNoVerify
    ? { verifyUserName: '系统', reason: '无需审核，系统自动通过' }
    : {};
  const res = await listAPI.editOneNode('MainVerifyProcess', {
    id: row.id,
    isAudit: status,
    ...extraFields,
  });
  return res?.message === 'successful';
}

/** 批量提交：提交勾选的待提交记录 */
async function handleBatchSubmitClick(rows) {
  const rowsArray = Array.isArray(rows) ? rows : [rows].filter(Boolean);
  if (!rowsArray.length) {
    ElMessage.warning('请先勾选需要提交的记录');
    return;
  }
  const pendingRows = rowsArray.filter(
    (row) => row && (row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row.isAudit === CONSTANT.AUDIT_STATUS.BACK)
  );
  if (!pendingRows.length) {
    ElMessage.warning('选中的记录中没有可以提交的记录');
    return;
  }
  let successCount = 0;
  for (const row of pendingRows) {
    if (await submitSingleRow(row)) successCount++;
  }
  if (successCount > 0) {
    ElMessage.success(`批量提交完成，共成功提交 ${successCount} 条记录`);
    baseList.value?.initDataList();
  }
}

const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

onMounted(async () => {
  const access = await ensureEnterpriseAccess(store);
  enterpriseBlocked.value = !access.passed;
  enterpriseAccessReady.value = true;
  // 异步加载院系完整路径；加载完成后若已变成院系级用户，需要手动刷新列表
  // （BaseList/DataTableList 只 watch nowSearchWords，不会因 initSearchWords 变化自动重拉）
  await loadDepartmentFullPath();
  if (isCollegeUser.value) {
    baseList.value?.initDataList();
  }
});

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgMainInternship.value?.closeAllDialogs?.();
  createDlgRef.value?.showDialog?.(false);
});

// 列表配置
const defaultProps = computed(() => ({
  defaultDTLProps: {
    // 启用审核状态自定义显示（Merge View 提供 currentRoleName）
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    someFlags: { checkFlag: true },
    buttonCondition: {},
    initSearchWords: initSearchWords.value,
    defaultDTHProps: {
      buttonProps: {
        create: { show: true },
        visible: { show: true, type: 'primary', name: '查看进度' },
        update: { show: true, name: '编辑' },
        submit: { show: true, type: 'warning', name: '提交' },
        delete: { show: true },
        more2: { show: true, name: '批量提交', type: 'primary' },
        more5: {
          show: true,
          name: '全部提交',
          type: 'warning',
          submitAll: {
            keyWords: 'ViewVerifyProcessInternshipMerge',
            searchKey: submitAllSearchKey.value,
            reg: submitAllReg.value,
            filterRows: (row) =>
              row.isAudit === CONSTANT.AUDIT_STATUS.SAVE || row.isAudit === CONSTANT.AUDIT_STATUS.BACK,
            buildConfirmText: (n) => `确定提交全部 ${n} 条待提交的实习计划吗？`,
          },
        },
      },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipMerge' },
      allTableColumns: [
        { id: 1, showName: '实习项目编号', theOrder: 1, tableColumnName: 'internshipCode' },
        { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'internshipName' },
        { id: 3, showName: '创建人', theOrder: 3, tableColumnName: 'createUserName' },
        { id: 4, showName: '开始时间', theOrder: 4, tableColumnName: 'startTime' },
        { id: 5, showName: '结束时间', theOrder: 5, tableColumnName: 'endTime' },
        { id: 6, showName: '状态', theOrder: 6, tableColumnName: 'customize-status' }
      ]
    }
  },
  // defaultSDProps 仍需保留（BaseList 编辑模式会用到），但新增模式使用自定义 #dlg
  defaultSDProps: {
    keyWord: 'MainInternship',
    formItems: [
      { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: { properties: 'Id', direction: 'DESC' }, searchKeys: templateSearchKey.value },
      { name: '项目编号', field: 'code', type: 'input' },
      { name: '实习名称', field: 'name', type: 'input' },
      { name: '备注', field: 'remarks', type: 'textarea' },
    ],
    formRules: {
      name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
      internshipTypeId: [{ required: true, message: '请选择实习模板', trigger: 'blur' }],
    },
    defaultDBProps: {
      footButtons: {
        cancel: { show: true, name: '取 消', type: '' },
        confirm: { show: true, name: '新增', type: 'primary' },
        submit: { show: false },
        repeatAdd: { show: false }
      },
      dialog: {}
    }
  }
}));
</script>

<style scoped>
/* body 已由全局 CSS 设为 flex:1 + flex-direction:column，
   .create-dlg-body 作为直接子元素继承 flex 布局即可 */
.create-dlg-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.create-dlg-form {
  flex-shrink: 0;
}

.process-inline-section {
  flex: 1;
  min-height: 200px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.process-inline-title {
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.process-dtl-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 去掉 el-card 边框和 padding */
.process-dtl-wrapper :deep(.el-card) {
  border: none;
  box-shadow: none;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.process-dtl-wrapper :deep(.el-card__body) {
  padding: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
