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
              <el-input v-model="form.name" placeholder="请输入题目名称" :disabled="!canEdit" maxlength="200" show-word-limit />
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
const form = reactive({ name: '' });

const isEditMode = ref(false);
const currentRowId = ref(null);
// 本地保存当前实习项目信息，避免父组件 props 传递时机问题
const currentInternshipLocal = ref(null);
// 记录当前行完整数据，便于在保存时兜底读取字段（如 internshipId）
const currentRowData = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});

const internshipName = computed(() => {
  const src = currentInternshipLocal.value || props.currentInternship;
  return src?.internshipName || src?.name || '--';
});

const canEdit = computed(() => true);

const formRules = {
  name: [
    { required: true, message: '请输入题目名称', trigger: 'blur' },
    { max: 200, message: '题目名称不能超过200个字符', trigger: 'blur' },
  ],
};

const defaultProps = computed(() => ({
  dlgTitle: isEditMode.value ? '编辑题目' : '申报题目',
  width: '500px',
  someFlags: {
    needValidate: false,
  },
  footButtons: {
    cancel: { show: true, name: '取 消', type: '' },
    confirm: { show: true, name: '保 存', type: 'primary' },
    repeatAdd: { show: false },
  },
}));

function resetForm() {
  form.name = '';
  isEditMode.value = false;
  currentRowId.value = null;
  currentInternshipLocal.value = null;
  currentRowData.value = null;
}

function showDialog(isAppend, initialForm, row, internship) {
  resetForm();
  // 记录当前实习项目（优先使用入参，其次使用父组件 props）
  currentInternshipLocal.value = internship || props.currentInternship || null;
  currentRowData.value = row || null;
  if (row && (row.id != null || row.id === 0)) {
    isEditMode.value = true;
    currentRowId.value = row.id;
    form.name = row.name ?? row.topicName ?? '';
  } else {
    isEditMode.value = false;
    if (initialForm && typeof initialForm === 'object') {
      form.name = initialForm.name ?? '';
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
  };

  if (isEditMode.value && currentRowId.value != null) {
    saveData.id = currentRowId.value;
  } else {
    saveData.stuId = saveData.stuId ?? 0;
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
