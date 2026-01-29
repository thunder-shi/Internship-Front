import { nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import listAPI from '@/api/list'
import treeAPI from '@/api/tree'

export default {
  commonSubmitDlg,
  commonSubmitTreeDlg
}

// 保存列表或树结构的表单
async function commonSubmitDlg(formPanel, formData, keyWords, option, isTree, isAudit, userId) {
  var resInfo

  // 根据 formData 是否有 id 来判断是新增还是修改（优先级高于 option 参数）
  var op = ''
  if (formData && formData.id != null && formData.id !== 0) {
    // 有 id 说明是修改
    op = '修改'
  } else {
    // 没有 id 或其他情况，根据 option 参数判断
    switch (option) {
      case 'append': op = '新增'
        break
      case 'edit': op = '修改'
        break
      case 'audit': op = '审核'
        break
      case 'submit': op = '提交'
        break
    }
  }

  if (await formPanel.validate()) {
    // const params = filterLastId(formData)
    const params = formData
    if (!isAudit) {
      if (isTree) {
        resInfo = await treeAPI.editOneNode(keyWords, params)
      } else {
        resInfo = await listAPI.editOneNode(keyWords, params)
      }
    } else {
      params.auditUserId = userId
      params.auditTime = new Date()
      resInfo = await listAPI.editOneNode(keyWords, params)
    }
    if (resInfo.message === 'successful') {
      ElMessage.success(`${op}成功！`)
    } else {
      ElMessage.warning(resInfo.message)
    }
  }
  return resInfo
}

function filterLastId(data) {
  // 遍历data，如果data中含有数组并且key不是复数形式就取数组的最后一级id
  // 注意：此函数会直接修改传入的对象，如果需要避免副作用，应该先深拷贝
  Object.keys(data).forEach(key => {
    if (data[key] instanceof Array) {
      // 从单词的最后一个字母是否为 s 判断该单词是否为复数（后端必须规范命名）
      // isArrayOfIds 判断是否是 id 的集合（树结构需要排除childList）
      const isArrayOfIds = !(key.substring(key.length - 1) === 's') && (key !== 'childList')
      if (isArrayOfIds) {
        const length = data[key].length
        // 如果数组不为空，取最后一个元素
        if (length > 0) {
          data[key] = data[key][length - 1]
        }
      }
    }
  })
  return data
}
// 保存树结构的表单
function commonSubmitTreeDlg(form, formData, keyWords, dialog, saveType = '') {
  // 将新增后的结点信息传回
  var resInfo = {
    successFlag: false,
    nodeInfo: {}
  }
  return new Promise(resolve => {
    form.validate(async valid => {
      if (valid) {
        try {
          const option = dialog.option === 'append' ? '新增' : '修改'
          const params = filterLastId(formData)
          var res = await treeAPI.editOneNode(keyWords, params)
          if (saveType === 'continue') {
            form.resetFields()
            resolve()
          } else {
            form.id = res.data.nodeInfo.id
            resInfo.successFlag = true
            resInfo.nodeInfo = res.data.nodeInfo
            dialog.show = false
          }
          ElMessage.success(`${option}成功！`)
          resolve(resInfo)
        } catch (error) {
          // axios 拦截器已经处理了错误提示，这里不需要重复显示
          // 错误处理：resolve Promise，但 successFlag 为 false
          resolve(resInfo) // 仍然 resolve，但 successFlag 为 false
        }
      }
    })
  })
}





const getComputedValue = (style, prop) => {
  const raw = style[prop] || '0px'
  if (raw.includes('%')) {
    const percent = Number(raw.replace('%', '')) / 100
    return prop === 'left'
      ? document.body.clientWidth * percent
      : document.body.clientHeight * percent
  }
  return Number(raw.replace('px', ''))
}

// Vue3 中解析 ref 或组件实例
const resolveInstance = (value) => {
  if (!value) return null
  // 如果是 ref 对象（有 value 属性）
  if (typeof value === 'object' && 'value' in value) {
    return value.value
  }
  // 如果是组件实例本身
  return value
}

const getDialogElements = (dialogInstance) => {
  // 解析实例（可能是 ref）
  const instance = resolveInstance(dialogInstance)
  if (!instance) return {}
  
  let dragDom = null
  
  // Vue3 + Element Plus 的 el-dialog 组件实例获取方式
  // 方法1: 在 Vue3 中，组件实例没有 $el，需要通过 ref 获取 DOM
  // Element Plus 的 dialog 组件会通过 ref 暴露 DOM 元素
  // 尝试通过组件实例的 ref 属性获取（如果直接传入的是 ref）
  if (instance && typeof instance === 'object') {
    // 如果实例本身就是一个 DOM 元素（直接传入 ref 的情况）
    if (instance instanceof HTMLElement) {
      if (instance.classList?.contains('el-dialog')) {
        dragDom = instance
      } else {
        dragDom = instance.querySelector?.('.el-dialog')
      }
    }
    // 尝试通过组件实例的内部属性获取（Element Plus 可能暴露的 ref）
    else if (instance.$el) {
      // Vue3 中某些情况下可能还有 $el（兼容处理）
      const wrapper = instance.$el
      if (wrapper.classList?.contains('el-dialog')) {
        dragDom = wrapper
      } else {
        dragDom = wrapper.querySelector?.('.el-dialog')
      }
    }
  }
  
  // 方法2: 在 body 中查找所有 .el-dialog，尝试找到对应的
  // 由于 append-to-body，对话框会被渲染到 body 下
  if (!dragDom) {
    const dialogs = document.querySelectorAll('.el-dialog')
    // 如果只有一个对话框，直接使用
    if (dialogs.length === 1) {
      dragDom = dialogs[0]
    } 
    // 如果有多个，尝试找到可见的那个（通常是最后打开的）
    else if (dialogs.length > 1) {
      // 查找可见的对话框
      for (let i = dialogs.length - 1; i >= 0; i--) {
        const dialog = dialogs[i]
        const style = window.getComputedStyle(dialog)
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          dragDom = dialog
          break
        }
      }
      // 如果没找到可见的，使用最后一个
      if (!dragDom) {
        dragDom = dialogs[dialogs.length - 1]
      }
    }
  }
  
  if (!dragDom) {
    return {}
  }
  
  const headerEl = dragDom.querySelector('.el-dialog__header')
  if (!headerEl) {
    return {}
  }
  
  return { dragDom, headerEl }
}

const attachDrag = (dialogInstance) => {
  const { dragDom, headerEl } = getDialogElements(dialogInstance)
  if (!dragDom || !headerEl) return null

  // 确保对话框使用 fixed 定位，这样才能拖拽
  const style = window.getComputedStyle(dragDom)
  if (style.position !== 'fixed' && style.position !== 'absolute') {
    dragDom.style.position = 'fixed'
  }

  // 初始化对话框位置：如果位置未设置或为 0，则居中显示
  const rect = dragDom.getBoundingClientRect()
  const currentLeft = parseFloat(style.left) || 0
  const currentTop = parseFloat(style.top) || 0
  const hasTransform = style.transform && style.transform !== 'none'
  const hasMarginAuto = style.marginLeft === 'auto' || style.marginRight === 'auto'
  
  // 如果位置是 0 或者使用了 transform/margin 居中，则计算居中位置
  // 或者如果当前实际位置在屏幕最左边（left < 10px），也重新居中
  if ((currentLeft === 0 && currentTop === 0) || hasTransform || hasMarginAuto || rect.left < 10) {
    const windowWidth = document.documentElement.clientWidth
    const windowHeight = document.documentElement.clientHeight
    
    // 计算居中位置（使用实际渲染后的尺寸）
    const centerLeft = (windowWidth - rect.width) / 2
    const centerTop = (windowHeight - rect.height) / 2
    
    dragDom.style.left = `${centerLeft}px`
    dragDom.style.top = `${centerTop}px`
    dragDom.style.margin = '0' // 清除 margin，使用绝对定位
    dragDom.style.transform = 'none' // 清除 transform
  }

  headerEl.style.cursor = 'move'

  const handleMouseDown = event => {
    // 阻止默认行为，防止选中文本
    event.preventDefault()
    
    // 获取对话框当前的位置（相对于视口）
    const dragRect = dragDom.getBoundingClientRect()
    
    // 计算鼠标相对于对话框的偏移量
    const disX = event.clientX - dragRect.left
    const disY = event.clientY - dragRect.top

    const handleMouseMove = moveEvent => {
      // 计算新位置：鼠标位置减去初始偏移量
      const newLeft = moveEvent.clientX - disX
      const newTop = moveEvent.clientY - disY
      
      // 限制在视口范围内（防止拖出屏幕）
      const maxLeft = document.documentElement.clientWidth - dragRect.width
      const maxTop = document.documentElement.clientHeight - dragRect.height
      
      const finalLeft = Math.max(0, Math.min(newLeft, maxLeft))
      const finalTop = Math.max(0, Math.min(newTop, maxTop))
      
      dragDom.style.left = `${finalLeft}px`
      dragDom.style.top = `${finalTop}px`
      dragDom.style.margin = '0' // 清除 margin，使用绝对定位
      dragDom.style.transform = 'none' // 清除可能的 transform
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  headerEl.addEventListener('mousedown', handleMouseDown)
  return () => {
    headerEl.removeEventListener('mousedown', handleMouseDown)
  }
}

const mountDirective = (el, binding) => {
  const instance = resolveInstance(binding.value)
  if (!instance) return
  
  // Vue3 + Element Plus: el-dialog 使用 v-model，对应 modelValue
  // 尝试获取对话框可见性状态
  const getVisible = () => {
    // Vue3 中，组件实例可能通过 props 或 setup 暴露属性
    // Element Plus 的 dialog 使用 v-model，对应 modelValue
    if (instance && typeof instance === 'object') {
      // 如果实例有 modelValue 属性（Vue3 的 v-model）
      if ('modelValue' in instance) {
        const modelValue = resolveInstance(instance.modelValue)
        return modelValue === true
      }
      // 兼容处理：某些情况下可能使用 visible
      if ('visible' in instance) {
        const visible = resolveInstance(instance.visible)
        return visible === true
      }
    }
    
    // 尝试通过 DOM 判断
    const { dragDom } = getDialogElements(instance)
    if (dragDom) {
      const style = window.getComputedStyle(dragDom)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }
    return false
  }
  
  const setup = () => {
    // 使用轮询方式等待对话框出现（最多尝试 10 次，每次 100ms）
    let attempts = 0
    const maxAttempts = 10
    
    const trySetup = () => {
      attempts++
      cleanupEvents(el)
      const cleanup = attachDrag(instance)
      if (cleanup) {
        el.__dialogDragCleanup__ = cleanup
      } else if (attempts < maxAttempts) {
        // 如果失败且未达到最大尝试次数，继续尝试
        setTimeout(trySetup, 100)
      }
    }
    
    // 立即尝试一次
    nextTick(() => {
      nextTick(() => {
        trySetup()
      })
    })
  }
  
  // Vue3 中监听可见性变化
  // Element Plus 的 dialog 使用 v-model，对应 modelValue
  let visibleRef = null
  if (instance && typeof instance === 'object') {
    visibleRef = instance.modelValue || instance.visible
  }
  
  if (visibleRef && typeof visibleRef === 'object' && 'value' in visibleRef) {
    // 如果是响应式 ref，使用 watch 监听
    const stopWatch = watch(
      () => visibleRef.value,
      (visible) => {
        if (visible) {
          // 对话框打开时，延迟一点再绑定拖拽
          setTimeout(() => { setup(); }, 150)
        } else {
          cleanupEvents(el)
        }
      },
      { immediate: true }
    )
    el.__dialogDragStopWatch__ = stopWatch
  } else {
    // 如果没有响应式的 visible，使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(() => {
      if (getVisible()) {
        setup()
      } else {
        cleanupEvents(el)
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    el.__dialogDragObserver__ = observer
    
    // 初始设置
    setTimeout(() => {
      if (getVisible()) {
        setup()
      }
    }, 150)
  }
}

const cleanupEvents = el => {
  if (typeof el.__dialogDragCleanup__ === 'function') {
    el.__dialogDragCleanup__()
    delete el.__dialogDragCleanup__
  }
}

const cleanupDirective = el => {
  cleanupEvents(el)
  if (typeof el.__dialogDragStopWatch__ === 'function') {
    el.__dialogDragStopWatch__()
    delete el.__dialogDragStopWatch__
  }
  if (el.__dialogDragObserver__) {
    el.__dialogDragObserver__.disconnect()
    delete el.__dialogDragObserver__
  }
}

const dialogDragDirective = {
  mounted(el, binding) {
    mountDirective(el, binding)
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      cleanupDirective(el)
      mountDirective(el, binding)
    }
  },
  unmounted(el) {
    cleanupDirective(el)
  }
}

export function registerDialogDrag(app) {
  app.directive('dialogDrag', dialogDragDirective)
}

// 导出指令供直接使用（如果需要）
export { dialogDragDirective }
