import request from '@/utils/request'

// 当前上传/下载进度百分比
let nowProgressPercent = 0

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
 * 下载文件
 * @param {string|number} id - SysOssFile.id
 * @returns {Promise} 下载请求的Promise
 */
const downloadFile = (id) => {
  return request({
    url: `/common/minio/download/${id}`,
    method: 'get',
    responseType: 'blob',
    onDownloadProgress: (progress) => {
      if (progress.total) {
        nowProgressPercent = Math.round((progress.loaded / progress.total) * 100)
      }
    }
  })
}

export default {
  upload,
  deleteFile,
  downloadFile,
  getProgressPercent
}

