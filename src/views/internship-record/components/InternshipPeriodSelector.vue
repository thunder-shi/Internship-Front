<template>
  <el-card class="selector-card" shadow="never">
    <el-row :gutter="16" align="middle">
      <el-col :span="10">
        <el-form-item label="实习项目" label-width="80px" class="mb-0">
          <el-select
            v-model="localInternshipId"
            placeholder="请选择实习项目"
            style="width: 100%"
            @change="handleInternshipChange"
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
            v-model="localPeriodId"
            placeholder="请选择期数"
            :disabled="!localInternshipId || periodList.length === 0"
            style="width: 100%"
            @change="handlePeriodChange"
          >
            <el-option
              v-for="p in periodList"
              :key="p.id"
              :label="periodLabel(p)"
              :value="p.id"
            />
          </el-select>
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import listAPI from '@/api/list'
import { getInternshipPeriods } from '@/api/diary'

defineOptions({ name: 'InternshipPeriodSelector' })

const props = defineProps({
  internshipId: { default: null },
  periodId: { default: null },
  userId: { type: [String, Number], required: true },
})

const emit = defineEmits([
  'update:internshipId',
  'update:periodId',
  'internship-change',
  'period-change',
])

const internshipList = ref([])
const periodList = ref([])
const currentPeriodId = ref(null)

const localInternshipId = computed({
  get: () => props.internshipId,
  set: val => emit('update:internshipId', val),
})

const localPeriodId = computed({
  get: () => props.periodId,
  set: val => emit('update:periodId', val),
})

async function loadInternshipList() {
  try {
    const res = await listAPI.getSomeRecords({
      keyWords: 'ViewRelIntershipUser',
      searchKey: { userId: props.userId },
      reg: { userId: '=' },
    })
    const raw = res?.data?.content || res?.data || []
    const seen = new Set()
    internshipList.value = raw.filter(item => {
      const key = item.internshipId
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (internshipList.value.length === 1) {
      localInternshipId.value = internshipList.value[0].internshipId
      await handleInternshipChange(localInternshipId.value)
    }
  } catch {
    ElMessage.error('获取实习项目列表失败')
  }
}

function findCurrentPeriod(list) {
  const now = new Date()
  const active = list.find(p =>
    p.beginTime && p.endTime &&
    new Date(p.beginTime) <= now && now <= new Date(p.endTime)
  )
  if (active) return active
  const past = list
    .filter(p => p.endTime && new Date(p.endTime) < now)
    .sort((a, b) => (b.periodIndex || 0) - (a.periodIndex || 0))
  if (past.length) return past[0]
  const future = list
    .filter(p => p.beginTime && new Date(p.beginTime) > now)
    .sort((a, b) => (a.periodIndex || 0) - (b.periodIndex || 0))
  return future[0] ?? null
}

async function handleInternshipChange(internshipId) {
  localPeriodId.value = null
  periodList.value = []
  currentPeriodId.value = null
  emit('internship-change', internshipId)

  if (!internshipId) return
  try {
    const res = await getInternshipPeriods({ internshipId })
    periodList.value = res?.data || []
    if (periodList.value.length > 0) {
      const current = findCurrentPeriod(periodList.value)
      if (current) {
        currentPeriodId.value = current.id
        localPeriodId.value = current.id
        emit('period-change', current.id)
      }
    }
  } catch {
    ElMessage.error('获取期数信息失败')
  }
}

function periodLabel(p) {
  const idx = `第 ${p.periodIndex} 期`
  const current = p.id === currentPeriodId.value ? '【本期】' : ''
  if (!p.beginTime && !p.endTime) return `${idx}${current}`
  const fmt = (dateStr) => dateStr ? dateStr.slice(0, 10) : ''
  const begin = fmt(p.beginTime)
  const end = fmt(p.endTime)
  const dateStr = (begin === end || !end) ? `（${begin}）` : `（${begin} ~ ${end}）`
  return `${idx}${dateStr}${current}`
}

function handlePeriodChange(periodId) {
  emit('period-change', periodId)
}

onMounted(() => {
  loadInternshipList()
})
</script>

<style scoped>
.selector-card :deep(.el-card__body) {
  padding: 14px 16px;
}

.mb-0 {
  margin-bottom: 0;
}
</style>
