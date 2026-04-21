<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'老师指定学生选题'"
    :no-project-message="'当前没有可指定的审核通过题目'"
    :pending-select-message="'当前实习项目：待选择'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    :process-type-code="CONSTANT.PROCESS_TYPE.INTERNAL_TEACHER_DECLARE_TOPIC"
    @view-click="handleViewClick"
    @edit-click="handleEditClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <DlgTopicDetail
        ref="dlgTopicDetailRef"
        :current-internship="currentInternship"
        @close-dialog="handleTopicDetailClose"
      />
      <DlgTopicStudentAssign
        ref="dlgTopicStudentAssignRef"
        :current-internship="currentInternship"
        @confirm="handleAssignStudentConfirm"
      />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgTopicDetail from '@/views/internship-process/components/DlgTopicDetail.vue';
import DlgTopicStudentAssign from '@/views/internship-process/components/DlgTopicStudentAssign.vue';
import CONSTANT from '@/utils/constant';
import { useProcessWindowProjectSelectKeys } from '@/utils/useProcessWindowProjectSelectKeys';
import listAPI from '@/api/list';

defineOptions({
  name: 'TeacherAssignStuTitle',
});

const store = useStore();
const headerPageRef = ref(null);
const dlgTopicDetailRef = ref(null);
const dlgTopicStudentAssignRef = ref(null);
const pendingAssignTopicRow = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});
const { projectSelectSearchKey, projectSelectRegKey } = useProcessWindowProjectSelectKeys(
  userInfo,
  true
);

const titleObj = reactive({
  mainTitle: '老师指定学生选题',
});

// 获取当前实习项目（从 headerPageRef）
const currentInternship = computed(() => {
  return headerPageRef.value?.currentInternship?.value || null;
});

// 与老师申报题目一致：当前实习项目 + 当前登录教师 + 审核通过（后端视图支持时生效）
function buildSearchKey(baseSearchKey) {
  return {
    internshipId: baseSearchKey.internshipId,
    teacherId: userInfo.value?.id,
    teacher_id: userInfo.value?.id,
    isAudit: CONSTANT.AUDIT_STATUS.PASS,
  };
}

function clientFilterFn(list) {
  const uid = Number(userInfo.value?.id || 0);
  const internshipId = Number(
    currentInternship.value?.internshipId ?? currentInternship.value?.id ?? 0
  );
  if (!uid || !Array.isArray(list)) return list || [];
  return list
    .filter((row) => {
      const teacherId = Number(row?.teacherId ?? row?.teacher_id ?? 0);
      if (teacherId !== uid) return false;
      if (internshipId) {
        const rowIid = Number(row?.internshipId ?? row?.internship_id ?? 0);
        if (rowIid && rowIid !== internshipId) return false;
      }
      const isAudit = row?.isAudit ?? row?.is_audit;
      if (isAudit != null && isAudit !== CONSTANT.AUDIT_STATUS.PASS) return false;
      return true;
    })
    .map((row) => {
      const isLimitValue = Number(row?.isLimit ?? row?.is_limit ?? 0);
      return {
        ...row,
        student_name: row?.student_name ?? row?.studentName ?? '--',
        isLimit: isLimitValue,
        is_limit: isLimitValue,
        isLimitText: isLimitValue === 1 ? '是' : '否',
      };
    });
}

// 处理项目选择后的回调
function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title;
}

// 查看按钮 - 只读查看题目详情
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  const relationId = row?.titleId ?? row?.title_id ?? row?.relationId ?? row?.relation_id ?? row?.id;
  const topicRow = { ...row, id: relationId };
  dlgTopicDetailRef.value?.showDialog(true, {}, topicRow, currentInternship.value, true);
}

function getTopicId(row) {
  return Number(
    row?.relationId ??
    row?.relation_id ??
    row?.titleId ??
    row?.title_id ??
    row?.id ??
    0
  ) || 0;
}

async function queryTitleStudentByTitleId(titleId) {
  if (!titleId) return null;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'RelTitleStudent',
      searchKey: { titleId },
      pageInfo: { page: 1, size: 1 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const list = res?.data?.content ?? res?.data ?? [];
    return list[0] || null;
  } catch (e) {
    console.error('查询题目绑定关系失败:', e);
    return null;
  }
}

async function queryTitleStudentByStuId(stuId, internshipId) {
  if (!stuId || !internshipId) return null;
  try {
    const relRes = await listAPI.getSomeRecords({
      keyWords: 'RelTitleStudent',
      searchKey: { stuId, stu_id: stuId },
      pageInfo: { page: 1, size: 200 },
      sort: { properties: 'id', direction: 'DESC' },
    });
    const relList = relRes?.data?.content ?? relRes?.data ?? [];
    if (!relList.length) return null;

    for (const rel of relList) {
      const titleId = rel?.titleId ?? rel?.title_id;
      if (!titleId) continue;
      const titleRes = await listAPI.getSomeRecords({
        keyWords: 'RelTitleTeacher',
        searchKey: { id: Number(titleId), internshipId },
        pageInfo: { page: 1, size: 1 },
      });
      const titleRow = (titleRes?.data?.content ?? titleRes?.data ?? [])[0];
      if (titleRow) {
        return {
          ...rel,
          titleName: titleRow.name,
        };
      }
    }
    return null;
  } catch (e) {
    console.error('查询学生绑定关系失败:', e);
    return null;
  }
}

async function handleEditClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  const topicId = getTopicId(row);
  if (!topicId) {
    ElMessage.warning('缺少题目ID');
    return;
  }

  const relation = await queryTitleStudentByTitleId(topicId);
  if (relation) {
    const stuId = relation?.stuId ?? relation?.stu_id;
    const studentName = stuId ? `ID:${stuId}` : '当前学生';
    try {
      await ElMessageBox.confirm(`该题目已指定给“${studentName}”，确认取消指定吗？`, '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return;
    }
    const ok = await cancelAssignTopic(topicId, relation.id);
    if (ok) {
      ElMessage.success('取消指定成功');
      headerPageRef.value?.baseListRef?.initDataList?.(true);
    }
    return;
  }

  pendingAssignTopicRow.value = row;
  dlgTopicStudentAssignRef.value?.showDialog?.(true, row);
}

async function cancelAssignTopic(topicId, relationId) {
  try {
    if (relationId) {
      const delRes = await listAPI.delOneOrManyNodes('RelTitleStudent', [Number(relationId)]);
      if (!delRes || delRes.message !== 'successful') {
        ElMessage.error(delRes?.message || '取消指定失败');
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error('取消指定失败:', e);
    ElMessage.error('取消指定失败');
    return false;
  }
}

async function handleAssignStudentConfirm(studentRow) {
  const topicRow = pendingAssignTopicRow.value;
  const topicId = getTopicId(topicRow);
  const internshipId = Number(
    topicRow?.internshipId ??
    topicRow?.internship_id ??
    currentInternship.value?.internshipId ??
    currentInternship.value?.id ??
    currentInternship.value?.mainInternshipId ??
    currentInternship.value?.main_internship_id ??
    0
  ) || 0;
  const stuId = Number(studentRow?.stu_id ?? studentRow?.id ?? studentRow?.userId ?? studentRow?.ID ?? 0) || 0;

  if (!topicId || !internshipId || !stuId) {
    console.warn('指定失败-缺少参数', { topicId, internshipId, stuId, topicRow, studentRow, currentInternship: currentInternship.value });
    ElMessage.warning('缺少必要参数，无法完成指定');
    return;
  }

  const titleRelation = await queryTitleStudentByTitleId(topicId);
  if (titleRelation) {
    ElMessage.warning('该题目已被分配，请刷新后重试');
    headerPageRef.value?.baseListRef?.initDataList?.(true);
    return;
  }

  const studentRelation = await queryTitleStudentByStuId(stuId, internshipId);
  if (studentRelation) {
    ElMessage.warning(`该学生已拥有题目：${studentRelation.titleName || studentRelation.name || '未知题目'}`);
    return;
  }

  let relationId = null;
  try {
    const createRes = await listAPI.editOneNode('RelTitleStudent', {
      stuId,
      stu_id: stuId,
      titleId: topicId,
      currentVerifyTypeId: CONSTANT.VERIFY_LEVEL.NO_VERIFY,
    });
    if (!createRes || createRes.message !== 'successful') {
      ElMessage.error(createRes?.message || '指定失败');
      return;
    }
    relationId = createRes?.data?.id;

    ElMessage.success('指定成功');
    headerPageRef.value?.baseListRef?.initDataList?.(true);
  } catch (e) {
    console.error('指定学生失败:', e);
    ElMessage.error('指定失败');
  } finally {
    pendingAssignTopicRow.value = null;
  }
}

function handleTopicDetailClose() {}

function generateTitleWithDate(internship) {
  if (!internship) return '';
  const name = internship.internshipName || internship.name;
  if (!name) return '';
  const start = internship.startTime ? moment(internship.startTime).format('YYYY-MM-DD') : '';
  const end = internship.endTime ? moment(internship.endTime).format('YYYY-MM-DD') : '';
  if (start && end) {
    return `当前实习项目：${name}（${start}到${end}）`;
  }
  return `当前实习项目：${name}`;
}

watch(currentInternship, (internship) => {
  if (!internship) return;
  titleObj.mainTitle = generateTitleWithDate(internship);
}, { immediate: true });

// 按钮配置
const buttonPropsComputed = computed(() => ({
  visible: { show: true, type: 'primary', name: '查看' },
  update: { show: true, type: 'primary', name: '指定/取消指定' },
}));

const getRowClassName = ({ row }) => {
  const studentName = row?.student_name ?? row?.studentName;
  return studentName && studentName !== '--' ? 'selected-post-row' : '';
};

const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value ?? false);

const defaultDTLProps = computed(() => ({
  title: titleObj,
  someFlags: {
    autoInit: false,
    checkFlag: false,
  },
  clientFilterFn,
  enableAuditStatusCustom: true,
  rowClassName: getRowClassName,
  defaultDTHProps: {
    buttonProps: {
      ...buttonPropsComputed.value,
      more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
    },
    keyWord: { edit: 'RelTitleStudent', view: 'ViewRelTitleTeacherStudent' },
    allTableColumns: [
      { id: 1, showName: '题目名称', tableColumnName: 'name', sortable: true },
      { id: 2, showName: '题目详情', tableColumnName: 'remarks', sortable: true },
      { id: 3, showName: '学生姓名', tableColumnName: 'student_name', sortable: false },
      { id: 5, showName: '学号', tableColumnName: 'studentAccount', sortable: false },
      { id: 4, showName: '是否限选', tableColumnName: 'isLimitText', sortable: false },
    ],
  },
  defaultDBIProps: {},
}));

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  dlgTopicDetailRef,
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>

<style scoped>
:deep(.selected-post-row) {
  background-color: #e6f7ff !important;
  font-weight: bold !important;
}
:deep(.selected-post-row:hover) {
  background-color: #bae7ff !important;
}
:deep(.selected-post-row td) {
  font-weight: bold !important;
}
</style>
