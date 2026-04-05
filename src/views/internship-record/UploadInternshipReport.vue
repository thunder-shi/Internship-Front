<template>
  <div class="upload-report-page">
    <!-- 顶部：实习岗位选择 -->
    <el-card class="selector-card" shadow="never">
      <div class="selector-row">
        <span class="selector-label">当前实习：</span>
        <el-select
          v-if="studentPosts.length > 1"
          v-model="selectedPostKey"
          placeholder="请选择实习岗位"
          style="width: 360px"
          :loading="postsLoading"
          @change="onPostChange"
        >
          <el-option
            v-for="post in studentPosts"
            :key="post._key"
            :label="postLabel(post)"
            :value="post._key"
          />
        </el-select>
        <span v-else-if="studentPosts.length === 1" class="current-post-name">
          {{ postLabel(studentPosts[0]) }}
        </span>
        <span v-else-if="!postsLoading" class="empty-hint">
          暂无实习岗位，请联系管理员
        </span>
      </div>
    </el-card>

    <!-- 主内容区 -->
    <div v-if="selectedPostKey" v-loading="periodsLoading" class="content-area">

      <!-- 空状态：尚无周期 -->
      <el-empty v-if="!periodsLoading && periods.length === 0" description="暂无报告周期" />

      <template v-else-if="periods.length > 0">
        <!-- 当前期卡片 -->
        <el-card v-if="currentPeriod" class="current-period-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="period-title">
                <el-tag type="primary" effect="dark" class="mr-8">当前</el-tag>
                第 {{ currentPeriod.periodIndex }} 期实习日志
              </span>
              <el-tag :type="statusInfo(currentPeriod).tagType">
                {{ statusInfo(currentPeriod).text }}
              </el-tag>
            </div>
          </template>

          <!-- 老师批阅意见（通过/不通过时显示） -->
          <el-alert
            v-if="currentPeriod.diary?.remark"
            :title="`老师批阅意见：${currentPeriod.diary.remark}`"
            type="info"
            :closable="false"
            class="mb-12"
          />

          <div class="card-actions">
            <span v-if="!selectedPost?._approved" class="pending-text">选题 / 岗位审核中，请稍等...</span>
            <template v-else>
              <!-- 首次提交 -->
              <el-button
                v-if="canSubmit(currentPeriod)"
                type="primary"
                @click="openSubmitDialog(currentPeriod)"
              >上传报告</el-button>

              <!-- 退回后重新提交 -->
              <el-button
                v-if="canResubmit(currentPeriod)"
                type="warning"
                @click="openSubmitDialog(currentPeriod)"
              >重新提交</el-button>

              <!-- 查看详情（待审核 / 已通过 / 不通过） -->
              <el-button
                v-if="canView(currentPeriod)"
                @click="openViewDialog(currentPeriod)"
              >查看详情</el-button>
            </template>
          </div>
        </el-card>

        <!-- 历史期列表 -->
        <el-card v-if="historyPeriods.length > 0" class="history-card" shadow="never">
          <template #header>
            <span>历史记录</span>
          </template>
          <el-table :data="historyPeriods" size="small" stripe>
            <el-table-column label="期次" width="90">
              <template #default="{ row }">第 {{ row.periodIndex }} 期</template>
            </el-table-column>
            <el-table-column label="审核状态" width="130">
              <template #default="{ row }">
                <el-tag :type="statusInfo(row).tagType" size="small">
                  {{ statusInfo(row).text }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="老师批阅意见" min-width="160">
              <template #default="{ row }">
                <span class="remark-text">{{ row.diary?.remark || '——' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <span v-if="!selectedPost?._approved" class="pending-text">审核中</span>
                <template v-else>
                  <el-button
                    v-if="canResubmit(row)"
                    type="warning"
                    link
                    size="small"
                    @click="openSubmitDialog(row)"
                  >重新提交</el-button>
                  <el-button
                    v-if="canView(row)"
                    link
                    size="small"
                    @click="openViewDialog(row)"
                  >查看</el-button>
                  <span v-if="!canResubmit(row) && !canView(row)" class="no-action">——</span>
                </template>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </template>
    </div>

    <!-- 提交 / 查看 对话框 -->
    <DlgSubmitDiary ref="dlgSubmitRef" @success="onSubmitSuccess" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useStore } from 'vuex'
import listAPI from '@/api/list'
import { getStudentPeriods } from '@/api/diary'
import DlgSubmitDiary from './components/DlgSubmitDiary.vue'
import CONSTANT from '@/utils/constant'

const PASS = CONSTANT.AUDIT_STATUS.PASS

defineOptions({ name: 'UploadInternshipReport' })

const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})

// ── 实习列表 ─────────────────────────────────────────────────
const postsLoading = ref(false)
// 每项附加 _key / _type / _paramId，统一校内外
const studentPosts = ref([])
const selectedPostKey = ref(null)
const selectedPost = computed(() =>
  studentPosts.value.find(p => p._key === selectedPostKey.value) ?? null
)

// ── 期数列表 ─────────────────────────────────────────────────
const periodsLoading = ref(false)
// 按 periodIndex 降序排列（当前期在最前）
const periods = ref([])

const currentPeriod = computed(() => periods.value[0] ?? null)
const historyPeriods = computed(() => periods.value.slice(1))

// ── 对话框 ───────────────────────────────────────────────────
const dlgSubmitRef = ref(null)

// ── 工具函数 ─────────────────────────────────────────────────
function postLabel(post) {
  if (post._type === 'external') {
    const name = post.internshipPostName || ''
    return post.internshipName ? `${post.internshipName} — ${name}` : name || `岗位 #${post.id}`
  }
  // internal
  const name = post.name || ''
  return post.teacherName ? `${name}（${post.teacherName}）` : name || `课题 #${post.relTitleStudentId}`
}

const STATUS_MAP = {
  [CONSTANT.AUDIT_STATUS.SAVE]:    { text: '退回，待重提', tagType: 'warning' },
  [CONSTANT.AUDIT_STATUS.SUBMIT]:  { text: '待审核',       tagType: '' },
  [CONSTANT.AUDIT_STATUS.PASS]:    { text: '审核通过',     tagType: 'success' },
  [CONSTANT.AUDIT_STATUS.NOTPASS]: { text: '审核不通过',   tagType: 'danger' },
}

function statusInfo(periodItem) {
  if (!periodItem.diary) return { text: '未提交', tagType: 'info' }
  return STATUS_MAP[periodItem.diary.isAudit] ?? { text: '未知', tagType: 'info' }
}

/** 仅当前期且从未提交时可首次提交 */
function canSubmit(periodItem) {
  return !periodItem.diary && periodItem === currentPeriod.value
}

/** isAudit=-1：退回后待重提（任意期都可重新提交） */
function canResubmit(periodItem) {
  return periodItem.diary?.isAudit === CONSTANT.AUDIT_STATUS.SAVE
}

/** isAudit=0/1/2：只可查看 */
function canView(periodItem) {
  if (!periodItem.diary) return false
  return [
    CONSTANT.AUDIT_STATUS.SUBMIT,
    CONSTANT.AUDIT_STATUS.PASS,
    CONSTANT.AUDIT_STATUS.NOTPASS,
  ].includes(periodItem.diary.isAudit)
}

// ── 数据加载 ─────────────────────────────────────────────────
async function loadStudentPosts() {
  const userId = userInfo.value?.id
  if (!userId) return
  try {
    postsLoading.value = true
    const [extRes, intRes] = await Promise.allSettled([
      listAPI.getSomeRecords({
        keyWords: 'ViewVerifyProcessRelStuInternshipPostMerge',
        searchKey: { studentId: userId },
        reg: { studentId: '=' },
      }),
      listAPI.getSomeRecords({
        keyWords: 'ViewRelTitleTeacherStudent',
        searchKey: { stuId: userId },
        reg: { stuId: '=' },
      }),
    ])
    const extList = extRes.status === 'fulfilled'
      ? (extRes.value?.data?.content || extRes.value?.data || [])
      : []
    const intList = intRes.status === 'fulfilled'
      ? (intRes.value?.data?.content || intRes.value?.data || [])
      : []

    studentPosts.value = [
      ...extList.map(item => ({
        ...item,
        _key: `ext_${item.relationId}`,
        _type: 'external',
        _paramId: item.relationId,
        _approved: item.isAllVerified === true,
      })),
      ...intList.map(item => ({
        ...item,
        _key: `int_${item.relTitleStudentId}`,
        _type: 'internal',
        _paramId: item.relTitleStudentId,
        _approved: item.isAudit === PASS,
      })),
    ]

  } catch {
    ElMessage.error('获取实习列表失败')
  } finally {
    postsLoading.value = false
  }
}

async function loadPeriods() {
  const post = selectedPost.value
  if (!post) return
  try {
    periodsLoading.value = true
    const paramKey = post._type === 'external' ? 'stuInternshipPostId' : 'relTitleStudentId'
    const res = await getStudentPeriods({ [paramKey]: post._paramId })
    const raw = res?.data || []
    periods.value = [...raw].sort((a, b) => b.periodIndex - a.periodIndex)
  } catch {
    ElMessage.error('获取报告列表失败')
    periods.value = []
  } finally {
    periodsLoading.value = false
  }
}

async function onPostChange() {
  periods.value = []
  await loadPeriods()
}

// ── 对话框操作 ───────────────────────────────────────────────
function buildIdParam(post) {
  return post._type === 'external'
    ? { stuInternshipPostId: post._paramId }
    : { relTitleStudentId: post._paramId }
}

function openSubmitDialog(periodItem) {
  dlgSubmitRef.value?.open({
    ...buildIdParam(selectedPost.value),
    periodIndex: periodItem.periodIndex,
    diary: periodItem.diary ?? null,
    readonly: false,
  })
}

function openViewDialog(periodItem) {
  dlgSubmitRef.value?.open({
    ...buildIdParam(selectedPost.value),
    periodIndex: periodItem.periodIndex,
    diary: periodItem.diary,
    readonly: true,
  })
}

function onSubmitSuccess() {
  loadPeriods()
}

// ── 初始化 ───────────────────────────────────────────────────
onMounted(async () => {
  await loadStudentPosts()
  if (studentPosts.value.length === 1) {
    selectedPostKey.value = studentPosts.value[0]._key
    await loadPeriods()
  }
})
</script>

<style scoped>
.upload-report-page {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.selector-card :deep(.el-card__body) {
  padding: 14px 20px;
}

.selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selector-label {
  font-weight: 600;
  white-space: nowrap;
  color: #303133;
}

.current-post-name {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
}

.empty-hint {
  color: #909399;
  font-size: 13px;
}

.content-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.period-title {
  font-size: 15px;
  font-weight: 600;
}

.mr-8 { margin-right: 8px; }
.mb-12 { margin-bottom: 12px; }

.card-actions {
  display: flex;
  gap: 10px;
}

.remark-text {
  color: #606266;
  font-size: 12px;
}

.no-action {
  color: #c0c4cc;
  font-size: 12px;
}

.pending-text {
  color: #e6a23c;
  font-size: 13px;
}
</style>
