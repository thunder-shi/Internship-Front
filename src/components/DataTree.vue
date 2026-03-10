<template>
  <div class="tree-panel" :class="{ collapsed: isCollapsed }">
    <transition name="tree-fade">
      <el-card v-show="!isCollapsed" v-adaptive-card :class="title ? '' : 'card-notitle'" shadow="never">
        <template v-if="title" #header>
          <span>{{ title.mainTitle }}</span>
          <span v-if="title.subTitle">&nbsp;|&nbsp;<strong>{{ title.subTitle || '全部' }}</strong></span>
        </template>
        <el-tree ref="dataTree" v-adaptive-card v-loading="loading" :lazy="lazy" :load="lazyLoad" highlight-current node-key="id" :show-checkbox="checkFlag" :expand-on-node="false" :default-expanded-keys="defaultExpandedKeys" :data="treeData" :props="defaultDataProps" @node-click="handleNodeClick" />
      </el-card>
    </transition>
    <div class="collapse-trigger" :class="{ collapsed: isCollapsed }" @click.stop="toggleCollapse">
      <span class="collapse-trigger__icon" :class="isCollapsed ? 'right' : 'left'"></span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import treeAPI from '@/api/tree'
import adaptiveCard from '@/directive/el-card'

defineOptions({
  name: 'DataTree'
})

const vAdaptiveCard = adaptiveCard

const props = defineProps({
  defaultProps: {
    type: Object,
    default: () => {
      return {
        title: { mainTitle: '', subTitle: '' },
        checkFlag: false,
        lazy: false,
        virtualRootFlag: true,
        keyWord: '',
        sort: { properties: 'theOrder', direction: 'ASC' },
        initSearchWords: {
          searchKey: {},
          regKey: {},
          andor: {}
        }
      }
    }
  }
})

const emit = defineEmits(['node-click'])

const dataTree = ref(null)
const treeData = ref([])
const defaultDataProps = reactive({
  label: 'name',
  children: 'children',
  isLeaf: 'isLeaf'
})
const loading = ref(false)
const maps = new Map()
const isCollapsed = ref(false)
// 控制默认展开的节点，初始为空数组，避免自动展开导致死循环
const defaultExpandedKeys = ref([])

const title = computed(() => props.defaultProps.title || null)
const lazy = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'lazy')) {
    return props.defaultProps.lazy
  }
  return true
})
const checkFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'checkFlag')) {
    return props.defaultProps.checkFlag
  }
  return false
})
const sort = computed(() => props.defaultProps.sort || { properties: 'theOrder', direction: 'ASC' })
const virtualRootFlag = computed(() => {
  if (Object.prototype.hasOwnProperty.call(props.defaultProps, 'virtualRootFlag')) {
    return props.defaultProps.virtualRootFlag
  }
  return false
})
const keyWord = computed(() => props.defaultProps.keyWord || null)
const searchKey = computed(() => props.defaultProps.initSearchWords?.searchKey || {})

const lazyLoad = (tree, resolve) => {
  if (!tree || !tree.key) {
    resolve([])
    return
  }
  
  // 防止重复加载：如果该节点已经在 maps 中，说明已经加载过，直接返回
  if (maps.has(tree.key)) {
    const cached = maps.get(tree.key)
    if (cached && cached.tree && cached.tree.children) {
      resolve(cached.tree.children)
      return
    }
  }
  
  // 如果正在加载中，避免重复请求
  if (loading.value) {
    resolve([])
    return
  }
  
  // 标记该节点正在加载
  maps.set(tree.key, { tree, resolve, loading: true })
  
  treeAPI.getAllNodes({
    keyWords: keyWord.value,
    virtualRootFlag: virtualRootFlag.value,
    searchKey: searchKey.value,
    lazy: true,
    parentId: tree.key,
    sort: sort.value
  }).then(res => {
    const data = res.data || []
    // 更新缓存
    maps.set(tree.key, { tree: { ...tree, children: data }, resolve, loading: false })
    resolve(data)
  }).catch(error => {
    console.error('懒加载节点失败:', error)
    // 移除加载标记
    maps.delete(tree.key)
    resolve([])
  })
}

// 初始化标志，防止重复初始化
let isInitializing = false

const initDataTree = async (parentId = -1) => {
  // 防止重复初始化
  if (isInitializing || loading.value) {
    return
  }
  isInitializing = true
  loading.value = true
  try {
    // 清空之前的缓存
    maps.clear()
    const res = await treeAPI.getAllNodes({
      keyWords: keyWord.value,
      virtualRootFlag: virtualRootFlag.value,
      searchKey: searchKey.value,
      lazy: lazy.value,
      parentId,
      sort: sort.value
    })
    treeData.value = res.data || []
    // 数据加载完成后，手动展开根节点（如果存在）
    if (treeData.value.length > 0 && virtualRootFlag.value) {
      // 延迟展开，确保树已渲染
      setTimeout(() => {
        if (dataTree.value) {
          const rootNode = treeData.value.find(node => node.id === -1)
          if (rootNode) {
            defaultExpandedKeys.value = [-1]
            dataTree.value.setCurrentKey(-1)
          }
        }
      }, 100)
    }
  } catch (error) {
    console.error('获取树数据失败:', error)
    treeData.value = []
  } finally {
    loading.value = false
    isInitializing = false
  }
}

const handleNodeClick = (row) => {
  emit('node-click', row)
}

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

defineExpose({
  dataTree,
  initDataTree
})

onMounted(() => {
  initDataTree()
})
</script>

