<template>
  <div class="build-internship-container">
    <BaseList
      :default-props="defaultProps"
      ref="baseList"
      :baselist-confirm="handleConfirm"
      @append-click="appendClick"
      @edit-click="editClick"
    >
    </BaseList>
    <!-- 自定义编辑窗口（独立于 BaseList，只用于编辑） -->
    <DlgMainInternship
      ref="dlgMainInternship"
      :user-department-id="userDepartmentId"
      :is-super-admin="isSuperAdmin"
      @update-record="handleUpdateRecord"
    />
  </div>
</template>
<script setup>
import { ref, computed, onBeforeUnmount } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import DlgMainInternship from '@/views/dialogs/DlgMainInternship.vue';
import otherAPI from '@/api/other';

defineOptions({
  name: 'MainInternship',
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

// 自定义确认函数
const handleConfirm = async (option, type, form) => {
  try {
    await ElMessageBox.confirm(
      '新增后，实习模板将不能修改，确定新增吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    // 用户点击确定后，执行保存逻辑
    const userInfo = store.getters.userInfo;
    if (userInfo && userInfo.id) {
      form.creatorId = userInfo.id;
    }
    form.studentNum = 0;    
    // 调用新增实习项目接口
    const resInfo = await otherAPI.addNewInternship(form);
    if (resInfo && resInfo.message === 'successful') {      
      // 显示成功提示
      ElMessage({
        message: '新增项目成功！请点击对应条目后的编辑按钮对项目详细信息进行设置。',
        type: 'success',
        duration: 5000 // 显示5秒，因为消息较长
      });
    } else {
      ElMessage.warning(resInfo?.message || '新增失败');
    }
    
  } catch {
    // 用户点击取消，抛出特殊错误以阻止对话框关闭，但不显示错误消息
    return false;
  }
  
};

// 处理新增按钮点击事件
const appendClick = () => {
  baseList.value?.openDlg('append', {});
};

// 处理编辑按钮点击事件，使用自定义的编辑窗口
const editClick = (row) => {
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
        delete: { show: true }
      },
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
      allTableColumns: [
        { id: 1, showName: '所属院系', theOrder: 1, tableColumnName: 'universityName' },
        { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'name' },
        { id: 3, showName: '实习类型', theOrder: 3, tableColumnName: 'intTypeName' },
        { id: 4, showName: '实习模板', theOrder: 4, tableColumnName: 'internshipTypeName' },
        { id: 5, showName: '报告周期', theOrder: 5, tableColumnName: 'cron' },
        // { id: 6, showName: '已选学生人数', theOrder: 6, tableColumnName: 'studentNum', sortable: true },
        { id: 7, showName: '备注', theOrder: 7, tableColumnName: 'remarks' }
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
        confirm: { show: true, name: '新增', type: 'primary' },
        submit: { show: false },
        repeatAdd: { show: false }
      },
      dialog: {}
    }
  },
}));
</script>
