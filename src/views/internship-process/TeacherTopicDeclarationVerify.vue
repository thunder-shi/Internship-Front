<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'题目申报审核'"
    :no-project-message="'当前没有可审核题目的实习项目'"
    :pending-select-message="'当前实习项目：待选择'"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_DECLARE_TOPIC"
    @audit-click="handleAuditClick"
    @audit-command="handleBatchAuditCommand"
    @edit-click="handleEditClick"
    @view-click="handleViewClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgVerify ref="dlgVerifyRef" @success="handleVerifySuccess" />
      <DlgTopicDetail ref="dlgTopicDetailRef" :current-internship="currentInternship" />
      <DlgVerifyProgress
        v-model="showProgressDialog"
        :main-internship-id="currentRow.internshipId"
        :process-info="currentRow"
        key-words="ViewVerifyProcessRelTeacherStudent"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerify from '@/views/internship-process/components/DlgVerify.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import DlgTopicDetail from './components/DlgTopicDetail.vue';
import CONSTANT from '@/utils/constant';
import internshipProcessAPI from '@/api/internshipProcess';
import listAPI from '@/api/list';

defineOptions({
  name: 'TeacherTopicDeclarationVerify',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgVerifyRef = ref(null);
const dlgTopicDetailRef = ref(null);

const showProgressDialog = ref(false);
const currentRow = ref({});

const userInfo = computed(() => store.getters.userInfo || {});
const titleObj = reactive({ mainTitle: '题目申报审核' });

const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value ?? null);
const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value ?? false);

// 精确检查 verifyUserId 是否包含指定的用户ID（与企业岗位审核一致）
function isUserIdInVerifyUserId(verifyUserId, userId) {
  if (!verifyUserId || !userId) return false;
  const userIdStr = String(userId);
  const verifyUserIdStr = String(verifyUserId);
  const ids = verifyUserIdStr.split('|').filter((id) => id !== '');
  return ids.includes(userIdStr);
}

// 客户端过滤：按题目(relationId)去重——同一题目只保留一条待审记录，避免一题多行
//（不再按 verifyUserId 过滤，防止看不到记录）
function clientFilterFn(dataList) {
  if (!Array.isArray(dataList)) return dataList;
  const seenRelationId = new Set();
  return dataList.filter((item) => {
    const rid = item?.relationId != null ? String(item.relationId) : '';
    if (seenRelationId.has(rid)) return false;
    seenRelationId.add(rid);
    return true;
  });
}

function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title;
}

// 只查询待审核（0）记录
function buildSearchKey(baseSearchKey) {
  return {
    ...baseSearchKey,
    isAudit: CONSTANT.AUDIT_STATUS.SUBMIT,
  };
}

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: { autoInit: false },
  // 审核页的按题目(relationId)去重逻辑通过 clientFilterFn 传给 BaseList/DataTableList
  clientFilterFn,
  enableAuditStatusCustom: true,
  defaultDTHProps: {
    buttonProps: {
      audit: { show: true, showPass: true, showNotPass: true, showBack: true },
      update: { show: true, type: 'primary', name: '查看题目详情' },
      visible: { show: true, type: 'primary', name: '查看审核进度' },
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    // 审核页：不提供新增/删除/提交
    keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelTeacherStudent' },
    allTableColumns: [
      { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 2, showName: '申报教师', tableColumnName: 'teacherName', sortable: true },
      { id: 3, showName: '创建时间', tableColumnName: 'createTime', sortable: true },
      //{ id: 4, showName: '审核要求', tableColumnName: 'current_verify_type_name', sortable: true },
      { id: 5, showName: '状态', tableColumnName: 'customize-status' },
    ],
  },
  defaultDBIProps: {},
}));

function handleAuditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;
  dlgVerifyRef.value?.showDialog(true, selectedRow);
}

// 查看题目详情：打开只读弹窗（row.id 为审核记录 id，题目 id 在 relationId）
async function handleEditClick(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  if (!selectedRow) return;
  const topicId = selectedRow.relationId;
  if (topicId == null) {
    ElMessage.warning('缺少题目ID，无法打开详情');
    return;
  }

  // 先用审核视图中的字段构建基础对象
  let topicRow = {
    id: topicId,
    name: selectedRow.name,
    internshipId: selectedRow.internshipId,
    internshipName: selectedRow.internshipName,
  };

  // 尝试从 ViewRelTeacherStudent 再查一遍，补齐 remarks（题目详情）
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelTeacherStudent',
      pageInfo: { page: 1, size: 1 },
      searchKey: { id: topicId },
    });
    const fullRow = res?.data?.content?.[0];
    if (fullRow) {
      topicRow = {
        ...topicRow,
        ...fullRow,
      };
    }
  } catch (e) {
    console.error('加载题目详情失败:', e);
  }

  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, currentInternship.value, true);
}

function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  if (!row) return;
  currentRow.value = {
    ...row,
    relationId: row.relationId,
  };
  showProgressDialog.value = true;
}

// 批量审核处理：根据下拉选择的审核结果，对选中记录统一审核
async function handleBatchAuditCommand(command, rows) {
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  if (!list.length) {
    ElMessage.warning('请先勾选要审核的记录');
    return;
  }

  // 仅处理当前为待审核的记录
  const targetList = list.filter((r) => r && r.isAudit === CONSTANT.AUDIT_STATUS.SUBMIT);
  if (!targetList.length) {
    ElMessage.warning('选中的记录中没有待审核的数据');
    return;
  }

  const textMap = {
    [CONSTANT.AUDIT_STATUS.PASS]: CONSTANT.AUDIT_STATUS.PASSNAME,
    [CONSTANT.AUDIT_STATUS.NOTPASS]: CONSTANT.AUDIT_STATUS.NOTPASSNAME,
    [CONSTANT.AUDIT_STATUS.BACK]: CONSTANT.AUDIT_STATUS.BACKNAME,
  };

  // 统一输入审核理由，应用到所有选中记录
  let reason;
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入审核理由（将应用于所有选中记录）：',
      '批量审核',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputValue: textMap[command] || '',
      }
    );
    reason = value != null ? String(value).trim() : '';
  } catch {
    return;
  }

  if (!reason) {
    ElMessage.warning('审核理由不能为空');
    return;
  }

  const uid = userInfo.value?.id;
  if (!uid) {
    ElMessage.error('无法获取当前用户信息，请重新登录');
    return;
  }

  let successCount = 0;
  for (const row of targetList) {
    const saveData = {
      id: row.id,
      isAudit: command,
      reason,
      verifyUserId: parseInt(uid, 10),
    };
    try {
      const res = await internshipProcessAPI.auditProcess(saveData);
      if (res && res.message === 'successful') {
        successCount += 1;
      }
    } catch (e) {
      console.error('批量审核失败记录:', row.id, e);
    }
  }

  if (successCount > 0) {
    ElMessage.success(`批量审核完成，成功 ${successCount} 条`);
    headerPageRef.value?.baseListRef?.initDataList?.(true);
  } else {
    ElMessage.warning('批量审核未成功，请稍后重试');
  }
}

function handleVerifySuccess() {
  headerPageRef.value?.baseListRef?.initDataList?.(true);
}
</script>
