<template>
  <el-breadcrumb class="app-breadcrumb" separator=">">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item v-for="(item,index) in levelList" :key="item.path">
        <span v-if="item.redirect==='noRedirect'||index==levelList.length-1" class="no-redirect">{{ item.meta.title }}</span>
        <span v-else class="redirect">{{ item.meta.title }}</span>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<script>
// import pathToRegexp from 'path-to-regexp'

export default {
  data() {
    return {
      levelList: null
    }
  },
  watch: {
    $route() {
      this.getBreadcrumb()
    }
  },
  created() {
    this.getBreadcrumb()
  },
  methods: {
    getBreadcrumb() {
      // only show routes with meta.title
      const matched = this.$route.matched.filter(item => item.meta && item.meta.title)
      // const first = matched[0]
      // if (!this.isDashboard(first)) {
      //   matched = [{ path: '/dashboard', meta: { title: 'Dashboard' }}].concat(matched)
      // }
      this.levelList = matched.filter(
        item => item.meta && item.meta.title && item.meta.isBreadcrumb !== false
      )
    },
    isDashboard(route) {
      const name = route && route.name
      if (!name) {
        return false
      }
      return name.trim().toLocaleLowerCase() === 'Dashboard'.toLocaleLowerCase()
    },
    pathCompile(path) {
      // 使用简单的字符串替换来处理路由参数
      const { params } = this.$route
      let result = path
      Object.keys(params).forEach(key => {
        result = result.replace(`:${key}`, params[key])
      })
      return result
    },
    handleLink(item) {
      const { redirect, path } = item
      if (redirect) {
        this.$router.push(redirect)
        return
      }
      this.$router.push(this.pathCompile(path))
    }
  }
}
</script>

<style lang="scss" scoped>
@use "@/assets/css/element-variables.scss" as *;
@use "@/assets/css/variables.module.scss" as *;

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
</style>
