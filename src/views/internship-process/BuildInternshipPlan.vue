<template>
  <div class="build-internship-plan-container">
    <BaseList :default-props="defaultProps" :baselist-confirm="handleConfirm" ref="baseList" @append-click="appendClick"
      @edit-click="editClick" @view-click="viewClick" @delete-click="handleDeleteClick">
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgInternshipDetail ref="dlgMainInternship" :user-department-id="userDepartmentId" :is-super-admin="isSuperAdmin"
      @update-record="handleUpdateRecord" />
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
 * - 提交：提交审核（isAudit = 0）
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


// 判断记录是否为系统自动通过
const isAutoApproved = (row) => {
  return row.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
    row.reason && row.reason.includes('系统自动通过');
};

// 处理编辑按钮点击事件
// 所有状态均可打开弹窗查看，DlgInternshipDetail 内部根据 isAudit 控制按钮显隐
// 系统自动通过的记录需先撤回再编辑
const editClick = async (row) => {
  if (isAutoApproved(row)) {
    try {
      await ElMessageBox.confirm(
        '此记录为系统自动通过，撤回后可修改并重新提交，是否撤回？',
        '撤回确认',
        { confirmButtonText: '确定撤回', cancelButtonText: '取消', type: 'warning' }
      );
      // 撤回：重置审核状态为待提交
      const res = await listAPI.editOneNode('MainVerifyProcess', {
        id: row.id,
        isAudit: CONSTANT.AUDIT_STATUS.SAVE,
        reason: null,
        verifyUserName: null,
        verifyUserId: null
      });
      if (res?.message !== 'successful') {
        ElMessage.error(res?.message || '撤回失败');
        return;
      }
      ElMessage.success('撤回成功，请修改后重新提交');
      // 更新本地行数据的审核状态
      row.isAudit = CONSTANT.AUDIT_STATUS.SAVE;
      row.reason = null;
    } catch {
      return; // 用户取消
    }
  }
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
const handleConfirm = async (option, type, form) => {
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
    // 按钮始终显示，不可用时由点击事件拦截并提示
    buttonCondition: {},
    defaultDTHProps: {
      buttonProps: { create: { show: true }, visible: { show: true, type: 'primary', name: '查看进度' }, update: { show: true, name: '编辑' }, delete: { show: true } },
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
      { name: '报告周期', field: 'cron', type: 'cron' },
      { name: '备注', field: 'remarks', type: 'textarea' }
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
