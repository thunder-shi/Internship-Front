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

// 设置表格高度
const doResize = (el, binding) => {
  // 获取 el-table 元素（指令直接绑定在 el-table 上）
  // Element Plus 的 el-table 渲染后会有一个 .el-table 的包装元素
  let tableEl = el
  if (!el.classList?.contains('el-table')) {
    // 如果当前元素不是 el-table，尝试查找
    tableEl = el.querySelector('.el-table') || el.closest('.el-table') || el
  }
  
  if (!tableEl) {
    console.warn('v-adaptive: 无法找到 el-table 元素')
    return
  }
  
  // 移除之前的检查，即使设置了 height 属性也应该重新计算（用于响应式调整）
  // 只有在 height 属性明确设置为非百分比时才跳过
  
  // 获取调用传递过来的数据
  const { value } = binding

  // 获取距底部距离（用于展示页码等信息）
  const bottomOffset = (value && value.bottomOffset) || 20
  const minHeight = 82
  const pageHeight = (value && value.noPage) ? 0 : getOffsetH('vpage-footer') // 分页高度

  // 计算列表高度
  const rect = tableEl.getBoundingClientRect()
  const totalHeight = window.innerHeight - rect.top - bottomOffset - pageHeight
  const height = totalHeight < minHeight ? minHeight : totalHeight

  // 直接设置表格的高度
  // Element Plus 的表格需要设置高度到 .el-table__body-wrapper
  const bodyWrapper = tableEl.querySelector('.el-table__body-wrapper')
  const headerWrapper = tableEl.querySelector('.el-table__header-wrapper')
  
  if (bodyWrapper) {
    const headerHeight = headerWrapper ? headerWrapper.offsetHeight : 0
    const bodyHeight = height - headerHeight - 2 // 减去边框等
    
    if (bodyHeight > 0) {
      // 设置表格整体高度
      tableEl.style.height = `${height}px`
      // 设置表格内容区域高度
      bodyWrapper.style.height = `${bodyHeight}px`
      // 触发表格重新布局
      const tableInstance = tableEl.__vueParentComponent?.ctx || tableEl.__vueParentInstance?.ctx
      if (tableInstance?.doLayout) {
        tableInstance.doLayout()
      }
    }
  } else {
    // 如果找不到 body-wrapper，直接设置表格高度
    tableEl.style.height = `${height}px`
  }
}

// 获取页面元素的 offsetHeight
const getOffsetH = (id) => {
  const element = document.getElementById(id)
  return element ? element.offsetHeight : 0
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
    setTimeout(() => {
      doResize(el, binding)
    }, 100)
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

