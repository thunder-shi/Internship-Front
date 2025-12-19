<template>
  <aside :class="{ 'has-logo': showLogo }">
    <!-- <logo v-if="showLogo" :collapse="isCollapse" /> -->
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu :default-active="activeMenu" :collapse="isCollapse" :background-color="variables.menuBg" :unique-opened="true" :collapse-transition="false" mode="vertical" class="sidebar-menu" @select="handleMenuSelect">
        <SideBarItem v-for="(route, index) in permission_routes" :key="index" :item="route" :base-path="route.path" @tabList="getTabList" />
      </el-menu>
    </el-scrollbar>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { isExternal } from '@/utils/validate'
import SideBarItem from './SideBarItem.vue'
import variables from '@/assets/css/variables.module.scss'

const store = useStore()
const route = useRoute()
const router = useRouter()

const tabList = ref([])

const permission_routes = computed(() => store.getters.permission_routes)
const sideBar = computed(() => store.getters.sideBar)
const roles = computed(() => store.getters.roles)

const routes = computed(() => router.options.routes)

const activeMenu = computed(() => {
  const { meta, path } = route
  // if set path, the sideBar will highlight the path you set
  if (meta.activeMenu) {
    return meta.activeMenu
  }
  return path
})

const showLogo = computed(() => store.state.settings.sideBarLogo)

const isCollapse = computed(() => !sideBar.value.opened)

const getTabList = (val) => {
  tabList.value = val
}

// 菜单点击事件处理
const handleMenuSelect = (index, indexPath) => {
  // index 是菜单项的路径，indexPath 是路径数组
  if (!index) {
    return
  }

  // 如果是外部链接，在新窗口打开
  if (isExternal(index)) {
    window.open(index, '_blank')
    return
  }

  // 如果当前路径和要跳转的路径相同，不重复跳转
  if (route.path === index) {
    return
  }

  // 使用 router.push 进行路由跳转，页面会在右侧主内容区打开
  router.push(index).catch(err => {
    // 避免重复导航错误
    if (err.name !== 'NavigationDuplicated') {
      console.error('路由跳转失败:', err)
    }
  })
}

defineOptions({
  name: 'SideBar'
})
</script>
