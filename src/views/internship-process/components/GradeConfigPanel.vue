<template>
  <div v-loading="loading" class="grade-config-panel">
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

    <div class="grade-table-wrapper">
      <DataTableList
        ref="dataTableListRef"
        :default-props="tableProps"
        :fetch-records="fetchDraft"
        @append-click="openAdd"
        @edit-click="openEdit"
        @spec-remove="handleDelete"
      >
        <template #levelOrder="{ row }">第 {{ row.levelOrder }} 级</template>
      </DataTableList>
    </div>

    <div class="footer-actions">
      <span class="weight-summary">
        权重总和：<b :class="localValid ? 'sum-ok' : 'sum-bad'">{{ localTotalWeight }}</b> / 100
        <span v-if="dirty" class="dirty-tag">未保存</span>
      </span>
      <el-button
        v-if="!locked && canConfigure"
        type="primary"
        :loading="saving"
        :disabled="!localValid || !dirty"
        @click="handleSaveBatch"
      >
        保存配置
      </el-button>
    </div>

    <!-- 成绩项编辑弹窗（DlgBasic 模板外壳） -->
    <DlgBasic
      ref="itemDlgRef"
      :default-props="itemDlgProps"
      :dlgbasic-confirm="onItemConfirm"
      @close-dialog="onItemDlgClosed"
    >
      <template #mainForm>
        <el-form
          ref="itemFormRef"
          :model="itemForm"
          :rules="itemFormRules"
          label-width="100px"
          class="grade-item-form"
        >
          <el-form-item label="审核级别" prop="levelOrder">
            <el-select v-model="itemForm.levelOrder" placeholder="选择第几级审核人打分" style="width: 100%">
              <el-option
                v-for="lv in levelOptions"
                :key="lv"
                :label="`第 ${lv} 级`"
                :value="lv"
                :disabled="isLevelOccupied(lv)"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="占比 (%)" prop="weight">
            <el-input-number v-model="itemForm.weight" :min="0" :max="100" :precision="2" controls-position="right" />
            <span class="weight-hint">已用 {{ otherWeights }}%，剩余 {{ remainingWeight }}%</span>
          </el-form-item>
          <el-form-item label="满分" prop="maxScore">
            <el-input-number v-model="itemForm.maxScore" :min="0.01" :max="1000" :precision="2" controls-position="right" />
          </el-form-item>
        </el-form>
      </template>
    </DlgBasic>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import DataTableList from '@/components/DataTableList.vue'
import DlgBasic from '@/components/DlgBasic.vue'
import gradeConfigAPI from '@/api/internshipGradeConfig'

defineOptions({ name: 'GradeConfigPanel' })

const props = defineProps({
  internshipId: { type: [Number, String], default: null },
  sourceTable: { type: String, default: 'MainDiary' },
  sourceLabel: { type: String, default: '实习日志' },
})

const loading = ref(false)
const saving = ref(false)

const maxLevelOrder = ref(null)
const locked = ref(false)
const items = ref([])
const draftItems = ref([])
const loadedKey = ref(null)
let tmpIdSeq = 0

const dataTableListRef = ref(null)
const itemDlgRef = ref(null)

const canConfigure = computed(() => maxLevelOrder.value != null && Number(maxLevelOrder.value) >= 1)
const cannotConfigureMessage = computed(() => '请先在「流程安排」tab 为该实习添加「实习项目进行」流程，且审核要求不能选「无需审核」，保存后再回到本页配置评分')
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
      Number(d.weight) !== Number(s.weight) ||
      Number(d.maxScore) !== Number(s.maxScore)
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
  draftItems.value.forEach((it) => {
    if (it.id === editingId.value) return
    set.add(Number(it.levelOrder))
  })
  return set
})

function isLevelOccupied(lv) {
  return occupiedLevels.value.has(lv)
}

const otherWeights = computed(() => {
  const sum = draftItems.value
    .filter((it) => it.id !== editingId.value)
    .reduce((s, it) => s + Number(it.weight || 0), 0)
  return Math.round(sum * 100) / 100
})

const remainingWeight = computed(() => {
  return Math.max(0, Math.round((100 - otherWeights.value) * 100) / 100)
})

const tableProps = computed(() => ({
  bottomOffset: 0,
  sortStr: { properties: 'levelOrder', direction: 'ASC' },
  someFlags: {
    operateShow: true,
    checkFlag: false,         // 单选 radio 列；勾选后启用顶部编辑/删除
    showPage: false,
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: true,
    keyWord: { view: 'GradeConfigDraft', edit: 'GradeConfigDraft' },
    buttonProps: {
      create: { show: canEditUI.value, name: '新增成绩项', type: 'primary' },
      update: { show: canEditUI.value, name: '编辑', type: 'primary' },
      delete: { show: canEditUI.value, name: '删除', type: 'danger' },
    },
    allTableColumns: [
      { id: 1, showName: '审核级别', theOrder: 1, tableColumnName: 'customize-levelOrder', width: 140 },
      { id: 2, showName: '占比 (%)', theOrder: 2, tableColumnName: 'weight', width: 160 },
      { id: 3, showName: '满分', theOrder: 3, tableColumnName: 'maxScore' },
    ],
  },
}))

const itemDlgProps = computed(() => ({
  dlgTitle: editingId.value == null ? '新增成绩项' : '编辑成绩项',
  width: '480px',
  footButtons: {
    cancel: { show: true, name: '取消', type: '' },
    confirm: { show: true, name: '确定', type: 'primary' },
    submit: { show: false },
    repeatAdd: { show: false },
  },
  someFlags: {
    noFooter: false,
    autoMax: false,
    needMaxBtn: false,
    needValidate: false,
    validate: false,
    needVerifyUpdate: false,
  },
}))

// 子对话框：编辑/新增成绩项
const editingId = ref(null) // null = 新增；否则为 draftItem.id
const itemFormRef = ref(null)
const itemForm = reactive({
  levelOrder: null,
  weight: 0,
  maxScore: 100,
})
const itemFormRules = {
  levelOrder: [{ required: true, message: '请选择审核级别', trigger: 'change' }],
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

function currentKey() {
  return `${props.internshipId ?? ''}|${props.sourceTable ?? ''}`
}

function cloneItems(arr) {
  return arr.map(it => ({
    id: ++tmpIdSeq,
    levelOrder: Number(it.levelOrder),
    weight: Number(it.weight),
    maxScore: Number(it.maxScore),
  }))
}

function resetState() {
  items.value = []
  draftItems.value = []
  maxLevelOrder.value = null
  locked.value = false
  loadedKey.value = null
}

function refreshTable() {
  nextTick(() => dataTableListRef.value?.initDataList(true))
}

watch(
  () => [props.internshipId, props.sourceTable],
  () => { resetState(); refreshTable() },
)

function fetchDraft() {
  return Promise.resolve({
    data: { content: draftItems.value.slice(), totalElements: draftItems.value.length },
    message: 'successful',
  })
}

async function initLoad(force = false) {
  if (!props.internshipId) return
  const key = currentKey()
  if (!force && loadedKey.value === key) return
  loading.value = true
  try {
    const res = await gradeConfigAPI.listGradeConfig({
      internshipId: props.internshipId,
      sourceTable: props.sourceTable,
    })
    const data = res?.data || {}
    items.value = Array.isArray(data.items) ? cloneItems(data.items) : []
    draftItems.value = cloneItems(items.value)
    maxLevelOrder.value = data.maxLevelOrder ?? null
    locked.value = !!data.locked
    loadedKey.value = key
  } catch (e) {
    console.error('加载评分配置失败:', e)
    resetState()
  } finally {
    loading.value = false
    refreshTable()
  }
}

function openAdd() {
  if (!canEditUI.value) return
  editingId.value = null
  Object.assign(itemForm, {
    levelOrder: null,
    weight: remainingWeight.value,
    maxScore: 100,
  })
  itemDlgRef.value?.showDialog(true, {}, 'append')
}

function openEdit(row) {
  if (!canEditUI.value) return
  // 顶部按钮场景 row 是单对象；行内场景也是单对象
  const target = Array.isArray(row) ? row[0] : row
  if (!target) return
  editingId.value = target.id
  Object.assign(itemForm, {
    levelOrder: Number(target.levelOrder),
    weight: Number(target.weight),
    maxScore: Number(target.maxScore),
  })
  itemDlgRef.value?.showDialog(true, {}, 'edit')
}

function onItemDlgClosed() {
  itemFormRef.value?.clearValidate()
  editingId.value = null
}

async function onItemConfirm() {
  try {
    await itemFormRef.value.validate()
  } catch {
    return false
  }
  const payload = {
    levelOrder: Number(itemForm.levelOrder),
    weight: Number(itemForm.weight),
    maxScore: Number(itemForm.maxScore),
  }
  if (editingId.value == null) {
    draftItems.value.push({ id: ++tmpIdSeq, ...payload })
  } else {
    const idx = draftItems.value.findIndex(it => it.id === editingId.value)
    if (idx >= 0) {
      draftItems.value.splice(idx, 1, { id: editingId.value, ...payload })
    }
  }
  draftItems.value.sort((a, b) => a.levelOrder - b.levelOrder)
  refreshTable()
  return true
}

async function handleDelete(rows) {
  if (!canEditUI.value) return
  const list = Array.isArray(rows) ? rows : [rows].filter(Boolean)
  if (!list.length) return
  const desc = list.map(r => `第 ${r.levelOrder} 级`).join('、')
  try {
    await ElMessageBox.confirm(
      `确定移除${desc}评分项？该操作仅暂存在前端，点「保存配置」后才生效。`,
      '提示',
      { type: 'warning', confirmButtonText: '移除', cancelButtonText: '取消' },
    )
  } catch { return }
  const ids = new Set(list.map(r => r.id))
  draftItems.value = draftItems.value.filter(it => !ids.has(it.id))
  refreshTable()
}

async function handleSaveBatch() {
  if (!localValid.value) {
    ElMessage.warning('权重总和必须精确等于 100%')
    return
  }
  saving.value = true
  try {
    const res = await gradeConfigAPI.saveBatchGradeConfig({
      internshipId: props.internshipId,
      sourceTable: props.sourceTable,
      items: draftItems.value.map(it => ({
        levelOrder: Number(it.levelOrder),
        weight: Number(it.weight),
        maxScore: Number(it.maxScore),
      })),
    })
    if (res?.message === 'successful') {
      ElMessage.success('配置已保存')
      const data = res?.data || {}
      items.value = Array.isArray(data.items) ? cloneItems(data.items) : cloneItems(draftItems.value)
      draftItems.value = cloneItems(items.value)
      if (data.maxLevelOrder !== undefined) maxLevelOrder.value = data.maxLevelOrder
      if (typeof data.locked === 'boolean') locked.value = data.locked
      loadedKey.value = currentKey()
      refreshTable()
    } else {
      ElMessage.error(res?.message || '保存失败')
    }
  } catch (e) {
    console.error('批量保存评分配置失败:', e)
  } finally {
    saving.value = false
  }
}

defineExpose({ initLoad, resetState, isDirty: () => dirty.value })
</script>

<style scoped>
.grade-config-panel {
  width: 100%;
}

.mb-12 {
  margin-bottom: 12px;
}

.grade-table-wrapper {
  height: 320px;
  overflow: hidden;
}

.grade-table-wrapper :deep(.el-card) {
  border: none;
  box-shadow: none;
}

.grade-table-wrapper :deep(.el-card__body) {
  padding: 0;
}

.grade-table-wrapper :deep(.el-table) {
  height: 280px !important;
}

.grade-table-wrapper :deep(.el-table__body-wrapper) {
  height: 240px !important;
  overflow-y: auto;
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

.grade-item-form {
  padding: 8px 16px 0;
}
</style>
