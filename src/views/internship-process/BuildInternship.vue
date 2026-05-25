<template>
  <div v-if="enterpriseAccessReady && !enterpriseBlocked" class="build-internship-container">
    <BaseList :default-props="defaultProps" ref="baseList" :baselist-confirm="handleConfirm" @append-click="appendClick"
      @edit-click="editClick" @delete-click="handleDeleteClick" @simple-select-change="onSimpleSelectChange">
      <!-- 新增弹窗内：模板下方实时显示该模板的流程列表（只读预览） -->
      <template #dlgBottom>
        <div class="template-process-preview">
          <div class="template-process-title">该模板包含的流程</div>
          <DataTableList
            v-if="selectedTypeId"
            ref="templateProcessTableRef"
            :default-props="templateProcessTableProps"
          />
          <el-empty v-else description="请先选择实习模板" :image-size="60" />
        </div>
      </template>
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgMainInternship ref="dlgMainInternship" :user-department-id="userDepartmentId" :is-super-admin="isSuperAdmin"
      @update-record="handleUpdateRecord" />
  </div>
  <el-card v-else-if="enterpriseAccessReady" shadow="never">
    <el-empty description="企业信息未审核通过，暂无校外实习申报资格" />
  </el-card>
</template>
<script setup>
/**
 * 实习项目创建页面
 *
 * 功能说明：
 * - 新增：创建实习项目基本信息（选择模板、填写名称等）
 * - 编辑：配置项目详情和流程列表
 * - 提交：锁定项目配置，完成创建
 *
 * 注意：项目创建本身不涉及审核流程。
 * 审核发生在后续的具体流程中（如"实习计划制定"），
 * 提交计划后，按照流程配置的审核要求进行审核。
 */
import { ref, computed, onBeforeUnmount, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DataTableList from '@/components/DataTableList.vue';
import DlgMainInternship from '@/views/dialogs/DlgMainInternship.vue';
import otherAPI from '@/api/other';
import { ensureEnterpriseAccess } from '@/utils/enterpriseAccess';

defineOptions({
  name: 'BuildInternship',
});

const store = useStore();
const baseList = ref(null);
const dlgMainInternship = ref(null);
const enterpriseBlocked = ref(false);
const enterpriseAccessReady = ref(false);

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
      searchKey: { universityId: userDepartmentId.value }
      // 默认使用 EQ 操作符，不需要 regKey
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

/**
 * 新增项目确认函数
 * 创建项目后需要进入编辑页面配置流程列表
 */
const handleConfirm = async (_option, _type, form) => {
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
        message: '新增项目成功！请点击编辑按钮配置项目流程。',
        type: 'success',
        duration: 5000
      });
    } else {
      ElMessage.warning(resInfo?.message || '新增失败');
    }
  } catch {
    return false;
  }
};

// 处理新增按钮点击事件
const appendClick = () => {
  selectedTypeId.value = null;
  baseList.value?.openDlg('append', {});
};

// 新增弹窗：选择实习模板后实时刷新下方模板流程预览表
const selectedTypeId = ref(null);
const templateProcessTableRef = ref(null);

const templateProcessTableProps = computed(() => ({
  bottomOffset: 0,
  sortStr: { properties: 'theOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 100 },
  initSearchWords: {
    searchKey: { internshipTypeId: selectedTypeId.value },
    regKey: { internshipTypeId: '=' },
    andor: {},
  },
  someFlags: {
    operateShow: false,
    checkFlag: false,
    showPage: false,
    autoInit: true,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: false,
    keyWord: { view: 'ViewRelProcessInternshipType', edit: 'RelProcessInternshipType' },
    buttonProps: {
      create: { show: false }, update: { show: false }, delete: { show: false },
      up: { show: false }, down: { show: false },
    },
    allTableColumns: [
      { id: 1, showName: '流程名称', theOrder: 1, tableColumnName: 'processTypeName', sortable: false },
      { id: 2, showName: '审核要求', theOrder: 2, tableColumnName: 'verifyTypeName', sortable: false },
    ],
  },
}));

function onSimpleSelectChange(val, field) {
  if (field === 'internshipTypeId') {
    selectedTypeId.value = val ?? null;
    nextTick(() => templateProcessTableRef.value?.initDataList(true));
  }
}

// 处理编辑按钮点击事件，使用自定义的编辑窗口
const editClick = (row) => {
  dlgMainInternship.value?.showDialog(true, row);
};

// 自定义删除处理
const handleDeleteClick = async (rows) => {
  const ids = Array.isArray(rows) ? rows.map(item => item.id) : rows?.id ? [rows.id] : [];
  if (!ids.length) {
    ElMessage.warning('未选择要删除的项目');
    return;
  }
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
    console.error('删除失败:', error);
  }
};

// 处理更新记录后的回调
const handleUpdateRecord = () => {
  baseList.value?.initDataList();
};

// 组件销毁前关闭所有对话框，防止遮罩层残留
onMounted(async () => {
  const access = await ensureEnterpriseAccess(store);
  enterpriseBlocked.value = !access.passed;
  enterpriseAccessReady.value = true;
});

onBeforeUnmount(() => {
  dlgMainInternship.value?.closeAllDialogs?.();
});

const defaultProps = computed(() => ({
  defaultDTLProps: {
    initSearchWords: initSearchWords.value,
    defaultDTHProps: {
      buttonProps: { update: { show: true }, create: { show: true }, delete: { show: true } },
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
      allTableColumns: [
        { id: 1, showName: '所属院系', theOrder: 1, tableColumnName: 'universityName' },
        { id: 2, showName: '项目编号', theOrder: 2, tableColumnName: 'code' },
        { id: 3, showName: '项目名称', theOrder: 3, tableColumnName: 'name' },
        { id: 4, showName: '实习类型', theOrder: 4, tableColumnName: 'intTypeName' },
        { id: 5, showName: '实习模板', theOrder: 5, tableColumnName: 'internshipTypeName' },
        { id: 6, showName: '备注', theOrder: 6, tableColumnName: 'remarks' }
      ],
    },
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
    formItems: [
      { name: '实习模板', field: 'internshipTypeId', type: 'select', keyWords: 'BaseInternshipType', sortJson: { properties: 'Id', direction: 'DESC' }, searchKeys: templateSearchKey.value },
      { name: '项目编号', field: 'code', type: 'input' },
      { name: '实习名称', field: 'name', type: 'input' },
      { name: '备注', field: 'remarks', type: 'textarea' }
    ],
    formRules: {
      name: [{ required: true, message: '实习名称不能为空', trigger: 'blur' }],
      internshipTypeId: [{ required: true, message: '请选择实习模板', trigger: 'blur' }],
    },
    defaultDBProps: {
      footButtons: {
        confirm: { show: true, name: '新增', type: 'primary' },
        submit: { show: false },
        repeatAdd: { show: false }
      },
      dialog: {}
    }
  },
}));
</script>

<style scoped>
.template-process-preview {
  margin-top: 12px;
  padding: 8px 0 0;
  border-top: 1px dashed var(--el-border-color-lighter);
}
.template-process-title {
  font-size: 13px;
  color: #606266;
  margin: 0 0 8px 8px;
}
.template-process-preview :deep(.el-card) {
  border: none;
  box-shadow: none;
}
.template-process-preview :deep(.el-card__body) {
  padding: 0;
}
.template-process-preview :deep(.el-table) {
  max-height: 280px;
}
</style>
