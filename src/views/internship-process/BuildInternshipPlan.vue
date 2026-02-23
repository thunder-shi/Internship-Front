<template>
  <div class="build-internship-plan-container">
    <BaseList :default-props="defaultProps" :baselist-confirm="handleConfirm" ref="baseList" @append-click="appendClick" @edit-click="editClick" @view-click="viewClick" @delete-click="handleDeleteClick">
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgInternshipDetail ref="dlgMainInternship" :user-department-id="userDepartmentId" :is-super-admin="isSuperAdmin" @update-record="handleUpdateRecord" />
    <!-- 审核进度查看对话框 -->
    <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId" :process-info="currentRow" key-words="ViewVerifyProcessInternship" />
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
import { ref, reactive, computed, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import moment from 'moment';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgInternshipDetail from '@/views/dialogs/DlgInternshipDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
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

// 当前时间
const currentTime = computed(() => moment().format('YYYY-MM-DD HH:mm:ss'));

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// 存储所有记录，用于查看进度时显示完整审核历史
const allRecordsMap = ref(new Map());

// 根据当前审核级别获取角色名称
// 通过比较 verifyUserId 和各级别的 roleId 来确定当前是第几级审核
const getVerifyRoleName = (row) => {
  // 如果有聚合后的当前级别角色名，直接使用
  if (row._currentRoleName) {
    return row._currentRoleName;
  }

  // 按级别顺序的角色ID和角色名称
  const levels = [
    { roleId: row.verifyFirstRoleId, roleName: row.verifyFirstRoleName },
    { roleId: row.verifySecondRoleId, roleName: row.verifySecondRoleName },
    { roleId: row.verifyThirdRoleId, roleName: row.verifyThirdRoleName },
    { roleId: row.verifyFourthRoleId, roleName: row.verifyFourthRoleName },
    { roleId: row.verifyFifthRoleId, roleName: row.verifyFifthRoleName }
  ].filter(level => level.roleId && level.roleId !== 17); // 过滤掉空值及旧版占位值 17

  // 返回第一个有值的角色名（当前记录对应的审核级别）
  if (levels.length > 0 && levels[0].roleName) {
    return levels[0].roleName;
  }

  return '';
};

// 客户端过滤函数：按 relationId 聚合，只显示最新状态的记录
const clientFilterFn = (dataList) => {
  if (!dataList || !Array.isArray(dataList) || dataList.length === 0) {
    return dataList;
  }

  // 按 relationId 分组
  const groupedMap = new Map();
  dataList.forEach(item => {
    const relationId = item.relationId;
    if (!groupedMap.has(relationId)) {
      groupedMap.set(relationId, []);
    }
    groupedMap.get(relationId).push(item);
  });

  // 保存所有记录到 allRecordsMap，供查看进度时使用
  allRecordsMap.value = groupedMap;

  // 对每组取最新的记录（按 id 降序，最大的是最新的）
  const result = [];
  groupedMap.forEach((records, relationId) => {
    // 按 id 降序排序
    records.sort((a, b) => (b.id || 0) - (a.id || 0));
    const latestRecord = records[0];

    // 确定当前审核级别的角色名
    // 通过计算已通过的级别数来确定当前是第几级
    const passedCount = records.filter(r => r.isAudit === CONSTANT.AUDIT_STATUS.PASS).length;
    const levels = [
      latestRecord.verifyFirstRoleName,
      latestRecord.verifySecondRoleName,
      latestRecord.verifyThirdRoleName,
      latestRecord.verifyFourthRoleName,
      latestRecord.verifyFifthRoleName
    ].filter(name => name);

    // 当前级别的角色名（基于已通过的级别数）
    if (latestRecord.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT && levels[passedCount]) {
      latestRecord._currentRoleName = levels[passedCount];
    }

    // 保存该 relationId 的所有记录引用
    latestRecord._allRecords = records;

    result.push(latestRecord);
  });

  return result;
};


// /**
//  * 列表查询条件：
//  * - 从 ViewVerifyInternshipPlanProcess 查询数据
//  * - 筛选正在流程时间内的项目
//  */
// const initSearchWords = computed(() => ({
//   searchKey: {
//     startTime: currentTime.value,
//     endTime: currentTime.value
//   },
//   regKey: {
//     startTime: CONSTANT.SEARCH_OPERATOR.LE,
//     endTime: CONSTANT.SEARCH_OPERATOR.GE
//   }
// }));

// 处理编辑按钮点击事件，使用自定义的编辑窗口
// 与 BuildInternship.vue 中的实现完全一样
const editClick = (row) => {
  dlgMainInternship.value?.showDialog(true, row);
};

// 查看进度按钮点击
// 注意：DataTableList 的内置 view 按钮通过 view([scope.row]) 传入数组，需要解包
const viewClick = (rowOrArray) => {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = {
    ...row,
    _allRecords: row._allRecords || allRecordsMap.value.get(row.relationId) || [row],
    _currentRoleName: row._currentRoleName || getVerifyRoleName(row)
  };
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
// 检查审核状态，只有待提交状态（isAudit = -1）的项目才能删除
const handleDeleteClick = async (rows) => {
  const items = Array.isArray(rows) ? rows : rows ? [rows] : [];
  // 检查是否有项目已经进入审核状态（isAudit !== -1）
  const hasAuditedItem = items.some(item => item.isAudit !== CONSTANT.AUDIT_STATUS.SAVE);
  if (hasAuditedItem) {
    ElMessage.warning('选择项目已经进入审核状态，无法删除！');
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


// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgMainInternship.value?.closeAllDialogs?.();
});

// 列表配置
const defaultProps = computed(() => ({
  defaultDTLProps: {
    // initSearchWords: initSearchWords.value,
    // 客户端过滤函数
    clientFilterFn: clientFilterFn,
    // 启用审核状态自定义显示
    enableAuditStatusCustom: true,
    // 获取审核角色名称函数
    getVerifyRoleName: getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: { create: { show: true }, visible: { show: true, type: 'primary', name: '查看进度' }, update: { show: true }, delete: { show: true } },
      // keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyInternshipPlanProcess' },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternship' },
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
      { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: {properties: 'Id', direction: 'DESC'}, searchKeys: templateSearchKey.value },
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

