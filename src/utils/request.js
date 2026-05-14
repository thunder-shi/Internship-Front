import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import store from '@/store'

function shouldUseLoadingMask(config) {
  if (config.loadingMask === false) return false
  const url = config.url || ''
  const base = config.baseURL || ''
  const path = url.startsWith('http') ? url : `${base}${url}`
  const skip = ['/sign/login', '/sign/logout', '/sign/info'].some(
    (p) => path.includes(p) || url.includes(p)
  )
  return !skip
}

function beginLoadingMask(config) {
  if (!shouldUseLoadingMask(config)) return
  config._loadingMaskHeld = true
  store.commit('requestMask/increment')
}

function endLoadingMask(config) {
  if (!config?._loadingMaskHeld) return
  config._loadingMaskHeld = false
  store.commit('requestMask/decrement')
}

const service = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 120 * 1000
})

service.interceptors.request.use(
  (config) => {
    beginLoadingMask(config)
    try {
      const isLoginRequest = config.url?.includes('/sign/login')
      if (store.getters.token && !isLoginRequest) {
        config.headers['X-Token'] = store.getters.token
      }
      return config
    } catch (e) {
      endLoadingMask(config)
      throw e
    }
  },
  (error) => Promise.reject(error)
)

const suppressMessages = ['用户Id获取失败']
const suppressUrls = ['/sign/logout', '/importAndExport/importInfo', '/importAndExport/exportInfo']

const backendMessageMap = {
  'enterprise verify user is not configured':
    '企业审核流程已配置，但在合作高校范围内未找到当前审核角色下的可用审核人。请检查：①「企业信息审核配置」是否已选择正确的合作高校（高校根部门）；② 该校下是否已为对应审核角色绑定账号。',
  'at least one attachment is required before submit':
    '提交审核前请至少上传 1 个附件。请点击「编辑/查看」，在「附件材料」中上传后再提交。',
}

function normalizeBackendMessage(message) {
  if (message == null || message === '') return message
  const s = String(message).trim()
  if (backendMessageMap[s]) return backendMessageMap[s]
  const lower = s.toLowerCase()
  for (const [key, val] of Object.entries(backendMessageMap)) {
    if (key.toLowerCase() === lower) return val
  }
  if (lower.includes('attachment') && lower.includes('required') && lower.includes('submit')) {
    return backendMessageMap['at least one attachment is required before submit']
  }
  return message
}

function shouldSuppress(message, url) {
  if (!message) return false
  if (url && suppressUrls.some((u) => url.includes(u))) return true
  return suppressMessages.some((text) => message.includes(text))
}

service.interceptors.response.use(
  (response) => {
    endLoadingMask(response.config)
    const res = response.data
    const requestUrl = response.config?.url || ''

    if (!res.code) {
      return res
    }

    if (res.status !== 200) {
      const message = normalizeBackendMessage(res.message || '操作失败')
      if (!shouldSuppress(message, requestUrl)) {
        ElMessage({
          message,
          type: 'error',
          duration: 5 * 1000
        })
      }
      return Promise.reject(new Error(message))
    }

    return res
  },
  (error) => {
    endLoadingMask(error.config)

    const errorData = error?.response?.data
    const configUrl = error?.config?.url || ''
    const baseURL = error?.config?.baseURL || ''
    const fullUrl = configUrl.startsWith('http') ? configUrl : `${baseURL}${configUrl}`
    const isLogoutRequest =
      fullUrl.includes('/sign/logout') || configUrl.includes('/sign/logout')
    const backendMessage =
      errorData?.message || errorData?.error || errorData?.msg || errorData?.errorMessage
    const errorMessage = normalizeBackendMessage(backendMessage || '操作失败')

    if (isLogoutRequest) {
      return Promise.reject(error)
    }

    if (errorData?.status === 4007) {
      ElMessageBox.confirm('登录状态已失效，请重新登录', '确定退出', {
        confirmButtonText: '重新登录',
        cancelButtonText: '取消',
        type: 'warning',
        showClose: false
      }).then(() => {
        store.dispatch('user/logout').then(() => {
          location.reload()
        })
      })
      return Promise.reject(error)
    }

    if (shouldSuppress(errorMessage, configUrl)) {
      console.warn('suppressed error message:', errorMessage)
      return Promise.reject(error)
    }

    ElMessage({
      message: errorMessage,
      type: 'error',
      duration: 3 * 1000
    })
    return Promise.reject(error)
  }
)

export default service
