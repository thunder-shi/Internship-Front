<template>
  <div class="review-internship-report">
    <!-- 顶部选择区 -->
    <el-card class="selector-card" shadow="never">
      <el-row :gutter="16" align="middle">
        <el-col :span="10">
          <el-form-item label="实习项目" label-width="80px" class="mb-0">
            <el-select
              v-model="selectedInternshipId"
              placeholder="请选择实习项目"
              style="width: 100%"
              @change="onInternshipChange"
            >
              <el-option
                v-for="item in internshipList"
                :key="item.internshipId"
                :label="item.internshipName"
                :value="item.internshipId"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="期数" label-width="50px" class="mb-0">
            <el-select
              v-model="selectedPeriod"
              placeholder="请选择期数"
              :disabled="!selectedInternshipId || totalPeriods === 0"
              style="width: 100%"
              @change="onPeriodChange"
            >
              <el-option
                v-for="p in periodOptions"
                :key="p"
                :label="`第 ${p} 期`"
                :value="p"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-button
            :loading="studentsLoading"
            :disabled="!selectedInternshipId || !selectedPeriod"
            @click="loadStudents"
          >刷新</el-button>
        </el-col>
      </el-row>
    </el-card>

    <!-- 统计区 -->
    <el-card v-if="selectedInternshipId && selectedPeriod" class="stats-card" shadow="never">
      <el-row :gutter="32" justify="center">
        <el-col :span="7" class="stat-item">
          <el-statistic title="已提交" :value="submittedStudents.length">
            <template #suffix>
              <span class="stat-unit">人</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="7" class="stat-item">
          <el-statistic title="未提交" :value="notSubmittedStudents.length">
            <template #suffix>
              <span class="stat-unit">人</span>
            </template>
          </el-statistic>
        </el-col>
        <el-col :span="7" class="stat-item">
          <el-statistic title="总计" :value="allStudents.length">
            <template #suffix>
              <span class="stat-unit">人</span>
            </template>
          </el-statistic>
        </el-col>
      </el-row>
    </el-card>

    <!-- 学生列表 -->
    <el-card v-if="selectedInternshipId && selectedPeriod" class="table-card" shadow="never">
      <el-tabs v-model="activeTab" v-loading="studentsLoading">
        <!-- 已提交 tab -->
        <el-tab-pane :label="`已提交（${submittedStudents.length}）`" name="submitted">
          <el-table
            :data="submittedStudents"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column label="学生姓名" prop="studentName" min-width="100" />
            <el-table-column label="岗位/题目" min-width="160">
              <template #default="{ row }">
                {{ row.internshipPostName || row.titleName || '——' }}
              </template>
            </el-table-column>
            <el-table-column label="提交时间" min-width="160">
              <template #default="{ row }">
                {{ row.diary?.createTime || '——' }}
              </template>
            </el-table-column>
            <el-table-column label="审核状态" min-width="110">
              <template #default="{ row }">
                <el-tag :type="auditTagType(row.diary?.isAudit)">
                  {{ auditText(row.diary?.isAudit) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="canReview(row.diary?.isAudit)"
                  type="primary"
                  size="small"
                  @click="openReview(row)"
                >批阅</el-button>
                <el-button
                  v-else
                  size="small"
                  @click="openView(row)"
                >查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 未提交 tab -->
        <el-tab-pane :label="`未提交（${notSubmittedStudents.length}）`" name="not-submitted">
          <el-table
            :data="notSubmittedStudents"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column label="学生姓名" prop="studentName" min-width="100" />
            <el-table-column label="学号" min-width="130">
              <template #default="{ row }">
                {{ row.studentNo || '——' }}
              </template>
            </el-table-column>
            <el-table-column label="岗位/题目" min-width="160">
              <template #default="{ row }">
                {{ row.internshipPostName || row.titleName || '——' }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default>
                <el-tag type="info">未提交</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openDetail(row)">详细信息</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 无选择提示 -->
    <el-empty
      v-if="!selectedInternshipId"
      description="请先选择实习项目"
      :image-size="120"
    />

    <!-- 批阅对话框 -->
    <DlgReviewDiary ref="dlgReviewRef" @success="loadStudents" />
    <!-- 学生详细信息对话框 -->
    <DlgStudentDetail ref="dlgDetailRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore } from 'vuex'
import DlgReviewDiary from './components/DlgReviewDiary.vue'
import DlgStudentDetail from './components/DlgStudentDetail.vue'
import listAPI from '@/api/list'
import { getInternshipPeriods, getPeriodStudents } from '@/api/diary'
import CONSTANT from '@/utils/constant'

defineOptions({ name: 'ReviewInternshipReport' })

const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})

const AUDIT_STATUS = CONSTANT.AUDIT_STATUS
const AUDIT_STATUS_MAP = {
  [AUDIT_STATUS.SAVE]:    { text: '退回，待重提', type: 'warning' },
  [AUDIT_STATUS.SUBMIT]:  { text: '待审核',       type: '' },
  [AUDIT_STATUS.PASS]:    { text: '审核通过',     type: 'success' },
  [AUDIT_STATUS.NOTPASS]: { text: '审核不通过',   type: 'danger' },
  [AUDIT_STATUS.BACK]:    { text: '已退回',       type: 'warning' },
}

function auditText(isAudit) {
  return AUDIT_STATUS_MAP[isAudit]?.text ?? '未知'
}
function auditTagType(isAudit) {
  return AUDIT_STATUS_MAP[isAudit]?.type ?? 'info'
}

// 只有"待审核"状态才需要批阅，其余状态只读查看
function canReview(isAudit) {
  return isAudit === AUDIT_STATUS.SUBMIT
}

// ── 实习项目列表 ─────────────────────────────────────────────
const internshipList = ref([])

async function loadInternshipList() {
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelIntershipUser',
      searchKey: { userId: userInfo.value.id },
      reg: { userId: '=' },
    })
    const raw = res?.data?.content || res?.data || []
    // 按 internshipId 去重
    const seen = new Set()
    internshipList.value = raw.filter(item => {
      const key = item.internshipId
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })

    // 如果只有一个项目，自动选中
    if (internshipList.value.length === 1) {
      selectedInternshipId.value = internshipList.value[0].internshipId
      await onInternshipChange(selectedInternshipId.value)
    }
  } catch {
    ElMessage.error('获取实习项目列表失败')
  }
}

// ── 期数选择 ─────────────────────────────────────────────────
const selectedInternshipId = ref(null)
const selectedPeriod = ref(null)
const totalPeriods = ref(0)

const periodOptions = computed(() => {
  if (totalPeriods.value <= 0) return []
  const arr = []
  for (let i = totalPeriods.value; i >= 1; i--) arr.push(i)
  return arr
})

async function onInternshipChange(internshipId) {
  selectedPeriod.value = null
  totalPeriods.value = 0
  allStudents.value = []

  if (!internshipId) return

  try {
    const res = await getInternshipPeriods({ internshipId })
    totalPeriods.value = res?.data?.totalPeriods ?? 0
    if (totalPeriods.value > 0) {
      selectedPeriod.value = totalPeriods.value // 默认当前期（最新期）
      await loadStudents()
    }
  } catch {
    ElMessage.error('获取期数信息失败')
  }
}

function onPeriodChange() {
  loadStudents()
}

// ── 学生列表 ─────────────────────────────────────────────────
const studentsLoading = ref(false)
const allStudents = ref([])
const activeTab = ref('submitted')

const submittedStudents = computed(() =>
  allStudents.value.filter(s => s.diary !== null && s.diary !== undefined)
)
const notSubmittedStudents = computed(() =>
  allStudents.value.filter(s => (s.diary === null || s.diary === undefined) && s.studentName)
)

async function loadStudents() {
  if (!selectedInternshipId.value || !selectedPeriod.value) return

  try {
    studentsLoading.value = true
    const res = await getPeriodStudents({
      internshipId: selectedInternshipId.value,
      periodIndex: selectedPeriod.value,
      userId: userInfo.value.id,
    })
    allStudents.value = res?.data || []
  } catch {
    ElMessage.error('获取学生列表失败')
    allStudents.value = []
  } finally {
    studentsLoading.value = false
  }
}

// ── 对话框操作 ────────────────────────────────────────────────
const dlgReviewRef = ref(null)
const dlgDetailRef = ref(null)

function openDetail(studentRow) {
  dlgDetailRef.value?.open(studentRow)
}

function openReview(studentRow) {
  dlgReviewRef.value?.open(studentRow)
}

function openView(studentRow) {
  dlgReviewRef.value?.open(studentRow)
}

onMounted(() => {
  loadInternshipList()
})
</script>

<style scoped>
.review-internship-report {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selector-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.stats-card :deep(.el-card__body) {
  padding: 16px 24px;
}

.table-card :deep(.el-card__body) {
  padding: 0 16px 16px;
}

.mb-0 {
  margin-bottom: 0;
}

.stat-item {
  text-align: center;
}

.stat-unit {
  font-size: 14px;
  color: #909399;
  margin-left: 2px;
}
</style>
