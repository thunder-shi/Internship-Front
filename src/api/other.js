import request from '@/utils/request'

// 获取密钥
const getKey = () => {
  return request({
    url: '/common/getKey',
    method: 'post'
  })
}

// 生成完整密钥
const getWholeKey = (key, value) => {
  const formattedValue = value > 9 ? value : `0${value}`
  return `${key}${formattedValue}${key.split('').reverse().join('')}`
}

/**
 * 新增实习项目
 * 创建项目基本信息，创建后需要进入编辑页面配置流程
 */
const addNewInternship = (form) => {
  return request({
    url: '/internshipProcess/addNewInternship',
    method: 'post',
    data: {
      node: JSON.stringify(form)
    }
  })
}

/**
 * 删除实习项目
 */
const deleteNewInternship = (ids) => {
  return request({
    url: '/internshipProcess/deleteNewInternship',
    method: 'post',
    data: { ids }
  })
}

export default {
  getKey,
  getWholeKey,
  addNewInternship,
  deleteNewInternship,
}
