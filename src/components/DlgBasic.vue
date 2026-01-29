<template>
  <div class="dlg-drag-wrapper" v-dialogDrag="dialogRef">
    <el-dialog ref="dialogRef" append-to-body v-model="dialogShow" :close-on-click-modal="false" :close-on-press-escape="false" :modal-append-to-body="false" :class="autoMax ? 'view-dialog' : ''" :fullscreen="autoMax" :before-close="beforeCloseDlg" :width="width" :height="height" @opened="openFun" @close="closeDlg">
      <template #title>
        <span>{{ dlgTitle + dlgSuffix }}</span>
        <svg-icon v-if="needMaxBtn" class="fullscreen" icon-class="fullscreen" @click="clickFull" />
      </template>
      <slot name="mainForm">默认值</slot>
      <template v-if="!noFooter" #footer>
        <div class="dialog-footer">
          <slot name="otherBtn" />
          <el-button v-if="buttonProps.cancel.show" :type="buttonProps.cancel.type" @click="beforeCloseDlg">{{ buttonProps.cancel.name }}</el-button>
          <el-button v-if="buttonProps.close.show" :type="buttonProps.close.type" @click="beforeCloseDlg">{{ buttonProps.close.name }}</el-button>
          <el-button v-if="buttonProps.confirm.show" :disabled="needValidate && validate" :type="buttonProps.confirm.type" :loading="buttonLoading.confirm" @click.prevent="onConfirm">{{ buttonProps.confirm.name }}</el-button>
          <el-button v-if="buttonProps.last.show" :type="buttonProps.last.type" :loading="buttonLoading.last" @click.prevent="onModalLast">{{ buttonProps.last.name }}</el-button>
          <el-button v-if="buttonProps.next.show" :type="buttonProps.next.type" :loading="buttonLoading.next" @click.prevent="onModalNext">{{ buttonProps.next.name }}</el-button>
          <el-button v-if="buttonProps.finish.show" :type="buttonProps.finish.type"  :loading="buttonLoading.finish" @click="beforeCloseDlg">{{ buttonProps.finish.name }}</el-button>
          <el-button v-if="buttonProps.submit.show" :disabled="needValidate && validate" :type="buttonProps.submit.type" :loading="buttonLoading.submit" @click.prevent="onModalSubmit">{{ buttonProps.submit.name }}</el-button>
          <el-button v-if="buttonProps.repeatAdd.show && option === 'append'" :disabled="needValidate && validate" :type="buttonProps.repeatAdd.type"  :loading="buttonLoading.repeatAdd" @click.prevent="onModalRepeatAdd">{{ buttonProps.repeatAdd.name }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
<script setup>
import { computed, reactive, ref, h } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { WarningFilled } from '@element-plus/icons-vue'
import { arrangeButton } from '@/utils/common'
import _ from 'lodash'

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => ({
      form: {},                            // 表单数据对象
      width: '40%',                        // 弹窗宽度，支持百分比或像素
      height: '',                          // 弹窗高度，默认自适应
      dlgTitle: '',                        // 弹窗标题
      dlgSuffix: '',                       // 弹窗标题后缀
      footButtons: {},                     // 底部按钮配置
      someFlags: {                         // 一些功能性标志
        noFooter: false,                   // 是否不显示底部footer
        autoMax: false,                    // 是否自动最大化
        needMaxBtn: false,                 // 是否需要全屏按钮
        needValidate: true,                // 是否需要表单校验
        validate: true,                    // 校验状态（可作为禁用按钮依据）
        needVerifyUpdate: true             // 是否需要验证数据是否变更
      }
    })
  },
  dlgbasicSpecConfirm: { type: Function, default: null },
  dlgbasicConfirm: { type: Function, default: null },
  dlgbasicRepeatAdd: { type: Function, default: null },
  dlgbasicSpecSubmit: { type: Function, default: null },
  dlgbasicSubmit: { type: Function, default: null }
})

const emit = defineEmits(['open-dialog', 'close-dialog', 'last-step', 'next-step', 'resize-dialog'])

const dialogRef = ref(null)
const form = ref({})
const dialogShow = ref(false)
const currentSave = ref(false)
const validate = ref(true)
const buttonLoading = reactive({ confirm: false, submit: false, repeatAdd: false, last: false, next: false, finish: false })
const oldData = ref({})
const type = ref('')
const currentOption = ref(null) // 用于存储当前的操作类型（append/edit）

// Vue 3 中不再需要通过 proxy 访问全局方法

const dlgTitle = computed(() => {
  if (props.defaultProps.dlgTitle) {
    return props.defaultProps.dlgTitle
  }
  // 优先根据 option 判断
  const currentOpt = option.value
  if (currentOpt === 'edit') {
    return '编辑/查看'
  }
  if (currentOpt === 'append') {
    return '新增'
  }
  // 如果没有明确的 option，则根据 form.value.id 判断
  if (Object.prototype.hasOwnProperty.call(form.value, 'id') && form.value.id != null && form.value.id !== 0) {
    return '编辑/查看'
  }
  return '新增'
})
const option = computed(() => {
  // 优先使用明确传入的 option
  if (currentOption.value) {
    return currentOption.value
  }
  // 其次使用 props 中的 option
  if (props.defaultProps.option) {
    return props.defaultProps.option
  }
  // 最后根据 form.value.id 判断
  if (Object.prototype.hasOwnProperty.call(form.value, 'id') && form.value.id != null && form.value.id !== 0) {
    return 'edit'
  }
  return 'append'
})
const width = computed(() => (props.defaultProps.width ? props.defaultProps.width : '40%'))
const height = computed(() => (props.defaultProps.height ? props.defaultProps.height : ''))
const dlgSuffix = computed(() => (props.defaultProps.dlgSuffix ? props.defaultProps.dlgSuffix : ''))
const footButtons = computed(() => (props.defaultProps.footButtons ? props.defaultProps.footButtons : {}))
const buttonProps = computed(() => {
  const btn = {
    cancel: { show: true, name: '取 消', type: '' },
    close: { show: false, name: '关 闭', type: 'info' },
    confirm: { show: true, name: '保 存', type: 'primary' },
    submit: { show: false, name: '提 交', type: 'success' },
    last: { show: false, name: '上一步', type: 'primary' },
    next: { show: false, name: '下一步', type: 'success' },
    finish: { show: false, name: '完成', type: 'danger' },
    repeatAdd: { show: true, name: '继续添加', type: 'warning' }
  }
  return arrangeButton(footButtons.value, btn)
})
const noFooter = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'noFooter')) {
      return props.defaultProps.someFlags.noFooter
    }
  }
  return false
})
const autoMax = computed({
  get() {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
      if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'autoMax')) {
        return props.defaultProps.someFlags.autoMax
      }
    }
    return false
  },
  set(val) {
    if (props.defaultProps.someFlags) {
      props.defaultProps.someFlags.autoMax = val
    }
  }
})
const needMaxBtn = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'needMaxBtn')) {
      return props.defaultProps.someFlags.needMaxBtn
    }
  }
  return false
})
const needValidate = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'needValidate')) {
      return props.defaultProps.someFlags.needValidate
    }
  }
  return true
})
const autoSaveClose = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'autoSaveClose')) {
      return props.defaultProps.someFlags.autoSaveClose
    }
  }
  return true
})
const needVerifyUpdate = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'needVerifyUpdate')) {
      return props.defaultProps.someFlags.needVerifyUpdate
    }
  }
  return true
})

const cloneOldData = () => {
  // 深拷贝 form.value 来保存初始数据，用于后续比较数据是否有变化
  // 注意：form.value 现在可能是 SimpleDialog 的 form 的引用（reactive 对象）
  // 使用 toRaw 来获取原始对象，避免 reactive 对象的问题
  oldData.value = _.cloneDeep(form.value)
}

const showDialog = (val, newForm = {}, optionParam = null) => {
  // 直接赋值，保持对原始对象的引用（这样 DlgBasic 的 form.value.id 能正确反映 SimpleDialog 的 form.id）
  // 注意：这里不深拷贝，因为 DlgBasic 只需要读取 id 来判断标题和按钮，不需要修改表单数据
  form.value = newForm
  // 如果传入了明确的 option 参数，则使用它；否则清除，让 computed 属性根据 form.value.id 自动判断
  if (optionParam) {
    currentOption.value = optionParam
  } else {
    currentOption.value = null
  }
  if (val) {
    currentSave.value = false
  }
  dialogShow.value = val
}

const openFun = () => {
  cloneOldData()
  emit('open-dialog', form.value)
}

const _onConfirm = async () => {
  // 总是调用 dlgbasicConfirm，让 SimpleDialog 的 confirm 函数处理保存逻辑
  // SimpleDialog 的 confirm 函数会调用 commonSubmitDlg，它会进行表单验证
  currentSave.value = true
  if (props.dlgbasicConfirm && typeof props.dlgbasicConfirm === 'function') {
    type.value = 'stop'
    const result = await props.dlgbasicConfirm(option.value, type.value)
    // 如果返回 false，表示用户取消了操作，不关闭对话框
    if (result === false) {
      return;
    }
  }
  if (autoSaveClose.value && type.value === 'stop') {
    dialogShow.value = false
  }
}

const onConfirm = async () => {
  buttonLoading.confirm = true
  try {
    if (!(props.dlgbasicSpecConfirm && typeof props.dlgbasicSpecConfirm === 'function')) {
      await _onConfirm()
    } else {
      type.value = 'stop'
      await props.dlgbasicSpecConfirm(option.value, type.value)
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    // 如果是验证错误（已在 confirm 函数中显示警告），不显示通用错误消息
    if (error.message && error.message.startsWith('缺少')) {
      console.log('验证未通过:', error.message)
    } else {
      console.error('保存操作失败:', error)
    }
  } finally {
    buttonLoading.confirm = false
  }
}

const _onModalRepeatAdd = async () => {
  if (JSON.stringify(oldData.value) !== JSON.stringify(form.value)) {
    currentSave.value = true
    if (props.dlgbasicConfirm && typeof props.dlgbasicConfirm === 'function') {
      type.value = 'continue'
      await props.dlgbasicConfirm(option.value, type.value)
    }
  } else {
    ElMessage.warning('尚未填写任何内容，无法新增！')
  }
}

const onModalRepeatAdd = async () => {
  buttonLoading.repeatAdd = true
  if (props.dlgbasicRepeatAdd && typeof props.dlgbasicRepeatAdd === 'function') {
    await props.dlgbasicRepeatAdd()
  } else {
    await _onModalRepeatAdd()
  }
  buttonLoading.repeatAdd = false
}

const onModalSubmit = async () => {
  buttonLoading.submit = true
  if (props.dlgbasicSpecSubmit && typeof props.dlgbasicSpecSubmit === 'function') {
    try {
      await props.dlgbasicSpecSubmit()
    } catch (error) {
      // axios 拦截器已经处理了错误提示，这里不需要重复显示
      // 如果是验证错误，不显示通用错误消息
      if (error.message && error.message.startsWith('缺少')) {
        console.log('验证未通过:', error.message)
      } else {
        console.error('提交操作失败:', error)
      }
    } finally {
      buttonLoading.submit = false
    }
  } else {
    ElMessageBox.confirm(
      '提交以后不能修改，确定提交吗？',
      '注意',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        icon: h(WarningFilled, { style: { color: '#E6A23C' } }),
        distinguishCancelAndClose: true
      }
    )
      .then(async () => {
        currentSave.value = true
        await props.dlgbasicSubmit()
        buttonLoading.submit = false
      })
      .catch(() => {
        buttonLoading.submit = false
      })
  }
}

const beforeCloseDlg = () => {
  if (needVerifyUpdate.value) {
    if (JSON.stringify(oldData.value) !== JSON.stringify(form.value)) {
      ElMessageBox.confirm(
        '数据已经修改，确认不保存退出吗？',
        '注意',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          distinguishCancelAndClose: true,
          center: true
        }
      )
        .then(() => {
          dialogShow.value = false
        })
        .catch(() => {})
    } else {
      dialogShow.value = false
    }
  } else {
    dialogShow.value = false
  }
}

const onModalLast = () => {
  type.value = 'continue'
  emit('last-step', 'contine')
}

const onModalNext = () => {
  type.value = 'continue'
  emit('next-step', 'contine')
}

const clickFull = () => {
  autoMax.value = !autoMax.value
  emit('resize-dialog', autoMax.value)
}

const closeDlg = () => {
  emit('close-dialog', currentSave.value)
}

defineExpose({
  dialogRef,
  showDialog,
  onConfirm,
  onModalRepeatAdd,
  onModalSubmit,
  beforeCloseDlg,
  onModalLast,
  onModalNext,
  clickFull,
  closeDlg,
  validate,
  _onConfirm
})
</script>

<style lang="scss" scoped>
.dlg-drag-wrapper {
  display: contents;
}

</style>
