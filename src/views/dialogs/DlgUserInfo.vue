<template>
  <div>
    <!-- :simpledialog-confirm-more="confirmMore" -->
    <SimpleDialog
      ref="simpleDlg"
      :default-props="defaultMainSDProps"
      :simpledialog-confirm="confirm"
      @update-record="updateRecord"
      @close-dialog="closeDialog"
      @open-dialog="openDialog"
    >
      <template #otherItems>
        <el-form-item label="角色"
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

const confirm = async (option, type, dlgForm) => {
  if (option === 'append') {
    let password = '000000';
    if (!!dlgForm.password) password = dlgForm.password;
    const res = await listAPI.editOneNode('BaseUser', { ...dlgForm, password });
    if (res.message === 'successful') {
      userAPI.saveUserRoles(res.data.id, form.roleIds);
    }
  } else if (option === 'edit') {
    await userAPI.editUserInfo(dlgForm.id, dlgForm);
    await confirmMore(dlgForm);
  }
};

const confirmMore = async (data) => {
  await userAPI.saveUserRoles(data.id, form.roleIds);
};

const onSelRoles = (val) => {
  form.roleIds = val;
};

const openDialog = (row, formData) => {
  setTimeout(() => {
    if (props.propsInfo.type === 'append') {
      if (!props.propsInfo.majorId) {
        formData.majorId = 0;
      } else {
        formData.majorId = props.propsInfo.majorId;
      }
    }
  }, 200);
};

defineExpose({
  showDialog,
});
</script>
