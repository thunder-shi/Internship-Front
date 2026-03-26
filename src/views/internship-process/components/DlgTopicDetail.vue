<template>
  <DlgBasic ref="dlgBasicRef" :default-props="defaultProps" :dlgbasic-confirm="handleConfirm" @close-dialog="handleCloseDialog">
    <template #mainForm>
      <el-form ref="formPanelRef" :model="form" :rules="formRules" label-width="120px">
        <el-row v-if="hasStudentInfo">
          <el-col :span="24">
            <el-form-item label="学生姓名：">
              <span>{{ studentNameText }}</span>
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
        <el-row>
          <el-col :span="24">
            <el-form-item label="是否限选：" prop="isLimit">
              <el-radio-group v-model="form.isLimit" :disabled="!canEdit">
                <el-radio :label="0">否（学生可选）</el-radio>
                <el-radio :label="1">是（限选/指定）</el-radio>
              </el-radio-group>
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
import internshipProcessAPI from '@/api/internshipProcess';

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
const form = reactive({ name: '', topicDetail: '', isLimit: 0 });

const isEditMode = ref(false);
const currentRowId = ref(null);
const isReadOnly = ref(false);
// 本地保存当前实习项目信息，避免父组件 props 传递时机问题
const currentInternshipLocal = ref(null);
// 记录当前行完整数据，便于在保存时兜底读取字段（如 internshipId）
const currentRowData = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});

const canEdit = computed(() => !isReadOnly.value);

const studentNameText = computed(() => {
  const raw =
    currentRowData.value?.student_name ??
    currentRowData.value?.studentName ??
    null;
  return raw != null && raw !== '' ? String(raw) : '--';
});

const hasStudentInfo = computed(() => {
  return (
    currentRowData.value?.student_name != null ||
    currentRowData.value?.studentName != null
  );
});

const formRules = {
  name: [
    { required: true, message: '请输入题目名称', trigger: 'blur' },
    { max: 200, message: '题目名称不能超过200个字符', trigger: 'blur' },
  ],
  topicDetail: [
    { max: 1000, message: '题目详情不能超过1000个字符', trigger: 'blur' },
  ],
  isLimit: [{ required: true, message: '请选择是否限选', trigger: 'change' }],
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
  form.isLimit = 0;
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
    form.isLimit = Number(
      row.isLimit ??
        row.is_limit ??
        row.titleIsLimit ??
        row.title_is_limit ??
        row.relTitleIsLimit ??
        row.rel_title_is_limit ??
        0
    );
  } else {
    isEditMode.value = false;
    if (initialForm && typeof initialForm === 'object') {
      form.name = initialForm.name ?? '';
      // 同样从 remarks 等字段映射到本地 topicDetail
      form.topicDetail = initialForm.topicDetail ?? initialForm.detail ?? initialForm.remarks ?? '';
      form.isLimit = Number(
        initialForm.isLimit ??
          initialForm.is_limit ??
          initialForm.titleIsLimit ??
          initialForm.title_is_limit ??
          initialForm.relTitleIsLimit ??
          initialForm.rel_title_is_limit ??
          0
      );
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
    // 后端表 RelTitleTeacher 使用 remarks 字段保存题目详情
    remarks: (form.topicDetail || '').trim(),
    // 0=非限选（学生可选），1=限选（仅指定）
    isLimit: Number(form.isLimit ?? 0),
    is_limit: Number(form.isLimit ?? 0),
  };

  if (isEditMode.value && currentRowId.value != null) {
    saveData.id = currentRowId.value;
  } else {
    // 新增模式：初始化当前审核级别
    saveData.currentVerifyTypeId = internshipSrc?.verifyTypeId === CONSTANT.VERIFY_LEVEL.NO_VERIFY
      ? CONSTANT.VERIFY_LEVEL.NO_VERIFY
      : CONSTANT.VERIFY_LEVEL.ONE_VERIFY;
  }

  const res = await listAPI.editOneNode('RelTitleTeacher', saveData);
  if (!isEditMode.value && res && res.message === 'successful' && res.data?.id) {
    // 项目选择弹窗中 id 可能是 internshipId，真实流程ID通常在 processId 或 realId
    const processId = internshipSrc?.processId ?? internshipSrc?.realId ?? null;
    const activateParams = {
      processId,
      relationId: res.data.id,
      tableName: 'RelTitleTeacher',
      createUserId: userInfo.value?.id,
    };
    if (!activateParams.processId) {
      ElMessage.warning('保存成功，但未获取到流程ID，列表可能暂时无法显示');
    } else if (activateParams.createUserId) {
      try {
        const queryRes = await listAPI.getSomeRecords({
          keyWords: 'MainVerifyProcess',
          searchKey: {
            processId: activateParams.processId,
            relationId: activateParams.relationId,
            tableName: activateParams.tableName,
          },
          pageInfo: { page: 1, size: 1 },
        });
        const existingRecords = queryRes?.data?.records || queryRes?.data?.content || [];
        if (existingRecords.length === 0) {
          const activateRes = await internshipProcessAPI.activateProcess(activateParams);
          if (!activateRes || activateRes.message !== 'successful') {
            ElMessage.warning(activateRes?.message || '保存成功，但激活审核流程失败，列表可能暂时无法显示');
          }
        }
      } catch (error) {
        console.error('激活题目申报流程失败:', error);
        ElMessage.warning('保存成功，但激活审核流程异常，列表可能暂时无法显示');
      }
    }
  }
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
