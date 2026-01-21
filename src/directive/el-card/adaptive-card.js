import { nextTick } from 'vue'

// 防抖函数
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 设置卡片高度
const doResize = (el, binding) => {
  // 获取 el-card 元素（指令直接绑定在 el-card 上）
  let cardEl = el
  if (!el.classList?.contains('el-card')) {
    // 如果当前元素不是 el-card，尝试查找
    cardEl = el.querySelector('.el-card') || el.closest('.el-card') || el
  }
  
  if (!cardEl) {
    console.warn('v-adaptive-card: 无法找到 el-card 元素')
    return
  }
  
  // 获取调用传递过来的数据
  const { value } = binding

  // 获取距底部距离（用于展示页码等信息）
  const bottomOffset = (value && value.bottomOffset) || 19
  const minHeight = 231

  // 计算卡片高度并设置
  const rect = cardEl.getBoundingClientRect()
  const totalHeight = window.innerHeight - rect.top - bottomOffset
  const height = totalHeight < minHeight ? minHeight : totalHeight

  cardEl.style.height = `${height}px`
  cardEl.style.transition = 'unset'
}

export default {
  // 初始化设置 - Vue 3 使用 beforeMount
  beforeMount(el, binding) {
    // 创建防抖的 resize 监听方法（优化性能，避免频繁触发）
    el.resizeListener = debounce(() => {
      doResize(el, binding)
    }, 100)
    
    // 绑定监听方法到window resize事件
    window.addEventListener('resize', el.resizeListener, { passive: true })
  },
  // 组件更新时调用 - Vue 3 使用 updated
  updated(el, binding) {
    // 延迟执行，确保 DOM 已更新
    nextTick(() => {
      doResize(el, binding)
    })
  },
  // 元素插入到DOM后调用 - Vue 3 使用 mounted
  mounted(el, binding) {
    // 延迟执行，确保组件实例已挂载
    setTimeout(() => { doResize(el, binding); }, 100)
  },
  // 组件卸载时调用 - Vue 3 使用 unmounted
  unmounted(el) {
    // 移除resize监听
    if (el.resizeListener) {
      window.removeEventListener('resize', el.resizeListener)
      delete el.resizeListener
    }
  }
}

