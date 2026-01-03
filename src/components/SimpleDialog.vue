<!-- 表单项，通过传入的 formItems 循环生成表单 -->
<!-- 基础入参包括：
    ① *name:表单项展示名称 String
    ② *field:后端所需入参(绑定值) String
    ③ *type:表单种类 String
    ④ options:各种子类选项 Array
    ⑤ keyWords:获取下拉选项
    ⑥ selectLabel:下拉框的回显字段（针对下拉框编辑时的回显）
    ⑦ multiple:是否开启多选（针对下拉框）
  -->
<template>
  <DlgBasic
    ref="dlgBasicRef"
    v-model:default-props="defaultProps.defaultDBProps"
    :dlgbasic-confirm="confirm"
    :dlgbasic-submit="submit"
    :dlgbasic-spec-confirm="specConfirm"
    @close-dialog="onCloseDialog"
    @open-dialog="openDialog"
  >
    <template #mainForm>
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
            <!-- <el-input v-else-if="item.type==='password'" type="password" v-model="form[item.field]" :placeholder="item.placeholder?item.placeholder:'请输入'" :disabled="item.disabled" /> -->
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
              @change="(val) => defaultProps.handleSelectChange(item, val, form)"
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
              v-model:form="form"
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
              @click="downloadLinkClick(form[item.ossFileId], form[item.fileName])"
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
              <!-- @show="resetSelected" -->
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
  </DlgBasic>
</template>

<script setup>
import {
  ref,
  reactive,
  computed,
  watch,
  nextTick,
  onMounted,
  useAttrs,
  getCurrentInstance,
} from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import { Search } from '@element-plus/icons-vue';
import _ from 'lodash';
import DlgBasic from '@/components/DlgBasic.vue';
import SimpleSelect from '@/components/SimpleSelect.vue';
import ElUploadSelf from '@/components/ElUploadSelf.vue';
import dlgAPI from '@/utils/forDialog';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';
import Password from '@/components/Password.vue';
import IconSelect from '@/components/IconSelect.vue';
import SimpleUpload from '@/components/SimpleUpload.vue';
import { resetForm } from '@/utils/common';
import fileAPI from '@/api/file.js';
import userAPI from '@/api/user';
import CONSTANT from '@/utils/constant';

const instance = getCurrentInstance();

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        labelWidth: '',
        keyWord: ' ',
        autoSaveClose: true, // 是否根据当前form变化状态自动关闭窗口，如果存储涉及多表需要多次保存，则将其设为false
        formItems: [],
        formRules: {},
        defaultDBProps: {
          footButtons: {},
        },
      };
    },
  },
  simpledialogSpecConfirm: { type: Function, default: null },
  simpledialogConfirm: { type: Function, default: null },
  simpledialogConfirmMore: { type: Function, default: null },
  simpledialogSubmit: { type: Function, default: null },
});

const emit = defineEmits([
  'update-record',
  'close-dialog',
  'open-dialog',
  'simple-select-change',
  'simple-select-init-finish',
  'tree-select-change',
]);

const store = useStore();
const attrs = useAttrs();

const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const iconSelectRef = ref(null);

const form = reactive({});
const keyWord = ref(props.defaultProps.keyWord); // keyWord必传并且不会改变
const footButtons = ref({});
let thisEvents = {};

// computed 属性
const labelWidth = computed(() => {
  return props.defaultProps.labelWidth ? props.defaultProps.labelWidth : '100px';
});
const autoSaveClose = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'autoSaveClose')) {
    return props.defaultProps.autoSaveClose;
  }
  return true;
});

const formItems = computed(() => {
  return props.defaultProps.formItems
    ? props.defaultProps.formItems
    : [
        { name: '编码', field: 'code', type: 'input' },
        { name: '名称', field: 'name', type: 'input' },
        { name: '备注', field: 'remarks', type: 'textarea' },
      ];
});

const formRules = computed(() => {
  return props.defaultProps.formRules
    ? props.defaultProps.formRules
    : { name: [{ required: true, message: '名称不能为空', trigger: 'blur' }] };
});

// watch
watch(
  form,
  () => {
    // 表单变化时只检查按钮状态，不显示错误信息
    verifyValid(false);
  },
  { deep: true }
);

onMounted(() => {
  thisEvents = {
    'simple-select-change': 'onSimpleSelectChange' in attrs,
    'tree-select-change': 'onTreeSelectChange' in attrs,
  };
});

function showDialog(val, formData = {}, bind = false) {
  // 判断是编辑还是新增
  const isEdit = formData && formData.id != null && formData.id !== 0;
  
  if (formData !== null) {
    if (isEdit) {
      // 编辑模式：先重置 form，然后赋值新数据
      resetForm(form);
      if (bind) {
        Object.assign(form, formData);
      } else {
        Object.assign(form, _.cloneDeep(formData));
      }
    } else {
      // 新增模式：先清除 form 中的所有属性，然后只赋值 formData 中的属性
      // 这样可以确保不会保留之前编辑时的数据
      const formKeys = Object.keys(form);
      formKeys.forEach(key => {
        Reflect.deleteProperty(form, key);
      });
      // 然后赋值新数据
      if (bind) {
        Object.assign(form, formData);
      } else {
        Object.assign(form, _.cloneDeep(formData));
      }
      // 确保删除 id 属性（如果存在）
      if (Object.prototype.hasOwnProperty.call(form, 'id')) {
        Reflect.deleteProperty(form, 'id');
      }
    }
  }
  // 将 form 数据传递给 DlgBasic，这样 DlgBasic 可以根据 form.id 判断是编辑还是新增
  // 同时传递一个明确的 option 参数，确保 DlgBasic 能正确判断
  dlgBasicRef.value.showDialog(val, form, isEdit ? 'edit' : 'append');
  setTimeout(() => {
    formPanelRef.value.clearValidate();
    // 初始化时设置按钮为禁用状态（因为表单为空，验证会失败）
    // 但如果是编辑模式（有 id），按钮应该是启用的（因为表单已有数据）
    if (isEdit) {
      // 编辑模式，检查表单是否有必填项未填
      verifyValid(false);
    } else {
      // 新增模式，按钮禁用
      dlgBasicRef.value.validate = true;
    }
  }, 100);
}

// 窗口打开
async function openDialog(row) {
  emit('open-dialog', row);
}

async function resetPass(password) {
  const phone = form.phone;
  try {
    await userAPI.editPassword({ phone: phone, verCode: '1980', password: password });
    ElMessage.success('重置完毕');
  } catch (error) {
    error();
  }
}

function verifyValid(showMessage = true) {
  if (!formPanelRef.value || !dlgBasicRef.value) return;
  nextTick(() => {
    if (formPanelRef.value && dlgBasicRef.value) {
      if (showMessage) {
        // 需要显示错误信息时（如保存时），正常验证
        formPanelRef.value
          .validate((valid) => {
            // valid: true 表示验证通过，false 表示验证失败
            // validate: true 表示按钮禁用，false 表示按钮可用
            dlgBasicRef.value.validate = !valid;
          })
          .catch(() => {
            // 验证出错时，按钮应该禁用
            dlgBasicRef.value.validate = true;
          });
      } else {
        // 不需要显示错误信息时（如初始化、表单变化时），手动检查规则但不显示错误
        const rules = formRules.value;
        const fields = Object.keys(rules);
        let hasError = false;

        // 遍历所有规则字段，手动检查必填规则
        fields.forEach((field) => {
          const ruleArray = rules[field];
          if (Array.isArray(ruleArray)) {
            const value = form[field];
            // 检查必填规则
            const requiredRule = ruleArray.find((r) => r.required === true);
            if (requiredRule) {
              // 检查值是否为空
              if (value === undefined || value === null || value === '' ||
                  (Array.isArray(value) && value.length === 0)) {
                hasError = true;
              }
            }
          }
        });

        // 设置按钮状态
        dlgBasicRef.value.validate = hasError;
      }
    }
  });
}

// #region 点击确认按钮，
// 1, 如果不想执行数据是否修改判断，直接外层spec-confirm; 2, 如果执行数据修改判断后再特殊操作，外层on-confirm；3，如果执行通用保存后外层再有操作，外层执行confirm-more
async function _confirm(option, type, formData = null) {
  if (formData != null) {
    Object.assign(form, formData);
  }
  // isTree 是否为树结构
  var parentId = null;
  var allNodeNames = null;
  const isTree = form.parentId >= -1;
  if (isTree) {
    parentId = form.parentId;
    allNodeNames = form ? form.allNodeNames : '全部';
  }
  const userId = store.getters.userInfo.id;
  var res = await dlgAPI.commonSubmitDlg(
    formPanelRef.value,
    form,
    keyWord.value,
    option,
    isTree,
    false,
    userId
  );
  if (res.message === 'successful') {
    if (props.simpledialogConfirmMore && typeof props.simpledialogConfirmMore === 'function') {
      await props.simpledialogConfirmMore(res.data);
    }
    if (type === 'continue') {
      formPanelRef.value.resetFields();
      Object.assign(form, resetForm(form));
      if (parentId) {
        form.allNodeNames = allNodeNames;
        form.parentId = parentId;
        form.isLeaf = true;
        form.childNum = 0;
      }
      // } else {
      //   if (autoSaveClose.value) {
      //     dlgBasicRef.value.showDialog(false, form)
      //   }
    }
  }
}

async function confirm(option, type) {
  try {
    if (!(props.simpledialogConfirm && typeof props.simpledialogConfirm === 'function')) {
      await _confirm(option, type);
    } else {
      await props.simpledialogConfirm(option, type, form);
    }
  } catch (error) {
    console.error('确认操作失败:', error);
    ElMessage.error('操作失败，请重试');
    throw error;
  }
}

async function specConfirm(option, type) {
  try {
    if (!(props.simpledialogSpecConfirm && typeof props.simpledialogSpecConfirm === 'function')) {
      await dlgBasicRef.value._onConfirm();
    } else {
      await props.simpledialogSpecConfirm(option, type, form);
    }
  } catch (error) {
    console.error('特殊确认操作失败:', error);
    ElMessage.error('操作失败，请重试');
    throw error;
  }
}
// #endregion

async function onCloseDialog(saveType) {
  if (saveType === true) {
    emit('update-record', form);
  }
  emit('close-dialog');
}

// 获取子组件 SimpleSelect 传递的值
function recieve(val, field) {
  // form[field] = val
}

const fileList = ref([]);
function remove() {
  if (fileList.value[0]?.id) {
    const delId = [fileList.value[0].id];
  }
  fileList.value = [];
}

async function submit() {
  if (!(props.simpledialogSubmit && typeof props.simpledialogSubmit === 'function')) {
    await _confirm('submit', 'stop');
  } else {
    await props.simpledialogSubmit(form);
  }
}

function beforeUpload(file) {
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) {
    ElMessage.error('上传文件大小不能超过 5MB!');
  }
  return isLt5M;
}

// 选中图标
function selected(name) {
  form.icon = name;
}

// resetSelected() {
//   iconSelectRef.value.reset()
// },

function onSimpleSelectChange(val, field, options) {
  form[field] = val;
  emit('simple-select-change', val, field, form, options);
}

function simpleSelectInitFinish(field, options) {
  const formData = _.cloneDeep(form)
  emit('simple-select-init-finish', field, options, formData);
}

function onTreeSelectChange(val, field, node) {
  form[field] = val;
  emit('tree-select-change', val, field, form, node);
}

// reCloneOldData() {
//   dlgBasicRef.value.cloneOldData()
// },

async function downloadLinkClick(id, fileName) {
  var content = await fileAPI.downloadFile(id);
  instance.proxy.downloadFile(content, fileName);
}

// 暴露方法供外部调用
defineExpose({
  showDialog,
  _confirm,
});
</script>
