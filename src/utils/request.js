
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

const shouldSuppress = (message, url) => {
  if (!message) return false
  if (url && url.includes('/sign/logout')) return true
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
          message: res.message || 'Error',
          type: 'error',
          duration: 5 * 1000
        })
      }
      return Promise.reject(new Error(res.message || 'Error'))
    } else {
      return res
    }
  },
  (error) => {
    const errorData = error?.response?.data
    const requestUrl = error?.config?.url || ''
    const isLogoutRequest = requestUrl && requestUrl.includes('/sign/logout')
    const errorMessage = errorData?.message || error?.message || '请求失败'
    
    // 退出登录请求：即使服务器错误也静默处理，不显示错误消息
    if (isLogoutRequest) {
      console.warn('Logout request failed, but continuing with session cleanup:', errorMessage)
      return Promise.reject(error)
    }
    
    // 4007：后台的token失效，需要重新获取
    if (errorData?.status === 4007) {
      ElMessageBox.confirm(
        '登录状态已失效，请重新登录',
        '确定退出', {
          confirmButtonText: '重新登录',
          cancelButtonText: '取消',
          type: 'warning',
          showClose: false
        }
      ).then(() => {
        store.dispatch('user/logout').then(() => {
          location.reload() // 为了重新实例化vue-router对象 避免bug
        })
      })
    } else if (shouldSuppress(errorMessage, requestUrl)) {
      console.warn('suppressed error message:', errorMessage)
      return Promise.reject(error)
    } else {
      ElMessage({
        message: errorMessage,
        type: 'error',
        duration: 3 * 1000
      })
      return Promise.reject(error)
    }
  })

export default service
