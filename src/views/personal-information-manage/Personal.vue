<template>
  <div v-loading="loading" element-loading-text="保存中...">
    <el-form ref="mainForm" :model="form" :rules="formRule" label-position="right" label-width="120px" class="personal-form" label-suffix=":">
      <el-form-item label="账号" prop="account">
        <el-input v-model="form.account" />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="form.sex">
          <el-radio label="男">男</el-radio>
          <el-radio label="女">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="所在学校/单位">
        <div>{{ fullDepartmentName || '--' }}</div>
      </el-form-item>
      <!-- <el-form-item label="所在院系/部门" prop="departmentId">
        <SimpleSelect v-model="form.departmentId" key-words="BaseDepartment" :search-key="searchKey" @update-value="onSimpleSelectChange"  />
      </el-form-item> -->
      <el-form-item label="身份类型">
        <div>{{ form.jobName || '--' }}</div>
      </el-form-item>
      <el-form-item label="身份证号">
        <el-input v-model="form.idCard" />
      </el-form-item>
      <el-form-item label="电子邮箱">
        <el-input v-model="form.email" />
      </el-form-item>
      <el-form-item label="联系地址">
        <el-input v-model="form.address" />
      </el-form-item>
      <el-form-item label="邮政编码">
        <el-input v-model="form.postalCode" />
      </el-form-item>
    </el-form>
    <div class="button-group">
      <!-- <el-button size="small" plain round @click="$router.go(-1)">
        返 回
      </el-button> -->
      <el-button size="small" type="primary" round :loading="loading" @click="handleSave()">
        保 存
      </el-button>
    </div>    
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import UserAPI from '@/api/user'
import treeAPI from '@/api/tree'
import SimpleSelect from '@/components/SimpleSelect.vue'

const store = useStore()

// 响应式数据
const mainForm = ref(null)
const loading = ref(false)
const editable = ref(false)

const userInfo = computed(() => store.getters.userInfo)
const userId = computed(() => userInfo.value?.id)

// 初始化表单数据
const initialFormData = store.getters.userInfo || {}
const form = reactive(JSON.parse(JSON.stringify(initialFormData)))

// 完整部门路径（从根节点到当前节点）
const fullDepartmentName = ref(form.departmentName || '')

async function loadFullDepartmentPath() {
  const deptId = form.departmentId
  if (!deptId) return
  try {
    const res = await treeAPI.getAllParentIndex('BaseDepartment', deptId)
    if (res.data && res.data.length > 0) {
      // res.data 从当前节点到根节点排列，需要反转后拼接
      const names = res.data.map(item => item.name).reverse()
      fullDepartmentName.value = names.join(' / ')
    }
  } catch (e) {
    console.error('加载部门完整路径失败:', e)
  }
}

onMounted(() => { loadFullDepartmentPath() })

const formRule = reactive({
  account: [{ required: true, trigger: 'blur', message: '请输入登录账号' }],
  name: [{ required: true, trigger: 'blur', message: '请输入用户姓名' }],
  departmentId: [{ required: true, trigger: 'blur', message: '部门不能为空' }]
})

const searchKey = computed(() => {
  return { parentId: form.departmentId, theLevel: 2 }
})

// 方法
function onSimpleSelectChange(val, field, options) {
  form.departmentId = val
}

// 保存个人信息
async function handleSave() {
  if (!mainForm.value) return
  
  await mainForm.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      // 信息保存
      try {
        const obj = JSON.parse(JSON.stringify(form))
        await UserAPI.editUserInfo(userId.value, obj)
        await store.dispatch('user/updateUserInfo', obj)
        ElMessage.success('保存成功！')
        loading.value = false
      } catch (error) {
        loading.value = false
      }
    }
  })
}
</script>

<style lang="scss" scoped>
@import "@/assets/css/element-variables.scss";
.el-form {
  width: fit-content;
  margin-left: 12%;
}
.personal-form {
  &:deep(.el-form-item__label) {
    color: #000;
  }
  &:deep(.el-form-item__content) {
    margin-left: 0 !important;
  }
}
input {
  outline: none;
}
.svg-icon {
  cursor: pointer;
  margin-left: 50px;
  color: #1890ff;
  &:hover {
    color: $--color-primary;
  }
}
.button-group {
  margin-left: 36%;
  margin-bottom: 40px;
}
</style>
