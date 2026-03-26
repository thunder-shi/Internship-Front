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
    if (isTree) {
      resInfo = await treeAPI.editOneNode(keyWords, params)
    } else {
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

// 从 binding.value 中提取 ref 和 uid（兼容旧格式和新格式）
const parseBindingValue = (bindingValue) => {
  if (!bindingValue) return { instance: null, uid: null }
  // 新格式: { ref, uid }（有 ref 和 uid 两个字段）
  if (typeof bindingValue === 'object' && 'ref' in bindingValue && 'uid' in bindingValue) {
    return { instance: resolveInstance(bindingValue.ref), uid: bindingValue.uid }
  }
  // 旧格式: 直接是 ref
  return { instance: resolveInstance(bindingValue), uid: null }
}

const getDialogElements = (dialogInstance, uid) => {
  const instance = resolveInstance(dialogInstance)
  if (!instance) return {}

  let dragDom = null

  // 最优先：通过 uid class 精确查找（每个 DlgBasic 实例有唯一标识）
  if (uid) {
    dragDom = document.querySelector(`.dlg-uid-${uid}`)
  }

  // 方法1: Element Plus el-dialog 暴露 dialogContentRef
  if (!dragDom && instance && typeof instance === 'object') {
    const contentRef = resolveInstance(instance.dialogContentRef)
    if (contentRef?.$el) {
      const contentEl = contentRef.$el
      if (contentEl.classList?.contains('el-dialog')) {
        dragDom = contentEl
      } else {
        dragDom = contentEl.closest?.('.el-dialog') || contentEl.querySelector?.('.el-dialog')
      }
    }

    if (!dragDom && instance instanceof HTMLElement) {
      if (instance.classList?.contains('el-dialog')) {
        dragDom = instance
      } else {
        dragDom = instance.querySelector?.('.el-dialog')
      }
    }
    if (!dragDom && instance.$el) {
      const wrapper = instance.$el
      if (wrapper instanceof HTMLElement) {
        if (wrapper.classList?.contains('el-dialog')) {
          dragDom = wrapper
        } else {
          dragDom = wrapper.querySelector?.('.el-dialog')
        }
      }
    }
  }

  // 方法2: 通过 overlay wrapper 查找
  if (!dragDom && instance && typeof instance === 'object') {
    const overlayRef = resolveInstance(instance.dialogRef)
    if (overlayRef instanceof HTMLElement) {
      dragDom = overlayRef.querySelector?.('.el-dialog')
    }
  }

  // 方法3: 在 body 中查找（最后手段）
  if (!dragDom) {
    const dialogs = document.querySelectorAll('.el-dialog')
    if (dialogs.length === 1) {
      dragDom = dialogs[0]
    } else if (dialogs.length > 1) {
      for (let i = dialogs.length - 1; i >= 0; i--) {
        const dialog = dialogs[i]
        const style = window.getComputedStyle(dialog)
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          dragDom = dialog
          break
        }
      }
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

const attachDrag = (dialogInstance, uid) => {
  const { dragDom, headerEl } = getDialogElements(dialogInstance, uid)
  if (!dragDom || !headerEl) return null

  // 确保对话框使用 fixed 定位，这样才能拖拽
  const style = window.getComputedStyle(dragDom)
  if (style.position !== 'fixed' && style.position !== 'absolute') {
    dragDom.style.position = 'fixed'
  }

  // 初始化对话框位置
  const rect = dragDom.getBoundingClientRect()
  const windowWidth = document.documentElement.clientWidth
  const windowHeight = document.documentElement.clientHeight

  const isFullScreen =
    dragDom.classList.contains('is-fullscreen') ||
    Math.abs(rect.width - windowWidth) <= 1

  if (isFullScreen) {
    // 全屏对话框固定在左上角且不支持拖拽
    dragDom.style.left = '0px'
    dragDom.style.top = '0px'
    dragDom.style.margin = '0'
    dragDom.style.transform = 'none'
    headerEl.style.cursor = 'default'
    return null
  }

  // 非全屏对话框始终居中，避免继承前一个对话框的位置
  const centerLeft = Math.max(0, (windowWidth - rect.width) / 2)
  const centerTop = Math.max(0, (windowHeight - rect.height) / 2)

  dragDom.style.left = `${centerLeft}px`
  dragDom.style.top = `${centerTop}px`
  dragDom.style.margin = '0'
  dragDom.style.transform = 'none'

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
      
      // 限制拖拽范围：至少保留 40px header 可见，防止拖丢
      const minLeft = -(dragRect.width - 100)
      const maxLeft = document.documentElement.clientWidth - 100
      const minTop = 0
      const maxTop = document.documentElement.clientHeight - 40

      const finalLeft = Math.max(minLeft, Math.min(newLeft, maxLeft))
      const finalTop = Math.max(minTop, Math.min(newTop, maxTop))
      
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
  const { instance, uid } = parseBindingValue(binding.value)
  if (!instance) return

  // 保存 uid 到 el 上，供 getVisible 使用
  el.__dialogDragUid__ = uid

  const getVisible = () => {
    if (instance && typeof instance === 'object') {
      if ('modelValue' in instance) {
        const modelValue = resolveInstance(instance.modelValue)
        return modelValue === true
      }
      if ('visible' in instance) {
        const visible = resolveInstance(instance.visible)
        return visible === true
      }
    }

    const { dragDom } = getDialogElements(instance, uid)
    if (dragDom) {
      const style = window.getComputedStyle(dragDom)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }
    return false
  }

  const setup = () => {
    let attempts = 0
    const maxAttempts = 10

    const trySetup = () => {
      attempts++
      cleanupEvents(el)
      const cleanup = attachDrag(instance, uid)
      if (cleanup) {
        el.__dialogDragCleanup__ = cleanup
      } else if (attempts < maxAttempts) {
        setTimeout(trySetup, 100)
      }
    }

    nextTick(() => {
      nextTick(() => {
        trySetup()
      })
    })
  }

  let visibleRef = null
  if (instance && typeof instance === 'object') {
    visibleRef = instance.modelValue || instance.visible
  }

  if (visibleRef && typeof visibleRef === 'object' && 'value' in visibleRef) {
    const stopWatch = watch(
      () => visibleRef.value,
      (visible) => {
        if (visible) {
          setTimeout(() => { setup(); }, 150)
        } else {
          cleanupEvents(el)
        }
      },
      { immediate: true }
    )
    el.__dialogDragStopWatch__ = stopWatch
  } else {
    const observer = new MutationObserver(() => {
      if (getVisible()) {
        if (!el.__dialogDragCleanup__) {
          setup()
        }
      } else {
        cleanupEvents(el)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    el.__dialogDragObserver__ = observer

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
    // 比较实际的 ref 值，而不是外层对象引用（因为对象每次渲染都会新建）
    const { instance: newInst, uid: newUid } = parseBindingValue(binding.value)
    const { instance: oldInst, uid: oldUid } = parseBindingValue(binding.oldValue)
    if (newInst !== oldInst || newUid !== oldUid) {
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
