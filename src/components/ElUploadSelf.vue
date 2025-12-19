<template>
  <div>
    <el-upload ref="uploadRef" action :class="{hide:fileList.length>=limit}" list-type="picture-card" :file-list="fileList" :drag="drag" :multiple="multiple" :limit="limit" :http-request="()=>{}" :on-change="handleChange" :before-upload="beforeUpload" :auto-upload="false" :on-preview="handlePictureCardPreview" :on-remove="handleRemove">
      <div v-if="drag">
        <el-icon><Upload /></el-icon>
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
      </div>
      <div v-else class="add-tip">
        <p :class="{'no-limit': !showLimit}" style="font-size: 20px">+</p>
        <p v-if="showLimit">{{ fileList.length + 1 }}/{{ limit }}</p>
      </div>
      <template #tip>
        <slot name="tip" />
      </template>
    </el-upload>
    <el-dialog class="image-dialog" v-model="dialogVisible" append-to-body>
      <img width="100%" :src="dialogImageUrl" alt="" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import CONSTANT from '@/utils/constant'

const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // 父组件 v-model 绑定值 (Vue 3 使用 modelValue)
  limit: { type: Number, default: 1 }, // 文件上传数量限制
  listType: { type: String, default: 'text' }, // 陈列方式，详见 Element Plus
  drag: { type: Boolean, default: false }, // 是否支持拖拽
  multiple: { type: Boolean, default: false }, // 是否支持多选
  fileTypes: { type: Array, required: true }, // 支持文件类型
  showLimit: { type: Boolean, default: false } // 是否显示限制数字
})

const emit = defineEmits(['update:modelValue', 'update:value', 'change', 'remove'])

const uploadRef = ref(null)
const fileList = ref([...props.modelValue])
const dialogVisible = ref(false)
const dialogImageUrl = ref('')

// Watch modelValue to update fileList
watch(() => props.modelValue, (val) => {
  fileList.value = [...val]
}, { deep: true })

function handleChange(file, files) {
  fileList.value = files
  emit('update:modelValue', files)
  emit('update:value', files) // 兼容 Vue 2
  emit('change', file, files)
}

// 删除文件触发事件
function handleRemove(file, files) {
  fileList.value = files
  emit('update:modelValue', files)
  emit('update:value', files) // 兼容 Vue 2
  emit('remove', file, files)
}

// 上传之前的回调
function beforeUpload(file) {
  const isLtSize = file.size / 1024 / 1024 < CONSTANT.IMAGE_MAX_SIZE
  if (!isLtSize) {
    ElMessage.warning(`上传图片大小不能超过 ${CONSTANT.IMAGE_MAX_SIZE} MB!`)
    return false
  }
  const fileName = file.name.lastIndexOf('.')
  const fileNameLength = file.name.length
  const fileFormat = file.name.substring(fileName + 1, fileNameLength)
  if (props.fileTypes.indexOf(fileFormat) !== -1) {
    return file
  } else {
    ElMessage.warning('上传文件只能是图片格式!')
    return false
  }
}

function handlePictureCardPreview(file) {
  console.log(file, 'file')
  dialogImageUrl.value = file.url
  dialogVisible.value = true
}

defineOptions({
  name: 'ElUploadSelf'
})
</script>

<style lang="scss" scoped>
:deep(.el-upload-list__item),
:deep(.el-upload--picture-card) {
  height: 60px;
  width: 60px;
  line-height: 60px;
}
.hide {
  :deep(.el-upload--picture-card) {
    display: none;
  }
}
.add-tip {
  margin: 10px auto;
  p {
    margin: 0 auto;
    line-height: 20px;
  }
  .no-limit {
    margin-top: 20px;
  }
}

:deep(.el-icon-upload-success),
:deep(.el-icon-check) {
  position: absolute;
  right: 15px;
}

.image-dialog :deep(.el-dialog__body) {
  border-top: 0 !important;
}
</style>
