<template>
  <div>
    <!-- :simpledialog-confirm-more="confirmMore" -->
    <SimpleDialog
      ref="simpleDlg"
      :default-props="defaultMainSDProps"
      :simpledialog-confirm="confirm"
      :simpledialog-reset-pass="resetPassword"
      @update-record="updateRecord"
      @close-dialog="closeDialog"
      @open-dialog="openDialog"
    >
      <template #otherItems>
        <el-form-item label="角色" prop="roleIds"
          ><SimpleSelect
            ref="spsRole"
            v-model="form.roleIds"
            multiple
            key-words="SysRole"
            @update-value="onSelRoles"
        /></el-form-item>
      </template>
    </SimpleDialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import SimpleDialog from '@/components/SimpleDialog.vue';
import SimpleSelect from '@/components/SimpleSelect.vue';
import listAPI from '@/api/list.js';
import userAPI from '@/api/user.js';
import _ from 'lodash';
const props = defineProps({
  propsInfo: {
    type: Object,
    default: () => ({
      majorId: 0,
      type: null,
    }),
  },
});
const emit = defineEmits(['update-record']);

const simpleDlg = ref(null);
const spsRole = ref(null);

const disabled = computed(() => {
  return props.propsInfo.type === 'edit';
});

const defaultMainSDProps = reactive({
  form: {},
  keyWord: 'BaseUser',
  formItems: [
    { name: '账号', field: 'account', placeholder: '账号不能为空', type: 'input' },
    {
      name: '密码',
      field: 'password',
      placeholder: '密码不能为空',
      type: 'password',
      disabled: disabled,
    },
    { name: '身份证号', field: 'idCard', placeholder: '身份证号', type: 'input' },
    { name: '姓名', field: 'name', placeholder: '姓名不能为空', type: 'input' },
    {
      name: '性别',
      field: 'sex',
      type: 'select_noremote',
      options: [
        { id: '0', name: '男' },
        { id: '1', name: '女' },
      ],
    },
    { name: '出生日期', field: 'birth', type: 'date', valueFormat: 'YYYY-MM-DD' },
    { name: '单位部门', field: 'departmentId', keyWords: 'BaseDepartment', type: 'cascader' },
    { name: '身份类型', field: 'jobId', keyWords: 'BaseJobPosition', type: 'select' },
    {
      name: '专业',
      field: 'majorId',
      keyWords: 'BaseMajor',
      type: 'cascader',
    },
    { name: '手机号', field: 'phone', type: 'input' },
    { name: '工号', field: 'workId', type: 'input' },
    {
      name: '学制',
      field: 'schoolLength',
      type: 'select_noremote',
      options: [
        { id: '1', name: '1年' },
        { id: '2', name: '2年' },
        { id: '3', name: '3年' },
        { id: '4', name: '4年' },
        { id: '5', name: '5年' },
        { id: '6', name: '6年' },
        { id: '7', name: '7年' },
        { id: '8', name: '8年' },
      ],
    },
    { name: '入学年份', field: 'startYear', type: 'input' },
    { name: '毕业年份', field: 'endYear', type: 'input' },
    { name: '备注', field: 'remarks', type: 'textarea' },
  ],
  formRules: {
    account: [{ required: true, message: '账号不能为空', trigger: 'blur' }],
    // phone: [{ required: true, message: '手机号不能为空', trigger: 'blur' }],
    name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
    majorId: [{ required: true, message: '专业不能为空', trigger: 'blur' }],
    jobId: [{ required: true, message: '身份类型不能为空', trigger: 'blur' }],
    departmentId: [{ required: true, message: '单位部门不能为空', trigger: 'blur' }],
    roleIds: [{ required: true, message: '角色不能为空', trigger: 'change', type: 'array' }],
  },
  defaultDBProps: {},
});

const form = reactive({});

const resetForm = (data = {}) => {
  Object.keys(form).forEach((key) => {
    delete form[key];
  });
  Object.assign(form, data);
};

const showDialog = async (val, formData = {}) => {
  resetForm(_.cloneDeep(formData));
  await initSomeValues(form.id);
  simpleDlg.value?.showDialog(val, form, true);
};

const initSomeValues = async (userId) => {
  if (userId) {
    const res1 = await userAPI.getUserRoles(userId);
    form.roleIds = res1.data.map((item) => item.id);
  }
};

const updateRecord = async () => {
  emit('update-record');
};

const syncPasswordToForm = (passwordValue) => {
  form.password = passwordValue;
  if (simpleDlg.value?.form) {
    simpleDlg.value.form.password = passwordValue;
  }
};

const fetchUserPassword = async (userId) => {
  const res = await listAPI.getSomeRecords({
    keyWords: 'BaseUser',
    pageInfo: { page: 1, size: 1 },
    searchKey: { id: userId },
  });
  return res?.data?.content?.[0]?.password;
};

const DEFAULT_PASSWORD = '000000';

const isAccountExists = async (account, excludeUserId) => {
  const trimmedAccount = account?.trim();
  if (!trimmedAccount) return false;
  const res = await listAPI.getSomeRecords({
    keyWords: 'BaseUser',
    pageInfo: { page: 1, size: 1 },
    searchKey: { account: trimmedAccount },
  });
  const existing = res?.data?.content?.[0];
  if (!existing) return false;
  if (excludeUserId != null && existing.id === excludeUserId) return false;
  return true;
};

const ensureAccountUnique = async (account, excludeUserId) => {
  if (await isAccountExists(account, excludeUserId)) {
    ElMessage.warning(`账号「${account.trim()}」已存在，请更换账号`);
    throw new Error('DUPLICATE_ACCOUNT');
  }
};

const resetPassword = async () => {
  if (!form.id) return;
  try {
    await ElMessageBox.confirm(
      `确认将该用户密码重置为 ${DEFAULT_PASSWORD}？重置后立即生效。`,
      '重置密码',
      { type: 'warning', confirmButtonText: '确认重置', cancelButtonText: '取消' }
    );
  } catch {
    return;
  }
  await userAPI.editPassword(form.id, '', DEFAULT_PASSWORD, true);
  const dbPassword = await fetchUserPassword(form.id);
  if (dbPassword != null) {
    syncPasswordToForm(dbPassword);
  }
  ElMessage.success('重置完毕');
};

const confirm = async (option, type, dlgForm) => {
  if (option === 'append') {
    await ensureAccountUnique(dlgForm.account);
    let password = DEFAULT_PASSWORD;
    if (!!dlgForm.password) password = dlgForm.password;
    const res = await listAPI.editOneNode('BaseUser', dlgForm);
    if (res.message === 'successful') {
      await userAPI.editPassword(res.data.id, '', password, true);
      userAPI.saveUserRoles(res.data.id, form.roleIds || []);
    }
  } else if (option === 'edit') {
    await ensureAccountUnique(dlgForm.account, dlgForm.id);
    await userAPI.editUserInfo(dlgForm.id, dlgForm);
    await confirmMore(dlgForm);
  }
};

const confirmMore = async (data) => {
  await userAPI.saveUserRoles(data.id, form.roleIds || []);
};

const onSelRoles = (val) => {
  form.roleIds = val;
  // 同步更新 SimpleDialog 内部的 form，确保验证能正确检测到值
  if (simpleDlg.value?.form) {
    simpleDlg.value.form.roleIds = val;
  }
};

const openDialog = (row, formData) => {
  setTimeout(() => {
    if (props.propsInfo.type === 'append') {
      if (!props.propsInfo.majorId) {
        formData.majorId = 0;
      } else {
        formData.majorId = props.propsInfo.majorId;
      }
      formData.themeColor = '#1890ff';
    }
  }, 200);
};

defineExpose({
  showDialog,
});
</script>
