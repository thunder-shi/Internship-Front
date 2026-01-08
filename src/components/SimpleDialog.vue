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
    :default-props="mergedDefaultDBProps"
    :dlgbasic-confirm="confirm"
    :dlgbasic-submit="submit"
    :dlgbasic-spec-confirm="specConfirm"
    @close-dialog="onCloseDialog"
    @open-dialog="openDialog"
  >
    <template #mainForm>
      <FormItemsforDialog
        ref="formItemsRef"
        :form="form"
        :form-items="formItems"
        :form-rules="formRules"
        :label-width="labelWidth"
        :handle-select-change="defaultProps.handleSelectChange"
        :reset-pass="resetPass"
        :download-link-click="downloadLinkClick"
        :before-upload="beforeUpload"
        :file-types="fileTypes"
        @simple-select-change="onSimpleSelectChange"
        @simple-select-init-finish="simpleSelectInitFinish"
        @tree-select-change="onTreeSelectChange"
        @cron-change="onCronChange"
        
      >
        <template #upItems>
          <slot name="upItems" />
        </template>
        <template #otherItems>
          <slot name="otherItems" />
        </template>
        <template #bottomItems>
          <slot name="bottomItems" />
        </template>
      </FormItemsforDialog>
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
import FormItemsforDialog from '@/components/FormItemsforDialog.vue';
import dlgAPI from '@/utils/forDialog';
import { resetForm } from '@/utils/common';
import fileAPI from '@/api/file.js';
import userAPI from '@/api/user';

const instance = getCurrentInstance();

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        labelWidth: '',
        keyWord: ' ',
        autoSaveClose: true, // 是否根据当前form变化状态自动关闭窗口，如果存储涉及多表需要多次保存，则将其设为false
        audit: false, // 是否启用审核模式：启用后显示提交按钮，保存时 isAudit=-1，提交时 isAudit=1
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
  'cron-change',
]);

const store = useStore();
const attrs = useAttrs();

const dlgBasicRef = ref(null);
const formItemsRef = ref(null);
const formPanelRef = computed(() => formItemsRef.value?.formPanelRef);

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

// 是否启用审核模式
const isAuditMode = computed(() => {
  return props.defaultProps.audit === true;
});

// 动态合并 footButtons 配置，审核模式下显示提交按钮
const mergedDefaultDBProps = computed(() => {
  const dbProps = props.defaultProps.defaultDBProps || {};
  if (isAuditMode.value) {
    return {
      ...dbProps,
      footButtons: {
        ...dbProps.footButtons,
        submit: { show: true, name: '提 交', type: 'success' },
      },
    };
  }
  return dbProps;
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
      formKeys.forEach((key) => {
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
    formPanelRef.value?.clearValidate();
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
  emit('open-dialog', row, form);
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
  const panelRef = formPanelRef.value;
  if (!panelRef || !dlgBasicRef.value) return;
  nextTick(() => {
    if (panelRef && dlgBasicRef.value) {
      if (showMessage) {
        // 需要显示错误信息时（如保存时），正常验证
        panelRef
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
              if (
                value === undefined ||
                value === null ||
                value === '' ||
                (Array.isArray(value) && value.length === 0)
              ) {
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
async function _confirm(option, type, formData = null, auditValue = null) {
  emit("confirm-click",formData)
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

  // 审核模式下设置 isAudit 值
  if (isAuditMode.value && auditValue !== null) {
    form.isAudit = auditValue;
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
      formPanelRef.value?.resetFields();
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
      // 审核模式下，保存按钮设置 isAudit = -1
      const auditValue = isAuditMode.value ? -1 : null;
      await _confirm(option, type, null, auditValue);
    } else {
      // 自定义确认函数，传递 isAudit 值
      if (isAuditMode.value) {
        form.isAudit = -1;
      }
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

const fileTypes = ref([]);

async function submit() {
  if (!(props.simpledialogSubmit && typeof props.simpledialogSubmit === 'function')) {
    // 审核模式下，提交按钮设置 isAudit = 0（未审核/待审核）
    const auditValue = isAuditMode.value ? 0 : null;
    await _confirm('submit', 'stop', null, auditValue);
  } else {
    // 自定义提交函数，传递 isAudit 值
    if (isAuditMode.value) {
      form.isAudit = 0;
    }
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

// resetSelected() {
//   iconSelectRef.value.reset()
// },

function onSimpleSelectChange(val, field, options) {
  form[field] = val;
  emit('simple-select-change', val, field, form, options);
}

function simpleSelectInitFinish(field, options) {
  const formData = _.cloneDeep(form);
  emit('simple-select-init-finish', field, options, formData);
}

function onTreeSelectChange(val, field, node) {
  form[field] = val;
  emit('tree-select-change', val, field, form, node);
}

function onCronChange(val, field, formData) {
  form[field] = val;
  emit('cron-change', val, field, form);
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
