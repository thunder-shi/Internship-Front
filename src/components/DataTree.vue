<template>
  <div class="tree-panel" :class="{ collapsed: isCollapsed }">
    <transition name="tree-fade">
      <el-card v-show="!isCollapsed" v-adaptive-card :class="title ? '' : 'card-notitle'" shadow="never">
        <template v-if="title" #header>
          <span>{{ title.mainTitle }}</span>
          <span v-if="title.subTitle">&nbsp;|&nbsp;<strong>{{ title.subTitle || '全部' }}</strong></span>
        </template>
        <el-tree
          ref="dataTree"
          v-adaptive-card
          v-loading="loading"
          :lazy="lazy"
          :load="lazyLoad"
          highlight-current
          node-key="id"
          :show-checkbox="checkFlag"
          :expand-on-node="false"
          :default-expanded-keys="[-1]"
          :data="treeData"
          :props="defaultDataProps"
          @node-click="handleNodeClick"
        />
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
  if (tree.key) {
    treeAPI.getAllNodes({
      keyWords: keyWord.value,
      virtualRootFlag: virtualRootFlag.value,
      searchKey: searchKey.value,
      lazy: true,
      parentId: tree.key,
      sort: sort.value
    }).then(res => {
      maps.set(tree.key, { tree, resolve })
      resolve(res.data)
    })
  }
}

const initDataTree = async (parentId = -1) => {
  loading.value = true
  try {
    const res = await treeAPI.getAllNodes({
      keyWords: keyWord.value,
      virtualRootFlag: virtualRootFlag.value,
      searchKey: searchKey.value,
      lazy: lazy.value,
      parentId,
      sort: sort.value
    })
    treeData.value = res.data
  } catch (error) {
    console.error('获取树数据失败:', error)
  } finally {
    loading.value = false
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

