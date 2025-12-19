// 权限指令定义
// 使用方式：v-permission="'权限名称'" 或 v-permission="['权限1', '权限2']"
const permission = {
  // Vue 3 指令钩子
  beforeMount(el, binding) {
    // 在元素挂载前处理权限逻辑
    checkPermission(el, binding)
  },
  mounted(el, binding) {
    // 元素挂载后再次检查（确保 DOM 已渲染）
    checkPermission(el, binding)
  },
  updated(el, binding) {
    // 组件更新时重新检查权限
    checkPermission(el, binding)
  }
}

// 检查权限的函数
const checkPermission = (el, binding) => {
  // 这里可以根据实际的权限系统实现权限检查逻辑
  // 示例：如果用户没有权限，则隐藏或禁用元素
  const { value } = binding
  if (value !== undefined && value !== null) {
    // 根据权限值决定是否显示元素
    // 如果权限检查失败，隐藏元素
    if (!hasPermission(value)) {
      el.style.display = 'none'
      // 或者完全移除元素
      // el.parentNode && el.parentNode.removeChild(el)
    } else {
      el.style.display = ''
    }
  }
}

// 权限检查函数（需要根据实际权限系统实现）
const hasPermission = (permissionValue) => {
  // 这里应该根据实际的权限系统来实现
  // 示例：从 store 或 API 检查用户是否有该权限
  // return store.getters.permissions?.includes(permissionValue)
  return true // 默认返回 true，实际使用时需要实现真实的权限检查逻辑
}

// Vue 3 插件安装函数
const install = (app) => {
  app.directive('permission', permission)
}

export default {
  ...permission,
  install
}
