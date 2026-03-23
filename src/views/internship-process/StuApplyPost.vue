<template>
  <InternshipPostHeaderPage
    ref="headerPageRef"
    :page-title="'学生岗位报名'"
    :no-project-message="'当前没有可报名岗位的实习项目'"
    :project-select-search-key="projectSelectSearchKey"
    :project-select-reg-key="projectSelectRegKey"
    :default-d-t-l-props="defaultDTLProps"
    :build-search-key="buildSearchKey"
    :is-company-user="false"
    @view-click="handleViewClick"
    @submit-click="handleSubmitClick"
    @project-selected="handleProjectSelected"
  >
    <template #dialogs>
      <!-- 审核进度对话框 -->
      <DlgVerifyProgress v-model="showProgressDialog" :main-internship-id="currentRow.internshipId"
        :process-info="currentRow" key-words="ViewVerifyProcessRelStuInternshipPost" />
    </template>
  </InternshipPostHeaderPage>
</template>

<script setup>
import { reactive, ref, computed } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import moment from 'moment';
import InternshipPostHeaderPage from '@/views/master-page/InternshipPostHeaderPage.vue';
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue';
import CONSTANT from '@/utils/constant';
import { useVerifyFilter } from '@/utils/useVerifyFilter';
import listAPI from '@/api/list';
import otherAPI from '@/api/other';

defineOptions({ name: 'StuApplyPost' });

const store = useStore();
const headerPageRef = ref(null);

const userInfo = computed(() => store.getters.userInfo || {});
const { getVerifyRoleName } = useVerifyFilter();

const titleObj = reactive({ mainTitle: '学生岗位报名' });

// 当前已报名的岗位信息
const currentSelectedPost = ref(null);
const hasApplication = computed(() => !!currentSelectedPost.value);

// 审核进度对话框
const showProgressDialog = ref(false);
const currentRow = ref({});

// 当前实习项目
const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value || null);
const isMore1Disabled = computed(() => headerPageRef.value?.isMore1Disabled?.value || false);

// 实习项目选择条件
const projectSelectSearchKey = computed(() => {
  const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
  const searchKey = {
    processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELECT_POST,
    startTime: currentTime,
    endTime: currentTime,
  };
  if (userInfo.value?.majorId) {
    searchKey.majorIds = userInfo.value.majorId;
  }
  return searchKey;
});

const projectSelectRegKey = computed(() => {
  const regKey = {
    startTime: CONSTANT.SEARCH_OPERATOR.LE,
    endTime: CONSTANT.SEARCH_OPERATOR.GE,
  };
  if (userInfo.value?.majorId) {
    regKey.majorIds = CONSTANT.SEARCH_OPERATOR.IN;
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

// 查询学生是否已报名
async function querySelectedPost(internshipId, studentId) {
  if (!internshipId || !studentId) return null;
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPost',
      searchKey: { internshipId, studentId },
    });
    const dataList = response?.data?.content || response?.data || [];
    return dataList.length > 0 ? dataList[0] : null;
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

// submit 按钮：浏览模式 = "报名"，已报名模式 = "退回"
async function handleSubmitClick(row) {
  if (!hasApplication.value) {
    await handleApply(row);
  } else {
    await handleRollback(row);
  }
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

// 退回（取消报名）
async function handleRollback(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;
  try {
    await ElMessageBox.confirm('确定退回该报名吗？退回后可以重新选择岗位。', '确认退回', {
      confirmButtonText: '确定退回', cancelButtonText: '取消', type: 'warning',
    });
  } catch { return; }

  try {
    const postId = selectedRow.internshipPostId || currentSelectedPost.value?.internshipPostId;
    const response = await otherAPI.stuSelPost(userInfo.value?.id, postId, 0);
    if (response?.message === 'successful') {
      ElMessage.success('退回成功，可以重新选择岗位');
      currentSelectedPost.value = null;
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    }
  } catch (e) {
    console.error('退回失败:', e);
  }
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

  if (hasApplication.value) {
    // ── 已报名模式：显示学生的报名记录 + 审核状态 ──
    return {
      ...common,
      enableAuditStatusCustom: true,
      getVerifyRoleName,
      defaultDTHProps: {
        buttonProps: {
          visible: { show: true, type: 'primary', name: '查看进度' },
          submit: { show: true, type: 'warning', name: '退回' },
          more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
        },
        buttonCondition: {
          submit: (row) => {
            const audit = row?.isAudit;
            return audit === CONSTANT.AUDIT_STATUS.SAVE ||
              audit === CONSTANT.AUDIT_STATUS.SUBMIT ||
              (audit === CONSTANT.AUDIT_STATUS.PASS && row?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY);
          },
        },
        keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessRelStuInternshipPostMerge' },
        allTableColumns: [
          { id: 1, showName: '企业名称', tableColumnName: 'companyName', sortable: true },
          { id: 2, showName: '岗位名称', tableColumnName: 'internshipPostName', sortable: true },
          { id: 3, showName: '状态', tableColumnName: 'customize-status' },
        ],
      },
      defaultDBIProps: {},
    };
  }

  // ── 浏览模式：显示所有可报名的岗位 ──
  return {
    ...common,
    enableAuditStatusCustom: true,
    getVerifyRoleName,
    defaultDTHProps: {
      buttonProps: {
        submit: { show: true, type: 'success', name: '报名' },
        more1: { show: true, name: '实习项目选择', disabled: isMore1Disabled.value },
      },
      keyWord: { edit: 'MainVerifyProcess', view: 'ViewVerifyProcessInternshipPostMerge' },
      allTableColumns: [
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
