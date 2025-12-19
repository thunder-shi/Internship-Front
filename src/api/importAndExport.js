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
    url: `/importAndExport/importInfo?keyWord=${keyWord}`,
    method: 'post',
    data: formData
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
  exportInfo
}
