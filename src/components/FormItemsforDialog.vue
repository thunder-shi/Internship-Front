<template>
  <el-form
    ref="formPanelRef"
    :rules="formRules"
    :model="form"
    label-suffix=":"
    :label-width="labelWidth"
  >
    <slot name="upItems" />
    <div v-for="(item, index) in formItems" :key="index">
      <el-form-item v-if="item.type !== 'textarea'" :prop="item.field" :label="item.name">
        <!-- 简单显示 -->
        <div v-if="item.type === 'label'"><span v-html="form[item.field]" /></div>
        <!-- 双列简单显示 -->
        <el-row v-else-if="item.type === 'doubleLabel'">
          <el-col :span="11">
            <el-form-item :prop="item.field1" :label="item.name1"
              ><span v-html="form[item.field1]"
            /></el-form-item>
          </el-col>
          <el-col :span="2" style="text-align: center">-</el-col>
          <el-col :span="11">
            <el-form-item :prop="item.field2" :label="item.name2"
              ><span v-html="form[item.field2]"
            /></el-form-item>
          </el-col>
        </el-row>
        <!-- 密码框 -->
        <password
          v-else-if="item.type === 'password'"
          v-model="form[item.field]"
          :placeholder="item.placeholder ? item.placeholder : '请输入'"
          @input="resetPass"
        />
        <!-- 开关 -->
        <el-switch v-else-if="item.type === 'switch'" v-model="form[item.field]" />
        <!-- 单选 -->
        <el-radio-group v-else-if="item.type === 'radio'" v-model="form[item.field]">
          <el-radio
            v-for="(citem, cindex) in item.options"
            :key="cindex + 'A'"
            :label="citem.id"
            >{{ citem.value }}</el-radio
          >
        </el-radio-group>
        <!-- 多选 -->
        <el-checkbox-group v-else-if="item.type === 'checkbox'" v-model="form[item.field]">
          <el-checkbox
            v-for="(citem, cindex) in item.options"
            :key="cindex + 'B'"
            :label="citem.id"
            >{{ citem.value }}</el-checkbox
          >
        </el-checkbox-group>
        <!-- 普通输入框 -->
        <el-input
          v-else-if="item.type === 'input'"
          v-model="form[item.field]"
          :maxlength="CONSTANT.INFO_MAX_LENGTH"
          :placeholder="item.placeholder ? item.placeholder : '请输入'"
          :disabled="item.disabled"
        />
        <!-- 双列普通输入框 -->
        <el-row v-else-if="item.type === 'doubleinput'">
          <el-col :span="11">
            <el-form-item :prop="item.field1">
              <el-input v-model="form[item.field1]" :placeholder="item.placeholder1" />
            </el-form-item>
          </el-col>
          <el-col :span="2" style="text-align: center">-</el-col>
          <el-col :span="11">
            <el-form-item :prop="item.field2">
              <el-input v-model="form[item.field2]" :placeholder="item.placeholder2" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 三列普通输入框 -->
        <el-row v-else-if="item.type === 'tripleinput'">
          <el-col :span="7">
            <el-form-item :prop="item.field1">
              <el-input v-model="form[item.field1]" :placeholder="item.placeholder1" />
            </el-form-item>
          </el-col>
          <el-col :span="2" style="text-align: center">-</el-col>
          <el-col :span="7">
            <el-form-item :prop="item.field2">
              <el-input v-model="form[item.field2]" :placeholder="item.placeholder2" />
            </el-form-item>
          </el-col>
          <el-col :span="2" style="text-align: center">-</el-col>
          <el-col :span="6">
            <el-form-item :prop="item.field3">
              <el-input v-model="form[item.field3]" :placeholder="item.placeholder3" />
            </el-form-item>
          </el-col>
        </el-row>
        <!-- 单列时间日期框 -->
        <el-date-picker
          v-else-if="item.type === 'date'"
          v-model="form[item.field]"
          type="datetime"
          placeholder="选择日期时间"
        />
        <!-- 简单下拉选择框 -->
        <el-select
          v-else-if="item.type === 'select_noremote'"
          v-model="form[item.field]"
          placeholder="请选择"
          @change="(val) => handleSelectChange && handleSelectChange(item, val, form)"
        >
          <el-option
            v-for="(sitem, sindex) in item.options"
            :key="sindex"
            :label="sitem.name"
            :value="sitem.id"
          />
        </el-select>
        <!-- 关联数据选择框 -->
        <SimpleSelect
          v-else-if="item.type === 'select'"
          :ref="'smpSel' + item.field"
          v-model="form[item.field]"
          :field="item.field"
          :select-label="item.selectLabel"
          :multiple="item.multiple"
          :key-words="item.keyWords"
          :search-key="form[item.searchKeys]"
          :reg-key="item.regKey"
          :disabled="item.disabled"
          :placeholder="item.placeholder ? item.placeholder : '请选择'"
          :auto-select="item.autoSelect"
          :sortJson="item.sortJson"
          @update-value="onSimpleSelectChange"
          @init-finish="simpleSelectInitFinish"
        />
        <!-- 级联选择框 -->
        <SimpleTreeSelect
          v-else-if="item.type === 'cascader'"
          v-model="form[item.field]"
          :field="item.field"
          :key-words="item.keyWords"
          :disabled="item.disabled"
          :check-strictly="item.checkStrictly"
          :search-keys="item.searchKeys"
          @update-value="onTreeSelectChange"
        />
        <!-- 文件上传框 -->
        <SimpleUpload
          v-else-if="item.type === 'uploadFile'"
          v-model="form[item.field]"
          :field="item.field"
          :up-button-info="item.upButtonInfo"
          :file-max-size="item.fileMaxSize"
          :file-allowed-types="item.fileAllowedTypes"
          :multiple="item.allowMultiFiles"
          :allow-multi-files="item.allowMultiFiles"
        />
        <!-- 文件下载链接 -->
        <el-button
          v-else-if="item.type === 'downloadFile'"
          type="text"
          @click="downloadLinkClick && downloadLinkClick(form[item.ossFileId], form[item.fileName])"
          >{{ form[item.fileName] }}</el-button
        >
        <!-- 上传--卡片类型 -->
        <el-upload-self
          v-else-if="item.type === 'upload-card'"
          v-model="fileList"
          :limit="1"
          show-limit
          list-type="picture-card"
          :file-types="item.fileTypes && item.fileTypes.length ? item.fileTypes : fileTypes"
          @beforeUpload="beforeUpload"
          @filesRemove="remove"
        />
        <!-- 图标选择 -->
        <el-popover
          v-else-if="item.type === 'icon'"
          placement="bottom-start"
          width="500"
          trigger="click"
        >
          <IconSelect ref="iconSelectRef" @selected="selected" />
          <template #reference>
            <el-input v-model="form.icon" placeholder="点击选择图标" readonly>
              <template #prefix>
                <svg-icon v-if="form.icon" :icon-class="form.icon" class="el-input__icon" />
                <el-icon v-else class="el-input__icon">
                  <Search />
                </el-icon>
              </template>
            </el-input>
          </template>
        </el-popover>
      </el-form-item>
    </div>
    <!-- 其他特殊项 -->
    <slot name="otherItems" />
    <div v-for="(item, index) in formItems" :key="'area' + index">
      <el-form-item v-if="item.type === 'textarea'" :prop="item.field" :label="item.name">
        <!-- 文本域输入框，始终出现在最下面 -->
        <el-input
          v-if="item.type === 'textarea'"
          v-model="form[item.field]"
          type="textarea"
          :placeholder="item.placeholder || '写点什么...'"
          :rows="3"
        />
      </el-form-item>
    </div>
    <slot name="bottomItems" />
  </el-form>
</template>

<script setup>
import { ref, computed } from 'vue';
import { Search } from '@element-plus/icons-vue';
import SimpleSelect from '@/components/SimpleSelect.vue';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';
import SimpleUpload from '@/components/SimpleUpload.vue';
import Password from '@/components/Password.vue';
import IconSelect from '@/components/IconSelect.vue';
import ElUploadSelf from '@/components/ElUploadSelf.vue';
import CONSTANT from '@/utils/constant';
import _ from 'lodash';

const props = defineProps({
  form: {
    type: Object,
    required: true
  },
  formItems: {
    type: Array,
    default: () => []
  },
  formRules: {
    type: Object,
    default: () => ({})
  },
  labelWidth: {
    type: String,
    default: '100px'
  },
  handleSelectChange: {
    type: Function,
    default: null
  },
  resetPass: {
    type: Function,
    default: null
  },
  downloadLinkClick: {
    type: Function,
    default: null
  },
  beforeUpload: {
    type: Function,
    default: null
  },
  fileTypes: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'simple-select-change',
  'simple-select-init-finish',
  'tree-select-change'
]);

const formPanelRef = ref(null);
const iconSelectRef = ref(null);
const fileList = ref([]);

function onSimpleSelectChange(val, field, options) {
  emit('simple-select-change', val, field, options);
}

function simpleSelectInitFinish(field, options) {
  const formData = _.cloneDeep(props.form);
  emit('simple-select-init-finish', field, options, formData);
}

function onTreeSelectChange(val, field, node) {
  emit('tree-select-change', val, field, node);
}

function selected(name) {
  props.form.icon = name;
}

function remove() {
  if (fileList.value[0]?.id) {
    const delId = [fileList.value[0].id];
  }
  fileList.value = [];
}

defineExpose({
  formPanelRef
});
</script>

