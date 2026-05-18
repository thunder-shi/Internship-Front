<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="780px"
    :close-on-click-modal="false"
    append-to-body
    :before-close="handleClose"
    @closed="onClosed"
  >
    <div v-loading="loading">
      <el-alert
        v-if="locked"
        type="warning"
        title="审核已开始，配置已锁定，不可修改"
        :closable="false"
        class="mb-12"
      />
      <el-alert
        v-else-if="!canConfigure"
        type="info"
        :title="cannotConfigureMessage"
        :closable="false"
        class="mb-12"
      />
      <el-alert
        v-else
        :title="weightHint"
        :type="localValid ? 'success' : 'warning'"
        :closable="false"
        class="mb-12"
      />

      <el-table :data="draftItems" border size="small" empty-text="尚未配置成绩项">
        <el-table-column prop="levelOrder" label="审核级别" width="100" align="center">
          <template #default="{ row }">第 {{ row.levelOrder }} 级</template>
        </el-table-column>
        <el-table-column prop="itemName" label="成绩项名称" min-width="160" />
        <el-table-column prop="weight" label="占比 (%)" width="100" align="center" />
        <el-table-column prop="maxScore" label="满分" width="80" align="center" />
        <el-table-column prop="orderNum" label="排序" width="70" align="center" />
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row, $index }">
            <el-button link type="primary" size="small" :disabled="!canEditUI" @click="openEdit(row, $index)">编辑</el-button>
            <el-button link type="danger" size="small" :disabled="!canEditUI" @click="handleDelete($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="footer-actions">
        <el-button type="primary" :disabled="!canEditUI" @click="openAdd">新增成绩项</el-button>
        <span class="weight-summary">
          权重总和：<b :class="localValid ? 'sum-ok' : 'sum-bad'">{{ localTotalWeight }}</b> / 100
          <span v-if="dirty" class="dirty-tag">未保存</span>
        </span>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button
        v-if="!locked && canConfigure"
        type="primary"
        :loading="saving"
        :disabled="!localValid || !dirty"
        @click="handleSaveBatch"
      >
        保存配置
      </el-button>
    </template>

    <!-- 内嵌成绩项编辑对话框 -->
    <el-dialog
      v-model="itemDlgVisible"
      :title="editingIndex < 0 ? '新增成绩项' : '编辑成绩项'"
      width="480px"
      :close-on-click-modal="false"
      append-to-body
      @closed="onItemDlgClosed"
    >
      <el-form ref="itemFormRef" :model="itemForm" :rules="itemFormRules" label-width="100px">
        <el-form-item label="审核级别" prop="levelOrder">
          <el-select v-model="itemForm.levelOrder" placeholder="选择第几级审核人打分">
            <el-option
              v-for="lv in levelOptions"
              :key="lv"
              :label="`第 ${lv} 级`"
              :value="lv"
              :disabled="isLevelOccupied(lv)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="成绩项名称" prop="itemName">
          <el-input v-model="itemForm.itemName" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="占比 (%)" prop="weight">
          <el-input-number v-model="itemForm.weight" :min="0" :max="100" :precision="2" controls-position="right" />
          <span class="weight-hint">已用 {{ otherWeights }}%，剩余 {{ remainingWeight }}%</span>
        </el-form-item>
        <el-form-item label="满分" prop="maxScore">
          <el-input-number v-model="itemForm.maxScore" :min="0.01" :max="1000" :precision="2" controls-position="right" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="itemForm.orderNum" :min="0" :max="999" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemDlgVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStageItem">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import gradeConfigAPI from '@/api/internshipGradeConfig'

defineOptions({ name: 'DlgGradeConfig' })

const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const internshipId = ref(null)
const internshipName = ref('')
const sourceTable = ref('MainDiary')
const sourceLabel = ref('实习日志')

// 服务端元数据
const maxLevelOrder = ref(null) // null = 无法配置（无日志或 NO_VERIFY）
const locked = ref(false)
const items = ref([])           // 服务端快照（用于 dirty 比对）
const draftItems = ref([])      // 本地暂存（用户编辑中）

const dialogTitle = computed(() => {
  const base = `评分配置 - ${sourceLabel.value}`
  return internshipName.value ? `${base}（${internshipName.value}）` : base
})

const canConfigure = computed(() => Number(maxLevelOrder.value) > 0)
const cannotConfigureMessage = computed(() => {
  if (maxLevelOrder.value === null || maxLevelOrder.value === undefined) {
    return '该实习的日志流程尚未生成或为无需审核类型，暂不支持配置评分'
  }
  return '当前流程没有可打分的审核级别（NO_VERIFY 或仅 1 级时无人可打分）'
})
const canEditUI = computed(() => !locked.value && canConfigure.value)

const localTotalWeight = computed(() => {
  const sum = draftItems.value.reduce((s, it) => s + Number(it.weight || 0), 0)
  return Math.round(sum * 100) / 100
})
const localValid = computed(() => localTotalWeight.value === 100)

const weightHint = computed(() => {
  if (draftItems.value.length === 0) return '尚未配置任何成绩项，总占比需精确等于 100%'
  if (localValid.value) return '权重总和已满 100%，配置完成'
  if (localTotalWeight.value < 100) return `权重总和不足 100%，还需追加 ${100 - localTotalWeight.value}%`
  return `权重总和超出 100%，需调整 ${localTotalWeight.value - 100}%`
})

const dirty = computed(() => {
  if (draftItems.value.length !== items.value.length) return true
  return draftItems.value.some((d, i) => {
    const s = items.value[i]
    if (!s) return true
    return (
      Number(d.levelOrder) !== Number(s.levelOrder) ||
      String(d.itemName) !== String(s.itemName) ||
      Number(d.weight) !== Number(s.weight) ||
      Number(d.maxScore) !== Number(s.maxScore) ||
      Number(d.orderNum || 0) !== Number(s.orderNum || 0)
    )
  })
})

const levelOptions = computed(() => {
  const max = Number(maxLevelOrder.value) || 0
  const arr = []
  for (let i = 1; i <= max; i++) arr.push(i)
  return arr
})

const occupiedLevels = computed(() => {
  const set = new Set()
  draftItems.value.forEach((it, idx) => {
    if (idx === editingIndex.value) return
    set.add(Number(it.levelOrder))
  })
  return set
})

function isLevelOccupied(lv) {
  return occupiedLevels.value.has(lv)
}

const otherWeights = computed(() => {
  const sum = draftItems.value
    .filter((_, idx) => idx !== editingIndex.value)
    .reduce((s, it) => s + Number(it.weight || 0), 0)
  return Math.round(sum * 100) / 100
})

const remainingWeight = computed(() => {
  return Math.max(0, Math.round((100 - otherWeights.value) * 100) / 100)
})

// ── 子对话框 ───────────────────────────────────────────
const itemDlgVisible = ref(false)
const editingIndex = ref(-1)
const itemFormRef = ref(null)
const itemForm = reactive({
  levelOrder: null,
  itemName: '',
  weight: 0,
  maxScore: 100,
  orderNum: 0,
})
const itemFormRules = {
  levelOrder: [{ required: true, message: '请选择审核级别', trigger: 'change' }],
  itemName: [
    { required: true, message: '请填写成绩项名称', trigger: 'blur' },
    { max: 64, message: '名称不超过 64 个字符', trigger: 'blur' },
  ],
  weight: [
    { required: true, message: '请填写占比', trigger: 'blur' },
    {
      validator: (_rule, val, cb) => {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0 || n > 100) cb(new Error('占比应在 0-100 之间'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
  maxScore: [
    { required: true, message: '请填写满分', trigger: 'blur' },
    {
      validator: (_rule, val, cb) => {
        const n = Number(val)
        if (!Number.isFinite(n) || n <= 0) cb(new Error('满分必须大于 0'))
        else cb()
      },
      trigger: 'blur',
    },
  ],
}

function open({ internshipId: iid, internshipName: name, sourceTable: src = 'MainDiary', sourceLabel: srcLabel = '实习日志' }) {
  internshipId.value = iid
  internshipName.value = name || ''
  sourceTable.value = src
  sourceLabel.value = srcLabel
  maxLevelOrder.value = null
  locked.value = false
  items.value = []
  draftItems.value = []
  visible.value = true
  loadList()
}

function onClosed() {
  items.value = []
  draftItems.value = []
  maxLevelOrder.value = null
  locked.value = false
}

async function handleClose(done) {
  if (!locked.value && canConfigure.value && dirty.value) {
    try {
      await ElMessageBox.confirm('有未保存的修改，确认放弃？', '提示', {
        type: 'warning',
        confirmButtonText: '放弃修改',
        cancelButtonText: '继续编辑',
      })
    } catch {
      if (typeof done === 'function') return
      return
    }
  }
  if (typeof done === 'function') {
    done()
  } else {
    visible.value = false
  }
}

async function loadList() {
  if (!internshipId.value) return
  loading.value = true
  try {
    const res = await gradeConfigAPI.listGradeConfig({
      internshipId: internshipId.value,
      sourceTable: sourceTable.value,
    })
    const data = res?.data || {}
    items.value = Array.isArray(data.items) ? cloneItems(data.items) : []
    draftItems.value = cloneItems(items.value)
    maxLevelOrder.value = data.maxLevelOrder ?? null
    locked.value = !!data.locked
  } catch (e) {
    console.error('加载评分配置失败:', e)
    items.value = []
    draftItems.value = []
    maxLevelOrder.value = null
    locked.value = false
  } finally {
    loading.value = false
  }
}

function cloneItems(arr) {
  return arr.map(it => ({
    levelOrder: Number(it.levelOrder),
    itemName: String(it.itemName ?? ''),
    weight: Number(it.weight),
    maxScore: Number(it.maxScore),
    orderNum: Number(it.orderNum ?? 0),
  }))
}

function openAdd() {
  if (!canEditUI.value) return
  editingIndex.value = -1
  Object.assign(itemForm, {
    levelOrder: null,
    itemName: '',
    weight: remainingWeight.value,
    maxScore: 100,
    orderNum: draftItems.value.length,
  })
  itemDlgVisible.value = true
}

function openEdit(row, index) {
  if (!canEditUI.value) return
  editingIndex.value = index
  Object.assign(itemForm, {
    levelOrder: Number(row.levelOrder),
    itemName: row.itemName,
    weight: Number(row.weight),
    maxScore: Number(row.maxScore),
    orderNum: Number(row.orderNum ?? 0),
  })
  itemDlgVisible.value = true
}

function onItemDlgClosed() {
  itemFormRef.value?.clearValidate()
  editingIndex.value = -1
}

async function handleStageItem() {
  try {
    await itemFormRef.value.validate()
  } catch {
    return
  }
  const payload = {
    levelOrder: Number(itemForm.levelOrder),
    itemName: itemForm.itemName.trim(),
    weight: Number(itemForm.weight),
    maxScore: Number(itemForm.maxScore),
    orderNum: Number(itemForm.orderNum) || 0,
  }
  if (editingIndex.value < 0) {
    draftItems.value.push(payload)
  } else {
    draftItems.value.splice(editingIndex.value, 1, payload)
  }
  draftItems.value.sort((a, b) => a.levelOrder - b.levelOrder || a.orderNum - b.orderNum)
  itemDlgVisible.value = false
}

async function handleDelete(index) {
  if (!canEditUI.value) return
  const row = draftItems.value[index]
  if (!row) return
  try {
    await ElMessageBox.confirm(
      `确定移除「${row.itemName}」？该操作仅暂存在前端，点「保存配置」后才生效。`,
      '提示',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' },
    )
  } catch { return }
  draftItems.value.splice(index, 1)
}

async function handleSaveBatch() {
  if (!localValid.value) {
    ElMessage.warning('权重总和必须精确等于 100%')
    return
  }
  saving.value = true
  try {
    const res = await gradeConfigAPI.saveBatchGradeConfig({
      internshipId: internshipId.value,
      sourceTable: sourceTable.value,
      items: draftItems.value.map(it => ({
        levelOrder: Number(it.levelOrder),
        itemName: it.itemName,
        weight: Number(it.weight),
        maxScore: Number(it.maxScore),
        orderNum: Number(it.orderNum) || 0,
      })),
    })
    if (res?.message === 'successful') {
      ElMessage.success('配置已保存')
      // 直接采用服务端最新返回，省一次 list 请求
      const data = res?.data || {}
      items.value = Array.isArray(data.items) ? cloneItems(data.items) : cloneItems(draftItems.value)
      draftItems.value = cloneItems(items.value)
      if (data.maxLevelOrder !== undefined) maxLevelOrder.value = data.maxLevelOrder
      if (typeof data.locked === 'boolean') locked.value = data.locked
    } else {
      ElMessage.error(res?.message || '保存失败')
    }
  } catch (e) {
    console.error('批量保存评分配置失败:', e)
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<style scoped>
.mb-12 {
  margin-bottom: 12px;
}

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.weight-summary {
  font-size: 13px;
  color: #606266;
}

.weight-summary .sum-ok {
  color: #67c23a;
  font-size: 15px;
}

.weight-summary .sum-bad {
  color: #e6a23c;
  font-size: 15px;
}

.dirty-tag {
  margin-left: 12px;
  padding: 1px 8px;
  border-radius: 4px;
  background: #fdf6ec;
  color: #e6a23c;
  font-size: 12px;
}

.weight-hint {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}
</style>
