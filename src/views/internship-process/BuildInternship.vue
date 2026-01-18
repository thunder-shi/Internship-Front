<template>
  <div class="build-internship-container">
    <BaseList
      :default-props="defaultProps"
      :button-condition="buttonCondition"
      ref="baseList"
      :baselist-confirm="handleConfirm"
      :check-row-edit="checkRowEditable"
      :check-row-delete="checkRowDeletable"
      @append-click="appendClick"
      @edit-click="editClick"
      @view-click="viewClick"
    >
      <!-- 自定义审核状态列显示 -->
      <template #auditStatus="{ row }">
        <el-tag :type="getAuditTagType(row.isAudit)" size="small">
          {{ getAuditStatusText(row) }}
        </el-tag>
      </template>
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgMainInternship
      ref="dlgMainInternship"
      :user-department-id="userDepartmentId"
      :is-super-admin="isSuperAdmin"
      @update-record="handleUpdateRecord"
    />
    <!-- 审核进度弹窗 -->
    <DlgVerifyProgress
      v-model="verifyProgressVisible"
      :main-internship-id="currentVerifyId"
      :process-info="currentProcessInfo"
    />
  </div>
</template>
<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgMainInternship from '@/views/dialogs/DlgMainInternship.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';

defineOptions({
  name: 'MainInternship',
});

const store = useStore();
const baseList = ref(null);
const dlgMainInternship = ref(null);

// 审核进度弹窗相关
const verifyProgressVisible = ref(false);
const currentVerifyId = ref(null);
const currentProcessInfo = ref({});

// 获取用户信息和角色
const userInfo = computed(() => store.getters.userInfo || {});
const roles = computed(() => store.getters.roles || []);

// 判断是否是超级管理员
const isSuperAdmin = computed(() => {
  return roles.value.some(role => role.name === '超级管理员');
});

// 用户所属院系ID
const userDepartmentId = computed(() => userInfo.value.departmentId);

// 计算列表查询条件（非超级管理员只能查看自己院系的项目）
const initSearchWords = computed(() => {
  if (isSuperAdmin.value) {
    return {};
  }
  if (userDepartmentId.value) {
    return {
      searchKey: { universityId: userDepartmentId.value },
      regKey: { universityId: '=' }
    };
  }
  return {};
});

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

// 按钮条件配置：控制编辑/删除/查看按钮的显示
// isAudit: -1 保存未提交, 0 提交待审核, 1 审核通过, 2 审核不通过, 3 审核退回
const buttonCondition = computed(() => ({
  // 编辑按钮：只有 -1（保存未提交）或 3（退回）时显示
  update: (row) => row.isAudit === -1 || row.isAudit === 3,
  // 删除按钮：只有 -1（保存未提交）或 3（退回）时显示
  delete: (row) => row.isAudit === -1 || row.isAudit === 3,
  // 查看按钮：0（待审核）、1（通过）、2（不通过）时显示
  visible: (row) => row.isAudit === 0 || row.isAudit === 1 || row.isAudit === 2
}));

// 审核状态标签类型
const getAuditTagType = (isAudit) => {
  const typeMap = {
    '-1': 'info',
    '0': 'warning',
    '1': 'success',
    '2': 'danger',
    '3': ''  // 默认样式
  };
  return typeMap[String(isAudit)] || 'info';
};

// 获取审核状态简短文本（根据流程信息显示）
const getAuditStatusText = (row) => {
  const statusMap = {
    '-1': '保存未提交',
    '0': '待审核',
    '1': '审核通过',
    '2': '审核不通过',
    '3': '审核退回'
  };
  // 如果有更详细的审核角色信息，可以显示更具体的状态
  // 例如：row.currentVerifyRole 存储当前审核角色名称
  if (row.isAudit === 0 && row.currentVerifyRole) {
    return `${row.currentVerifyRole}审核中`;
  }
  return statusMap[String(row.isAudit)] || '--';
};

// 显示审核进度弹窗
const showVerifyProgress = (row) => {
  // 使用 relProcessInternshipId 来查询审核进度
  // 这里假设 row 中有 id 作为 MainInternship 的 ID
  // 需要根据实际的数据结构调整
  currentVerifyId.value = row.id;
  currentProcessInfo.value = {
    isAudit: row.isAudit,  // 直接使用 datalist 中的审核状态
    verifyTypeId: row.verifyTypeId,
    verifyFirstRole: row.verifyFirstRole,
    verifySecondRole: row.verifySecondRole,
    verifyThirdRole: row.verifyThirdRole,
    verifyFourthRole: row.verifyFourthRole,
    verifyFifthRole: row.verifyFifthRole
  };
  verifyProgressVisible.value = true;
};

// 查看按钮点击事件（小眼睛按钮，打开审核进度弹窗）
const viewClick = (rows) => {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (row) {
    showVerifyProgress(row);
  }
};

// 自定义暂存函数（isAudit = -1 暂存未提交）
const handleConfirm = async (option, type, form) => {
  const userInfo = store.getters.userInfo;
  if (userInfo && userInfo.id) {
    form.creatorId = userInfo.id;
  }
  form.studentNum = 0;
  form.isAudit = -1; // 暂存未提交
  await baseList.value?._confirm(option, type, form);
  baseList.value?.initDataList();
};

// 检查行是否可编辑（只有 -1 保存未提交和 3 审核退回可编辑）
const checkRowEditable = (row) => {
  if (row.isAudit !== -1 && row.isAudit !== 3) {
    ElMessage.warning('当前状态不可编辑');
    return false;
  }
  return true;
};

// 检查行是否可删除（只有 -1 保存未提交和 3 审核退回可删除）
const checkRowDeletable = (row) => {
  if (row.isAudit !== -1 && row.isAudit !== 3) {
    ElMessage.warning('当前状态不可删除');
    return false;
  }
  return true;
};

// 处理新增按钮点击事件
const appendClick = () => {
  baseList.value?.openDlg('append', {});
};

// 处理编辑按钮点击事件，使用自定义的编辑窗口
const editClick = (row) => {
  // 只有 -1 保存未提交和 3 审核退回可编辑
  if (row.isAudit !== -1 && row.isAudit !== 3) {
    ElMessage.warning('当前状态不可编辑');
    return;
  }
  dlgMainInternship.value?.showDialog(true, row);
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 组件销毁前关闭所有对话框，防止遮罩层残留
onBeforeUnmount(() => {
  dlgMainInternship.value?.closeAllDialogs?.();
});

const defaultProps = computed(() => ({
  defaultDTLProps: {
    initSearchWords: initSearchWords.value,
    defaultDTHProps: {
      buttonProps: {
        update: { show: true },
        create: { show: true },
        delete: { show: true },
        export: { show: true },
        visible: { show: true, name: '查看', type: 'info' }
      },
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', theOrder: 1, tableColumnName: 'name' },
        { id: 2, showName: '所属院系', theOrder: 2, tableColumnName: 'universityName' },
        { id: 3, showName: '实习类型', theOrder: 3, tableColumnName: 'typeName' },
        { id: 4, showName: '实习模板', theOrder: 4, tableColumnName: 'internshipTypeName' },
        { id: 5, showName: '报告周期', theOrder: 5, tableColumnName: 'cron' },
        { id: 6, showName: '已选学生人数', theOrder: 6, tableColumnName: 'studentNum', sortable: true },
        { id: 7, showName: '审核状态', theOrder: 7, tableColumnName: 'customize-auditStatus', width: 180 },
        { id: 8, showName: '备注', theOrder: 8, tableColumnName: 'remarks' }
      ],
    },
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
    formItems: [
      { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: {properties: 'Id', direction: 'DESC'}, searchKeys: templateSearchKey.value },
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
        confirm: { show: true, name: '暂 存', type: 'primary' },
        submit: { show: false },
        repeatAdd: { show: false }
      },
      dialog: {}
    }
  },
}));
</script>
