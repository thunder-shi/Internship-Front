import request from '@/utils/request'

// 当前上传/下载进度百分比
let nowProgressPercent = 0

/** 与 axios baseURL 一致，浏览器打开时走同源 /api，带登录 cookie */
const API_BASE = '/api'

function minioUrl(kind, id) {
  return `${API_BASE}/common/minio/${kind}/${id}`
}

/** 后端相对路径（如 /common/minio/file/1）拼到 /api 下；已是绝对地址则原样返回 */
function resolveFileHref(path) {
  if (path == null || path === '') return ''
  const s = String(path)
  if (/^https?:\/\//i.test(s)) return s
  const p = s.startsWith('/') ? s : `/${s}`
  if (p.startsWith(`${API_BASE}/`)) return p
  return `${API_BASE}${p}`
}

const getFileUrl = (id) => minioUrl('file', id)
const getPreviewUrl = (id) => minioUrl('preview', id)
const getDownloadUrl = (id) => minioUrl('download', id)

/**
 * 文件上传-上传到public
 * @param {Object} params - 上传参数
 * @param {File|File[]} params.files - 文件或文件数组
 * @param {string} [params.tabName] - 标签名称
 * @param {string|number} [params.relIds] - 关联ID
 * @returns {Promise} 上传请求的Promise
 */
const upload = (params) => {
  const formData = new FormData()
  
  Object.keys(params).forEach(key => {
    const value = params[key]
    if (value && typeof value === 'object' && !(value instanceof File) && !(value instanceof Blob)) {
      // 如果是对象数组（文件数组），则逐个添加
      if (Array.isArray(value)) {
        value.forEach(item => {
          formData.append('files', item)
        })
      } else {
        // 如果是普通对象，则遍历其属性
        Object.keys(value).forEach(subKey => {
          formData.append('files', value[subKey])
        })
      }
    } else {
      // 普通值直接添加
      formData.append(key, value)
    }
  })
  
  return request({
    url: '/common/minio/upload',
    method: 'post',
    data: formData,
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total) {
        nowProgressPercent = Math.floor((progressEvent.loaded / progressEvent.total) * 99)
      }
    }
  })
}

/**
 * 获取当前上传/下载进度百分比
 * @returns {number} 进度百分比
 */
const getProgressPercent = () => {
  return nowProgressPercent
}

/**
 * 删除文件
 * @param {string|number|Array} fileIds - 文件ID或ID数组
 * @returns {Promise} 删除请求的Promise
 */
const deleteFile = (fileIds) => {
  const ids = Array.isArray(fileIds) ? fileIds.join(',') : fileIds
  return request.delete(`/common/minio/deleteFile?ossFileIds=${ids}`)
}

/**
 * 下载文件：直接打开后端文件流地址（Content-Disposition: attachment）
 * 不要再用 axios GET 解析 JSON，也不要把 res.data 当 MinIO 直链
 * @param {string|number} id - SysOssFile.id
 */
const downloadFile = (id) => {
  if (id == null || id === '') return
  window.open(getDownloadUrl(id), '_blank')
}

/**
 * Office 预览用：已登录请求，返回 MinIO 预签名 GET URL（10 分钟）。
 * 只把返回值交给 kkFileView 服务端拉取，不要 window.open。
 * @param {string|number} id - SysOssFile.id
 * @returns {Promise<string>}
 */
const getPresignedPreviewUrl = async (id) => {
  const res = await request({
    url: `/common/minio/presignedPreview/${id}`,
    method: 'get',
  })
  const url = res?.data
  if (!url || typeof url !== 'string') {
    throw new Error('预览地址无效')
  }
  return url
}

export default {
  upload,
  deleteFile,
  downloadFile,
  getFileUrl,
  getPreviewUrl,
  getDownloadUrl,
  getPresignedPreviewUrl,
  resolveFileHref,
  getProgressPercent
}

