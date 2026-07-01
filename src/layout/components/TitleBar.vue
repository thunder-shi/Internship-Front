<template>
  <header id="title-bar" class="title-bar fixed-title-bar" :style="bgColor">
    <div class="headline">
      <img v-if="logo" :src="logo" />
      <h4>{{ title }}</h4>
    </div>
    <div class="right-menu">
      <div class="dashboard-picker">
        <svg-icon icon-class="axt-s-dashboard" />
        <theme-picker @change="themeChange" />
      </div>
      <el-dropdown trigger="click">
        <div class="title-user-name el-dropdown-link">
          <span>{{ userName }}，你好&nbsp;</span>
          <el-icon><ArrowDown /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu class="user-dropdown">
            <el-dropdown-item @click="personalInfo">
              <span>个人信息</span>
            </el-dropdown-item>
            <el-dropdown-item @click="updatePassword">
              <span>修改密码</span>
            </el-dropdown-item>
            <el-dropdown-item @click="logout">
              <span style="display: block">退出登录</span>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <DlgBasic ref="dlgPassword" :default-props="defaultDBProps" :dlgbasic-confirm="submit" @closeDialog="closeDialog">
      <template #mainForm>
        <el-form ref="formRef" :rules="rules" :model="form" size="small" label-suffix=":" label-width="100px">
          <!-- <el-form-item label="手机号">
            <span>{{ hidePhone(form.phone) }}</span>
            <BtnGetVerCode :phone="form.phone" type="text" style="margin-left: 20px" />
          </el-form-item> -->
          <!-- <el-form-item prop="verCode" label="验证码">
            <div style="display: flex">
              <el-input v-model="form.verCode" class="verCode-input" type="text" auto-complete="on" placeholder="请输入验证码" />
            </div>
          </el-form-item> -->
          <el-form-item prop="oldPassword" label="旧密码">
            <el-input v-model="form.oldPassword" type="password" placeholder="请输入旧密码" />
          </el-form-item>
          <el-form-item prop="password" label="新密码">
            <el-input v-model="form.password" type="password" placeholder="请输入新密码" />
          </el-form-item>
          <el-form-item prop="checkPass" label="确认新密码">
            <el-input v-model="form.checkPass" type="password" placeholder="请再次输入新密码" />
          </el-form-item>
        </el-form>
      </template>
    </DlgBasic>
  </header>
</template>
<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import defaultSettings from '@/utils/settings.js'
import DlgBasic from '@/components/DlgBasic.vue'
// import BtnGetVerCode from '@/components/BtnGetVerCode'
import ThemePicker from '@/components/theme-picker/Index.vue'
import userAPI from '@/api/user'
// import { checkIsEmpty, checkPassword } from '@/utils/formRules'
import logoImg from '@/assets/img/logo.png'

const emit = defineEmits(['bgColor', 'closeDialog'])

const store = useStore()
const router = useRouter()

const logo = logoImg
const title = ref('')

const storeUserInfo = computed(() => store.getters.userInfo || {})

const userInfo = reactive({ ...storeUserInfo.value })
watch(
  storeUserInfo,
  (val) => {
    Object.assign(userInfo, val || {})
  },
  { immediate: true, deep: true }
)

const form = reactive({
  phone: storeUserInfo.value.phone || '',
  verCode: '',
  oldPassword: '',
  password: '',
  checkPass: ''
})

watch(
  () => storeUserInfo.value.phone,
  (phone) => {
    form.phone = phone || ''
  }
)

const defaultDBProps = reactive({
  dlgTitle: '修改密码',
  width: '300px', // 或者使用百分比，如 '30%'
  footButtons: { repeatAdd: { show: false }},
  someFlags: {
    needValidate: false
  }
})

function requireField(message) {
  return {
    validator: (_rule, value, callback) => {
      if (value === undefined || value === null || String(value).trim() === '') {
        callback(new Error(message))
      } else {
        callback()
      }
    },
    trigger: ['blur', 'change'],
  }
}

const rules = reactive({
  oldPassword: [requireField('请输入旧密码')],
  password: [requireField('请输入新密码')],
  checkPass: [requireField('请再次输入新密码')],
})

const btnDisabled = ref(false)
// const btnValue = ref('获取验证码')
// const phoneFocus = ref(false)
// const verCodeFocus = ref(false)
// const passwordFocus = ref(false)
// const passwordsFocus = ref(false)

const bgColor = computed(() => ({
  backgroundColor: storeUserInfo.value.themeColor
}))

watch(
  () => storeUserInfo.value.themeColor,
  (color) => {
    if (color) {
      emit('bgColor', color)
    }
  },
  { immediate: true }
)

const userName = computed(() => storeUserInfo.value.name || '先生')

const hidePhone = (tel) => {
  if (!tel) return ''
  const reg = /(\d{3})\d{4}(\d{4})/
  return tel.replace(reg, '$1****$2')
}

const dlgPassword = ref(null)
const formRef = ref(null)

const getTitle = () => {
  title.value = defaultSettings.title
}

onMounted(() => {
  getTitle()
})

const themeChange = async (color) => {
  try {
    userInfo.themeColor = color
    await userAPI.editUserInfo(userInfo.id, { ...userInfo })
    await store.dispatch('user/updateUserInfo', { ...userInfo })
    document.body.style.setProperty('--color-primary', color)
  } catch (error) {
    // 错误已经在 request 拦截器中显示，这里只需要回滚主题色
    console.error('Failed to update theme color:', error)
    // 如果更新失败，可以回滚主题色
    userInfo.themeColor = storeUserInfo.value.themeColor || '#009140'
  }
}

const toggleSideBar = () => {
  store.dispatch('app/toggleSideBar')
}

const personalInfo = () => {
  router.push('/personal-information-manage/Personal')
}

const updatePassword = () => {
  form.oldPassword = ''
  form.password = ''
  form.checkPass = ''
  dlgPassword.value?.showDialog(true, form)
  nextTick(() => formRef.value?.clearValidate())
}

const logout = async () => {
  try {
    await store.dispatch('user/logout')
    router.push('/Login')
  } catch (error) {
    // 即使退出登录失败，也跳转到登录页（错误已经在 store 中处理）
    console.error('Logout error:', error)
    router.push('/Login')
  }
}

const submit = async () => {
  if (!formRef.value) return false
  try {
    await formRef.value.validate()
  } catch {
    return false
  }
  try {
    await userAPI.editPassword(store.getters.userInfo.id, form.oldPassword, form.password, false)
    ElMessage.success('修改成功！')
    formRef.value.resetFields()
    dlgPassword.value?.showDialog(false)
  } catch {
    return false
  }
}

const closeDialog = (data) => {
  emit('closeDialog', data)
}
</script>

<style lang="scss" scoped>
@use "@/assets/css/variables.module.scss" as *;
.title-bar {
  width: 100%;
  height: $titleBarHeight;
  display: flex;
  justify-content: space-between;
  .headline {
    img {
      width: 35px;
      height: 35px;
      padding-right: 15px;
    }
    span {
      margin-left: 10px;
    }
    display: flex;
    align-items: center;
    letter-spacing: 1px;
    font-size: 16px;
    color: $headlineColor;
    margin-left: 1em;
  }
  .right-menu {
    display: flex;
    justify-content: space-between;
    align-items: center;
    .el-avatar :deep(img) {
      width: 100%;
    }
    .el-avatar + .el-dropdown {
      margin-left: 15px;
    }
    margin-right: 1em;
    .el-dropdown {
      cursor: pointer;
    }
  }
  .title-user-name {
    color: $headlineColor;
  }
}
// .fixed-title-bar {
//   position: fixed;
//   top: 0;
//   // z-index: 999;
// }
.dashboard-picker {
  position: relative;
  width: 30px;
  margin-right: 20px;
  height: $titleBarHeight;
  display: flex;
  align-items: center;
  justify-content: center;
  :deep(.theme-picker) {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    opacity: 0;
    cursor: pointer;
  }
  .axt-s-dashboard {
    color: #fff;
    font-size: 26px;
    pointer-events: none;
  }
}
</style>

