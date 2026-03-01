<template>
  <div>
    <el-upload ref="uploadRef" action multiple :list-type="listType" :auto-upload="autoUpload" :before-remove="handleBeforeRemove" :on-preview="handlePreview" :on-remove="handleRemove" :on-change="handleChange" :file-list="fileList" :http-request="() => {}" :before-upload="beforeUploadVerify">
      <el-button size="small" type="primary" :title="upButtonInfo.tooltip" @click.stop="beforeUpload">{{ upButtonInfo.name }}</el-button>
    </el-upload>
    <div v-show="upLoading">
      <el-progress ref="progressBarRef" :percentage="progressPercent" :text-inside="true" :stroke-width="24" status="success" />
    </div>
  </div>
</template>

<script setup>
// 注：一般不能自动上传服务器，否则无法知道关联表信息，所以必须是在外层调用上传

import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import CONSTANT from '@/utils/constant'
import fileAPI from '@/api/file'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // 父组件 v-model 绑定值 (Vue 3 使用 modelValue)
  value: { type: Array, default: () => [] }, // 兼容 Vue 2 的 value
  upButtonInfo: {
    type: Object, default: () => ({
      name: '点击上传',
      tooltip: '只能上传jpg/png文件，且不超过500kb！'
    })
  },
  fileMaxSize: { type: Number, default: CONSTANT.FILE_MAX_SIZE },
  fileAllowedTypes: { type: Array, default: () => [] }, // 支持文件类型
  autoUpload: { type: Boolean, default: true },
  multiple: { type: Boolean, default: true },
  allowMultiFiles: { type: Boolean, default: true },
  updateStatus: { type: Boolean, default: true },
  listType: { type: String, default: 'text' }
})

const emit = defineEmits(['update:modelValue', 'update:value', 'handle-change'])

const uploadRef = ref(null)
const progressBarRef = ref(null)
// 兼容 Vue 2 的 value 和 Vue 3 的 modelValue
const currentValue = computed(() => props.modelValue?.length > 0 ? props.modelValue : props.value)
const fileList = ref([...currentValue.value])
const upLoading = ref(false)
const progressPercent = ref(0)
const timer = ref(null)
const isManualDelete = ref(true)

// Watch props changes
watch(() => props.modelValue, (val) => {
  if (val && val.length > 0) {
    fileList.value = val
  }
}, { deep: true })

watch(() => props.value, (val) => {
  if (val && val.length > 0 && (props.modelValue?.length === 0 || !props.modelValue)) {
    fileList.value = val
  }
}, { deep: true })

function clearFiles() {
  uploadRef.value?.clearFiles()
}

// 上传之前的回调
function beforeUpload() {
  if (!props.updateStatus) {
    ElMessage.warning('当前状态无法上传文件！')
  } else if (fileList.value && (fileList.value.length > 0) && (!props.allowMultiFiles)) {
    ElMessage.warning('上传文件已经选择！如需重新选择，请先删除已选择文件！')
  } else {
    uploadRef.value?.$refs['upload-inner']?.handleClick()
  }
}

function beforeUploadVerify(file) {
  // 首先判断文件大小
  isManualDelete.value = false
  const isLtSize = file.size / 1024 / 1024 < props.fileMaxSize
  if (!isLtSize) {
    ElMessage.warning(`上传文件大小不能超过${props.fileMaxSize}MB!`)
    return false
  }
  // 然后判断文件格式是否正确
  const fileName = file.name.lastIndexOf('.')
  const fileNameLength = file.name.length
  const fileFormat = file.name.substring(fileName + 1, fileNameLength)
  if ((props.fileAllowedTypes.length > 0) && (props.fileAllowedTypes.indexOf(fileFormat.toLowerCase()) === -1)) {
    ElMessage.warning(props.upButtonInfo.tooltip)
    return false
  }
  // 最后判断是否是重复文件选择
  let i = 0
  fileList.value.forEach(fi => {
    if ((fi.name === file.name) && (fi.size === file.size)) {
      i++
    }
  })
  if (i > 1) {
    ElMessage.warning('当前文件已经选择！')
    return false
  }
  isManualDelete.value = true
  return file
}

function handleChange(file, files) {
  fileList.value = files
  emit('handle-change', files)
  emit('update:modelValue', files)
  emit('update:value', files) // 兼容 Vue 2
}

async function handleBeforeRemove(file, files) {
  if (!props.updateStatus) {
    ElMessage.warning('当前文件不能被删除！')
    return false
  }
  if (isManualDelete.value) {
    try {
      await ElMessageBox.confirm('删除以后不可恢复，确定删除该文件吗？', '警告', { confirmButtonText: '确定', cancelButtonText: '取消' })
      return true
    } catch {
      return false
    }
  }
  return true
}

async function handleRemove(file, files) {
  if (file.status === 'success') {
    await fileAPI.deleteFile([file.id])
  }
  fileList.value = files
  emit('update:modelValue', files)
  emit('update:value', files) // 兼容 Vue 2
}

// type: 1 图片；2 文件
async function handleUpload(userId, relId, type) {
  const files = []
  fileList.value.forEach(fi => {
    files.push(fi.raw)
  })
  const params = {
    files: files,
    userId: userId,
    relId: relId,
    type: type
  }
  try {
    upLoading.value = true
    timer.value = setInterval(handleProgress, 1000)
    await fileAPI.upload(params, progressPercent.value)
  } catch (error) {
    ElMessage.warning('文件上传失败' + error)
  }
  upLoading.value = false
}

function handleProgress() {
  progressPercent.value = fileAPI.getProgressPercent()
  if (!upLoading.value) {
    if (timer.value) {
      clearInterval(timer.value)
      timer.value = null
    }
  }
}

async function handlePreview(file) {
  if (file.status === 'success') {
    try {
      await ElMessageBox.confirm('是否下载该文件？', '提示')
      const loading = ElLoading.service({ text: '下载中...', lock: true })
      try {
        const content = await fileAPI.downloadFile(file.id)
        downloadFile(content, file.name)
      } finally {
        loading.close()
      }
    } catch {
      // User cancelled
    }
  }
}

function downloadFile(content, filename) {
  const blob = new Blob([content])
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

// Cleanup timer on unmount
onBeforeUnmount(() => {
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
})

// Expose methods for parent component
defineExpose({
  clearFiles,
  handleUpload
})

defineOptions({
  name: 'SimpleUpload'
})
</script>
