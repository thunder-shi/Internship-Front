<template>
  <div>
    <InternshipPostPage ref="internshipPostPageRef" :page-title="'选择指导老师'" :no-project-message="'当前没有可选择指导老师的实习项目'"
      :table-columns="tableColumns" :process-type-code="processTypeCode" :button-props-fn="getButtonProps"
      :button-condition="buttonCondition" :build-search-key="buildSearchKey" :is-company-user="isCompanyUser"
      :key-word="keyWord" @append-click="handleAppendClick" @delete-click="handleDeleteClick"
      @submit-click="handleSubmitClick" />
    <slot name="dlg">
      <DlgTeacherSelect v-model="dlgTeacherSelectVisible" :internship-id="dlgTeacherSelectInternshipId"
        @success="onTeacherSelectSuccess" />
    </slot>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { useStore } from 'vuex';
import InternshipPostPage from '@/views/master-page/InternshipPostPage.vue';
import DlgTeacherSelect from './components/DlgTeacherSelect.vue';
import CONSTANT from '@/utils/constant';
import listAPI from '@/api/list';

defineOptions({
  name: 'TeacherAssignment',
});

const internshipPostPageRef = ref(null);
const store = useStore();
const roles = computed(() => store.getters.roles || []);
const isCompanyUser = computed(() =>
  roles.value.some(
    (r) => r === CONSTANT.ROLE_TABLE.COMPANY_ADMIN || r === CONSTANT.ROLE_TABLE.COMPANY_TUTOR
  )
);

const processTypeCode = CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_SELECT_PROJECT;

const tableColumns = [
  { id: 1, showName: '指导老师', tableColumnName: 'userName', sortable: true },
  { id: 1, showName: '审核要求', tableColumnName: 'verifyTypeName', sortable: true },
];

const keyWord = { edit: 'RelIntershipUser', view: 'ViewRelIntershipUser' };

const dlgTeacherSelectVisible = ref(false);
const dlgTeacherSelectInternshipId = ref(null);

function onTeacherSelectSuccess() {
  internshipPostPageRef.value?.baseListRef?.initDataList(true);
}
// 按钮配置函数
function getButtonProps(currentInternship, isMore1Disabled) {
  return {
    create: { show: true, disabled: !currentInternship || !currentInternship.internshipId },
    submit: { show: true },
    delete: { show: true },
    more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled },
  };
}

// 按钮条件配置
const buttonCondition = {
  update: (row) => {
    const isAudit = row?.isAudit;
    // 只有待提交(SAVE=-1)、审核退回(BACK=3)或未设置状态时可以修改
    return (
      isAudit === null ||
      isAudit === undefined ||
      isAudit === CONSTANT.AUDIT_STATUS.SAVE ||
      isAudit === CONSTANT.AUDIT_STATUS.BACK
    );
  },
};

function buildSearchKey(baseSearchKey) {
  return { processTypeCode, internshipId: baseSearchKey.internshipId };
}

function handleAppendClick(currentInternship) {
  if (!currentInternship || !currentInternship.internshipId) {
    ElMessage.warning('请先选择实习项目');
    return;
  }
  dlgTeacherSelectInternshipId.value = currentInternship.internshipId;
  dlgTeacherSelectVisible.value = true;
}

async function handleDeleteClick(rows) {
  const rowsToDelete = Array.isArray(rows) ? rows : [rows];
  if (!rowsToDelete?.length) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }
  const ids = rowsToDelete.map((row) => row.id).filter((id) => id != null);
  if (!ids.length) return;
  try {
    const res = await listAPI.delOneOrManyNodes('RelIntershipUser', ids);
    if (res?.message === 'successful') {
      ElMessage.success('删除成功');
      internshipPostPageRef.value?.baseListRef?.initDataList(true);
    } else {
      ElMessage.error(res?.message || '删除失败');
    }
  } catch (e) {
    console.error('删除失败:', e);
    ElMessage.error('删除失败');
  }
}

function handleSubmitClick(row) {
  console.log(row);

  return
  updateVerifyProcess(row.id, CONSTANT.AUDIT_STATUS.SUBMIT);
}

async function updateVerifyProcess(id, isAudit) {
  try {
    // 更新流程状态到 MainVerifyProcess
    const resInfo = await listAPI.editOneNode('MainVerifyProcess', {
      id: id,
      isAudit: isAudit
    });
    if (resInfo && resInfo.message === 'successful') {
      return true;
    } else {
      ElMessage.warning(resInfo?.message || '更新审核状态失败');
      return false;
    }
  } catch (error) {
    // axios 拦截器已经处理了错误提示，这里不需要重复显示
    console.error('更新审核状态失败:', error);
    return false;
  }
} 
</script>
