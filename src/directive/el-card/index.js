import adaptiveCard from './adaptive-card'

// Vue 3 插件安装函数
const install = (app) => {
  // 绑定v-adaptive-card指令
  app.directive('adaptive-card', adaptiveCard)
}

export default {
  ...adaptiveCard,
  install
}
