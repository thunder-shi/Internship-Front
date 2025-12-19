<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      network: true // 默认有网
    }
  },
  mounted() {
    // 定义事件处理函数
    this.handleOffline = () => {
      if (this.$message) {
        this.$message.warning('已断网')
      }
      this.network = false
    }
    this.handleOnline = () => {
      this.network = true
    }
    
    // 添加事件监听
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('online', this.handleOnline)
  },
  beforeUnmount() {
    // 移除事件监听，防止内存泄漏
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('online', this.handleOnline)
  }
}
</script>
<style lang="scss">
@use "@/assets/css/index.scss" as *;
#app {
  overflow: hidden;
}
</style>