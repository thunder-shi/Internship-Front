<template>
  <div class="external-internship-detail page-wrap">
    <el-page-header class="page-header" @back="goBack">
      <template #content>
        <div class="header-title">
          <span class="title-text">{{ displayTitle }}</span>
          <span v-if="internshipId" class="sub-id">项目 ID：{{ internshipId }}</span>
        </div>
      </template>
    </el-page-header>

    <el-alert
      v-if="!internshipId"
      type="warning"
      show-icon
      :closable="false"
      title="未指定实习项目，请从「校外实习报名统计」列表进入。"
    />

    <template v-else>
      <el-tabs v-model="activeTab" class="detail-tabs">
        <el-tab-pane label="已通过审核的岗位" name="posts">
          <el-table v-loading="postsLoading" :data="posts" border stripe style="width: 100%">
            <el-table-column type="index" label="#" width="55" align="center" />
            <el-table-column
              prop="internshipPostName"
              label="岗位名称"
              min-width="160"
              show-overflow-tooltip
            />
            <el-table-column
              prop="companyName"
              label="公司"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column label="薪资" width="120" align="center" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.salary != null && row.salary !== '' ? row.salary : '—' }}
              </template>
            </el-table-column>
            <el-table-column prop="allPersonNum" label="招聘人数" width="100" align="center" />
            <el-table-column prop="nowPersonNum" label="已招人数" width="100" align="center" />
            <el-table-column
              prop="internshipPostCode"
              label="岗位编码"
              width="120"
              show-overflow-tooltip
            />
            <el-table-column prop="remarks" label="备注" min-width="140" show-overflow-tooltip />
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="postsPage"
              v-model:page-size="postsSize"
              :total="postsTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              background
              @size-change="loadPosts"
              @current-change="loadPosts"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="学生选岗情况" name="students">
          <div class="counts-row">
            <el-card shadow="hover" class="count-card">
              <div class="count-label">未选岗位</div>
              <div class="count-num">{{ studentCounts.notSelected ?? 0 }}</div>
            </el-card>
            <el-card shadow="hover" class="count-card">
              <div class="count-label">已选岗待审核</div>
              <div class="count-num">{{ studentCounts.selectedPendingAudit ?? 0 }}</div>
            </el-card>
            <el-card shadow="hover" class="count-card">
              <div class="count-label">岗位已通过</div>
              <div class="count-num">{{ studentCounts.postApproved ?? 0 }}</div>
            </el-card>
          </div>

          <div class="student-toolbar">
            <span class="toolbar-label">筛选</span>
            <el-radio-group v-model="studentStatus" @change="onStudentStatusChange">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="notSelected">未选岗位</el-radio-button>
              <el-radio-button label="selectedPendingAudit">已选岗待审核</el-radio-button>
              <el-radio-button label="postApproved">岗位已通过</el-radio-button>
            </el-radio-group>
          </div>

          <el-table
            v-loading="studentsLoading"
            :data="studentRows"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column type="index" label="#" width="55" align="center" />
            <el-table-column prop="userName" label="姓名" width="120" />
            <el-table-column
              prop="departmentName"
              label="学院/部门"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column
              prop="internshipPostName"
              label="岗位"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column
              prop="companyName"
              label="公司"
              min-width="140"
              show-overflow-tooltip
            />
            <el-table-column prop="selectionStatus" label="选岗状态" width="130" align="center">
              <template #default="{ row }">
                {{ selectionStatusLabel(row.selectionStatus) }}
              </template>
            </el-table-column>
            <el-table-column prop="isAudit" label="审核状态" width="110" align="center">
              <template #default="{ row }">
                {{ auditLabel(row.isAudit) }}
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="studentsPage"
              v-model:page-size="studentsSize"
              :total="studentsTotal"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="loadStudents"
              @current-change="loadStudents"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import internshipProcessAPI from '@/api/internshipProcess';
import CONSTANT from '@/utils/constant';

defineOptions({
  name: 'ExternalInternshipProjectDetail',
});

const route = useRoute();
const router = useRouter();

const activeTab = ref('posts');

const internshipId = computed(() => {
  const q = route.query.internshipId;
  if (q == null || q === '') return null;
  const n = Number(q);
  return Number.isNaN(n) ? q : n;
});

const internshipNameFromQuery = computed(() => String(route.query.internshipName || ''));

const displayTitle = computed(() => {
  if (internshipNameFromQuery.value) return internshipNameFromQuery.value;
  return '校外实习项目详情';
});

function unwrapPayload(res) {
  if (res == null) return {};
  return res.data !== undefined ? res.data : res;
}

/** ---------- 岗位 ---------- */
const postsLoading = ref(false);
const posts = ref([]);
const postsTotal = ref(0);
const postsPage = ref(1);
const postsSize = ref(20);

async function loadPosts() {
  if (!internshipId.value) return;
  postsLoading.value = true;
  try {
    const res = await internshipProcessAPI.listApprovedExternalInternshipPosts({
      internshipId: Number(internshipId.value),
      pageInfo: { page: postsPage.value, size: postsSize.value },
    });
    const data = unwrapPayload(res);
    posts.value = Array.isArray(data.posts) ? data.posts : [];
    postsTotal.value = Number(data.totalElements ?? data.total ?? posts.value.length ?? 0);
  } catch (e) {
    console.error('listApprovedExternalInternshipPosts', e);
    posts.value = [];
    postsTotal.value = 0;
  } finally {
    postsLoading.value = false;
  }
}

/** ---------- 学生 ---------- */
const studentsLoading = ref(false);
const studentRows = ref([]);
const studentsTotal = ref(0);
const studentsPage = ref(1);
const studentsSize = ref(20);
const studentStatus = ref('all');
const studentCounts = ref({
  notSelected: 0,
  selectedPendingAudit: 0,
  postApproved: 0,
});

const STATUS_LABELS = {
  notSelected: '未选岗位',
  selectedPendingAudit: '已选岗待审核',
  postApproved: '岗位已通过',
  all: '全部',
};

function selectionStatusLabel(v) {
  return STATUS_LABELS[v] || v || '—';
}

function auditLabel(v) {
  if (v === CONSTANT.AUDIT_STATUS.SAVE) return CONSTANT.AUDIT_STATUS.SAVENAME;
  if (v === CONSTANT.AUDIT_STATUS.SUBMIT) return CONSTANT.AUDIT_STATUS.SUBMITNAME;
  if (v === CONSTANT.AUDIT_STATUS.PASS) return CONSTANT.AUDIT_STATUS.PASSNAME;
  if (v === CONSTANT.AUDIT_STATUS.NOTPASS) return CONSTANT.AUDIT_STATUS.NOTPASSNAME;
  if (v === CONSTANT.AUDIT_STATUS.BACK) return CONSTANT.AUDIT_STATUS.BACKNAME;
  return v ?? '—';
}

async function loadStudents() {
  if (!internshipId.value) return;
  studentsLoading.value = true;
  try {
    const res = await internshipProcessAPI.getExternalInternshipStudentPostBreakdown({
      internshipId: Number(internshipId.value),
      status: studentStatus.value,
      pageInfo: { page: studentsPage.value, size: studentsSize.value },
    });
    const data = unwrapPayload(res);
    studentRows.value = Array.isArray(data.rows) ? data.rows : [];
    studentsTotal.value = Number(data.totalElements ?? 0);
    if (data.counts && typeof data.counts === 'object') {
      studentCounts.value = {
        notSelected: Number(data.counts.notSelected ?? 0),
        selectedPendingAudit: Number(data.counts.selectedPendingAudit ?? 0),
        postApproved: Number(data.counts.postApproved ?? 0),
      };
    }
  } catch (e) {
    console.error('getExternalInternshipStudentPostBreakdown', e);
    studentRows.value = [];
    studentsTotal.value = 0;
  } finally {
    studentsLoading.value = false;
  }
}

function onStudentStatusChange() {
  studentsPage.value = 1;
  loadStudents();
}

function pathWithLastSegment(segment) {
  const parts = route.path.split('/').filter(Boolean);
  if (parts.length) parts[parts.length - 1] = segment;
  return `/${parts.join('/')}`;
}

function goBack() {
  router.push({ path: pathWithLastSegment('ExtInternshipCollegeStats') });
}

watch(
  () => route.query.internshipId,
  (id) => {
    if (!id) return;
    postsPage.value = 1;
    studentsPage.value = 1;
    loadPosts();
    loadStudents();
  },
  { immediate: true }
);
</script>

<style scoped>
.page-wrap {
  padding: 12px;
}
.page-header {
  margin-bottom: 16px;
}
.header-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.title-text {
  font-size: 16px;
  font-weight: 600;
}
.sub-id {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-weight: normal;
}
.detail-tabs {
  margin-top: 8px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.counts-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}
.count-card {
  min-width: 160px;
  flex: 1;
}
.count-card :deep(.el-card__body) {
  padding: 12px 16px;
}
.count-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.count-num {
  font-size: 22px;
  font-weight: 600;
  margin-top: 6px;
}
.student-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.toolbar-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
