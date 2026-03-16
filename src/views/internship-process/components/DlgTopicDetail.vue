<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" :dlgbasic-confirm="handleConfirm" @close-dialog="handleCloseDialog">
    <template #mainForm>
      <el-form ref="formPanelRef" :model="form" :rules="formRules" label-width="120px">
        <el-row>
          <el-col :span="24">
            <el-form-item label="实习项目：">
              <span>{{ internshipName || '--' }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="题目名称：" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入题目名称"
                :disabled="!canEdit"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="题目详情：" prop="topicDetail">
              <el-input
                v-model="form.topicDetail"
                type="textarea"
                :rows="5"
                placeholder="请填写题目的详细说明、内容要求等"
                :disabled="!canEdit"
                maxlength="1000"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </template>
  </DlgBasic>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useStore } from 'vuex';
import DlgBasic from '@/components/DlgBasic.vue';
import { ElMessage } from 'element-plus';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'DlgTopicDetail',
});

const props = defineProps({
  currentInternship: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(['close-dialog', 'success']);

const store = useStore();
const dlgBasicRef = ref(null);
const formPanelRef = ref(null);
const form = reactive({ name: '', topicDetail: '' });

const isEditMode = ref(false);
const currentRowId = ref(null);
const isReadOnly = ref(false);
// 本地保存当前实习项目信息，避免父组件 props 传递时机问题
const currentInternshipLocal = ref(null);
// 记录当前行完整数据，便于在保存时兜底读取字段（如 internshipId）
const currentRowData = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});

const internshipName = computed(() => {
  const src = currentInternshipLocal.value || props.currentInternship;
  return src?.internshipName || src?.name || '--';
});

const canEdit = computed(() => !isReadOnly.value);

const formRules = {
  name: [
    { required: true, message: '请输入题目名称', trigger: 'blur' },
    { max: 200, message: '题目名称不能超过200个字符', trigger: 'blur' },
  ],
  topicDetail: [
    { max: 1000, message: '题目详情不能超过1000个字符', trigger: 'blur' },
  ],
};

const defaultProps = computed(() => ({
  dlgTitle: isReadOnly.value ? '题目详情' : (isEditMode.value ? '编辑题目' : '申报题目'),
  width: '500px',
  someFlags: {
    needValidate: false,
  },
  footButtons: {
    cancel: { show: true, name: isReadOnly.value ? '关 闭' : '取 消', type: '' },
    confirm: { show: !isReadOnly.value, name: '保 存', type: 'primary' },
    repeatAdd: { show: false },
  },
}));

function resetForm() {
  form.name = '';
  form.topicDetail = '';
  isEditMode.value = false;
  currentRowId.value = null;
  isReadOnly.value = false;
  currentInternshipLocal.value = null;
  currentRowData.value = null;
}

function showDialog(isAppend, initialForm, row, internship, readOnly = false) {
  resetForm();
  isReadOnly.value = !!readOnly;
  // 记录当前实习项目（优先使用入参，其次使用父组件 props）
  currentInternshipLocal.value = internship || props.currentInternship || null;
  currentRowData.value = row || null;
  if (row && (row.id != null || row.id === 0)) {
    isEditMode.value = true;
    currentRowId.value = row.id;
    form.name = row.name ?? row.topicName ?? '';
    // 后端使用 remarks 存储题目详情，这里做前端字段映射
    form.topicDetail = row.topicDetail ?? row.detail ?? row.remarks ?? '';
  } else {
    isEditMode.value = false;
    if (initialForm && typeof initialForm === 'object') {
      form.name = initialForm.name ?? '';
      // 同样从 remarks 等字段映射到本地 topicDetail
      form.topicDetail = initialForm.topicDetail ?? initialForm.detail ?? initialForm.remarks ?? '';
    }
  }
  dlgBasicRef.value?.showDialog?.(true, { ...form }, isEditMode.value ? 'edit' : 'append');
}

async function handleConfirm() {
  try {
    const valid = await formPanelRef.value?.validate?.();
    if (!valid) {
      ElMessage.warning('请填写题目名称');
      return false;
    }
  } catch (e) {
    return false;
  }

  // 优先从当前实习项目对象获取 internshipId，其次从当前行数据兜底
  const internshipSrc = currentInternshipLocal.value || props.currentInternship || currentRowData.value || {};
  const internshipId = internshipSrc?.internshipId ?? internshipSrc?.id;
  if (!internshipId) {
    ElMessage.warning('请先选择实习项目');
    return false;
  }

  const teacherId = userInfo.value?.id;
  if (!teacherId) {
    ElMessage.warning('请先登录');
    return false;
  }

  const saveData = {
    teacherId,
    internshipId,
    name: (form.name || '').trim(),
    // 后端表 RelTeacherStudent 使用 remarks 字段保存题目详情
    remarks: (form.topicDetail || '').trim(),
  };

  if (isEditMode.value && currentRowId.value != null) {
    saveData.id = currentRowId.value;
  } else {
    saveData.stuId = saveData.stuId ?? 0;
    saveData.currentVerifyTypeId = internshipSrc?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
  }

  const res = await listAPI.editOneNode('RelTeacherStudent', saveData);
  if (res && res.message === 'successful') {
    ElMessage.success(isEditMode.value ? '修改成功' : '保存成功');
    emit('success', saveData);
    emit('close-dialog');
    return true;
  }
  ElMessage.error(res?.message || '保存失败');
  return false;
}

function handleCloseDialog() {
  emit('close-dialog');
}

defineExpose({
  showDialog,
  closeDialog: () => dlgBasicRef.value?.beforeCloseDlg?.(),
});
</script>
