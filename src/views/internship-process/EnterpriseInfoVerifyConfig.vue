<template>
  <div class="enterprise-verify-config-page" v-loading="loading">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>企业信息审核配置</span>
          <el-button
            type="primary"
            :loading="saving"
            :disabled="!canManageVerifyConfig"
            @click="handleSave"
          >
            保存配置
          </el-button>
        </div>
      </template>

      <el-alert
        title="这是系统级企业审核配置。保存后，后续新提交的企业申报都按这套配置走。"
        type="info"
        :closable="false"
        class="mb-16"
      />

      <el-alert
        title="合作高校（必选）：须选择高校根部门（部门类型为「学校」），用于在高校范围内匹配审核人账号；勿选企业集群根，否则会出现「已配置但匹配不到审核人」。"
        type="warning"
        :closable="false"
        class="mb-16"
      />

      <el-alert
        title="已提交记录沿用提交时的审核快照；后续修改配置不会追溯影响历史单据。"
        type="info"
        :closable="false"
        class="mb-16"
      />

      <el-alert
        v-if="!canManageVerifyConfig"
        title="当前账号没有企业信息审核配置维护权限，仅可查看当前配置。如需修改，请使用超级管理员账号操作。"
        type="warning"
        :closable="false"
        class="mb-16"
      />

      <el-form ref="formRef" :model="form" :rules="formRules" label-width="120px" class="config-form">
        <el-form-item label="审核级数" prop="verifyTypeId">
          <el-select
            v-model="form.verifyTypeId"
            :disabled="!canManageVerifyConfig"
            placeholder="请选择审核级数"
            clearable
            style="width: 320px"
            @change="handleVerifyTypeChange"
          >
            <el-option
              v-for="item in verifyTypeOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="合作高校" prop="schoolId">
          <SimpleTreeSelect
            v-model="form.schoolId"
            key-words="BaseDepartment"
            :search-keys="schoolDepartmentSearchKeys"
            :disabled="!canManageVerifyConfig"
            placeholder="请选择合作高校（高校根部门）"
            :check-strictly="true"
          />
        </el-form-item>

        <el-form-item
          v-for="field in roleFields"
          v-show="shouldShowRoleField(field.level)"
          :key="field.field"
          :label="field.label"
          :prop="field.field"
        >
          <el-select
            v-model="form[field.field]"
            :disabled="!canManageVerifyConfig"
            placeholder="请选择审核角色"
            clearable
            style="width: 320px"
          >
            <el-option
              v-for="item in roleOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="form.remarks"
            :disabled="!canManageVerifyConfig"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="可填写审核规则说明"
          />
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import enterpriseInfoAPI from '@/api/enterpriseInfo';
import listAPI from '@/api/list';
import CONSTANT from '@/utils/constant';
import SimpleTreeSelect from '@/components/SimpleTreeSelect.vue';

defineOptions({
  name: 'EnterpriseInfoVerifyConfig',
});

const loading = ref(false);
const saving = ref(false);
const formRef = ref(null);
const store = useStore();

const verifyTypeOptions = ref([]);
const roleOptions = ref([]);

const roles = computed(() => store.getters.roles || []);
const canManageVerifyConfig = computed(() =>
  roles.value.some(
    (role) =>
      role === CONSTANT.ROLE_TABLE.SUPER_ADMIN ||
      role?.id === CONSTANT.ROLE_TABLE.SUPER_ADMIN ||
      role?.name === '超级管理员' ||
      role?.jobCode === CONSTANT.USER_JOB_CODE.SUPER_ADMIN
  )
);

/** 部门类型：2 = 学校（与 Department 维护一致），用于树只展示高校侧部门 */
const schoolDepartmentSearchKeys = { typeId: 2 };

const roleFields = [
  { field: 'verifyFirstRoleId', label: '一审角色', level: CONSTANT.VERIFY_LEVEL.ONE_VERIFY },
  { field: 'verifySecondRoleId', label: '二审角色', level: CONSTANT.VERIFY_LEVEL.TWO_VERIFYS },
  { field: 'verifyThirdRoleId', label: '三审角色', level: CONSTANT.VERIFY_LEVEL.THREE_VERIFYS },
  { field: 'verifyFourthRoleId', label: '四审角色', level: CONSTANT.VERIFY_LEVEL.FOUR_VERIFYS },
  { field: 'verifyFifthRoleId', label: '五审角色', level: CONSTANT.VERIFY_LEVEL.FIVE_VERIFYS },
];

const form = reactive({
  verifyTypeId: null,
  schoolId: null,
  verifyFirstRoleId: null,
  verifySecondRoleId: null,
  verifyThirdRoleId: null,
  verifyFourthRoleId: null,
  verifyFifthRoleId: null,
  remarks: '',
});

const formRules = reactive({
  verifyTypeId: [{ required: true, message: '请选择审核级数', trigger: 'change' }],
  schoolId: [
    {
      validator: (_rule, value, callback) => {
        if (Number(form.verifyTypeId) === CONSTANT.VERIFY_LEVEL.NO_VERIFY) {
          callback();
          return;
        }
        if (normalizeId(value)) {
          callback();
          return;
        }
        callback(new Error('请选择合作高校（高校根部门）'));
      },
      trigger: 'change',
    },
  ],
});

function shouldShowRoleField(level) {
  return Number(form.verifyTypeId || 0) >= level;
}

function normalizeId(value) {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizeForm(data = {}) {
  form.verifyTypeId = normalizeId(data.verifyTypeId);
  form.schoolId = normalizeId(data.schoolId);
  form.verifyFirstRoleId = normalizeId(data.verifyFirstRoleId);
  form.verifySecondRoleId = normalizeId(data.verifySecondRoleId);
  form.verifyThirdRoleId = normalizeId(data.verifyThirdRoleId);
  form.verifyFourthRoleId = normalizeId(data.verifyFourthRoleId);
  form.verifyFifthRoleId = normalizeId(data.verifyFifthRoleId);
  form.remarks = data.remarks || '';
  updateRoleRules();
}

function updateRoleRules() {
  roleFields.forEach((item) => {
    if (shouldShowRoleField(item.level)) {
      formRules[item.field] = [{ required: true, message: `请选择${item.label}`, trigger: 'change' }];
    } else {
      delete formRules[item.field];
      form[item.field] = null;
    }
  });
}

function handleVerifyTypeChange() {
  updateRoleRules();
  formRef.value?.validateField?.('schoolId');
}

async function loadVerifyTypeOptions() {
  const res = await listAPI.getSomeRecords({
    keyWords: 'BaseVerifyType',
    pageInfo: { page: 1, size: 100 },
    sort: { properties: 'theOrder', direction: 'ASC' },
  });
  verifyTypeOptions.value = res?.data?.content || [];
}

async function loadRoleOptions() {
  const res = await listAPI.getSomeRecords({
    keyWords: 'SysRole',
    pageInfo: { page: 1, size: 200 },
    sort: { properties: 'id', direction: 'ASC' },
  });
  const list = res?.data?.content || [];
  roleOptions.value = list.filter((item) => !['超级管理员', '学生', '--'].includes(item.name));
}

async function loadConfig() {
  const res = await enterpriseInfoAPI.getVerifyConfig();
  normalizeForm(res?.data || {});
}

async function initPage() {
  loading.value = true;
  try {
    await Promise.all([loadVerifyTypeOptions(), loadRoleOptions(), loadConfig()]);
  } finally {
    loading.value = false;
  }
}

async function handleSave() {
  if (!canManageVerifyConfig.value) {
    ElMessage.warning('当前账号没有企业信息审核配置维护权限，请使用超级管理员账号操作');
    return;
  }

  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const node = {
      verifyTypeId: form.verifyTypeId,
      schoolId: normalizeId(form.schoolId) || 0,
      verifyFirstRoleId: form.verifyFirstRoleId || 0,
      verifySecondRoleId: form.verifySecondRoleId || 0,
      verifyThirdRoleId: form.verifyThirdRoleId || 0,
      verifyFourthRoleId: form.verifyFourthRoleId || 0,
      verifyFifthRoleId: form.verifyFifthRoleId || 0,
      remarks: form.remarks,
    };
    const res = await enterpriseInfoAPI.saveVerifyConfig(node);
    if (res?.message === 'successful') {
      ElMessage.success('配置保存成功');
      await loadConfig();
    }
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  initPage();
});
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-form {
  max-width: 720px;
}

.mb-16 {
  margin-bottom: 16px;
}
</style>
