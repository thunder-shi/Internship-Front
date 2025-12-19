<template>
  <div class="homepage">
    欢迎使用 <h1>{{ settings.title }}</h1>
  </div>
</template>

<script>
import defaultSettings from '@/utils/settings'

export default {
  name: 'Homepage',
  data() {
    return {}
  },
  computed: {
    settings() {
      return defaultSettings
    }
  }
}
</script>

<style lang="scss" scoped>
.homepage {
  padding: 20px;
  text-align: center;
  
  h1 {
    margin-top: 20px;
    color: #409eff;
  }
}
</style>
