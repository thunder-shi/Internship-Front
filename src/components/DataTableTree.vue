<template>
  <DataTableHeader ref="dataTBLMotherRef" :default-props="defaultProps.defaultDTHProps" v-model:selected-columns="selectedColumns" @init-click="initDataTree" @append-click="appendClick" @edit-click="editClick" @delete-click="deleteClick" @upload="upload">
    <template #body>
      <el-card shadow="never">
        <template v-if="hasHeaderContent" #header>
          <slot name="cardTitle" />
          <template v-if="title">
            <span>{{ title.mainTitle }}</span>
            <span v-if="title.subTitle">&nbsp;|&nbsp;<strong>{{ title.subTitle || "全部" }}</strong></span>
          </template>
        </template>
        <el-table ref="dataTreeRef" v-adaptive :lazy="lazy" :load="lazyLoad" height="100%" border :data="treeTableData" :tree-props="{children: 'children', hasChildren: 'hasChildren'}" row-key="id" highlight-current-row :default-expand-all="expandFlag" :expand-row-keys="['-1']" @current-change="handleNodeClick" @select="handleSelection" @selection-change="handleSelectionChange" @select-all="handleSelectionAll">
          <el-table-column v-if="checkFlag" type="selection" fixed width="55px" />
          <el-table-column v-for="(item, index) in tableColumnItem" :key="index" :show-overflow-tooltip="true" :label="item.showName" :width="item.width" align="left">
            <template #default="scope">
              <span v-if="item.tableColumnName === 'icon'">
                <svg-icon :icon-class="scope.row[item.tableColumnName]" />
              </span>
              <!-- 判断是否是日期格式 -->
              <span v-else-if="item.tableColumnName.endsWith('Time')">{{ filterDateTime(scope.row[item.tableColumnName]) }}</span>
              <!-- 列表自定义显示的内容 >-->
              <slot v-else-if="item.tableColumnName.startsWith('customize-')" :name="item.tableColumnName.replace('customize-','')" :row="scope.row" />
              <span v-else>{{ scope.row[item.tableColumnName] || '--' }}</span>
            </template>
          </el-table-column>
          <el-table-column v-if="operateFlag" fixed="right" label="操作" :width="operateWidth">
            <template #default="scope">
              <el-button type="primary" :icon="Plus" size="small" title="新增下级" @click="appendClick(scope.row)" />
              <el-button v-if="button?.update?.show" type="info" :icon="Edit" size="small" :title="button.update.name" @click="editClick(scope.row)" />
              <el-button v-if="button?.delete?.show" type="danger" :icon="Delete" size="small" :title="button.delete.name" @click="remove([scope.row])" />
              <el-button v-if="button?.up?.show" type="warning" :icon="Top" size="small" :title="button.up.name" @click="changeNodes('up',scope.row)" />
              <el-button v-if="button?.down?.show" type="warning" :icon="Bottom" size="small" :title="button.down.name" @click="changeNodes('down',scope.row)" />
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </DataTableHeader>
</template>
<script setup>
import { ref, reactive, computed, onMounted, useAttrs, getCurrentInstance, h, useSlots } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Edit, Delete, Top, Bottom } from '@element-plus/icons-vue'
import DataTableHeader from '@/components/DataTableHeader.vue'
import treeAPI from '@/api/tree'
import moment from 'moment'

// 懒加载，新增第一个节点不展开，不出现小箭头，暂时未解决
// 遗留思路，新增第一个节点，让上级节点出现小箭头

const props = defineProps({
  defaultProps: { // 注意这里的默认值没有用
    type: Object,
    default: () => {
      return {
        keyWord: { },
        title: { },
        allTableColumns: { },
        bottomOffset: 0,
        someFlags: {
          expandFlag: false,
          checkFlag: false,
          lazy: true,
          operateFlag: true,
          virtualRootFlag: false
        },
        initSearchWords: { // 初始时查询的三个关键词
          searchKey: { },
          regKey: { },
          andor: { }
        }
      }
    }
  }
})

const emit = defineEmits(['update:selectedColumns', 'append-click', 'edit-click', 'delete-click', 'node-click', 'upload-finish'])

const instance = getCurrentInstance()
const attrs = useAttrs()
const slots = useSlots()

const dataTBLMotherRef = ref(null)
const dataTreeRef = ref(null)

const operateWidth = ref(230)
const treeTableData = ref([])
const selectedColumns = ref([])
const tableColumnItem = computed(() => {
  return dataTBLMotherRef.value?.tableColumnItem || []
})

const checkAll = ref(true)
const indeterminate = ref(false)
const addDisabled = ref(false)
const loading = ref(true)
const isAllSelect = ref(false)

const maps = ref(new Map())
let thisEvents = {}

// 过滤器改为方法
function filterDateTime(val) {
  return moment(val).format('YYYY-MM-DD HH:mm')
}

// computed 属性
const button = computed(() => {
  return dataTBLMotherRef.value?.button
})

const keyWord = computed(() => {
  return dataTBLMotherRef.value?.keyWord
})

const title = computed(() => {
  return props.defaultProps.title ? props.defaultProps.title : null
})

// 判断是否有 header 内容需要显示
const hasHeaderContent = computed(() => {
  return !!(slots.cardTitle || title.value)
})

const expandFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'expandFlag')) {
      return props.defaultProps.someFlags.expandFlag
    }
  }
  return false
})

const checkFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'checkFlag')) {
      return props.defaultProps.someFlags.checkFlag
    }
  }
  return true
})

const lazy = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'lazy')) {
      return props.defaultProps.someFlags.lazy
    }
  }
  return true
})

const operateFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'operateFlag')) {
      return props.defaultProps.someFlags.operateFlag
    }
  }
  return true
})

const virtualRootFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'someFlags')) {
    if (Object.prototype.hasOwnProperty.call(props.defaultProps.someFlags, 'virtualRootFlag')) {
      return props.defaultProps.someFlags.virtualRootFlag
    }
  }
  return false
})

const initSearchWords = computed(() => {
  return props.defaultProps.initSearchWords ? props.defaultProps.initSearchWords : { }
})

const sort = computed(() => {
  return props.defaultProps.sort ? props.defaultProps.sort : { properties: 'theOrder', direction: 'ASC' }
})

const bottomOffset = computed(() => {
  return props.defaultProps.bottomOffset ? props.defaultProps.bottomOffset : 0
})

onMounted(() => {
  // 在 Vue 3 中，使用 attrs 来检查事件监听器
  thisEvents = {
    'delete-click': 'onDeleteClick' in attrs
  }

  // 计算显示的按钮数量（包括固定的"新增下级"按钮）
  let num = 1 // 固定有一个"新增下级"按钮
  const arr = [
    button.value?.update?.show,
    button.value?.delete?.show,
    button.value?.up?.show,
    button.value?.down?.show
  ]
  num = arr.reduce((acc, cur) => {
    acc = cur ? acc + 1 : acc
    return acc
  }, 1) // 从1开始，因为已经有"新增下级"按钮

  // 根据实际测量的按钮数量直接设置宽度
  let width = 0
  if (num === 5) {
    width = 160
  } else if (num === 4) {
    width = 130
  } else if (num === 3) {
    width = 105
  } else if (num === 2) {
    width = 78
  } else if (num === 1) {
    width = 55
  } else {
    // 没有按钮时，只显示列标题
    width = 50
  }

  operateWidth.value = width
  setTimeout(() => { initDataTree() }, 500)
})
// #region 初始化以及加载
// 懒加载
async function lazyLoad(tree, treeNode, resolve) {
  if (tree.id === -1) {
    initDataTree()
  } else {
    var view = keyWord.value.view
    const res = await treeAPI.getAllNodes({
      keyWords: view,
      parentId: tree.id,
      virtualRootFlag: virtualRootFlag.value,
      searchKey: instance?.proxy?.searchKey,
      lazy: true,
      preName: tree.allNodeNames,
      sort: sort.value
    })
    maps.value.set(tree.id, { tree, treeNode, resolve })
    resolve(res.data)
  }
}

// 加载部分树
async function updatePartTree(row) {
  if (lazy.value) {
    // 强制从后端重新加载数据，确保获取最新数据
    var nowMaps
    if (maps.value.size > 0) {
      nowMaps = maps.value.get(row.parentId)
    }

    if (nowMaps === undefined) {
      // 如果找不到父节点，重新加载整棵树
      await initDataTree()
    } else {
      // 重新从后端获取该节点的子数据
      const view = keyWord.value.view
      const res = await treeAPI.getAllNodes({
        keyWords: view,
        parentId: nowMaps.tree.id,
        virtualRootFlag: virtualRootFlag.value,
        searchKey: instance?.proxy?.searchKey,
        lazy: true,
        preName: nowMaps.tree.allNodeNames,
        sort: sort.value
      })

      // 使用 resolve 更新数据，这会强制刷新该节点
      nowMaps.resolve(res.data)
    }
  } else {
    await initDataTree()
  }

  // 更新完成后自动取消所有选择
  if (dataTreeRef.value) {
    dataTreeRef.value.clearSelection()
  }
}

// 初始化/刷新树（无论懒加载与否，初始时都会调用）
async function initDataTree(parentId = -1) {
  loading.value = true
  try {
    var view = keyWord.value.view
    var parentNode = { id: parentId, allNodeNames: '' }
    const res = await treeAPI.getAllNodes({
      keyWords: view,
      parentId: parentNode.id,
      virtualRootFlag: virtualRootFlag.value,
      searchKey: instance?.proxy?.searchKey,
      lazy: lazy.value,
      preName: parentNode.allNodeNames,
      sort: sort.value
    })
    treeTableData.value = res.data
  } catch (error) {
    loading.value = false
    console.log(error)
  }
  loading.value = false
}
// #endregion

// #region 选择相关
// 获取当前所有展开的行的 key
function getExpandedKeys() {
  const table = dataTreeRef.value
  if (!table || !table.store) return []

  const expandedKeys = []
  const states = table.store.states
  if (states && states.treeData && states.treeData.value) {
    Object.keys(states.treeData.value).forEach(key => {
      if (states.treeData.value[key].expanded) {
        expandedKeys.push(key)
      }
    })
  }
  return expandedKeys
}

// 恢复展开状态
function restoreExpandedKeys(keys) {
  const table = dataTreeRef.value
  if (!table || !keys || keys.length === 0) return

  // 使用 nextTick 确保 DOM 更新完成后再恢复展开状态
  setTimeout(() => {
    keys.forEach(key => {
      const row = findRowByKey(treeTableData.value, key)
      if (row) {
        table.toggleRowExpansion(row, true)
      }
    })
  }, 0)
}

// 根据 key 查找行数据
function findRowByKey(data, key) {
  for (let i = 0; i < data.length; i++) {
    if (String(data[i].id) === String(key)) {
      return data[i]
    }
    if (data[i].children && data[i].children.length) {
      const found = findRowByKey(data[i].children, key)
      if (found) return found
    }
  }
  return null
}

// 监听选中的事件
function handleSelection(selection, row) {
  // 保存当前展开状态
  const expandedKeys = getExpandedKeys()

  if (selection.indexOf(row) !== -1) {
    selectChange(selection, row, true, true)
  } else {
    selectChange(selection, row, false, true)
  }
  emit('update:selectedColumns', selection)

  // 恢复展开状态
  restoreExpandedKeys(expandedKeys)
}

// 监听选中的事件
function handleSelectionChange(selection) {
  selectedColumns.value = selection
}

// 递归获取所有行数据（包括所有层级）
function getAllRows(data) {
  const result = []
  function traverse(nodes) {
    nodes.forEach(node => {
      result.push(node)
      if (node.children && node.children.length) {
        traverse(node.children)
      }
    })
  }
  traverse(data)
  return result
}

// 全选
function handleSelectionAll(selection) {
  const expandedKeys = getExpandedKeys()

  isAllSelect.value = !isAllSelect.value
  if (isAllSelect.value) {
    // 获取所有行数据（包括所有层级）
    const allRows = getAllRows(treeTableData.value)
    // 选中所有行
    allRows.forEach(row => {
      dataTreeRef.value.toggleRowSelection(row, true)
    })
  } else {
    dataTreeRef.value.clearSelection()
  }

  // 恢复展开状态
  restoreExpandedKeys(expandedKeys)

  emit('update:selectedColumns', isAllSelect.value ? getAllRows(treeTableData.value) : [])
}

function selectChange(selection, row, isChecked, notAll) {
  // 先选中/取消当前行（如果还没有被处理）
  if (selection.indexOf(row) === -1 && isChecked) {
    selection.push(row)
  } else if (selection.indexOf(row) !== -1 && !isChecked) {
    selection.splice(selection.indexOf(row), 1)
  }

  // 递归处理所有子节点
  if (row.children && row.children.length) {
    row.children.forEach(val => {
      dataTreeRef.value.toggleRowSelection(val, isChecked)
      if (notAll) {
        if (isChecked) {
          if (selection.indexOf(val) === -1) {
            selection.push(val)
          }
        } else {
          const index = selection.indexOf(val)
          if (index !== -1) {
            selection.splice(index, 1)
          }
        }
      }
      // 递归处理子节点的子节点
      if (val.children && val.children.length) {
        selectChange(selection, val, isChecked, notAll)
      }
    })
  }
}
// #endregion

// 按钮新增
async function appendClick(row) {
  emit('append-click', row)
}

// 按钮修改
async function editClick(row) {
  emit('edit-click', row)
}

// 按钮删除
async function deleteClick(row) {
  if (thisEvents['delete-click']) {
    emit('delete-click', row)
  } else {
    loading.value = true
    await treeAPI.delManyNode(keyWord.value.edit, row)
    dataTreeRef.value.clearSelection()
    updatePartTree(row[0])
    ElMessage.success('删除成功！')
    loading.value = false
  }
}

// 删除
function remove(row) {
  dataTBLMotherRef.value.remove(row)
}

// 移动节点
async function changeNodes(direction, node) {
  loading.value = true
  const resp = await treeAPI.getAllBrotherIndex(keyWord.value.edit, node.id)
  const nodes = resp.data
  const index = nodes.findIndex(item => item.id === node.id)
  if (direction === 'up' && index === 0) {
    ElMessage.warning('当前节点是第一个节点，无法上移！')
  } else if (direction === 'down' && index === nodes.length - 1) {
    ElMessage.warning('当前节点是最后一个节点，无法下移！')
  } else {
    const changeId = direction === 'up' ? nodes[index - 1].id : nodes[index + 1].id
    await treeAPI.changeTwoNodes(keyWord.value.edit, node.id, changeId)
    await updatePartTree(node)
    ElMessage.success('移动成功！')
  }
  loading.value = false
}

// 监听点击某一行事件
function handleNodeClick(val) {
  emit('node-click', val)
}

function upload() {
  emit('batch-import-click')
}

// 暴露方法供外部调用
defineExpose({
  updatePartTree,
  initDataTree
})
</script>
