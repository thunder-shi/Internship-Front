<template>
  <section :class="classObj" class="app-wrapper">
    <!-- 头部标题 -->
    <title-bar @bgColor="getColor" />
    <!-- 侧边栏 -->
    <section class="container">
      <!-- 适配移动端页面 -->
      <div v-if="device === 'mobile' && sideBar.opened" class="drawer-bg" @click="handleClickOutside" />
      <side-bar class="side-bar-container" />
      <!-- 右侧内容 -->
      <section class="main-container-view main-width">
        <!-- 导航栏 -->
        <tags-view v-if="needTagsView" :style="bgColorAlpha" class="tag-bar" />
        <main class="scroll-content">
          <!-- 面包屑导航 -->
          <!-- <nav-bar class="position-sticky" /> -->
          <!-- 主体内容 -->
          <app-main />
        </main>
      </section>
    </section>
  </section>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStore } from 'vuex'
import AppMain from './components/AppMain.vue'
import SideBar from './components/side-bar/Index.vue'
import TagsView from './components/tags-view/Index.vue'
import TitleBar from './components/TitleBar.vue'
import { useResizeHandler } from './mixin/useResizeHandler'

const store = useStore()

// Use resize handler composable
useResizeHandler()

const themeColor = ref(store.getters.userInfo?.themeColor || '')

// Watch for userInfo changes to update themeColor
watch(
  () => store.getters.userInfo,
  (userInfo) => {
    if (userInfo?.themeColor) {
      themeColor.value = userInfo.themeColor
    }
  },
  { immediate: true, deep: true }
)

const sideBar = computed(() => store.getters.sideBar || store.state.app.sideBar)
const device = computed(() => store.getters.device || store.state.app.device)
const needTagsView = computed(() => store.state.settings.tagsView)
const fixedHeader = computed(() => store.state.settings.fixedHeader)

const bgColorAlpha = computed(() => {
  return { backgroundColor: themeColor.value + '33' }
})

const classObj = computed(() => {
  return {
    'hide-side-bar': !sideBar.value.opened,
    'open-side-bar': sideBar.value.opened,
    withoutAnimation: sideBar.value.withoutAnimation,
    mobile: device.value === 'mobile'
  }
})

const handleClickOutside = () => {
  store.dispatch('app/closeSideBar', { withoutAnimation: false })
}

const getColor = (color) => {
  themeColor.value = color
}

defineOptions({
  name: 'Layout'
})
</script>

<style lang="scss" scoped>
@use "@/assets/css/mixin.scss" as *;
@use "@/assets/css/variables.module.scss" as *;

.app-wrapper {
  height: 100%;
  width: 100%;
  &.mobile.open-side-bar {
    position: fixed;
    top: 0;
    z-index: 10;
  }
}

.drawer-bg {
  background: #000;
  opacity: 0.5;
  width: 100%;
  top: 0;
  height: 100%;
  position: absolute;
  z-index: 9;
}

.container {
  // margin-top: $titleBarHeight;
  height: calc(100vh - #{$titleBarHeight});
  display: flex;
  flex-direction: row;
  flex: 1;
  flex-basis: auto;
  box-sizing: border-box;
  min-width: 0;
}

.tag-bar {
  width: 100%;
  background: #fff;
}
.main-width {
  transition: width 0.28s;
  width: calc(100% - #{$sideBarWidth});
}
.hide-side-bar .main-width {
  width: calc(100% - 54px);
}
.mobile .main-width {
  width: 100%;
}

.scroll-content {
  height: calc(100vh - #{$titleBarHeight} - 34px);
  box-sizing: border-box;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* 隐藏右侧滚动条，仍可用滚轮/触控板滚动 */
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
  }
}
.app-main {
  padding: $paddingTop $paddingRight $paddingBottom $paddingLeft;
  box-sizing: border-box;
}
.position-sticky {
  position: sticky;
  top: 0;
  left: 0;
  z-index: 998;
}
</style>
