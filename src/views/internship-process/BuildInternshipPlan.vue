<template>
  <div class="build-internship-plan-container">
    <BaseList :default-props="defaultProps" :baselist-confirm="handleSave" :baselist-submit="handleSubmit" ref="baseList" @edit-click="editClick" @view-click="viewClick">
    </BaseList>
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
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import moment from 'moment';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

defineOptions({
  name: 'BuildInternshipPlan',
});

const store = useStore();
const baseList = ref(null);

// 当前时间
const currentTime = computed(() => moment().format('YYYY-MM-DD HH:mm:ss'));

// 当前操作的行数据（用于查看进度）
const currentRow = ref({});

// 审核进度对话框显示状态
const showProgressDialog = ref(false);

// 按钮条件配置：控制各按钮在不同行数据条件下的显示/隐藏
// 编辑按钮在未提交和审核退回状态显示
// 删除按钮可以根据需要配置（这里暂时不限制，如果需要可以添加）
const buttonCondition = {
  update: (row) => row.isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
                   row.isAudit === CONSTANT.AUDIT_STATUS.BACK ||
                   row.isAudit === null ||
                   row.isAudit === undefined
  // delete: (row) => true, // 如果需要限制删除按钮，可以在这里配置
};

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


/**
 * 列表查询条件：
 * - 从 ViewVerifyInternshipPlanProcess 查询数据
 * - 筛选正在流程时间内的项目
 */
const initSearchWords = computed(() => ({
  searchKey: {
    startTime: currentTime.value,
    endTime: currentTime.value
  },
  regKey: {
    startTime: CONSTANT.SEARCH_OPERATOR.LE,
    endTime: CONSTANT.SEARCH_OPERATOR.GE
  }
}));

// 编辑按钮点击
// 注意：row 来自 ViewVerifyInternshipPlanProcess 视图，需要将 internshipId 映射为 id
// 因为弹出窗口操作的表是 MainInternship，主键是 id
// 同时需要保留 row.id（MainVerifyProcess 表的主键）用于后续更新
const editClick = async (row) => {
  try {
    // 先根据 internshipId 从 MainInternship 表加载完整数据
    // 注意：MainInternship 表没有 theOrder 字段，所以使用 id 排序
    const res = await listAPI.getSomeRecords({
      keyWords: 'MainInternship',
      searchKey: { id: row.internshipId },
      reg: { id: '=' }
    });

    let mainInternshipData = {};
    if (res && res.data && res.data.content && res.data.content.length > 0) {
      mainInternshipData = res.data.content[0];
    }

    // 将 row.internshipId 映射为 form.id，以便 SimpleDialog 正确识别为编辑模式
    // 保留 row.id 作为 processId，用于后续更新 MainVerifyProcess 表
    // 字段映射：数据库字段名 -> 视图字段名（用于表单显示）
    const formData = {
      ...row,
      id: row.internshipId, // 将 internshipId 映射为 id（用于 MainInternship 表）
      processId: row.id, // 保留原始的 MainVerifyProcess 表的主键
      // 将数据库字段映射为视图字段名，以便表单正确显示
      internshipCode: mainInternshipData.code,
      internshipName: mainInternshipData.name,
      internshipRemarks: mainInternshipData.remarks
    };
    baseList.value?.openDlg('edit', formData);
  } catch (error) {
    console.error('加载数据失败:', error);
    // 如果加载失败，仍然使用视图数据
    const formData = {
      ...row,
      id: row.internshipId,
      processId: row.id
    };
    baseList.value?.openDlg('edit', formData);
  }
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
    // 字段映射：视图字段名 -> 数据库字段名
    // internshipCode -> code, internshipName -> name, internshipRemarks -> remarks
    const mainInternshipRes = await listAPI.editOneNode('MainInternship', {
      id: form.id, // internshipId
      code: form.internshipCode || form.code, // 优先使用视图字段名，如果没有则使用数据库字段名
      name: form.internshipName || form.name,
      remarks: form.internshipRemarks || form.remarks
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
 * 更新 MainVerifyProcess 表的审核状态
 * 只有"提交"操作才会调用此函数
 * @param {Object} form - 表单数据
 * @param {Number} isAudit - 审核状态（0: 提交待审核）
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
const updateVerifyProcess = async (form, isAudit) => {
  try {
    // 更新流程状态到 MainVerifyProcess
    // 注意：需要使用 form.processId 来更新 MainVerifyProcess 表
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: form.processId, // 使用 processId（MainVerifyProcess 表的主键）
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
};

/**
 * 暂存：保存但不提交
 * 只保存 MainInternship 表，不更新 MainVerifyProcess 表
 */
const handleSave = async (option, type, form) => {
  return await saveInternshipData(form, '暂存成功');
};

/**
 * 提交：提交审核
 * isAudit = 0（提交待审核）
 * 先保存 MainInternship 表，然后更新 MainVerifyProcess 表的审核状态
 * @returns {Promise<Boolean>} - 返回 true 表示成功，false 表示失败
 */
const handleSubmit = async (form) => {
  try {
    await ElMessageBox.confirm('提交后将进入审核流程，信息将不可修改，确定提交吗？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });
  } catch { return false }

  // 先保存 MainInternship 表
  const saveSuccess = await saveInternshipData(form, '提交成功，等待审核');
  if (!saveSuccess) {
    return false;
  }
  // 然后更新 MainVerifyProcess 表的审核状态
  const updateSuccess = await updateVerifyProcess(form, CONSTANT.AUDIT_STATUS.SUBMIT);
  if (updateSuccess) {
    return true; // 返回 true，DlgBasic 会自动关闭对话框
  }
  return false;
};

// 列表配置
const defaultProps = computed(() => ({
  defaultDTLProps: {
    initSearchWords: initSearchWords.value,
    // 按钮条件配置
    buttonCondition: buttonCondition,
    // 客户端过滤函数
    clientFilterFn: clientFilterFn,
    // 启用审核状态自定义显示
    enableAuditStatusCustom: true,
    // 获取审核角色名称函数
    getVerifyRoleName: getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: { create: { show: false }, visible: { show: true, type: 'primary', name: '查看进度' }, update: { show: true }, delete: { show: false } },
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
      { name: '实习编号', field: 'internshipCode', type: 'input' },
      { name: '实习名称', field: 'internshipName', type: 'input' },
      { name: '详细计划', field: 'internshipRemarks', type: 'textarea' }
    ],
    formRules: {},
    defaultDBProps: {
      footButtons: {
        cancel: { show: true, name: '取 消', type: '' },
        confirm: { show: true, name: '暂 存', type: 'primary' },
        submit: { show: true, name: '提 交', type: 'success' }
      },
      dialog: {
        width: '50%',
        title: '编辑实习计划'
      },
      someFlags: {
        needVerifyUpdate: false // 禁用数据变更检查，允许直接关闭对话框
      }
    }
  }
}));
</script>

