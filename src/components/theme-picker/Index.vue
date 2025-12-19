<template>
  <el-color-picker
    v-model="theme"
    :predefine="predefineColors"
    class="theme-picker"
    popper-class="theme-picker-dropdown"
    @change="updatePrimaryColor"
  />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useStore } from 'vuex'
import Cookies from 'js-cookie'

const emit = defineEmits(['change'])

const store = useStore()

const predefineColors = [
  '#009140',
  '#1890ff',
  '#304156',
  '#212121',
  '#11a983',
  '#13c2c2',
  '#6959CD',
  '#f5222d'
]

const storeThemeColor = computed(() => store.getters.userInfo?.themeColor || '#409EFF')
const theme = ref(storeThemeColor.value)

watch(storeThemeColor, (color) => {
  if (color && color !== theme.value) {
    theme.value = color
  }
})

const applyCssVars = (color) => {
  const root = document.documentElement
  root.style.setProperty('--el-color-primary', color)
  root.style.setProperty('--el-color-primary-light-3', `${color}26`)
  root.style.setProperty('--color-primary', color)
}

const updatePrimaryColor = (val) => {
  if (!val) return
  Cookies.set('theme', val, { expires: 365 })
  applyCssVars(val)
  emit('change', val)
}

watch(theme, (val, oldVal) => {
  if (val && val !== oldVal) {
    updatePrimaryColor(val)
  }
})

onMounted(() => {
  if (theme.value) {
    applyCssVars(theme.value)
  }
})
</script>

<style>
.theme-message,
.theme-picker-dropdown {
  z-index: 99999 !important;
}

.theme-picker {
  display: inline-block;
  width: 30px;
  height: 30px;
}

.theme-picker .el-color-picker__trigger {
  height: 100% !important;
  width: 100% !important;
  padding: 0;
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  opacity: 0;
}

.theme-picker .el-color-picker__icon {
  display: none;
}

.theme-picker-dropdown .el-color-dropdown__link-btn {
  display: none;
}
</style>

