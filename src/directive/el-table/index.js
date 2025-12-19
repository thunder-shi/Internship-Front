import adaptive from './adaptive'

// Vue 3 插件安装函数
const install = (app) => {
  // 绑定v-adaptive指令
  app.directive('adaptive', adaptive)
}

export default {
  ...adaptive,
  install
}
