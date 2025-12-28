<template>
  <DataTableHeader
    ref="dataTBLMother"
    v-model:selected-columns="selectedColumns"
    :default-props="defaultProps.defaultDTHProps"
    @init-click="refreshInit"
    @show-search="showSearchPanel"
    @append-click="appendClick"
    @edit-click="editClick"
    @delete-click="deleteClick"
    @audit-click="auditClick"
    @export-click="exportClick"
    @more1-click="more1Click"
    @more2-click="more2Click"
    @upload-finish="uploadFinish"
    @batch-create="batchCreate"
  >
    <template #searchPanel>
      <slot name="searchPanel">
        <BtnSearch
          :search-name="searchName"
          :placeholder="searchPlaceholder"
          :no-advanced-search="noAdvancedSearch"
          :search-items="searchItems"
          @search-click="searchClick"
          @advanced-search-click="advancedSearchClick"
          @clean-out-value="onCleanOutValue"
          @input="onInput"
        >
          <template #beforeSearch>
            <slot name="beforeSearch" />
          </template>
        </BtnSearch>
      </slot>
    </template>
    <template #moreTopButtons>
      <slot name="moreTopButtons" />
    </template>
    <template #topOperate>
      <slot name="topOperate" />
    </template>
    <template #body>
      <slot name="topAlert" />
      <el-card shadow="never" :class="{ 'no-header': !hasCardTitle }">
        <template #header>
          <template v-if="hasCardTitle">
            <slot name="cardTitle" />
            <template v-if="title">
              <span>{{ title.mainTitle }}</span>
              <span v-if="title.subTitle">&nbsp;|&nbsp;<strong>{{ title.subTitle || '全部' }}</strong></span>
            </template>
          </template>
        </template>
        <el-table
          ref="table"
          v-adaptive="{ bottomOffset }"
          v-loading="loading"
          height="100%"
          border
          :data="dataList"
          row-key="id"
          highlight-current-rows
          @current-change="handleColumnChange"
          @selection-change="handleSelectionChange"
          @sort-change="handleSortChange"
        >
          <el-table-column v-if="checkFlag" fixed :reserve-selection="true" type="selection" width="55" />
          <el-table-column v-else fixed width="55">
            <template #default="scope">
              <el-radio v-model="tableRadio" :label="scope.row"><i /></el-radio>
            </template>
          </el-table-column>
          <el-table-column
            v-for="(item, index) in tableColumnItem"
            :key="index"
            :show-overflow-tooltip="true"
            :prop="item.tableColumnName"
            :label="item.showName"
            :width="item.width"
            :sortable="item.sortable ? 'custom' : false"
          >
            <template #default="scope">
              <slot
                v-if="item.tableColumnName && item.tableColumnName.startsWith('customize-')"
                :name="item.tableColumnName.replace('customize-', '')"
                :row="scope.row"
              />
              <div v-else-if="item.tableColumnName && item.tableColumnName.endsWith('Time')">{{ filterDateTime(scope.row[item.tableColumnName]) }}</div>
              <div v-else-if="item.tableColumnName && item.tableColumnName.endsWith('Day')">{{ filterDateDay(scope.row[item.tableColumnName]) }}</div>
              <div v-else-if="item.tableColumnName === 'isAudit'">{{ filterIsAudit(scope.row[item.tableColumnName]) }}</div>
              <div v-else-if="item.tableColumnName === 'cost'">{{ scope.row[item.tableColumnName] }}元</div>
              <div v-else>{{ scope.row[item.tableColumnName] || '--' }}</div>
            </template>
          </el-table-column>
          <el-table-column v-if="operateShow" fixed="right" label="操作" :width="operateWidth">
            <template #default="scope">
              <el-button v-if="button?.visible?.show" :type="button.visible.type" size="small" :title="button.visible.name" @click="view([scope.row])">
                <svg-icon icon-class="axt-view" />
              </el-button>
              <el-button v-if="button?.update?.show" :type="button.update.type" size="small" :title="button.update.name" @click="editClick(scope.row)">
                <el-icon><Edit /></el-icon>
              </el-button>
              <slot name="rightOperate" :row="scope.row" />
              <el-button v-if="button?.delete?.show" :type="button.delete.type" size="small" :title="button.delete.name" @click="remove([scope.row])">
                <el-icon><Delete /></el-icon>
              </el-button>
              <el-button v-if="button?.up?.show" :type="button.up.type" size="small" :loading="buttonLoading.up" :title="button.up.name" @click="move(scope.row, true)">
                <el-icon><Top /></el-icon>
              </el-button>
              <el-button v-if="button?.down?.show" :type="button.down.type" size="small" :loading="buttonLoading.down" :title="button.down.name" @click="move(scope.row, false)">
                <el-icon><Bottom /></el-icon>
              </el-button>
              <el-button v-if="button?.audit?.show" :type="button.audit.type" size="small" :title="button.audit.name" @click="auditClick([scope.row], null)">
                <el-icon><Check /></el-icon>
              </el-button>
              <slot name="rightbtn" :row="scope.row" />
            </template>
          </el-table-column>
        </el-table>
        <v-page
          v-if="showPage"
          align="center"
          :total="totalSize"
          :current-page="pageInfo.page"
          :page-size="pageInfo.size"
          :page-sizes="pageInfo.sizes"
          :selected-columns="selectedColumns"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </el-card>
    </template>
  </DataTableHeader>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, useAttrs, useSlots, nextTick } from 'vue'
import { Edit, Delete, Top, Bottom, Check } from '@element-plus/icons-vue'
import DataTableHeader from '@/components/DataTableHeader.vue'
import listAPI from '@/api/list'
import BtnSearch from '@/components/BtnSearch.vue'
import VPage from '@/components/Pagination.vue'
import moment from 'moment'
import adaptive from '@/directive/el-table'
import CONSTANT from '@/utils/constant'
import _ from 'lodash'
import '@/assets/css/table.scss'

defineOptions({
  name: 'DataTableList'
})

// 过滤器函数
const filterDateTime = (val) => {
  if (!val) return '--'
  return moment(val).format('YYYY-MM-DD HH:mm')
}
const filterDateDay = (val) => {
  if (!val) return '--'
  return moment(val).format('YYYY-MM-DD')
}
const filterIsAudit = (val) => {
  switch (val) {
    case CONSTANT.AUDIT_STATUS.SUBMIT: return CONSTANT.AUDIT_STATUS.SUBMITNAME
    case CONSTANT.AUDIT_STATUS.PASS: return CONSTANT.AUDIT_STATUS.PASSNAME
    case CONSTANT.AUDIT_STATUS.NOTPASS: return CONSTANT.AUDIT_STATUS.NOTPASSNAME
    case CONSTANT.AUDIT_STATUS.BACK: return CONSTANT.AUDIT_STATUS.BACKNAME
    default: return CONSTANT.AUDIT_STATUS.SAVENAME
  }
}

const props = defineProps({
  defaultProps: { // 注意这里的默认值没有用，必须在create中再设置
    type: Object,
    default: () => {
      return {
        keyWord: { },
        selectedColumns: [],
        title: { mainTile: '', subTitle: '' },
        bottomOffset: 0,
        sortStr: { properties: 'Id', direction: 'DESC' }, // 排序方法
        treeInfo: { },
        parentId: '',
        someFlags: {
          operateShow: true, // 最右边的按钮操作面板是否出现
          checkFlag: true, // 是否出现最左边的checkBox
          showPage: true, // 是否显示底部翻页
          autoInit: true, // 初始时是否显示数据
          hasOwnGet: false
        },
        initSearchWords: { // 初始时查询的三个关键词
          searchKey: { },
          regKey: { },
          andor: { }
        },
        nowSearchWords: { // 变化查询的三个关键词
          searchKey: { },
          regKey: { },
          andor: { }
        },
        moveSearchWords: { // 用于上移下移时候的查询字
          moveSearchKey: { },
          moveRegKey: { }
        },
        searchPanel: {
          name: '',
          placeholder: ''
        },
        defaultDTHProps: {
          // defaultDTHProps中的所有对象属性
        }
      }
    }
  }
})

const emit = defineEmits([
  'after-init-data',
  'total-size',
  'append-click',
  'edit-click',
  'delete-click',
  'delete-finish-click',
  'export-click',
  'more1-click',
  'more2-click',
  'upload-finish',
  'batch-create',
  'update-column',
  'view-click',
  'spec-remove',
  'spec-move',
  'audit-click',
  'self-init',
  'clean-out-value',
  'input'
])

const attrs = useAttrs()
const slots = useSlots()

// refs
const dataTBLMother = ref(null)
const table = ref(null)

// 响应式数据
const usedSearchWords = reactive({ // 最终使用查询的三个关键词
  searchKey: { },
  regKey: { },
  andor: { }
})
const selectedColumns = ref([])
const dataList = ref([])
const pageInfo = reactive({ page: 1, size: 25, sizes: [25, 50, 75, 100] })
const totalSize = ref(0)
const loading = ref(false)
const buttonLoading = reactive({ up: false, down: false })
const tableRadio = ref(null)
const redArr = ref([])
const greenArr = ref([])
const blueArr = ref([])
const yellowArr = ref([])
const operateWidth = ref(60)
const thisEvents = ref([])
const isPageInit = ref(false)

const nowSearchWordsLocal = reactive({
  searchKey: _.cloneDeep(props.defaultProps.nowSearchWords?.searchKey || {}),
  regKey: _.cloneDeep(props.defaultProps.nowSearchWords?.regKey || {}),
  andor: _.cloneDeep(props.defaultProps.nowSearchWords?.andor || {})
})

// computed
const keyWord = computed(() => dataTBLMother.value?.keyWord)

const title = computed(() => props.defaultProps.title || null)

const hasCardTitle = computed(() => {
  if (slots.cardTitle) return true
  if (title.value && (title.value.mainTitle || title.value.subTitle)) return true
  return false
})

const button = computed(() => dataTBLMother.value?.button)

const tableColumnItem = computed(() => dataTBLMother.value?.tableColumnItem || [])

const operateShow = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'operateShow')) {
      return props.defaultProps.someFlags.operateShow
    }
  }
  return true
})

const checkFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'checkFlag')) {
      return props.defaultProps.someFlags.checkFlag
    }
  }
  return true
})

const orderList = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'orderList')) {
      return props.defaultProps.someFlags.orderList
    }
  }
  return false
})

const noAdvancedSearch = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'noAdvancedSearch')) {
      return props.defaultProps.someFlags.noAdvancedSearch
    }
  }
  return true
})

const showPage = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'showPage')) {
      return props.defaultProps.someFlags.showPage
    }
  }
  return true
})

const autoInit = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'autoInit')) {
      return props.defaultProps.someFlags.autoInit
    }
  }
  return true
})

const bottomOffset = computed(() => props.defaultProps.bottomOffset || 0)

const searchItems = computed(() => props.defaultProps.searchItems || [])

const sortStr = reactive(props.defaultProps.sortStr ? _.cloneDeep(props.defaultProps.sortStr) : { properties: 'Id', direction: 'DESC' })

const initSearchWords = computed(() => props.defaultProps.initSearchWords || { })

const moveSearchWords = computed(() => props.defaultProps.moveSearchWords || { })

const treeInfo = computed(() => props.defaultProps.treeInfo || {})

const searchName = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'searchPanel')) {
    return props.defaultProps.searchPanel.name ? props.defaultProps.searchPanel.name : ''
  }
  return ''
})

const searchPlaceholder = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'searchPanel')) {
    return props.defaultProps.searchPanel.placeholder ? props.defaultProps.searchPanel.placeholder : '请输入名称'
  }
  return '请输入名称'
})

// watch
watch(autoInit, (val) => {
  if (val) setTimeout(() => { initDataList() }, 500)
})

watch(() => props.defaultProps.nowSearchWords, (val) => {
  if (val) {
    nowSearchWordsLocal.searchKey = _.cloneDeep(val.searchKey || {})
    nowSearchWordsLocal.regKey = _.cloneDeep(val.regKey || {})
    nowSearchWordsLocal.andor = _.cloneDeep(val.andor || {})
  }
}, { deep: true, immediate: true })

watch(nowSearchWordsLocal, () => {
  if (autoInit.value) {
    setTimeout(() => { initDataList() }, 500)
  }
}, { deep: true })

watch(() => props.defaultProps.selectedColumns, (val) => {
  if (Array.isArray(val)) {
    selectedColumns.value = []
    val.forEach(id => {
      const row = dataList.value.find(item => item.id === id)
      if (row) {
        selectedColumns.value.push(row)
      }
    })
  }
}, { deep: true })

onMounted(() => {
  thisEvents.value = Object.keys(attrs).filter(key => key.startsWith('on'))
  nextTick(() => {
    let num = 0
    const arr = [
      button.value?.visible?.show,
      button.value?.update?.show,
      button.value?.delete?.show,
      button.value?.up?.show,
      button.value?.down?.show,
      button.value?.audit?.show
    ]
    num = arr.reduce((acc, cur) => (cur ? acc + 1 : acc), 0)
    let width = num * 46
    if (width < 60) width = 60
    operateWidth.value = width
    setTimeout(() => { initDataList() }, 500)
  })
})

// methods
const getUsedSearchWords = () => {
  usedSearchWords.searchKey = {}
  usedSearchWords.regKey = {}
  usedSearchWords.andor = {}

  if (initSearchWords.value?.searchKey && Object.keys(initSearchWords.value.searchKey).length !== 0) {
    usedSearchWords.searchKey = _.cloneDeep(initSearchWords.value.searchKey)
    if (initSearchWords.value?.regKey && Object.keys(initSearchWords.value.regKey).length !== 0) {
      usedSearchWords.regKey = _.cloneDeep(initSearchWords.value.regKey)
    }
    if (initSearchWords.value?.andor && Object.keys(initSearchWords.value.andor).length !== 0) {
      usedSearchWords.andor = _.cloneDeep(initSearchWords.value.andor)
    }
  }
  if (nowSearchWordsLocal.searchKey && Object.keys(nowSearchWordsLocal.searchKey).length !== 0) {
    usedSearchWords.searchKey = _.merge(nowSearchWordsLocal.searchKey, initSearchWords.value.searchKey)
    if (nowSearchWordsLocal.regKey && Object.keys(nowSearchWordsLocal.regKey).length !== 0) {
      usedSearchWords.regKey = _.merge(nowSearchWordsLocal.regKey, initSearchWords.value.regKey)
    }
    if (nowSearchWordsLocal.andor && Object.keys(nowSearchWordsLocal.andor).length !== 0) {
      usedSearchWords.andor = _.merge(nowSearchWordsLocal.andor, initSearchWords.value.andor)
    }
  }
}

const _initDataList = async () => {
  loading.value = true
  try {
    if (selectedColumns.value.length > 0 && !isPageInit.value) {
      selectedColumns.value = selectedColumns.value.slice(0, 0)
      table.value?.clearSelection()
    }
    getUsedSearchWords()
    let resp
    try {
      if (props.defaultProps.someFlags?.hasOwnGet) {
        emit('self-init', pageInfo, sortStr, usedSearchWords)
        loading.value = false
        return
      }
      const payload = {
        keyWords: keyWord.value?.view,
        pageInfo,
        treeInfo: Object.keys(treeInfo.value || {}).length ? treeInfo.value : null,
        searchKey: usedSearchWords.searchKey,
        sort: sortStr,
        reg: usedSearchWords.regKey,
        andor: usedSearchWords.andor
      }
      resp = await listAPI.getSomeRecords(payload)
    } catch (error) {
      console.error(error)
      loading.value = false
      return
    }

    const filteredContent = (resp?.data?.content || []).filter(item => {
      if (!item || typeof item !== 'object') return false
      const keys = Object.keys(item)
      if (keys.length === 0) return false
      if (keys.length === 1 && keys[0] === 'id' && (item.id === null || item.id === undefined)) return false
      const hasValidData = keys.some(key => {
        if (key === 'id') return true
        const value = item[key]
        return value !== null && value !== undefined && value !== ''
      })
      return hasValidData
    })

    dataList.value = _.cloneDeep(filteredContent)
    totalSize.value = filteredContent.length > 0 ? (resp?.data?.totalElements || filteredContent.length) : 0

    if (Array.isArray(props.defaultProps.selectedColumns) && props.defaultProps.selectedColumns.length) {
      dataList.value.forEach((row) => {
        const shouldSelect = props.defaultProps.selectedColumns.includes(row.id)
        table.value?.toggleRowSelection(row, shouldSelect)
      })
    }

    emit('after-init-data', dataList.value)
    emit('total-size', totalSize.value)
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

const initDataList = async (manual = false) => {
  if (autoInit.value || manual) {
    await _initDataList()
  }
}

const showSearchPanel = () => {}

const onCleanOutValue = () => emit('clean-out-value')
const onInput = (val) => emit('input', val)

// 按钮新增
const appendClick = async () => { emit('append-click') }

// 按钮修改
const editClick = async (row) => { emit('edit-click', row) }

// 删除主函数
const _deleteClick = async (row) => {
  const ids = row.map(e => e.id)
  await listAPI.delOneOrManyNodes(keyWord.value?.edit, ids)
  _deleteSuccess(ids.length, row)
}

// 删除成功后的处理
const _deleteSuccess = async (num, row) => {
  const { ElMessage } = await import('element-plus')
  ElMessage.success('删除成功！')
  emit('delete-finish-click', row)
  if ((totalSize.value - num) % pageInfo.size === 0 && pageInfo.page > 1) {
    pageInfo.page--
  }
  table.value?.clearSelection()
  initDataList()
}

const uploadFinish = () => { initDataList() }

const _exportClick = async () => { await dataTBLMother.value?._exportData() }

const batchCreate = async () => {
  if (thisEvents.value.includes('onBatch-create') || thisEvents.value.includes('onBatchCreate')) {
    emit('batch-create')
  } else {
    await _exportClick()
  }
}

const exportClick = async () => {
  if (thisEvents.value.includes('onExport-click') || thisEvents.value.includes('onExportClick')) {
    emit('export-click')
  } else {
    await _exportClick()
  }
}

const deleteClick = async (row) => {
  if (thisEvents.value.includes('onDelete-click') || thisEvents.value.includes('onDeleteClick')) {
    emit('delete-click', row)
  } else {
    _deleteClick(row)
  }
}

const remove = (row) => {
  if (!thisEvents.value.includes('onSpec-remove') && !thisEvents.value.includes('onSpecRemove')) {
    dataTBLMother.value?.remove(row)
  } else {
    emit('spec-remove', row)
  }
}

const _move = async (row, up) => {
  try {
    await listAPI.changeNodeOrder(keyWord.value?.edit, row.id, up, moveSearchWords.value.searchKey, moveSearchWords.value.regKey)
    await initDataList()
    const { ElMessage } = await import('element-plus')
    ElMessage.success('移动成功！')
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

const move = async (row, up) => {
  if (up) buttonLoading.up = true
  else buttonLoading.down = true
  if (!thisEvents.value.includes('onSpec-move') && !thisEvents.value.includes('onSpecMove')) {
    await _move(row, up)
  } else {
    emit('spec-move', row, up)
  }
  if (up) buttonLoading.up = false
  else buttonLoading.down = false
}

// 审核
const auditClick = async (row, operName) => {
  if (thisEvents.value.includes('onAudit-click') || thisEvents.value.includes('onAuditClick')) {
    emit('audit-click', row, operName)
  } else {
    _audit(row, operName)
  }
}

const _audit = (row, operName) => {
  if (row.length === 1) {
    emit('audit-click', row, operName)
  } else {
    row.forEach(async (ro) => {
      ro.auditUserId = ro.auditUserId || null
      ro.auditTime = new Date()
      switch (operName) {
        case '批量审核通过':
          ro.isAudit = CONSTANT.AUDIT_STATUS.PASS
          ro.reason = CONSTANT.AUDIT_STATUS.PASSNAME
          break
        case '批量审核不通过':
          ro.isAudit = CONSTANT.AUDIT_STATUS.NOTPASS
          ro.reason = CONSTANT.AUDIT_STATUS.NOTPASSNAME
          break
        case '批量打回':
          ro.isAudit = CONSTANT.AUDIT_STATUS.SAVE
          ro.reason = CONSTANT.AUDIT_STATUS.SAVENAME
          ro.auditTime = null
          break
        case '批量审核退回':
          ro.isAudit = CONSTANT.AUDIT_STATUS.BACK
          ro.reason = CONSTANT.AUDIT_STATUS.BACKNAME
          break
        default:
          break
      }
      await listAPI.editOneNode(keyWord.value?.edit, ro)
    })
  }
}

// 查询
const searchClick = (searchInfo) => {
  const searchKey = {}
  const regKey = {}
  pageInfo.page = 1
  if (typeof searchName.value === 'string') {
    searchKey[searchName.value] = searchInfo
    regKey[searchName.value] = CONSTANT.SEARCH_OPERATOR.LIKE
  }
  nowSearchWordsLocal.searchKey = searchKey
  nowSearchWordsLocal.regKey = regKey
  nowSearchWordsLocal.andor = {}
  setTimeout(() => { initDataList() }, 500)
}

const advancedSearchClick = (searchInfo) => {
  const searchKey = {}
  const regKey = {}
  const andor = {}
  pageInfo.page = 1
  const keys = Object.keys(searchInfo)
  for (let i = 0; i < keys.length; i++) {
    const item = searchItems.value.filter(item => item.field === keys[i])
    if (item.length > 0) {
      if (item[0].type === 'input') {
        searchKey[keys[i]] = searchInfo[keys[i]]
        regKey[keys[i]] = CONSTANT.SEARCH_OPERATOR.LIKE
        if (item[0].doubleWords && item[0].doubleWords.length > 0) {
          andor[keys[i]] = false
          item[0].doubleWords.forEach(e => {
            searchKey[e] = searchInfo[keys[i]]
            regKey[e] = CONSTANT.SEARCH_OPERATOR.LIKE
            andor[e] = false
          })
        }
      } else if (item[0].type === 'select') {
        searchKey[keys[i]] = searchInfo[keys[i]]
      } else if (item[0].type === 'cascader') {
        searchKey[keys[i]] = searchInfo[keys[i]][searchInfo[keys[i]].length - 1]
      } else if (item[0].type === 'year') {
        searchKey[keys[i]] = searchInfo[keys[i]] ? searchInfo[keys[i]].getFullYear() : null
      } else if (item[0].type === 'day') {
        searchKey[keys[i]] = searchInfo[keys[i]] || null
      } else if (item[0].type === 'date') {
        if (searchInfo[keys[i]] && searchInfo[keys[i]].length) {
          const endDate = new Date(searchInfo[keys[i]][1])
          endDate.setHours(23, 59, 59, 0)
          searchKey[keys[i]] = { beginDate: searchInfo[keys[i]][0], endDate }
        } else {
          searchKey[keys[i]] = []
        }
        regKey[keys[i]] = CONSTANT.SEARCH_OPERATOR.RANGE
      }
    }
  }
  nowSearchWordsLocal.searchKey = searchKey
  nowSearchWordsLocal.regKey = regKey
  nowSearchWordsLocal.andor = andor
  setTimeout(() => { initDataList() }, 500)
}

const more1Click = async (row) => { emit('more1-click', row) }
const more2Click = async (row) => { emit('more2-click', row) }

const refreshInit = () => {
  nowSearchWordsLocal.searchKey = {}
  nowSearchWordsLocal.regKey = {}
  nowSearchWordsLocal.andor = {}
  initDataList()
}

const handleSortChange = (column) => {
  sortStr.properties = column.prop
  sortStr.direction = column.order === 'ascending' ? 'ASC' : 'DESC'
  setTimeout(() => { initDataList() }, 500)
}

const handleColumnChange = (val) => {
  if (!checkFlag.value) {
    tableRadio.value = val
    selectedColumns.value = [val]
  }
  emit('update-column', val)
}

const handleSelectionChange = (selection) => {
  if (Array.isArray(props.defaultProps.selectedColumns)) {
    selection.forEach(val => {
      if (!props.defaultProps.selectedColumns.includes(val.id)) {
        props.defaultProps.selectedColumns.push(val.id)
      }
    })
  }
  selectedColumns.value = selection
}

const view = async (val) => { emit('view-click', val) }

const handleSizeChange = async (val) => {
  pageInfo.size = val
  isPageInit.value = true
  await initDataList()
  isPageInit.value = false
}

const handleCurrentChange = async (val) => {
  pageInfo.page = val
  isPageInit.value = true
  await initDataList()
  isPageInit.value = false
  if (Array.isArray(props.defaultProps.selectedColumns)) {
    dataList.value.forEach(row => {
      const shouldSelect = props.defaultProps.selectedColumns.includes(row.id)
      table.value?.toggleRowSelection(row, shouldSelect)
    })
  }
}

defineExpose({
  initDataList,
  _deleteClick,
  usedSearchWords
})
</script>
