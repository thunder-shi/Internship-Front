<template>
  <section id="app-main" class="app-main">
    <!-- <reset-login :dialog-visible.sync="dialogVisible" /> -->
    <router-view v-slot="{ Component }">
      <transition name="fade-transform" mode="out-in">
        <keep-alive v-if="$route.meta.isCache && Component">
          <component :is="Component" class="router-view" />
        </keep-alive>
        <component v-else-if="Component" :is="Component" class="router-view" />
      </transition>
    </router-view>
  </section>
</template>
<script>
export default {
  name: 'AppMain',
  data() {
    return {
      dialogVisible: false
    }
  },
  computed: {
    key() {
      return this.$route.path
    }
  }
}
</script>

<style lang="scss" scoped>
@use "@/assets/css/variables.module.scss" as *;
.app-main {
  background-color: #fff;
  position: relative;
  padding: $paddingTop $paddingRight $paddingBottom $paddingLeft;
  box-sizing: border-box;
}
</style>

<style lang="scss">
// fix css style bug in open el-dialog
.el-popup-parent--hidden {
  .fixed-header {
    padding-right: 15px;
  }
}

.router-view {
  background-color: #fff;
  border-radius: 5px;
}
</style>
