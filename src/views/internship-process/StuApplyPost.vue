<template>
  <el-result
    v-if="internshipType === null"
    icon="info"
    title="未到时间，请等候学校通知"
  />
  <InternshipPostHeaderPage
    v-else-if="ready"
    ref="headerPageRef"
    :page-title="'学生岗位报名'"
    :no-project-message="'未安排实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @view-click="handleViewClick"
    @submit-click="handleSubmitClick"
    @project-selected="handleProjectSelected"
  >
    <!-- 已报名模式：行操作列中的"岗位详情"按钮 -->
    <template v-if="hasApplication" #rightOperate="{ row }">
      <el-button type="info" size="small" title="岗位详情" @click="handleViewPostDetail(row)">
        <el-icon><InfoFilled /></el-icon>
      </el-button>
    </template>
    <template #dialogs>
      <!-- 岗位详情对话框（只读） -->
      <DlgPostDetail ref="dlgPostDetail" :current-internship="currentInternship"
        :custom-foot-button="rollbackButton" @success="handleRollbackSuccess" />
      <!-- 审核进度对话框 -->
      <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId"
        :process-info="currentRow" key-words="ViewVerifyProcessRelStuInternshipPost" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue'; // used in template #rightOperate
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgPostDetail from '@/views/internship-process/components/DlgPostDetail.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';
import treeAPI from '@/api/tree';

defineOptions({ name: 'StuApplyPost' });

const store = useStore();
const headerPageRef = ref(null);
const dlgPostDetail = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});
const internshipType = computed(() => store.getters.studentInternshipType);
const { getVerifyRoleName } = useVerifyFilter();

const titleObj = reactive({ mainTitle: '学生岗位报名' });

// 学生已分配的实习项目 ID 列表（从 RelIntershipUser 查询）
const studentInternshipIds = ref([]);
// 学生专业及所有祖先专业 ID（用于匹配项目允许的专业，支持层级匹配）
const expandedMajorIds = ref([]);
const ready = ref(false);

async function loadStudentAssignment() {
  const userId = userInfo.value?.id;
  if (!userId) { ready.value = true; return; }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'RelIntershipUser',
      searchKey: { userId },
    });
    const records = res?.data?.content || res?.data || [];
    studentInternshipIds.value = records.map(r => r.internshipId).filter(Boolean);
  } catch (e) {
    console.error('查询学生分配记录失败:', e);
  }
}

// 加载学生专业的所有祖先 ID（含自身），实现层级专业匹配
// 例如：学生是"软件工程"(id=15)，其父节点"计算机类"(id=10) → expandedMajorIds = [15, 10, ...]
async function loadExpandedMajorIds() {
  const majorId = userInfo.value?.majorId;
  if (!majorId) return;
  try {
    const res = await treeAPI.getAllParentIndex('BaseMajor', majorId);
    if (res.data && res.data.length > 0) {
      expandedMajorIds.value = res.data.map(item => item.id).filter(Boolean);
    } else {
      expandedMajorIds.value = [majorId];
    }
  } catch (e) {
    console.error('加载专业层级失败:', e);
    expandedMajorIds.value = [majorId];
  }
}

onMounted(async () => {
  await Promise.all([loadStudentAssignment(), loadExpandedMajorIds()]);
  ready.value = true;
});

// 当前已报名的岗位信息
const currentSelectedPost = ref(null);
const hasApplication = computed(() => !!currentSelectedPost.value);

// 审核进度对话框
const showProgressDialog = ref(false);
const currentRow = ref({});

// 当前实习项目
const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value || null);

// 实习项目选择条件（加上学生分配的 internshipId 过滤）
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELECT_POST,
    startTime: currentTime,
    endTime: currentTime,
  };
  if (studentInternshipIds.value.length > 0) {
    searchKey.internshipId = studentInternshipIds.value.join(',');
  }
  if (expandedMajorIds.value.length > 0) {
    searchKey.majorIds = expandedMajorIds.value.join(',');
  }
  return searchKey;
});

const projectSelectRegKey = computed(() => {
  const regKey = {
    startTime: CONSTANT.SEARCH_OPERATOR.LE,
    endTime: CONSTANT.SEARCH_OPERATOR.GE,
  };
  if (studentInternshipIds.value.length > 0) {
    regKey.internshipId = CONSTANT.SEARCH_OPERATOR.IN;
  }
  if (expandedMajorIds.value.length > 0) {
    regKey.majorIds = 'fi()';
  }
  return regKey;
});

// 根据是否已报名切换查询条件
function buildSearchKey(baseSearchKey) {
  if (hasApplication.value) {
    // 已报名：查询学生自己的报名记录
    return { internshipId: baseSearchKey.internshipId, studentId: userInfo.value?.id };
  }
  // 未报名：查询所有审核通过的岗位
  return { ...baseSearchKey, isAudit: CONSTANT.AUDIT_STATUS.PASS };
}

// 浏览模式：只显示未报满的岗位
function filterAvailablePosts(dataList) {
  return dataList.filter(row => (row.nowPersonNum || 0) < (row.allPersonNum || 0));
}

// 已报名模式：只显示有效的报名记录（SAVE/SUBMIT/PASS），过滤掉历史退回/不通过
const ACTIVE_STATUSES = [CONSTANT.AUDIT_STATUS.SAVE, CONSTANT.AUDIT_STATUS.SUBMIT, CONSTANT.AUDIT_STATUS.PASS];
function filterActiveApplications(dataList) {
  return dataList.filter(row => ACTIVE_STATUSES.includes(row.isAudit));
}

// 查询学生是否已报名
async function querySelectedPost(internshipId, studentId) {
  if (!internshipId || !studentId) return null;
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPost',
      searchKey: { internshipId, studentId },
    });
    const dataList = response?.data?.content || response?.data || [];
    if (dataList.length === 0) return null;
    const record = dataList[0];
    // 只有 SAVE/SUBMIT/PASS 视为有效报名，BACK/NOTPASS 视为无效（回到浏览模式）
    const ACTIVE = [CONSTANT.AUDIT_STATUS.SAVE, CONSTANT.AUDIT_STATUS.SUBMIT, CONSTANT.AUDIT_STATUS.PASS];
    return ACTIVE.includes(record.isAudit) ? record : null;
  } catch {
    return null;
  }
}

// 项目选择后回调：查询报名状态，按需刷新
async function handleProjectSelected(internship, title) {
  if (title) titleObj.mainTitle = title;

  if (internship?.internshipId || internship?.id) {
    const internshipId = internship.internshipId || internship.id;
    const post = await querySelectedPost(internshipId, userInfo.value?.id);
    currentSelectedPost.value = post;
    // 如果已报名，需要用学生报名视图重新刷新（初次加载用的是岗位视图）
    if (post) {
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    }
  } else {
    currentSelectedPost.value = null;
  }
}

// 报名按钮（仅浏览模式）
async function handleSubmitClick(row) {
  await handleApply(row);
}

// 报名
async function handleApply(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  const nowPersonNum = selectedRow.nowPersonNum || 0;
  const allPersonNum = selectedRow.allPersonNum || 0;
  if (nowPersonNum >= allPersonNum) {
    ElMessage.warning('当前岗位已经选满，无法报名！');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定报名「${selectedRow.internshipPostName || ''}」岗位吗？`,
      '确认报名', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' },
    );
  } catch { return; }

  try {
    const response = await otherAPI.stuSelPost(userInfo.value?.id, 0, Number(selectedRow.internshipPostId) || 0);
    if (response?.message === 'successful') {
      ElMessage.success('报名成功');
      currentSelectedPost.value = response.data || selectedRow;
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    }
  } catch (e) {
    console.error('报名失败:', e);
  }
}

// 自动通过的报名记录：在详情对话框中显示"退回报名"按钮
const rollbackButton = {
  name: '退回报名',
  type: 'warning',
  show: (rowData) => {
    return rowData?.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
      rowData?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY;
  },
  action: async (rowData) => {
    try {
      await ElMessageBox.confirm('确定退回该报名吗？退回后可以重新选择岗位。', '确认退回', {
        confirmButtonText: '确定退回', cancelButtonText: '取消', type: 'warning',
      });
    } catch { return false; }
    try {
      const postId = rowData?.internshipPostId || rowData?.relationId;
      const response = await otherAPI.stuSelPost(userInfo.value?.id, postId, 0);
      if (response?.message === 'successful') {
        ElMessage.success('退回成功，可以重新选择岗位');
        return true;
      }
    } catch (e) {
      console.error('退回失败:', e);
    }
    return false;
  },
};

function handleRollbackSuccess() {
  currentSelectedPost.value = null;
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
}

// 查看岗位详情（只读，从行操作列触发）
function handleViewPostDetail(row) {
  if (!row) return;
  const detailRow = { ...row, id: row.internshipPostId || row.relationId };
  dlgPostDetail.value?.showDialog(true, {}, detailRow, true);
}

// 查看审核进度
function handleViewClick(rowOrArray) {
  const row = Array.isArray(rowOrArray) ? rowOrArray[0] : rowOrArray;
  currentRow.value = row ? { ...row } : {};
  showProgressDialog.value = true;
}

// 动态 DTL 配置：根据是否已报名切换视图、按钮、列
const defaultDTLProps = computed(() => {
  const common = {
    title: titleObj,
    someFlags: { autoInit: false },
  };

  // 两个模式声明相同的按钮 key，用 show 控制显隐
  const applied = hasApplication.value;

  return {
    ...common,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    clientFilterFn: applied ? filterActiveApplications : filterAvailablePosts,
    defaultDTHProps: {
      buttonProps: {
        visible: { show: applied, type: 'primary', name: '查看进度' },
        submit: { show: !applied, type: 'success', name: '报名' },
        buttonGroup: { show: false },
      },
      keyWord: {
        edit: 'MainVerifyProcess',
        view: applied ? 'ViewVerifyProcessRelStuInternshipPostMerge' : 'ViewVerifyProcessInternshipPostMerge',
      },
      allTableColumns: applied
        ? [
            { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
            { id: 2, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
            { id: 3, showName: '状态', tableColumnName: 'customize-status' },
          ]
        : [
            { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
            { id: 2, showName: '岗位编码', tableColumnName: 'internshipPostCode', sortable: true },
            { id: 3, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
            { id: 4, showName: '岗位总人数', tableColumnName: 'allPersonNum', sortable: true },
            { id: 5, showName: '已选人数', tableColumnName: 'nowPersonNum' },
          ],
    },
    defaultDBIProps: {},
  };
});

defineExpose({
  baseListRef: computed(() => headerPageRef.value?.baseListRef),
  currentInternship,
  updateSearchWordsAndRefresh: () => headerPageRef.value?.updateSearchWordsAndRefresh(),
});
</script>
