<template>
  <div v-if="!item.hidden && !isHiddenByInternshipType" class="menu-wrapper">
    <template v-if="hasOneShowingChild(item.children, item) && (!onlyOneChild.children || onlyOneChild.noShowingChildren) && !item.alwaysShow">
      <app-link v-if="onlyOneChild.meta" :to="resolvePath(onlyOneChild.path)">
        <el-menu-item :index="resolvePath(onlyOneChild.path)" :class="{'submenu-title-noDropdown':!isNest}">
          <item :icon="onlyOneChild.meta.icon||(item.meta&&item.meta.icon)||'dot'" :title="onlyOneChild.meta.title" />
        </el-menu-item>
      </app-link>
    </template>
    <el-sub-menu v-else ref="subMenu" :index="resolvePath(item.path)" popper-append-to-body>
      <template #title>
        <item v-if="item.meta" :icon="item.meta && item.meta.icon" :title="item.meta.title" />
      </template>
      <SideBarItem v-for="child in item.children" :key="child.path" :is-nest="true" :item="child" :base-path="resolvePath(child.path)" class="nest-menu" />
    </el-sub-menu>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { isExternal } from '@/utils/validate'
import Item from './Item.vue'
import AppLink from './Link.vue'
import { useFixIOSBug } from './fixIOSBug'

const props = defineProps({
  // route object
  item: { type: Object, required: true },
  isNest: { type: Boolean, default: false },
  basePath: { type: String, default: '' }
})

// To fix https://github.com/PanJiaChen/vue-admin-template/issues/237
// TODO: refactor with render function
const onlyOneChild = ref(null)
const subMenu = ref(null)

const store = useStore()
// 按学生实习类型隐藏无关菜单
const isHiddenByInternshipType = computed(() => {
  const type = store.getters.studentInternshipType
  if (!type || type === 'both') return false
  const path = props.basePath || props.item.path || ''
  if (type === 'external' && path.includes('/StuSelectTopic')) return true
  if (type === 'internal' && path.includes('StuApplyPost')) return true
  return false
})

const hasOneShowingChild = (children = [], parent) => {
  const showingChildren = children.filter(item => {
    if (item.hidden) {
      return false
    } else {
      // Temp set(will be used if only has one showing child)
      onlyOneChild.value = item
      return true
    }
  })

  // When there is only one child router, the child router is displayed by default
  if (showingChildren.length === 1) {
    return true
  }

  // Show parent if there are no child router to display
  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, path: '', noShowingChildren: true }
    return true
  }

  return false
}

// 浏览器兼容的路径解析函数（替代 Node.js path.resolve）
const resolvePath = (routePath) => {
  if (isExternal(routePath)) {
    return routePath
  }
  if (isExternal(props.basePath)) {
    return props.basePath
  }
  
  // 如果 routePath 是绝对路径（以 / 开头），直接返回
  if (routePath.startsWith('/')) {
    return routePath
  }
  
  // 合并 basePath 和 routePath
  // 规范化路径：移除多余的斜杠
  const base = props.basePath.replace(/\/+$/, '') // 移除末尾斜杠
  const path = routePath.replace(/^\/+/, '') // 移除开头斜杠
  
  // 如果 base 为空，直接返回 path（确保以 / 开头）
  if (!base) {
    return '/' + path
  }
  
  return base + '/' + path
}

// Use fixIOSBug composable
useFixIOSBug(subMenu)

defineOptions({
  name: 'SideBarItem'
})
</script>
