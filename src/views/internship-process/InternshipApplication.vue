<template>
  <div>
    <BaseList ref="baseListRef" :default-props="defaultProps" @after-init-data="handleAfterInitData">
      <template #rightOperate="{ row }">
        <template v-if="isTeacher">
          <el-button size="small" @click="handleApply(row)" type="primary" :disabled="isApplied(row.id)" :title="isApplied(row.id) ? '已报名' : '报名'"><el-icon><CircleCheck /></el-icon></el-button>
          <el-button size="small" @click="handleCancel(row)" type="danger" :disabled="!isApplied(row.id)" :title="!isApplied(row.id) ? '未报名' : '取消报名'"><el-icon><CircleClose /></el-icon></el-button>
        </template>
        <template v-if="isSuperAdmin">
          <el-button size="small" @click="handleAdminApply(row)" type="success" title="管理员分配项目"><el-icon><User /></el-icon></el-button>
          <el-button size="small" @click="handleAdminCancel(row)" type="warning" title="管理员取消分配项目"><el-icon><UserFilled /></el-icon></el-button>
        </template>
      </template>
    </BaseList>
    <SimpleDialog ref="simpleDlg" :default-props="adminDialogProps" :simpledialog-confirm="handleAdminConfirm"
      @close-dialog="handleAdminDialogClose" />
    <SimpleDialog ref="adminCancelDlg" :default-props="adminCancelDialogProps"
      :simpledialog-confirm="handleAdminCancelConfirm" @close-dialog="handleAdminCancelDialogClose" />
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import BaseList from '@/views/master-page/BaseList.vue';
import listAPI from '@/api/list';
import { CircleCheck, CircleClose, User, UserFilled } from '@element-plus/icons-vue';
import SimpleDialog from '@/components/SimpleDialog.vue';
import CONSTANT from '@/utils/constant';
defineOptions({
  name: 'InternshipApplication',
});

const store = useStore();
const baseListRef = ref(null);

// 获取当前用户ID
const userInfo = computed(() => store.getters.userInfo || {});
const userId = computed(() => userInfo.value.id);

// 判断是否是老师
const isTeacher = computed(() => {
  return userInfo.value.jobName === '老师';
});

// 判断是否是超级管理员
const roles = computed(() => store.getters.roles || []);
const isSuperAdmin = computed(() => {
  return roles.value.some(role => role == 1);
});

// 当前操作的实习项目（用于管理员报名/取消）
const currentInternshipRow = ref(null);
const simpleDlg = ref(null);
const adminCancelDlg = ref(null);

// 存储已报名当前项目的老师ID集合
const appliedTeacherIds = ref(new Set());

// 存储已报名的实习项目ID集合
const appliedInternshipIds = ref(new Set());

// 查询当前用户已报名的实习项目
async function loadAppliedInternships() {
  if (!userId.value) {
    appliedInternshipIds.value = new Set();
    return;
  }

  try {
    const queryResult = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      searchKey: {
        teacherId: userId.value,
      },
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'ASC' }
    });

    if (queryResult && queryResult.data && queryResult.data.content) {
      // 提取所有已报名的 internshipId（去重）
      const ids = new Set(
        queryResult.data.content
          .map(item => item.internshipId)
          .filter(id => id != null && id !== undefined)
      );
      appliedInternshipIds.value = ids;
    } else {
      appliedInternshipIds.value = new Set();
    }
  } catch (error) {
    console.error('查询已报名实习项目失败:', error);
    appliedInternshipIds.value = new Set();
  }
}

// 判断某个实习项目是否已报名
function isApplied(internshipId) {
  return appliedInternshipIds.value.has(internshipId);
}

// 监听用户ID变化，重新加载已报名列表
watch(userId, () => {
  loadAppliedInternships();
}, { immediate: true });

// 组件挂载时加载已报名列表
onMounted(() => {
  loadAppliedInternships();
});

const defaultProps = reactive({
  defaultDTLProps: {
    title: { mainTitle: '' },
    defaultDTHProps: {
      buttonProps: { update: { show: false }, create: { show: false }, delete: { show: false }, export: { show: false } },
      keyWord: { edit: 'MainInternship', view: 'ViewMainInternship' },
      allTableColumns: [
        { id: 1, showName: '实习项目名称', tableColumnName: 'name', sortable: true },
        { id: 2, showName: '实习模板', tableColumnName: 'internshipTypeName', sortable: true },
        { id: 3, showName: '报告周期', tableColumnName: 'cron', sortable: false },
        { id: 4, showName: '备注', tableColumnName: 'remarks', sortable: false }
      ],
    },
    defaultDBIProps: {},
  },
  defaultSDProps: {
    keyWord: 'MainInternship',
    formItems: [],
    formRules: {},
    defaultDBProps: {
      dialog: {},
    },
  },
  defaultDBIProps: {
    keyWords: 'MainInternship',
  },
});

// 处理报名操作
async function handleApply(row) {
  if (!userId.value) {
    ElMessage.warning('请先登录');
    return;
  }

  try {
    // 弹出输入框，让用户输入指导人数
    const { value } = await ElMessageBox.prompt('请输入指导人数', '', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^[1-9]\d*$/,
      inputErrorMessage: '指导人数必须是大于0的整数',
      inputType: 'number',
      inputPlaceholder: '请输入指导人数',
    });

    const studentCount = parseInt(value, 10);
    if (isNaN(studentCount) || studentCount <= 0) {
      ElMessage.warning('指导人数必须是大于0的整数');
      return;
    }

    // 确认操作
    await ElMessageBox.confirm(`确定报名实习项目"${row.name}"，指导人数为 ${studentCount} 人吗？`, '确认报名', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });

    // 批量创建 RelTeacherStudent 记录
    const promises = [];
    for (let i = 0; i < studentCount; i++) {
      const record = {
        teacherId: userId.value,
        internshipId: row.id,
        relInternshipId: 0,
        currentVerifyTypeId: row.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
          ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
          : CONSTANT.VERIFY_LEVEL.ONE_VERIFY,
      };
      promises.push(listAPI.editOneNode('RelTeacherStudent', record));
    }

    // 等待所有记录创建完成
    const results = await Promise.all(promises);

    // 检查是否有失败的记录
    const failedCount = results.filter(res => res.message !== 'successful').length;

    if (failedCount === 0) {
      ElMessage.success(`成功报名实习项目，已创建 ${studentCount} 条指导记录`);
      // 更新已报名列表
      appliedInternshipIds.value.add(row.id);
      // 刷新列表
      baseListRef.value?.initDataList(true);
    } else {
      ElMessage.warning(`报名完成，但 ${failedCount} 条记录创建失败`);
    }
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消操作，不显示错误消息
      return;
    }
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('报名失败:', error);
  }
}

// 处理取消操作
async function handleCancel(row) {
  if (!userId.value) {
    ElMessage.warning('请先登录');
    return;
  }

  try {
    await ElMessageBox.confirm(`确定取消报名实习项目"${row.name}"吗？`, '确认取消', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });

    // 查询该用户在该实习项目下的所有记录（relInternshipId为0的记录）
    const searchKey = {
      teacherId: userId.value,
      internshipId: row.id,
      relInternshipId: 0,
    };

    // 先查询相关记录
    const queryResult = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      searchKey: searchKey,
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'ASC' }
    });

    if (!queryResult || !queryResult.data || !queryResult.data.content || queryResult.data.content.length === 0) {
      ElMessage.warning('未找到相关报名记录');
      return;
    }

    // 删除所有相关记录
    const ids = queryResult.data.content.map(item => item.id);
    await listAPI.delOneOrManyNodes('RelTeacherStudent', ids);

    ElMessage.success('取消报名成功');
    // 更新已报名列表
    appliedInternshipIds.value.delete(row.id);
    // 刷新列表
    baseListRef.value?.initDataList(true);
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消操作，不显示错误消息
      return;
    }
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('取消报名失败:', error);
  }
}

// 数据加载完成后，重新加载已报名列表（确保数据同步）
function handleAfterInitData() {
  loadAppliedInternships();
}

// 管理员报名对话框配置
const adminDialogProps = reactive({
  keyWord: 'AdminApply',
  formItems: [
    {
      name: '选择老师',
      field: 'teacherId',
      type: 'select',
      keyWords: 'BaseUser',
      searchKeys: { jobName: '老师' },
      placeholder: '请选择老师',
      sortJson: { properties: 'Id', direction: 'DESC' },
    },
    {
      name: '指导人数',
      field: 'studentCount',
      type: 'input',
      placeholder: '请输入指导人数',
    },
  ],
  formRules: {
    teacherId: [{ required: true, message: '请选择老师', trigger: 'change' }],
    studentCount: [
      { required: true, message: '请输入指导人数', trigger: 'blur' },
      {
        validator: (rule, value, callback) => {
          if (!value) {
            callback();
            return;
          }
          const numValue = typeof value === 'string' ? Number(value) : value;
          if (isNaN(numValue) || numValue <= 0 || !Number.isInteger(numValue)) {
            callback(new Error('指导人数必须是大于0的整数'));
          } else {
            callback();
          }
        },
        trigger: 'blur',
      },
    ],
  },
  defaultDBProps: {
    dlgTitle: '管理员分配实习项目',
    width: '500px',
    footButtons: {
      cancel: { show: true, name: '取消', type: '' },
      confirm: { show: true, name: '确定', type: 'primary' },
    },
  },
});

// 查询已报名当前项目的老师列表
async function loadAppliedTeachers(internshipId) {
  if (!internshipId) {
    appliedTeacherIds.value = new Set();
    return;
  }

  try {
    const queryResult = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      searchKey: {
        internshipId: internshipId,
      },
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'ASC' },
    });

    if (queryResult && queryResult.data && queryResult.data.content) {
      // 提取所有已报名的 teacherId（去重）
      const ids = new Set(
        queryResult.data.content
          .map(item => item.teacherId)
          .filter(id => id != null && id !== undefined)
      );
      appliedTeacherIds.value = ids;
    } else {
      appliedTeacherIds.value = new Set();
    }
  } catch (error) {
    console.error('查询已报名老师失败:', error);
    appliedTeacherIds.value = new Set();
  }
}

// 打开管理员报名对话框
async function handleAdminApply(row) {
  if (!isSuperAdmin.value) {
    ElMessage.warning('只有管理员才能使用此功能');
    return;
  }

  currentInternshipRow.value = row;
  // 查询已报名的老师列表
  await loadAppliedTeachers(row.id);

  // 更新选择框的过滤条件，排除已报名的老师
  const excludedIds = Array.from(appliedTeacherIds.value).join(',');
  if (excludedIds && excludedIds.length > 0) {
    // 使用 NOT IN 操作符排除已报名的老师
    adminDialogProps.formItems[0].searchKeys = {
      jobName: '老师',
      id: excludedIds,
    };
    adminDialogProps.formItems[0].regKey = {
      id: '!()', // NOT IN 操作符
      // jobName 默认使用 EQ 操作符，不需要 regKey
    };
  } else {
    // 如果没有已报名的老师，只过滤 jobName
    adminDialogProps.formItems[0].searchKeys = {
      jobName: '老师',
    };
    // jobName 默认使用 EQ 操作符，不需要 regKey
    adminDialogProps.formItems[0].regKey = {};
    // 确保删除 id 相关的过滤条件
    if (adminDialogProps.formItems[0].regKey.id) {
      delete adminDialogProps.formItems[0].regKey.id;
    }
    if (adminDialogProps.formItems[0].searchKeys.id) {
      delete adminDialogProps.formItems[0].searchKeys.id;
    }
  }

  // 重置表单并打开对话框
  const form = {
    teacherId: null,
    studentCount: null,
  };
  simpleDlg.value?.showDialog(true, form);
}

// 管理员报名确认
async function handleAdminConfirm(option, type, form) {
  if (!currentInternshipRow.value) {
    ElMessage.error('未选择实习项目');
    return;
  }

  if (!form.teacherId) {
    ElMessage.warning('请选择老师');
    return;
  }

  const studentCount = parseInt(form.studentCount, 10);
  if (isNaN(studentCount) || studentCount <= 0) {
    ElMessage.warning('指导人数必须是大于0的整数');
    return;
  }

  // 确认操作
  try {
    await ElMessageBox.confirm(`确定为老师报名实习项目"${currentInternshipRow.value.name}"，指导人数为 ${studentCount} 人吗？`, '确认报名', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });

    // 批量创建 RelTeacherStudent 记录
    const promises = [];
    for (let i = 0; i < studentCount; i++) {
      const record = {
        teacherId: form.teacherId,
        internshipId: currentInternshipRow.value.id,
        relInternshipId: 0,
        currentVerifyTypeId: currentInternshipRow.value.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
          ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
          : CONSTANT.VERIFY_LEVEL.ONE_VERIFY,
      };
      promises.push(listAPI.editOneNode('RelTeacherStudent', record));
    }

    // 等待所有记录创建完成
    const results = await Promise.all(promises);

    // 检查是否有失败的记录
    const failedCount = results.filter(res => res.message !== 'successful').length;

    if (failedCount === 0) {
      ElMessage.success(`成功为老师报名实习项目，已创建 ${studentCount} 条指导记录`);
      // 更新已报名列表
      appliedTeacherIds.value.add(form.teacherId);
      // 刷新列表
      baseListRef.value?.initDataList(true);
      // 关闭对话框
      simpleDlg.value?.showDialog(false, {});
    } else {
      ElMessage.warning(`报名完成，但 ${failedCount} 条记录创建失败`);
    }
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消操作，不显示错误消息
      return;
    }
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('管理员分配失败:', error);
  }
}

// 管理员对话框关闭
function handleAdminDialogClose() {
  currentInternshipRow.value = null;
  appliedTeacherIds.value = new Set();
}

// 管理员取消报名对话框配置
const adminCancelDialogProps = reactive({
  keyWord: 'AdminCancel',
  formItems: [
    {
      name: '选择老师',
      field: 'teacherId',
      type: 'select',
      keyWords: 'BaseUser',
      searchKeys: { jobName: '老师' },
      placeholder: '请选择要取消报名的老师',
      sortJson: { properties: 'Id', direction: 'DESC' },
    },
  ],
  formRules: {
    teacherId: [{ required: true, message: '请选择老师', trigger: 'change' }],
  },
  defaultDBProps: {
    dlgTitle: '管理员取消分配',
    width: '500px',
    footButtons: {
      cancel: { show: true, name: '取消', type: '' },
      confirm: { show: true, name: '确定', type: 'primary' },
    },
  },
});

// 打开管理员取消报名对话框
async function handleAdminCancel(row) {
  if (!isSuperAdmin.value) {
    ElMessage.warning('只有管理员才能使用此功能');
    return;
  }

  currentInternshipRow.value = row;
  // 查询已报名的老师列表
  await loadAppliedTeachers(row.id);

  // 如果没有已报名的老师，提示并返回
  if (appliedTeacherIds.value.size === 0) {
    ElMessage.warning('该项目暂无已报名的老师');
    return;
  }

  // 更新选择框的过滤条件，只显示已报名的老师
  const includedIds = Array.from(appliedTeacherIds.value).join(',');
  if (includedIds && includedIds.length > 0) {
    // 使用 IN 操作符只显示已报名的老师
    adminCancelDialogProps.formItems[0].searchKeys = {
      jobName: '老师',
      id: includedIds,
    };
    adminCancelDialogProps.formItems[0].regKey = {
      id: '()', // IN 操作符
      // jobName 默认使用 EQ 操作符，不需要 regKey
    };
  } else {
    // 如果没有已报名的老师，清空选择框
    adminCancelDialogProps.formItems[0].searchKeys = {
      jobName: '老师',
    };
    // jobName 默认使用 EQ 操作符，不需要 regKey
    adminCancelDialogProps.formItems[0].regKey = {};
  }

  // 重置表单并打开对话框
  const form = {
    teacherId: null,
  };
  adminCancelDlg.value?.showDialog(true, form);
}

// 管理员取消报名确认
async function handleAdminCancelConfirm(option, type, form) {
  if (!currentInternshipRow.value) {
    ElMessage.error('未选择实习项目');
    return;
  }

  if (!form.teacherId) {
    ElMessage.warning('请选择要取消报名的老师');
    return;
  }

  // 确认操作
  try {
    await ElMessageBox.confirm(`确定取消老师对实习项目"${currentInternshipRow.value.name}"的报名吗？`, '确认取消报名', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' });

    // 查询该老师在该实习项目下的所有记录（relInternshipId为0的记录）
    const searchKey = {
      teacherId: form.teacherId,
      internshipId: currentInternshipRow.value.id,
      relInternshipId: 0,
    };

    // 先查询相关记录
    const queryResult = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      searchKey: searchKey,
      pageInfo: { page: 1, size: 1000 },
      sort: { properties: 'id', direction: 'ASC' },
    });

    if (!queryResult || !queryResult.data || !queryResult.data.content || queryResult.data.content.length === 0) {
      ElMessage.warning('未找到相关报名记录');
      return;
    }

    // 删除所有相关记录
    const ids = queryResult.data.content.map(item => item.id);
    await listAPI.delOneOrManyNodes('RelTeacherStudent', ids);

    ElMessage.success('取消报名成功');
    // 更新已报名列表
    appliedTeacherIds.value.delete(form.teacherId);
    // 刷新列表
    baseListRef.value?.initDataList(true);
    // 关闭对话框
    adminCancelDlg.value?.showDialog(false, {});
  } catch (error) {
    if (error === 'cancel') {
      // 用户取消操作，不显示错误消息
      return;
    }
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('管理员取消分配失败:', error);
  }
}

// 管理员取消报名对话框关闭
function handleAdminCancelDialogClose() {
  currentInternshipRow.value = null;
  appliedTeacherIds.value = new Set();
}
</script>