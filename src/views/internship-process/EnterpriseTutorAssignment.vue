<template>
  <TutorAssignmentBase
    ref="baseRef"
    :process-type-code="processTypeCode"
    page-title="分配企业导师"
    no-project-message="当前没有可分配企业导师的实习项目"
    main-title="分配企业导师"
    :list-key-word="TUTOR_ASSIGNMENT_ENTERPRISE_LIST_KEY_WORD"
    system-assign-mode="autoOnEmpty"
    :submit-row-condition="submitRowCondition"
  >
    <template #rightOperate="{ row }">
      <el-button
        type="primary"
        size="small"
        circle
        title="分配企业导师"
        :disabled="row.isAudit != CONSTANT.AUDIT_STATUS.SAVE"
        @click="openAssignEnterpriseTutor(row)"
      >
        <el-icon>
          <Avatar />
        </el-icon>
      </el-button>
    </template>

    <template #dialogsExtra>
      <SimpleDialog
        ref="assignDlgRef"
        :default-props="assignDialogProps"
        :simpledialog-confirm="confirmAssignEnterpriseTutor"
      />
    </template>
  </TutorAssignmentBase>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import CONSTANT from '@/utils/constant';
import { TUTOR_ASSIGNMENT_ENTERPRISE_LIST_KEY_WORD } from './config/assignmentPresets';
import listAPI from '@/api/list';
import internshipProcessAPI from '@/api/internshipProcess';
import SimpleDialog from '@/components/SimpleDialog.vue';
import { Avatar } from '@element-plus/icons-vue';
import TutorAssignmentBase from './components/TutorAssignmentBase.vue';

defineOptions({
  name: 'EnterpriseTutorAssignment',
});

const baseRef = ref(null);
const store = useStore();

const processTypeCode = CONSTANT.PROCESS_TYPE.EXTERNAL_ENTERPRISE_ASSIGN_TUTOR;

/** 未分配企业导师（无 teacherId）时不允许点操作栏「提交」 */
const submitRowCondition = (row) => {
  if (row?.isAudit !== CONSTANT.AUDIT_STATUS.SAVE) return false;
  const tid = row?.teacherId ?? row?.teacher_id;
  return tid !== undefined && tid !== null && tid !== '';
};

const assignDlgRef = ref(null);
const assignTargetRow = ref(null);

const assignDialogProps = reactive({
  dlgTitle: '分配企业导师',
  keyWord: ' ',
  formItems: [
    {
      name: '企业导师',
      field: 'teacherId',
      type: 'select_noremote',
      options: [],
    },
  ],
  formRules: {
    teacherId: [{ required: true, message: '请选择企业导师', trigger: 'change' }],
  },
  defaultDBProps: {
    footButtons: {
      repeatAdd: { show: false },
    },
  },
});

async function openAssignEnterpriseTutor(row) {
  assignTargetRow.value = row;
  const schoolId = store.getters.userInfo?.schoolId;
  if (!schoolId) {
    ElMessage.warning('当前账号缺少 schoolId，无法筛选企业导师');
    return;
  }

  const relId = row?.relationId;
  if (!relId) {
    ElMessage.warning('当前行缺少 relationId，无法更新师生关系');
    return;
  }

  try {
    const resp = await listAPI.getSomeRecords({
      keyWords: 'ViewBaseUser',
      searchKey: { jobCode: 'COMPANY_TUTOR', schoolId },
      reg: {
        jobCode: CONSTANT.SEARCH_OPERATOR.EQ,
        schoolId: CONSTANT.SEARCH_OPERATOR.EQ,
      },
    });
    const list = resp?.data?.content || [];
    if (!list.length) {
      ElMessage.warning('未找到符合条件的企业导师');
      return;
    }

    assignDialogProps.formItems[0].options = list.map((u) => ({
      id: u.id,
      name: u.name || u.account || String(u.id),
    }));
    assignDlgRef.value?.showDialog(true, {}, true);
  } catch (error) {
    console.error('加载企业导师列表失败:', error);
    ElMessage.error('加载企业导师列表失败');
  }
}

async function confirmAssignEnterpriseTutor(_option, _type, form) {
  const row = assignTargetRow.value;
  const relId = row?.relationId;
  const mainRowId = row?.id;
  if (!relId) {
    ElMessage.warning('缺少 relationId');
    return false;
  }
  if (!mainRowId) {
    ElMessage.warning('当前记录缺少流程ID');
    return false;
  }

  const teacherId = form?.teacherId;
  if (teacherId === undefined || teacherId === null || teacherId === '') {
    ElMessage.warning('请选择企业导师');
    return false;
  }

  const cur = baseRef.value?.getCurrentInternship?.();
  const internshipId = Number(cur?.internshipId ?? cur?.id);
  const createUserId = Number(store.getters.userInfo?.id);
  const verifyRoleId = cur?.verifyFirstRoleId;
  if (!internshipId || Number.isNaN(internshipId)) {
    ElMessage.warning('请先选择实习项目');
    return false;
  }
  if (!createUserId || Number.isNaN(createUserId)) {
    ElMessage.warning('无法获取当前用户信息');
    return false;
  }

  try {
    const verifyResp = await internshipProcessAPI.getVerifyUserIds({
      verifyRoleId,
      createUserId,
      internshipId,
    });
    const verifyUserId = verifyResp?.data ?? verifyResp;
    const res = await listAPI.editOneNode('RelTeacherStudent', {
      id: relId,
      teacherId,
    });
    if (!res || res.message !== 'successful') {
      ElMessage.warning(res?.message || '保存失败');
      return false;
    }
    const resMvp = await listAPI.editOneNode('MainVerifyProcess', {
      id: mainRowId,
      createUserId,
      verifyUserId,
    });
    if (!resMvp || resMvp.message !== 'successful') {
      ElMessage.warning(resMvp?.message || '更新审核流程失败');
      return false;
    }

    ElMessage.success('分配成功');
    await baseRef.value?.refreshList?.();
    return true;
  } catch (error) {
    console.error('保存企业导师失败:', error);
    return false;
  }
}
</script>
