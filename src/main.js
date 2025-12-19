import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import { ElLoading } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import 'element-plus/dist/index.css'
import router from './router'
import SvgIcon from '@/components/SvgIcon.vue'
import 'virtual:svg-icons-register'
import store from './store'
import './permission' // 权限控制
import { registerDialogDrag } from '@/utils/forDialog'
// 导入指令
import adaptiveDirective from '@/directive/el-table'
import adaptiveCardDirective from '@/directive/el-card'
import permissionDirective from '@/directive/permission'
// 导入并注册图标
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// 导入常量
import CONSTANT from '@/utils/constant'
// 导入工具库
import _ from 'lodash'

const app = createApp(App)
app.use(ElementPlus, {
  locale: zhCn
})
app.use(router)
app.use(store)
// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
// 注册全局指令
app.use(adaptiveDirective)
app.use(adaptiveCardDirective)
app.use(permissionDirective)
app.component('svg-icon', SvgIcon)
registerDialogDrag(app)

// 全局指令式 loading 加载
app.config.globalProperties.fullScreenLoading = () => {
  return ElLoading.service({
    lock: true,
    fullscreen: true,
    text: '数据处理中，请稍后……',
    spinner: 'el-icon-loading',
    background: 'rgba(0, 0, 0, 0.7)'
  })
}

// 全局文件下载
app.config.globalProperties.downloadFile = (content, fileName) => {
  // 字符内容转变成blob地址
  const blob = new Blob([content])
  if ('download' in document.createElement('a')) { // 对象的属性
    // 创建隐藏的可下载链接
    const eleLink = document.createElement('a')
    eleLink.download = fileName
    eleLink.style.display = 'none'

    const URLObject = window.URL || window.webkitURL
    eleLink.href = URLObject.createObjectURL(blob)
    // 触发点击
    document.body.appendChild(eleLink)
    eleLink.click()
    // 然后移除
    document.body.removeChild(eleLink)
    // 释放 URL 对象
    URLObject.revokeObjectURL(eleLink.href)
  } else {
    // IE10+下载
    navigator.msSaveBlob(blob, fileName)
  }
}

// 替换指定字符串前后指定字符
// eslint-disable-next-line no-extend-native
String.prototype.trim = function(char, type) {
  if (char) {
    if (type === 'left') {
      return this.replace(new RegExp('^\\' + char + '+', 'g'), '')
    } else if (type === 'right') {
      return this.replace(new RegExp('\\' + char + '+$', 'g'), '')
    }
    return this.replace(new RegExp('^\\' + char + '+|\\' + char + '+$', 'g'), '')
  }
  return this.replace(/^\s+|\s+$/g, '')
}

// 全局挂载常量
app.config.globalProperties.CONSTANT = CONSTANT

// 全局挂载 lodash
app.config.globalProperties._ = _

app.mount('#app')