
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import store from '@/store'
// 创建aaxios实例
const service = axios.create({
  // baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  baseURL: '/api',
  withCredentials: true, // send cookies when cross-domain requests
  timeout: 120 * 1000 // request timeout
})

// request interceptor 这个部分保留，当后端系统需要传递唯一凭证的token时使用
service.interceptors.request.use(
  config => {
    // do something before request is sent
    
    // 登录接口不需要 token
    const isLoginRequest = config.url?.includes('/sign/login')
    
    if (store.getters.token && !isLoginRequest) {
      // let each request carry token
      // ['X-Token'] is a custom headers key
      // please modify it according to the actual situation
      config.headers['X-Token'] = store.getters.token
    }
    return config
  },
  error => {
    // do something with request error
    return Promise.reject(error)
  }
)

// response interceptor
const suppressMessages = ['用户Id获取失败']

const suppressUrls = ['/sign/logout', '/importAndExport/importInfo', '/importAndExport/exportInfo']

const shouldSuppress = (message, url) => {
  if (!message) return false
  if (url && suppressUrls.some((u) => url.includes(u))) return true
  return suppressMessages.some((text) => message.includes(text))
}

service.interceptors.response.use(

  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
  */

  /**
   * Determine the request status by custom status
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    const res = response.data
    const requestUrl = response.config?.url || ''
    if (!res.code) { // 文件下载
      return res
    }

    // if the custom status is not 200, it is judged as an error.
    if (res.status !== 200) {
      if (!shouldSuppress(res.message, requestUrl)) {
        ElMessage({
          message: res.message || '操作失败',
          type: 'error',
          duration: 5 * 1000
        })
      }
      return Promise.reject(new Error(res.message || '操作失败'))
    } else {
      return res
    }
  },
  (error) => {
    const errorData = error?.response?.data
    // 获取请求 URL（可能是相对路径或完整路径）
    const configUrl = error?.config?.url || ''
    const baseURL = error?.config?.baseURL || ''
    // 构建完整的请求路径用于判断
    const fullUrl = configUrl.startsWith('http') ? configUrl : (baseURL + configUrl)
    // 更健壮的判断：检查 URL 中是否包含退出登录路径
    const isLogoutRequest = fullUrl && (fullUrl.includes('/sign/logout') || configUrl.includes('/sign/logout'))
    const httpStatus = error?.response?.status
    
    // 优先使用后端返回的 message，如果存在就只显示它，不显示 HTTP 状态码
    // 支持多种可能的数据结构：errorData.message、errorData.error、errorData.msg 等
    const backendMessage = errorData?.message || errorData?.error || errorData?.msg || errorData?.errorMessage
    
    // 如果后端返回了 message，就只使用它，不显示 HTTP 状态码错误
    // 如果后端没有返回 message 或者 message 为空，使用默认提示
    const errorMessage = backendMessage || '操作失败'
    
    // 退出登录请求：即使服务器错误也静默处理，不显示错误消息
    // 包括 401 未授权错误，因为退出登录时 token 可能已经失效
    if (isLogoutRequest) {
      // 静默处理，不显示错误消息
      return Promise.reject(error)
    }
    
    // 4007：后台的token失效，需要重新获取
    if (errorData?.status === 4007) {
      ElMessageBox.confirm('登录状态已失效，请重新登录', '确定退出', { confirmButtonText: '重新登录', cancelButtonText: '取消', type: 'warning', showClose: false }).then(() => {
        store.dispatch('user/logout').then(() => {
          location.reload() // 为了重新实例化vue-router对象 避免bug
        })
      })
    } else if (shouldSuppress(errorMessage, configUrl)) {
      console.warn('suppressed error message:', errorMessage)
      return Promise.reject(error)
    } else {
      // 只显示后端返回的 message，不显示 HTTP 状态码
      ElMessage({
        message: errorMessage,
        type: 'error',
        duration: 3 * 1000
      })
      return Promise.reject(error)
    }
  })

export default service
