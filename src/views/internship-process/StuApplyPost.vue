<template>
  <el-result v-if="internshipType === null" icon="info" title="未到时间，请等候学校通知" />
  <template v-else-if="ready">
    <!-- 控制栏：项目选择 + Tab 切换 -->
    <el-card shadow="never" class="control-bar">
      <div class="control-bar-inner">
        <el-form-item label="实习项目" label-width="80px" class="mb-0 project-select-item">
          <el-select
            v-model="selectedProjectId"
            placeholder="请选择实习项目"
            :loading="projectsLoading"
            filterable
            clearable
            style="width: 100%"
            @change="handleDropdownProjectChange"
          >
            <template #empty>
              <p class="select-empty">{{ projectsLoading ? '加载中...' : '暂无可用实习项目' }}</p>
            </template>
            <el-option
              v-for="p in projectList"
              :key="p.internshipId"
              :label="projectLabel(p)"
              :value="p.internshipId"
            />
          </el-select>
        </el-form-item>
        <el-radio-group v-model="activeTab" style="flex-shrink: 0">
          <el-radio-button value="available">可选</el-radio-button>
          <el-radio-button value="applied">已选（{{ selectedPosts.length }}）</el-radio-button>
        </el-radio-group>
      </div>
    </el-card>

    <InternshipPostHeaderPage
      ref="headerPageRef"
      :page-title="'学生岗位报名'"
      :no-project-message="'未安排实习项目'"
      :project-select-search-key="projectSelectSearchKey"
      :project-select-reg-key="projectSelectRegKey"
      :default-d-t-l-props="defaultDTLProps"
      :build-search-key="buildSearchKey"
      :is-company-user="false"
      :before-refresh-on-project-selected="beforeRefreshOnProjectSelected"
      @view-click="handleViewClick"
      @submit-click="handleSubmitClick"
      @project-selected="handleProjectSelected"
    >
      <!-- 已选模式：行操作列中的"岗位详情"按钮 -->
      <template v-if="activeTab === 'applied'" #rightOperate="{ row }">
        <el-button type="info" size="small" title="岗位详情" @click="handleViewPostDetail(row)">
          <el-icon><InfoFilled /></el-icon>
        </el-button>
      </template>
      <template #dialogs>
        <!-- 岗位详情对话框（只读） -->
        <DlgPostDetail
          ref="dlgPostDetail"
          :current-internship="currentInternship"
          :custom-foot-button="rollbackButton"
          @success="handleRollbackSuccess"
        />
        <!-- 审核进度对话框 -->
        <DlgVerifyProgress
          v-model="showProgressDialog"
          :main-internship-id="currentRow.internshipId"
          :process-info="currentRow"
          key-words="ViewVerifyProcessRelStuInternshipPost"
        />
      </template>
    </InternshipPostHeaderPage>
  </template>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import { ElMessage, ElMessageBox } from 'element-plus';
import { InfoFilled } from '@element-plus/icons-vue';
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
  if (!userId) {
    ready.value = true;
    return;
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'RelIntershipUser',
      searchKey: { userId },
    });
    const records = res?.data?.content || res?.data || [];
    studentInternshipIds.value = records.map((r) => r.internshipId).filter(Boolean);
  } catch (e) {
    console.error('查询学生分配记录失败:', e);
  }
}

// 加载学生专业的所有祖先 ID（含自身），实现层级专业匹配
async function loadExpandedMajorIds() {
  const majorId = userInfo.value?.majorId;
  if (!majorId) return;
  try {
    const res = await treeAPI.getAllParentIndex('BaseMajor', majorId);
    if (res.data && res.data.length > 0) {
      expandedMajorIds.value = res.data.map((item) => item.id).filter(Boolean);
    } else {
      expandedMajorIds.value = [majorId];
    }
  } catch (e) {
    console.error('加载专业层级失败:', e);
    expandedMajorIds.value = [majorId];
  }
}

// ── 顶部实习项目下拉选择 ─────────────────────────────────────────
const projectList = ref([]);
const projectsLoading = ref(false);
const selectedProjectId = ref(null);

function projectLabel(p) {
  const name = p.internshipName || p.name || '';
  const start = p.startTime ? String(p.startTime).substring(0, 10) : '';
  const end = p.endTime ? String(p.endTime).substring(0, 10) : '';
  return start && end ? `${name}（${start} 至 ${end}）` : name;
}

async function loadProjectList() {
  projectsLoading.value = true;
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      searchKey: projectSelectSearchKey.value,
      reg: projectSelectRegKey.value,
    });
    const list = res?.data?.content || res?.data || [];
    const seen = new Set();
    const unique = [];
    list.forEach((item) => {
      const key = item.internshipId || item.id;
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push({ ...item, internshipId: item.internshipId || item.id });
    });
    projectList.value = unique;
  } catch (e) {
    console.error('加载实习项目列表失败:', e);
  } finally {
    projectsLoading.value = false;
  }
}

async function handleDropdownProjectChange(internshipId) {
  selectedPosts.value = [];
  if (!internshipId) return;
  const project = projectList.value.find((p) => String(p.internshipId) === String(internshipId));
  if (!project) return;
  // 通过 InternshipPostHeaderPage 的标准选项方法触发数据加载，避免直接操作内部 ref
  await headerPageRef.value?.selectProject?.(project);
}

onMounted(async () => {
  await Promise.all([loadStudentAssignment(), loadExpandedMajorIds()]);
  ready.value = true;
  await loadProjectList();
});

// ── Tab 状态 ──────────────────────────────────────────────────
const activeTab = ref('available'); // 'available'（可选）| 'applied'（已选）

// ── 已报名岗位列表（SAVE/SUBMIT/PASS） ────────────────────────
const selectedPosts = ref([]);
const ACTIVE_STATUSES = [
  CONSTANT.AUDIT_STATUS.SAVE,
  CONSTANT.AUDIT_STATUS.SUBMIT,
  CONSTANT.AUDIT_STATUS.PASS,
];

// 已有有效报名的岗位 ID Set（字符串化，避免视图间 number/string 类型不一致导致比对失败）
const selectedPostIds = computed(
  () =>
    new Set(
      selectedPosts.value
        .map((p) => p.internshipPostId)
        .filter((id) => id != null)
        .map(String)
    )
);

// 是否已有审核通过的报名（通过后锁定，不允许再报其他岗位）
const hasApprovedPost = computed(() =>
  selectedPosts.value.some((p) => Number(p.isAudit) === CONSTANT.AUDIT_STATUS.PASS)
);

// 审核进度对话框
const showProgressDialog = ref(false);
const currentRow = ref({});

// 当前实习项目
const currentInternship = computed(() => headerPageRef.value?.currentInternship?.value || null);

// 当 InternshipPostHeaderPage 自动选中项目时，同步下拉框
watch(currentInternship, (internship) => {
  if (internship?.internshipId) {
    selectedProjectId.value = internship.internshipId;
  }
});

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

// 查询当前实习项目下学生的全部有效报名记录
// 用非 Merge 视图：报名成功后立即可查（Merge 视图依赖审核流程记录，后端异步创建会导致查询为空）
// 按 internshipPostId 去重，同一岗位多审核步骤时保留 PASS 优先的记录
async function querySelectedPosts(internshipId, studentId) {
  if (!internshipId || !studentId) return [];
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPost',
      searchKey: { internshipId, studentId },
      reg: { internshipId: '=', studentId: '=' },
    });
    const dataList = response?.data?.content || response?.data || [];
    const filtered = dataList.filter((r) => ACTIVE_STATUSES.includes(Number(r.isAudit)));
    // 按 internshipPostId 去重，同一岗位存在多条审核步骤时优先保留 PASS 记录
    const map = new Map();
    for (const r of filtered) {
      const key = String(r.internshipPostId);
      if (!map.has(key) || Number(r.isAudit) === CONSTANT.AUDIT_STATUS.PASS) {
        map.set(key, r);
      }
    }
    return Array.from(map.values());
  } catch (e) {
    console.error('querySelectedPosts 失败:', e);
    return [];
  }
}

// 查询学生在全部实习项目下已选择的岗位数量（不传 internshipId）
// 规则与 querySelectedPosts 一致：仅统计有效状态，按 internshipPostId 去重，PASS 优先
async function querySelectedPostCount(studentId) {
  if (!studentId) return 0;
  try {
    const response = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPost',
      searchKey: { studentId },
      reg: { studentId: '=' },
    });
    const dataList = response?.data?.content || response?.data || [];
    const filtered = dataList.filter((r) => ACTIVE_STATUSES.includes(Number(r.isAudit)));
    const map = new Map();
    for (const r of filtered) {
      const key = String(r.internshipPostId);
      if (!map.has(key) || Number(r.isAudit) === CONSTANT.AUDIT_STATUS.PASS) {
        map.set(key, r);
      }
    }
    return map.size;
  } catch (e) {
    console.error('querySelectedPostCount 失败:', e);
    return 0;
  }
}

// 根据 tab 切换查询条件
function buildSearchKey(baseSearchKey) {
  if (activeTab.value === 'applied') {
    return { internshipId: baseSearchKey.internshipId, studentId: userInfo.value?.id };
  }
  return { ...baseSearchKey, isAudit: CONSTANT.AUDIT_STATUS.PASS };
}

// "可选" tab：已有审核通过的报名则返回空（锁定）；否则排除满员 + 已报名岗位
function filterAvailablePosts(dataList) {
  if (hasApprovedPost.value) return [];
  return dataList.filter(
    (row) =>
      (row.nowPersonNum || 0) < (row.allPersonNum || 0) &&
      !selectedPostIds.value.has(String(row.internshipPostId))
  );
}

// "已选" tab：软删除保证 BACK/NOTPASS 不会出现，Number() 防止视图返回字符串 isAudit
function filterActiveApplications(dataList) {
  return dataList.filter((row) => ACTIVE_STATUSES.includes(Number(row.isAudit)));
}

// 项目选择后回调：清空旧状态（表格标题不更新，项目信息由顶部下拉框展示）
function handleProjectSelected(internship, title) {
  selectedPosts.value = [];
}

// InternshipPostHeaderPage 在刷新列表前调用，确保 selectedPostIds 在首次渲染前就位
async function beforeRefreshOnProjectSelected(internship) {
  const internshipId = internship?.internshipId || internship?.id;
  if (internshipId) {
    selectedPosts.value = await querySelectedPosts(internshipId, userInfo.value?.id);
  }
}

// tab 切换时刷新列表
watch(activeTab, () => {
  headerPageRef.value?.updateSearchWordsAndRefresh?.();
});

// 报名按钮（仅"可选" tab）
async function handleSubmitClick(row) {
  querySelectedPostCount(userInfo.value?.id).then((count) => {
    if (count >= 3) {
      ElMessage.warning('您已报名3个岗位，无法继续报名');
      return;
    }
  });
  await handleApply(row);
}

// 报名
async function handleApply(row) {
  const selectedRow = Array.isArray(row) ? row[0] : row;

  // 客户端快速拦截（后端同样会校验，双重保障）
  if (hasApprovedPost.value) {
    ElMessage.warning('您已有审核通过的报名，无法继续选择岗位');
    return;
  }

  // 已有报名记录时拦截（防止过滤器未及时生效时的重复操作）
  const existing = selectedPosts.value.find(
    (p) => String(p.internshipPostId) === String(selectedRow.internshipPostId)
  );
  if (existing) {
    if (Number(existing.isAudit) === CONSTANT.AUDIT_STATUS.PASS) {
      ElMessage.warning('该岗位报名已审核通过，如需取消请联系管理员');
    } else {
      ElMessage.warning('您已报名此岗位，请勿重复报名');
    }
    return;
  }

  const nowPersonNum = selectedRow.nowPersonNum || 0;
  const allPersonNum = selectedRow.allPersonNum || 0;
  if (nowPersonNum >= allPersonNum) {
    ElMessage.warning('当前岗位已经选满，无法报名！');
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定报名「${selectedRow.internshipPostName || ''}」岗位吗？`,
      '确认报名',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'info' }
    );
  } catch {
    return;
  }

  try {
    const response = await otherAPI.stuSelPost(
      userInfo.value?.id,
      0,
      Number(selectedRow.internshipPostId) || 0
    );
    if (response?.message === 'successful') {
      ElMessage.success('报名成功');
      // 直接使用后端返回的真实 isAudit，不再依赖视图查询
      // NO_VERIFY 自动通过时 isAudit=1(PASS)，需要人工审核时 isAudit=0(SUBMIT)
      const realIsAudit = response.data?.isAudit ?? CONSTANT.AUDIT_STATUS.SUBMIT;
      selectedPosts.value = [
        ...selectedPosts.value,
        { internshipPostId: selectedRow.internshipPostId, isAudit: realIsAudit },
      ];
      await headerPageRef.value?.updateSearchWordsAndRefresh?.();
    } else {
      // 后端业务校验失败（如：该学生在此项目下已有通过记录）
      ElMessage.warning(response?.message || '报名失败');
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
    return (
      rowData?.isAudit === CONSTANT.AUDIT_STATUS.PASS &&
      rowData?.verifyTypeId == CONSTANT.VERIFY_LEVEL.NO_VERIFY
    );
  },
  action: async (rowData) => {
    try {
      await ElMessageBox.confirm('确定退回该报名吗？退回后可以重新选择岗位。', '确认退回', {
        confirmButtonText: '确定退回',
        cancelButtonText: '取消',
        type: 'warning',
      });
    } catch {
      return false;
    }
    try {
      const postId = rowData?.internshipPostId || rowData?.relationId;
      const response = await otherAPI.stuSelPost(userInfo.value?.id, postId, 0);
      if (response?.message === 'successful') {
        ElMessage.success('退回成功，可以重新选择岗位');
        // 乐观更新：立即移除此岗位，防止后端视图时序问题导致计数暂时归零
        selectedPosts.value = selectedPosts.value.filter(
          (p) => String(p.internshipPostId) !== String(rowData?.internshipPostId)
        );
        return true;
      }
    } catch (e) {
      console.error('退回失败:', e);
    }
    return false;
  },
};

async function handleRollbackSuccess() {
  // selectedPosts 已在 rollbackButton.action 乐观更新，这里只刷新表格
  await headerPageRef.value?.updateSearchWordsAndRefresh?.();
  // 后台同步：若后端有结果则以后端为准，为空时保留乐观状态
  const internshipId = currentInternship.value?.internshipId || currentInternship.value?.id;
  if (internshipId) {
    querySelectedPosts(internshipId, userInfo.value?.id).then((fresh) => {
      if (fresh.length > 0) selectedPosts.value = fresh;
    });
  }
}

// 查看岗位详情（只读，"已选" tab 行操作列触发）
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

// 动态 DTL 配置：根据 activeTab 切换视图、按钮、列
const defaultDTLProps = computed(() => {
  const applied = activeTab.value === 'applied';
  return {
    title: titleObj,
    someFlags: { autoInit: false },
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
        view: applied
          ? 'ViewVerifyProcessRelStuInternshipPostMerge'
          : 'ViewVerifyProcessInternshipPostMerge',
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
            { id: 6, showName: '薪资', tableColumnName: 'salary' },
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

<style scoped>
.control-bar :deep(.el-card__body) {
  padding: 10px 16px;
}

.control-bar-inner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.project-select-item {
  flex: 1;
  min-width: 0;
}

.mb-0 {
  margin-bottom: 0;
}

.select-empty {
  text-align: center;
  color: #909399;
  padding: 10px 0;
  margin: 0;
}
</style>
