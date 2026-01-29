import request from '@/utils/request'
import { getEncryptKeyWord } from '@/utils/rsaEncrypt'
import CONSTANT from '@/utils/constant'

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
const deleteNewInternship = async (ids) => {
  // 将数组转换为逗号分隔的字符串，与 delOneOrManyNodes 保持一致
  const idsString = Array.isArray(ids) ? ids.join(CONSTANT.SPLIT_OPERATOR.COMMA) : ids
  // 对 ids 进行加密，与 delOneOrManyNodes 保持一致
  const encryptedIds = await getEncryptKeyWord(idsString)
  return request({
    url: '/internshipProcess/deleteNewInternship',
    method: 'post',
    data: { ids: encryptedIds }
  })
}

export default {
  getKey,
  getWholeKey,
  addNewInternship,
  deleteNewInternship,
}
