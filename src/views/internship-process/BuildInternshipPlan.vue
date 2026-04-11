<template>
  <div class="build-internship-plan-container">
    <BaseList :default-props="defaultProps" :baselist-confirm="handleConfirm" ref="baseList" @append-click="appendClick"
      @edit-click="editClick" @view-click="viewClick" @delete-click="handleDeleteClick" @submit-click="handleSubmitClick">
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgInternshipDetail ref="dlgMainInternship" :user-department-id="userDepartmentId" :is-super-admin="isSuperAdmin"
      hide-submit @update-record="handleUpdateRecord" />
    <!-- 审核进度查看对话框 -->
    <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId"
      :process-info="currentRow" key-words="ViewVerifyProcessInternship" />
  </div>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipDetail from '@/views/dialogs/DlgInternshipDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';

defineOptions({
  name: 'BuildInternshipPlan',
});

const store = useStore();
const baseList = ref(null);
const dlgMainInternship = ref(null);

// 获取用户信息和角色
const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

// 判断是否是超级管理员
const isSuperAdmin = computed(() => {
  return roles.value.some(role => role.name === '超级管理员');
});

// 用户所属院系ID
const userDepartmentId = computed(() => userInfo.value.departmentId);

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

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// Merge View 已按 processId 聚合，无需前端分组
const { getVerifyRoleName } = useVerifyFilter();


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

// 处理新增按钮点击事件
const appendClick = () => {
  baseList.value?.openDlg('append', {});
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

const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

onMounted(() => {
  baseList.value?.initDataList();
});

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgMainInternship.value?.closeAllDialogs?.();
});

// 列表配置
const defaultProps = computed(() => ({
  defaultDTLProps: {
    // 启用审核状态自定义显示（Merge View 提供 currentRoleName）
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    buttonCondition: {},
    defaultDTHProps: {
      buttonProps: {
        create: { show: true },
        visible: { show: true, type: 'primary', name: '查看进度' },
        update: { show: true, name: '编辑' },
        submit: { show: true, type: 'warning', name: '提交' },
        delete: { show: true }
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
