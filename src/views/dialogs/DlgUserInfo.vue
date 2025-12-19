<template>
  <div>
    <!-- :simpledialog-confirm-more="confirmMore" -->
    <SimpleDialog ref="simpleDlg" :default-props="defaultMainSDProps" :simpledialog-confirm="confirm" @update-record="updateRecord">
      <template #otherItems>
        <el-form-item label="角色"><SimpleSelect ref="spsRole" v-model="form.roleIds" multiple key-words="SysRole" @update-value="onSelRoles" /></el-form-item>
      </template>
    </SimpleDialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import SimpleDialog from '@/components/SimpleDialog.vue'
import SimpleSelect from '@/components/SimpleSelect.vue'
import userAPI from '@/api/user.js'
import _ from 'lodash'

const emit = defineEmits(['update-record'])

const simpleDlg = ref(null)
const spsRole = ref(null)

const defaultMainSDProps = reactive({
  form: {},
  keyWord: 'BaseUser',
  formItems: [
    { name: '账号', field: 'account', placeholder: '账号不能为空', type: 'input' },
    { name: '密码', field: 'password', placeholder: '密码不能为空', type: 'password' },
    { name: '身份证号', field: 'idCard', placeholder: '身份证号', type: 'input' },
    { name: '姓名', field: 'name', placeholder: '姓名不能为空', type: 'input' },
    { name: '性别', field: 'sex', type: 'select_noremote', options: [{ id: '男', name: '男' }, { id: '女', name: '女' }] },
    { name: '单位部门', field: 'departmentId', keyWords: 'BaseDepartment', type: 'cascader' },
    { name: '身份类型', field: 'jobId', keyWords: 'BaseJobPosition', type: 'select' },
    { name: '手机号', field: 'phone', placeholder: '手机号不能为空', type: 'input' },
    { name: '备注', field: 'remarks', type: 'textarea' }
  ],
  formRules: {
    account: [{ required: true, message: '账号不能为空', trigger: 'blur' }],
    phone: [{ required: true, message: '手机号不能为空', trigger: 'blur' }],
    name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }]
  },
  defaultDBProps: {}
})

const form = reactive({})

const resetForm = (data = {}) => {
  Object.keys(form).forEach(key => {
    delete form[key]
  })
  Object.assign(form, data)
}

const showDialog = async (val, formData = {}) => {
  resetForm(_.cloneDeep(formData))
  await initSomeValues(form.id)
  simpleDlg.value?.showDialog(val, form, true)
}

const initSomeValues = async (userId) => {
  if (userId) {
    const res1 = await userAPI.getUserRoles(userId)
    form.roleIds = res1.data.map(item => item.id)
  }
}

const updateRecord = async () => {
  emit('update-record')
}

const confirm = async (option, type, dlgForm) => {
  await userAPI.editUserInfo(dlgForm.id, dlgForm)
  await confirmMore(dlgForm)
}

const confirmMore = async (data) => {
  await userAPI.saveUserRoles(data.id, form.roleIds)
}

const onSelRoles = (val) => {
  form.roleIds = val  
}

defineExpose({
  showDialog
})
</script>
