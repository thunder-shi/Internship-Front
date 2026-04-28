<template>
  <section id="app-main" class="app-main">
    <!-- <reset-login :dialog-visible.sync="dialogVisible" /> -->
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" class="router-view" />
      </keep-alive>
    </router-view>
  </section>
</template>
<script>
export default {
  name: 'AppMain'
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
