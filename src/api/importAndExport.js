import request from '@/utils/request'

/**
 * 导入信息
 * @param {string} keyWord - 关键词
 * @param {File} file - 要导入的文件
 * @returns {Promise} 导入请求的Promise
 */
const importInfo = (keyWord, file) => {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/importAndExport/importInfo', // 建议把参数拿出来
    method: 'post',
    params: { keyWord: keyWord },       // 1. 规范写法：查询参数放在 params 里
    data: formData,
    timeout: 300000                     // 2. 关键修改：设置超时时间为 5分钟 (单位毫秒)
  })
}

function baseTemplateFile(val) {
  return request({
    url: `/importAndExport/template`,
    method: 'post',
    data: {
      keyWords: val
    },
    responseType: 'blob'
  })
}

/**
 * 导出信息
 * @param {string|Object} keyWords - 关键词
 * @param {Array} nodes - 节点数据
 * @param {Array} allTableColumns - 所有表格列
 * @param {Object} searchWords - 搜索关键词
 * @returns {Promise} 导出请求的Promise
 */
const exportInfo = (keyWords, nodes, allTableColumns, searchWords) => {
  return request({
    url: '/importAndExport/exportInfo',
    method: 'post',
    data: {
      keyWords,
      nodes,
      allTableColumns,
      searchWords
    },
    responseType: 'blob'
  })
}

export default {
  importInfo,
  exportInfo,
  baseTemplateFile
}
