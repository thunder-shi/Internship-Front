<template>
  <el-breadcrumb class="app-breadcrumb" separator=">" @contextmenu.prevent="handleContextMenu">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item v-for="(item, index) in levelList" :key="item.path">
        <span
          v-if="item.redirect === 'noRedirect' || index == levelList.length - 1"
          class="no-redirect"
          >{{ item.meta.title }}</span
        >
        <span v-else class="redirect">{{ item.meta.title }}</span>
      </el-breadcrumb-item>
    </transition-group>
    <!-- 右键菜单：复用 tagsView 的操作语义 -->
    <ul
      v-show="menuVisible"
      :style="{ left: menuLeft + 'px', top: menuTop + 'px' }"
      class="breadcrumb-contextmenu"
    >
      <li @click="closeAllTags">关闭全部标签</li>
      <li @click="closeRightTags">关闭右侧标签</li>
    </ul>
  </el-breadcrumb>
</template>

<script>
// import pathToRegexp from 'path-to-regexp'

export default {
  data() {
    return {
      levelList: null,
      menuVisible: false,
      menuLeft: 0,
      menuTop: 0,
    };
  },
  watch: {
    $route() {
      this.getBreadcrumb();
    },
  },
  created() {
    this.getBreadcrumb();
  },
  methods: {
    getBreadcrumb() {
      // only show routes with meta.title
      const matched = this.$route.matched.filter((item) => item.meta && item.meta.title);
      // const first = matched[0]
      // if (!this.isDashboard(first)) {
      //   matched = [{ path: '/dashboard', meta: { title: 'Dashboard' }}].concat(matched)
      // }
      this.levelList = matched.filter(
        (item) => item.meta && item.meta.title && item.meta.isBreadcrumb !== false
      );
    },
    handleContextMenu(e) {
      const menuMinWidth = 160;
      const container = this.$el;
      const offsetLeft = container.getBoundingClientRect().left || 0;
      const offsetWidth = container.offsetWidth || 0;
      const maxLeft = offsetWidth - menuMinWidth;
      const left = e.clientX - offsetLeft;
      this.menuLeft = left > maxLeft ? maxLeft : left;
      this.menuTop = container.getBoundingClientRect().bottom;
      this.menuVisible = true;
      document.body.addEventListener('click', this.closeMenu);
    },
    closeMenu() {
      this.menuVisible = false;
      document.body.removeEventListener('click', this.closeMenu);
    },
    // 关闭全部标签（包含面包屑对应的路由标签）
    closeAllTags() {
      this.menuVisible = false;
      this.$store
        .dispatch('tagsView/delAllViews')
        .then(({ visitedViews }) => {
          // 如果当前路由不在 affix 中，则跳转到最后一个或首页
          const latestView = visitedViews.slice(-1)[0];
          if (latestView) {
            this.$router.push(latestView);
          } else {
            this.$router.push('/');
          }
        })
        .catch(() => {});
    },
    // 关闭当前路由右侧所有标签
    closeRightTags() {
      this.menuVisible = false;
      const visitedViews = this.$store.state.tagsView?.visitedViews || [];
      const currentIndex = visitedViews.findIndex((v) => v.path === this.$route.path);
      if (currentIndex === -1) return;
      const keep = visitedViews.slice(0, currentIndex + 1);
      // 直接替换 store 中的 visitedViews
      this.$store.state.tagsView.visitedViews = keep;
    },
    isDashboard(route) {
      const name = route && route.name;
      if (!name) {
        return false;
      }
      return name.trim().toLocaleLowerCase() === 'Dashboard'.toLocaleLowerCase();
    },
    pathCompile(path) {
      // 使用简单的字符串替换来处理路由参数
      const { params } = this.$route;
      let result = path;
      Object.keys(params).forEach((key) => {
        result = result.replace(`:${key}`, params[key]);
      });
      return result;
    },
    handleLink(item) {
      const { redirect, path } = item;
      if (redirect) {
        this.$router.push(redirect);
        return;
      }
      this.$router.push(this.pathCompile(path));
    },
  },
};
</script>

<style lang="scss" scoped>
@use '@/assets/css/element-variables.scss' as *;
@use '@/assets/css/variables.module.scss' as *;

.app-breadcrumb.el-breadcrumb {
  display: inline-block;
  font-size: 12px;
  line-height: $navBarHeight;
  margin-left: 8px;

  .no-redirect {
    cursor: text;
  }
  .redirect {
    color: #333;
    cursor: text;
  }
}

.breadcrumb-contextmenu {
  position: fixed;
  z-index: 3000;
  margin: 0;
  padding: 5px 0;
  list-style: none;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  font-size: 12px;
  min-width: 160px;

  li {
    padding: 6px 16px;
    cursor: pointer;
    white-space: nowrap;
    &:hover {
      background: #f5f7fa;
    }
  }
}
</style>
