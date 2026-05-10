<template>
  <el-result v-if="internshipType === null" icon="info" title="未到时间，请等候学校通知" />
  <template v-else>
    <el-card shadow="never" class="control-bar">
      <div class="control-bar-inner">
        <el-form-item label="实习项目" label-width="80px" class="mb-0 project-select-item">
          <el-select
            v-model="selectedInternshipId"
            placeholder="请选择实习项目"
            :loading="projectsLoading"
            filterable
            clearable
            style="width: 100%"
            @change="handleProjectChange"
          >
            <template #empty>
              <p class="select-empty">{{ projectsLoading ? '加载中...' : '暂无可申请的校外实习项目' }}</p>
            </template>
            <el-option
              v-for="p in projectList"
              :key="p.internshipId"
              :label="projectLabel(p)"
              :value="p.internshipId"
            />
          </el-select>
        </el-form-item>
        <el-button
          type="primary"
          :disabled="!canSubmit"
          @click="openSubmitDialog()"
        >{{ submitBtnText }}</el-button>
      </div>
      <div v-if="selectedInternshipId && !processConfigured" class="process-hint">
        <el-alert
          type="warning"
          :closable="false"
          title="当前项目未开通自主实习申请"
          description="请联系管理员在实习模板中添加「校外实习-学生自主申报」流程"
          show-icon
        />
      </div>
      <div v-else-if="hasOtherApprovedPost" class="process-hint">
        <el-alert
          type="warning"
          :closable="false"
          title="已有通过的实习岗位"
          description="您在当前实习项目下已有审核通过的实习岗位报名，无法再申请自主实习"
          show-icon
        />
      </div>
    </el-card>

    <el-card v-if="selectedInternshipId" shadow="never" class="record-card">
      <template #header>
        <div class="record-header">
          <span>我的申请记录</span>
          <el-button size="small" :loading="recordRefreshing" :icon="Refresh" @click="refreshRecord">刷新</el-button>
        </div>
      </template>
      <el-empty v-if="!hasRecord" description="暂无申请记录" :image-size="80" />
      <div v-else class="record-row">
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="实习单位">{{ currentRecord.selfCompanyName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="实习岗位">{{ currentRecord.selfPostName || '--' }}</el-descriptions-item>
          <el-descriptions-item label="实习地址" :span="2">{{ currentRecord.selfAddress || '--' }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentRecord.selfRemarks || '--' }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="auditTagType">{{ auditText }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核意见">{{ currentRecord.reason || '--' }}</el-descriptions-item>
        </el-descriptions>
        <div class="record-actions">
          <el-button size="small" @click="openSubmitDialog(true)">查看详情</el-button>
          <el-button
            v-if="canViewProgress"
            size="small"
            type="primary"
            @click="openProgress"
          >查看进度</el-button>
        </div>
      </div>
    </el-card>

    <DlgSelfDeclaration
      ref="dlgSelfDeclarationRef"
      @success="refreshRecord"
    />
    <DlgVerifyProgress
      v-model="showProgressDialog"
      :main-internship-id="currentRecord?.internshipId"
      :process-info="currentRecord"
      key-words="ViewVerifyProcessRelStuInternshipPost"
    />
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import moment from 'moment'
import listAPI from '@/api/list'
import CONSTANT from '@/utils/constant'
import { getAuditStatusText, getAuditTagType } from '@/utils/verify'
import DlgSelfDeclaration from './components/DlgSelfDeclaration.vue'
import DlgVerifyProgress from '@/views/dialogs/DlgVerifyProgress.vue'

defineOptions({ name: 'StuSelfDeclaration' })

const store = useStore()
const userInfo = computed(() => store.getters.userInfo || {})
const internshipType = computed(() => store.getters.studentInternshipType)

const dlgSelfDeclarationRef = ref(null)
const showProgressDialog = ref(false)
const recordRefreshing = ref(false)

// ─ 项目列表（学生已分配 + 开通了自主实习流程的校外项目）
const projectList = ref([])
const projectsLoading = ref(false)
const selectedInternshipId = ref(null)
const processConfigured = ref(false)

// ─ 当前项目下学生的自主实习申请记录
const currentRecord = ref(null)
const hasRecord = computed(() => !!currentRecord.value?.relationId)

// 当前项目下学生是否已存在"非自主实习"的已通过报名（企业岗位通过即锁定）
const hasOtherApprovedPost = ref(false)

const auditText = computed(() => getAuditStatusText(currentRecord.value?.isAudit))
const auditTagType = computed(() => getAuditTagType(currentRecord.value?.isAudit))

const canViewProgress = computed(() => {
  const s = currentRecord.value?.isAudit
  return s === CONSTANT.AUDIT_STATUS.SUBMIT ||
         s === CONSTANT.AUDIT_STATUS.PASS ||
         s === CONSTANT.AUDIT_STATUS.NOTPASS ||
         s === CONSTANT.AUDIT_STATUS.BACK
})

// 可点击"提交 / 重投 / 修改"按钮的条件
// - 无项目 / 未开通流程 / 已有其他已通过岗位 / 已有 SAVE/SUBMIT/PASS（只读） → 禁用
// - 无记录 / NOTPASS / BACK → 启用
const canSubmit = computed(() => {
  if (!selectedInternshipId.value || !processConfigured.value) return false
  if (hasOtherApprovedPost.value) return false
  if (!hasRecord.value) return true
  const s = currentRecord.value?.isAudit
  return s === CONSTANT.AUDIT_STATUS.NOTPASS || s === CONSTANT.AUDIT_STATUS.BACK
})

const submitBtnText = computed(() => {
  if (!hasRecord.value) return '提交申请'
  const s = currentRecord.value?.isAudit
  if (s === CONSTANT.AUDIT_STATUS.NOTPASS) return '重新提交'
  if (s === CONSTANT.AUDIT_STATUS.BACK) return '修改重提'
  return '提交申请'
})

function projectLabel(p) {
  const name = p.internshipName || p.name || ''
  const start = p.startTime ? String(p.startTime).substring(0, 10) : ''
  const end = p.endTime ? String(p.endTime).substring(0, 10) : ''
  return start && end ? `${name}（${start} 至 ${end}）` : name
}

/**
 * 加载学生可申请自主实习的项目列表：
 * 条件：学生被分配到项目 + 项目为校外 + 存在自主实习流程节点且在有效时段
 * 直接用 ViewRelProcessInternship（含 processTypeCode、startTime、endTime、intTypeName），
 * 保证"流程已开通且在时段内"的条目天然被筛选。
 */
async function loadProjectList() {
  const userId = userInfo.value?.id
  if (!userId) return
  projectsLoading.value = true
  try {
    // 1. 查学生已分配到的 internshipId 集合
    const assignRes = await listAPI.getSomeRecords({
      keyWords: 'RelIntershipUser',
      searchKey: { userId },
      reg: { userId: '=' },
    })
    const assignList = assignRes?.data?.content || assignRes?.data || []
    const assignedIds = assignList.map(r => r.internshipId).filter(Boolean)
    if (!assignedIds.length) {
      projectList.value = []
      return
    }

    // 2. 查这些项目下开通了自主实习申报流程、且当前时间在流程时段内的记录
    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss')
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelProcessInternship',
      searchKey: {
        processTypeCode: CONSTANT.PROCESS_TYPE.EXTERNAL_STUDENT_SELF_DECLARATION,
        internshipId: assignedIds.join(','),
        startTime: currentTime,
        endTime: currentTime,
      },
      reg: {
        processTypeCode: '=',
        internshipId: CONSTANT.SEARCH_OPERATOR.IN,
        startTime: CONSTANT.SEARCH_OPERATOR.LE,
        endTime: CONSTANT.SEARCH_OPERATOR.GE,
      },
    })
    const list = res?.data?.content || res?.data || []
    // 按 internshipId 去重（同一项目可能有多条流程记录，但通常只有一条自主实习）
    const seen = new Set()
    const unique = []
    list.forEach(item => {
      const id = item.internshipId
      if (!id || seen.has(id)) return
      seen.add(id)
      unique.push({ ...item, internshipId: id })
    })
    projectList.value = unique
  } catch (e) {
    console.error('加载自主实习项目列表失败:', e)
    projectList.value = []
  } finally {
    projectsLoading.value = false
  }
}

async function handleProjectChange(internshipId) {
  currentRecord.value = null
  processConfigured.value = false
  hasOtherApprovedPost.value = false
  if (!internshipId) return
  const project = projectList.value.find(p => String(p.internshipId) === String(internshipId))
  processConfigured.value = !!project
  await Promise.all([
    loadCurrentRecord(internshipId),
    loadHasOtherApprovedPost(internshipId),
  ])
}

/**
 * 查询当前项目下学生是否已存在"非自主实习"的已通过报名
 * （视图返回的行包含 internshipPostCode，过滤掉自主实习虚拟岗位即可）
 */
async function loadHasOtherApprovedPost(internshipId) {
  const userId = userInfo.value?.id
  if (!internshipId || !userId) {
    hasOtherApprovedPost.value = false
    return
  }
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPostMerge',
      searchKey: {
        internshipId,
        studentId: userId,
        isAudit: CONSTANT.AUDIT_STATUS.PASS,
      },
      reg: { internshipId: '=', studentId: '=', isAudit: '=' },
    })
    const rows = res?.data?.content || res?.data || []
    hasOtherApprovedPost.value = rows.some(
      (r) => r?.internshipPostCode !== CONSTANT.SELF_INTERNSHIP.POST_CODE
    )
  } catch (e) {
    console.error('校验已通过岗位失败:', e)
    hasOtherApprovedPost.value = false
  }
}

/** 查询当前学生在当前项目下的自主实习申请记录 */
async function loadCurrentRecord(internshipId) {
  const userId = userInfo.value?.id
  if (!internshipId || !userId) return
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewVerifyProcessRelStuInternshipPostMerge',
      searchKey: {
        internshipId,
        studentId: userId,
        internshipPostCode: CONSTANT.SELF_INTERNSHIP.POST_CODE,
      },
      reg: { internshipId: '=', studentId: '=', internshipPostCode: '=' },
      sort: { properties: 'id', direction: 'DESC' },
      pageInfo: { page: 1, size: 1 },
    })
    const rows = res?.data?.content || res?.data || []
    currentRecord.value = rows[0] || null
  } catch (e) {
    console.error('加载自主实习申请记录失败:', e)
    currentRecord.value = null
  }
}

async function refreshRecord() {
  if (!selectedInternshipId.value) return
  recordRefreshing.value = true
  // 至少保证动画可见 400ms，避免请求太快时闪一下看不到
  const minDelay = new Promise((resolve) => setTimeout(resolve, 400))
  try {
    await Promise.all([
      loadCurrentRecord(selectedInternshipId.value),
      loadHasOtherApprovedPost(selectedInternshipId.value),
      minDelay,
    ])
  } finally {
    recordRefreshing.value = false
  }
}

/**
 * 打开申请弹窗
 * @param {boolean} [viewOnly] - 若传 true 强制只读查看（即便当前状态本可编辑）
 */
function openSubmitDialog(viewOnly = false) {
  if (!selectedInternshipId.value) {
    ElMessage.warning('请先选择实习项目')
    return
  }
  if (!processConfigured.value) {
    ElMessage.warning('当前项目未开通自主实习申请')
    return
  }
  // 已有通过的实习岗位（非自主实习）时，直接拦截，不打开弹窗让学生填写
  if (!viewOnly && hasOtherApprovedPost.value) {
    ElMessage.warning('您在当前实习项目下已有审核通过的实习岗位，无法再申请自主实习')
    return
  }
  const project = projectList.value.find(
    p => String(p.internshipId) === String(selectedInternshipId.value)
  )
  // viewOnly 时传一条假装为 PASS 的记录副本触发只读模式
  let passRecord = currentRecord.value
  if (viewOnly && passRecord) {
    passRecord = { ...passRecord, isAudit: CONSTANT.AUDIT_STATUS.PASS }
  }
  dlgSelfDeclarationRef.value?.open({
    internshipId: selectedInternshipId.value,
    internshipName: project?.internshipName || project?.name || '',
    record: hasRecord.value ? passRecord : null,
  })
}

function openProgress() {
  if (!currentRecord.value) return
  showProgressDialog.value = true
}

onMounted(async () => {
  await loadProjectList()
})

onActivated(async () => {
  await loadProjectList()
  if (selectedInternshipId.value) {
    await Promise.all([
      loadCurrentRecord(selectedInternshipId.value),
      loadHasOtherApprovedPost(selectedInternshipId.value),
    ])
  }
})
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

.process-hint {
  margin-top: 10px;
}

.record-card {
  margin-top: 12px;
}

.record-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
