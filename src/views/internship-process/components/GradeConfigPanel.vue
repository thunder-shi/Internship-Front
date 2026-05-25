<template>
  <div v-loading="loading" class="grade-config-panel">
    <el-alert v-if="locked" type="warning" title="审核已开始，配置已锁定，不可修改" :closable="false" class="mb-12" />
    <el-alert v-else-if="!canConfigure" type="info" :title="cannotConfigureMessage" :closable="false" class="mb-12" />
    <el-alert v-else :title="weightHint" :type="totalValid ? 'success' : 'warning'" :closable="false" class="mb-12" />

    <div class="grade-table-wrapper">
      <DataTableList :key="tableKey" ref="dataTableListRef" :default-props="tableProps" :fetch-records="fetchItems"
        @append-click="openAdd" @edit-click="openEdit" @delete-click="handleDelete" @spec-remove="handleDelete">
        <template #levelOrder="{ row }">第 {{ row.levelOrder }} 级</template>
      </DataTableList>
    </div>

    <div class="footer-actions">
      <span class="weight-summary">
        权重总和：<b :class="totalValid ? 'sum-ok' : 'sum-bad'">{{ totalWeight }}</b> / 100
      </span>
    </div>

    <!-- 成绩项编辑弹窗（DlgBasic 模板外壳） -->
    <DlgBasic ref="itemDlgRef" :default-props="itemDlgProps" :dlgbasic-confirm="onItemConfirm"
      @close-dialog="onItemDlgClosed">
      <template #mainForm>
        <el-form ref="itemFormRef" :model="itemForm" :rules="itemFormRules" label-width="100px" class="grade-item-form">
          <el-form-item label="审核级别" prop="levelOrder">
            <el-select v-model="itemForm.levelOrder" placeholder="选择第几级审核人打分" style="width: 100%">
              <el-option v-for="lv in levelOptions" :key="lv" :label="`第 ${lv} 级`" :value="lv"
                :disabled="isLevelOccupied(lv)" />
            </el-select>
          </el-form-item>
          <el-form-item label="占比 (%)" prop="weight">
            <el-slider v-model="itemForm.weight" :min="0" :max="remainingWeight" :step="1" show-input
              :show-input-controls="false" class="weight-slider" />
            <div class="weight-hint">已用 {{ otherWeights }}%，剩余 {{ remainingWeight }}%</div>
          </el-form-item>
          <el-form-item label="满分" prop="maxScore">
            <el-input-number v-model="itemForm.maxScore" :min="0.01" :max="1000" :precision="2"
              controls-position="right" />
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

const maxLevelOrder = ref(null)
const locked = ref(false)
const items = ref([])
const loadedKey = ref(null)
const valid = ref(true)

const dataTableListRef = ref(null)
const itemDlgRef = ref(null)

const canConfigure = computed(() => maxLevelOrder.value != null && Number(maxLevelOrder.value) >= 1)
const cannotConfigureMessage = computed(() => '请先在「流程安排」tab 为该实习添加「实习项目进行」流程，且审核要求不能选「无需审核」，保存后再回到本页配置评分')
const canEditUI = computed(() => !locked.value && canConfigure.value)

// canEditUI 变化时强制重建 DataTableList，使其重新计算 operateWidth
const tableKey = computed(() => canEditUI.value ? 'editable' : 'readonly')

const totalWeight = computed(() => {
  const sum = items.value.reduce((s, it) => s + Number(it.weight || 0), 0)
  return Math.round(sum * 100) / 100
})
const totalValid = computed(() => valid.value)

const weightHint = computed(() => {
  if (items.value.length === 0) return '尚未配置任何成绩项，总占比需精确等于 100%'
  if (totalValid.value) return '权重总和已满 100%，配置完成'
  if (totalWeight.value < 100) return `权重总和不足 100%，还需追加 ${100 - totalWeight.value}%`
  return `权重总和超出 100%，需调整 ${totalWeight.value - 100}%`
})

const levelOptions = computed(() => {
  const max = Number(maxLevelOrder.value) || 0
  const arr = []
  for (let i = 1; i <= max; i++) arr.push(i)
  return arr
})

const occupiedLevels = computed(() => {
  const set = new Set()
  items.value.forEach((it) => {
    if (it.id === editingId.value) return
    set.add(Number(it.levelOrder))
  })
  return set
})

function isLevelOccupied(lv) {
  return occupiedLevels.value.has(lv)
}

const otherWeights = computed(() => {
  const sum = items.value
    .filter((it) => it.id !== editingId.value)
    .reduce((s, it) => s + Number(it.weight || 0), 0)
  return Math.round(sum * 100) / 100
})

const remainingWeight = computed(() => {
  return Math.max(0, Math.round((100 - otherWeights.value) * 100) / 100)
})

const tableProps = computed(() => ({
  bottomOffset: 70,
  sortStr: { properties: 'levelOrder', direction: 'ASC' },
  pageInfo: { page: 1, size: 25 },
  someFlags: {
    operateShow: true,
    checkFlag: true,          // 多选复选框列，支持顶部批量删除
    showPage: true,           // 显示分页栏
    autoInit: false,
    noAdvancedSearch: true,
  },
  defaultDTHProps: {
    showTopButtons: true,
    keyWord: { view: 'InternshipGradeConfigItem', edit: 'InternshipGradeConfigItem' },
    buttonProps: {
      create: { show: true, type: 'primary' },
      update: { show: true, type: 'primary' },
      delete: { show: true, type: 'danger' },
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
    { required: true, message: '请填写占比', trigger: 'change' },
    {
      validator: (_rule, val, cb) => {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0 || n > 100) cb(new Error('占比应在 0-100 之间'))
        else cb()
      },
      trigger: 'change',
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

function normalizeItems(arr) {
  return arr.map(it => ({
    id: it.id,
    levelOrder: Number(it.levelOrder),
    weight: Number(it.weight),
    maxScore: Number(it.maxScore),
  }))
}

function resetState() {
  items.value = []
  maxLevelOrder.value = null
  locked.value = false
  loadedKey.value = null
  valid.value = true
}

function refreshTable() {
  nextTick(() => dataTableListRef.value?.initDataList(true))
}

watch(
  () => [props.internshipId, props.sourceTable],
  () => { resetState(); refreshTable() },
)

function fetchItems(params) {
  const all = items.value.slice()
  const page = Number(params?.pageInfo?.page) || 1
  const size = Number(params?.pageInfo?.size) || all.length || 1
  const start = (page - 1) * size
  const content = all.slice(start, start + size)
  return Promise.resolve({
    data: { content, totalElements: all.length },
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
    items.value = Array.isArray(data.items) ? normalizeItems(data.items) : []
    maxLevelOrder.value = data.maxLevelOrder ?? null
    locked.value = !!data.locked
    valid.value = data.valid !== false
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
    id: editingId.value,
    internshipId: props.internshipId,
    sourceTable: props.sourceTable,
    levelOrder: Number(itemForm.levelOrder),
    weight: Number(itemForm.weight),
    maxScore: Number(itemForm.maxScore),
  }
  try {
    const res = await gradeConfigAPI.saveGradeConfig(payload)
    if (res?.message !== 'successful') {
      ElMessage.error(res?.message || '保存失败')
      return false
    }
    ElMessage.success(editingId.value == null ? '新增成功' : '编辑成功')
    await initLoad(true)
    return true
  } catch (e) {
    console.error('保存评分项失败:', e)
    return false
  }
}

async function handleDelete(rows) {
  if (!canEditUI.value) return
  const list = Array.isArray(rows) ? rows : [rows].filter(Boolean)
  if (!list.length) return
  const desc = list.map(r => `第 ${r.levelOrder} 级`).join('、')
  try {
    await ElMessageBox.confirm(
      `确定删除${desc}评分项？删除后将直接生效。`,
      '提示',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch { return }
  try {
    for (const row of list) {
      const res = await gradeConfigAPI.deleteGradeConfig({ id: row.id })
      if (res?.message !== 'successful') {
        ElMessage.error(res?.message || '删除失败')
        await initLoad(true)
        return
      }
    }
    ElMessage.success('删除成功')
    await initLoad(true)
  } catch (e) {
    console.error('删除评分项失败:', e)
    await initLoad(true)
  }
}

defineExpose({ initLoad, resetState })
</script>

<style scoped>
.grade-config-panel {
  width: 100%;
}

.mb-12 {
  margin-bottom: 12px;
}

.grade-table-wrapper :deep(.el-card) {
  border: none;
  box-shadow: none;
}

.grade-table-wrapper :deep(.el-card__body) {
  padding: 0;
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
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.weight-slider {
  width: 100%;
}

.weight-slider :deep(.el-slider__input) {
  width: 110px;
}

.grade-item-form {
  padding: 8px 16px 0;
}
</style>
