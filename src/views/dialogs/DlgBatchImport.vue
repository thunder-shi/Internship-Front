<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" :dlgbasic-spec-confirm="submit" @close-dialog="handleCloseDialog">
    <template #mainForm>
      <el-upload ref="uploadRef" class="upload-demo" drag action :limit="1" :show-file-list="true" :http-request="() => {}" :on-exceed="handleExceed" :before-upload="beforeUpload" :on-remove="() => (file.value = {})">
        <i class="el-icon-upload" />
        <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
        <template #tip>
          <div v-show="noFile" class="el-upload__tip" style="color: red">请上传文件！</div>
          <div v-if="isNeedExport" class="el-upload__tip">
            请先进行<span class="download">"导出"</span>或<span class="download">"全部导出"</span
            >操作获取模板
          </div>
          <div class="el-upload__tip">
            <span v-show="!isNeedExport" class="download" @click="downloadTemplate">下载模板</span>
            <span>导入文件不能超过5M，仅允许导入"xls"或"xlsx"格式文件</span>
          </div>
        </template>
      </el-upload>
    </template>
  </DlgBasic>
</template>

<script setup>
import { ref, computed, watch, getCurrentInstance } from 'vue';
import IEAPI from '@/api/importAndExport';
import DlgBasic from '@/components/DlgBasic.vue';

const { proxy } = getCurrentInstance();

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        keyWords: '',
        dlgTitle: '',
        footButtons: {
          confirm: { show: true, name: '保 存', type: 'primary' },
          repeatAdd: { show: false, name: '继续添加', type: 'warning' },
          cancel: { show: true, name: '取 消', type: '' },
        },
        selfImport: false,
      };
    },
  },
  importDialog: { type: Object, default: () => ({}) },
  templateFile: {
    type: Object,
    default: () => ({ id: null, name: '' }),
  },
  // 是否需要先执行导出操作
  isNeedExport: { type: Boolean, default: false },
  keyWords: { type: String, default: '' },
});

const emit = defineEmits(['selfImport', 'ex-material', 'close-dialog']);

const dlgBasicRef = ref(null);
const uploadRef = ref(null);
const file = ref({});
const fileFlag = ref(false);
const dialogFull = ref(false);
const comfimLoading = ref(false);

const noFile = computed(() => {
  if (!file.value.type && fileFlag.value) return true;
  return false;
});

watch(
  file,
  () => {
    if (dlgBasicRef.value) {
      dlgBasicRef.value.validate = !file.value.type;
    }
  },
  { deep: true }
);

const showDialog = async (val) => {
  if (uploadRef.value) {
    await uploadRef.value.clearFiles();
    file.value = {};
  }
  dlgBasicRef.value.showDialog(val);
};

// The parameter of the hook before uploading a file is the uploaded file.
// If false or promise is returned and rejected, the upload will stop.
// 上传文件前调用的钩子函数
const beforeUpload = (uploadFile) => {
  const fileTypes = ['xls', 'xlsx'];
  const splitArr = uploadFile.name.split('.');
  const fileType = splitArr[splitArr.length - 1];
  const isLtSize = uploadFile.size / 1024 / 1024 < proxy.CONSTANT.FILE_MAX_SIZE;

  if (!fileTypes.includes(fileType)) {
    proxy.$message.error('上传文件只能是 xls/xlsx 格式!');
    return false;
  }
  if (!isLtSize) {
    return proxy.$message.error(`上传图片大小不能超过 ${proxy.CONSTANT.FILE_MAX_SIZE} MB!`);
  }
  fileFlag.value = false;
  file.value = uploadFile;
};

// 上传文件数量超过限制时触发的钩子函数
// Hook when the number of files exceeds the limit
const handleExceed = (files, fileList) => {
  proxy.$message.warning('当前限制选择 1 个文件，请删除后继续上传');
};

// 关闭弹窗
// Close the pop-up window
const closeDialog = () => {
  file.value = {};
  dlgBasicRef.value.showDialog(false);
};

const handleCloseDialog = () => {
  emit('close-dialog');
};
// Download the template, judge which interface to call according to different bellongpage fields,
// and obtain the templates belonging to different pages
const downloadTemplate = async () => {
  // 更新为以后的模板 都是后端代码生成
  // const templateFile = getTemplateFile(props.keyWords, '.xls')
  console.log(props.defaultProps);
  try {
    // props.importDialog.show = false
    showDialog(false);
    proxy.fullScreenLoading();
    let content;
    if (props.defaultProps.keyWords) {
      content = await IEAPI.baseTemplateFile(props.defaultProps.keyWords);
    } else {
      // 暂时没有导出模板接口
    }
    proxy.fullScreenLoading().close();
    proxy.downloadFile(content, '批量导入模板.xls');
  } catch (error) {
    proxy.fullScreenLoading().close();
  }
};

// Override the default upload behavior and customize the implementation of upload
// According to different bellongpage fields, determine which page's upload interface to call,
// or change it to emit event to process the event on each page, depending on the requirements
// 确认上传
const submit = async () => {
  if (!file.value.type) {
    fileFlag.value = true;
    return;
  }
  if (props.defaultProps.selfImport) {
    emit('selfImport', file.value);
    return;
  }

  let success = false;
  showDialog(false);
  proxy.fullScreenLoading();

  try {
    await IEAPI.importInfo(props.defaultProps.keyWords, file.value);
    success = true;
  } catch (error) {
    console.error('导入失败:', error);
    proxy.$message.error('导入失败，请检查文件格式是否正确');
  } finally {
    proxy.fullScreenLoading().close();
    if (dlgBasicRef.value?.buttonLoading) {
      dlgBasicRef.value.buttonLoading.confirm = false;
    }
    file.value = {};
  }

  // 成功后的操作放在 try-catch 之外，避免事件处理错误影响提示
  if (success) {
    proxy.$message.success('导入成功');
    emit('import-success');
  }
};

defineExpose({
  showDialog,
  closeDialog,
});
</script>

<style lang="scss" scoped>
@import '@/assets/css/variables.module.scss';

:deep(.el-dialog__body) {
  display: flex;
  justify-content: center;
  align-items: center;
}
.el-upload__tip {
  display: flex;
  .download {
    margin-right: 5px;
    color: $color-primary;
    cursor: pointer;
  }
}
.view-dialog {
  :deep(.el-dialog__body) {
    max-height: unset;
    height: calc(100vh - 108px);
  }
}
</style>
