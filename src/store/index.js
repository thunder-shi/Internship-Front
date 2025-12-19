import { createStore } from 'vuex'
import getters from './getters'
import createPersistedState from 'vuex-persistedstate'

// 静态导入模块，避免动态导入时的循环依赖问题
import app from './modules/app'
import permission from './modules/permission'
import settings from './modules/settings'
import tagsView from './modules/tagsView'
import user from './modules/user'

const modules = {
  app,
  permission,
  settings,
  tagsView,
  user
}

// 创建 store
const store = createStore({
  modules,
  getters,
  plugins: [createPersistedState({
    storage: window.sessionStorage,
    reducer(val) {
      return {
        // 这里可以指定需要持久化的数据
        // 例如: app: val.app
      }
    }
  })]
})

export default store