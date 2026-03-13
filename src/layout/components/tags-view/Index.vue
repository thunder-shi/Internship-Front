<template>
  <header ref="tagsViewContainer" id="tags-view-container" class="tags-view-container">
    <scroll-pane ref="scrollPane" class="tags-view-wrapper">
      <hamburger id="hamburger-container" :is-active="sideBar.opened" class="hamburger-container" :title="sideBar.opened ? '收起侧栏' : '展开侧栏'" @toggleClick="toggleSideBar" />
      <router-link
        v-for="tag in visitedViews"
        ref="tagRefs"
        :key="tag.path"
        :class="isActive(tag) ? 'active' : ''"
        :to="{ path: tag.path, query: tag.query, fullPath: tag.fullPath }"
        class="tags-view-item"
        @click.middle="closeSelectedTag(tag)"
        @contextmenu.prevent="openMenu(tag, $event)"
      >
        <span class="tag-title">{{ tag.title }}</span>
        <el-icon class="el-icon-close" @click.prevent.stop="closeSelectedTag(tag)"><Close /></el-icon>
      </router-link>
    </scroll-pane>
    <ul v-show="visible" :style="{ left: left + 'px', top: top + 'px' }" class="contextmenu">
      <li @click="closeAllTags(selectedTag)">关闭全部</li>
      <li @click="closeOthersTags(selectedTag)">关闭其他</li>
      <li @click="closeRightTags(selectedTag)">关闭右侧</li>
    </ul>
  </header>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import ScrollPane from './ScrollPane.vue'
import Hamburger from '@/layout/Hamburger.vue'
import { Close } from '@element-plus/icons-vue'

const store = useStore()
const route = useRoute()
const router = useRouter()

const visible = ref(false)
const top = ref(0)
const left = ref(0)
const homeViews = ref({})
const selectedTag = ref({})
const affixTags = ref([])
const scrollPane = ref(null)
const tagRefs = ref([])
const tagsViewContainer = ref(null)

const sideBar = computed(() => store.getters.sideBar)
const device = computed(() => store.getters.device)

const visitedViews = computed(() => {
  const visit = store.state.tagsView?.visitedViews || []
  return visit.filter((i) => {
    if (!((i.name === 'Login') || (i.name === 'Register') || (i.name === 'Forget'))) {
      return i
    }
  })
})

const routes = computed(() => store.state.permission.routes)

watch(() => route.path, () => {
  addTags()
  moveToCurrentTag()
})

watch(visible, (value) => {
  if (value) {
    document.body.addEventListener('click', closeMenu)
  } else {
    document.body.removeEventListener('click', closeMenu)
  }
})

onMounted(() => {
  // 页面刷新前缓存和赋值
  beforeUnload()
  initTags()
  addTags()
})

const beforeUnload = () => {
  // 监听页面刷新
  window.addEventListener('beforeunload', () => {
    // visitedViews数据结构太复杂无法直接JSON.stringify处理，先转换需要的数据
    const tabViews = visitedViews.value.map(item => {
      return {
        fullPath: item.fullPath,
        hash: item.hash,
        meta: { ...item.meta },
        name: item.name,
        params: { ...item.params },
        path: item.path,
        query: { ...item.query },
        title: item.title
      }
    })
    sessionStorage.setItem('tabViews', JSON.stringify(tabViews))
  })
  // 页面初始化加载判断缓存中是否有数据
  const oldViews = JSON.parse(sessionStorage.getItem('tabViews')) || []
  if (oldViews.length > 0) {
    store.state.tagsView.visitedViews = oldViews
    sessionStorage.clear()
  }
}

const toggleSideBar = () => {
  store.dispatch('app/toggleSideBar')
}

const isActive = (routeItem) => {
  return routeItem.path === route.path
}

const filterAffixTags = (routesList, basePath = '/') => {
  let tags = []
  routesList.forEach(routeItem => {
    if (routeItem.meta && routeItem.meta.affix) {
      // 使用简单的路径拼接逻辑替换 path.resolve
      const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
      const normalizedRoutePath = routeItem.path.startsWith('/') ? routeItem.path : `/${routeItem.path}`
      const tagPath = `${normalizedBasePath}${normalizedRoutePath}`
      tags.push({
        fullPath: tagPath,
        path: tagPath,
        name: routeItem.name,
        meta: { ...routeItem.meta }
      })
    }
    if (routeItem.children) {
      const tempTags = filterAffixTags(routeItem.children, routeItem.path)
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags]
      }
    }
  })
  return tags
}

const initTags = () => {
  const tags = filterAffixTags(routes.value)
  affixTags.value = tags
  // eslint-disable-next-line no-unused-vars
  for (const tag of tags) {
    if (tag.name) {
      store.dispatch('tagsView/addVisitedView', tag)
    }
  }
}

const addTags = () => {
  const { name } = route
  if (name) {
    store.dispatch('tagsView/addView', route)
  }
  return false
}

const moveToCurrentTag = () => {
  const tags = tagRefs.value
  nextTick(() => {
    // 通过 visitedViews 找到当前路由对应的索引
    const currentIndex = visitedViews.value.findIndex(view => view.path === route.path)
    if (currentIndex >= 0 && tags[currentIndex]) {
      const tag = tags[currentIndex]
      // ScrollPane 的 moveToTarget 期望接收组件实例（有 $el 属性）
      scrollPane.value?.moveToTarget(tag)
      // when query is different then update
      const currentView = visitedViews.value[currentIndex]
      if (currentView.fullPath !== route.fullPath) {
        store.dispatch('tagsView/updateVisitedView', route)
      }
    }
  })
}

const refreshSelectedTag = (view) => {
  store
    .dispatch('tagsView/delCachedView', view)
    .then(() => {
      const { fullPath } = view
      nextTick(() => {
        // router.replace({
        //   path: '/redirect' + fullPath
        // })
        router.push({
          path: fullPath,
          replace: true
        })
      })
    })
    .catch(error => error)
}

const closeSelectedTag = (view) => {
  store
    .dispatch('tagsView/delView', view)
    .then(({ visitedViews }) => {
      if (isActive(view)) {
        toLastView(visitedViews, view)
      }
    })
    .catch(error => error)
}

const closeOthersTags = (view) => {
  visible.value = false
  router.push(view)
  store
    .dispatch('tagsView/delOthersViews', view)
    .then(() => {
      moveToCurrentTag()
    })
    .catch(error => error)
}

const closeAllTags = (view) => {
  visible.value = false
  store
    .dispatch('tagsView/delAllViews')
    .then(({ visitedViews }) => {
      // 优先跳转到最后一个标签，否则回到首页
      const latestView = visitedViews.slice(-1)[0]
      if (latestView) {
        router.push(latestView)
      } else {
        router.push('/')
      }
    })
    .catch(error => error)
}

// 关闭当前标签右侧的所有标签
const closeRightTags = (view) => {
  visible.value = false
  const allVisited = store.state.tagsView?.visitedViews || []
  const currentIndex = allVisited.findIndex(v => v.path === view.path)
  if (currentIndex === -1) return
  const keep = allVisited.slice(0, currentIndex + 1)
  // 直接替换 visitedViews
  store.state.tagsView.visitedViews = keep
  // 同步 cachedViews：只保留仍存在的 name
  const keepNames = new Set(keep.map(v => v.name))
  store.state.tagsView.cachedViews = store.state.tagsView.cachedViews.filter(name => keepNames.has(name))
  // 确保当前路由位于保留列表中
  if (!keep.some(v => v.path === route.path)) {
    router.push(keep[keep.length - 1])
  }
}

const toLastView = (visitedViewsList, view) => {
  const latestView = visitedViewsList.slice(-1)[0]
  if (latestView) {
    router.push(latestView)
  } else {
    // now the default is to redirect to the home page if there is no tags-view,
    // you can adjust it according to your needs.
    if (view.name === 'Dashboard') {
      // to reload home page
      router.replace({ path: '/redirect' + view.fullPath })
    } else {
      router.push('/')
    }
  }
}

const openMenu = (tag, e) => {
  const menuMinWidth = 210
  const offsetLeft = tagsViewContainer.value?.getBoundingClientRect().left || 0 // container margin left
  const offsetWidth = tagsViewContainer.value?.offsetWidth || 0 // container width
  const maxLeft = offsetWidth - menuMinWidth // left boundary
  const leftValue = e.clientX - offsetLeft + 15 // 15: margin right

  if (leftValue > maxLeft) {
    left.value = maxLeft
  } else {
    left.value = leftValue
  }

  top.value = 34
  visible.value = true
  selectedTag.value = tag
}

const closeMenu = () => {
  visible.value = false
}

defineOptions({
  name: 'TagsView'
})
</script>

<style lang="scss" scoped>
$tagsViewHeight: 34px;
.tags-view-container {
  position: relative;
  height: $tagsViewHeight;
  width: 100%;
  .tags-view-wrapper {
    .tags-view-item {
      display: inline-flex;
      align-items: center;
      position: relative;
      cursor: pointer;
      height: calc(#{$tagsViewHeight} - 4px);
      color: #495060;
      padding: 0 8px;
      font-size: 12px;
      margin-top: 4px;
      gap: 4px;
      &:first-of-type {
        margin-left: 15px;
      }
      &:last-of-type {
        margin-right: 15px;
      }
      &.active {
        background-color: #fff;
      }
      .tag-title {
        line-height: 1;
      }
    }
  }
  .contextmenu {
    margin: 0;
    background: #fff;
    z-index: 3000;
    position: absolute;
    list-style-type: none;
    padding: 5px 0;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 400;
    color: #333;
    box-shadow: 2px 2px 3px 0 rgba(0, 0, 0, 0.3);
    li {
      margin: 0;
      padding: 7px 16px;
      cursor: pointer;
      &:hover {
        background: #eee;
      }
    }
  }
  .hamburger-container {
    line-height: $tagsViewHeight;
    height: 100%;
    float: left;
    padding: 0 10px;
    cursor: pointer;
    transition: background 0.3s;
    -webkit-tap-highlight-color: transparent;
    &:hover {
      background: rgba(0, 0, 0, 0.025);
    }
  }
}
</style>

<style lang="scss">
//reset element css of el-icon-close
.tags-view-wrapper {
  .tags-view-item {
    .el-icon-close {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      transform-origin: center;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      &:hover {
        background-color: #b4bccc;
        color: #fff;
      }
      :deep(svg) {
        width: 10px;
        height: 10px;
      }
    }
  }
}
</style>
