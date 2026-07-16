import request from '@/utils/request'
import { getEncryptKeyWord } from '@/utils/rsaEncrypt'
import constant from '@/utils/constant'
import { safeStringify } from '@/utils/common'

// 获得所有树节点（searchKey 与 regKey 需成对传入时，后端才能正确解析精确匹配等条件）
const getAllNodes = async ({
  keyWords,
  parentId = -1,
  virtualRootFlag = true,
  searchKey = '',
  regKey = {},
  andor = {},
  lazy = false,
  preName = '',
  sort = { properties: 'theOrder', direction: 'ASC' },
}) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/readAllTreeNodes',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      parentId,
      virtualRootFlag,
      searchKey,
      regKey,
      andor,
      lazy,
      preName,
      sort,
    }
  }).then(response => {
    if (response && response.data) {
      response.data = response.data.filter(item => item.code !== '0')
    }
    return response
  })
}

// 交换两个树节点位置
const changeTwoNodes = async (keyWords, nodeId, nodeChangeId) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/changeTwoNodes',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      nodeId,
      nodeChangeId
    }
  })
}

// 删除一个节点
const delOneNode = async (keyWords, node) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/delOneNode',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      node: safeStringify(node)
    }
  })
}

// 删除多个节点
const delManyNode = async (keyWords, nodes) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  console.log(nodes.map(e => e.id).join(constant.SPLIT_OPERATOR.COMMA))
  return request({
    url: '/dataTree/delManyNode',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      nodes: safeStringify(nodes)
      // nodes: getEncryptKeyWord(nodes.map(e => e.id).join(constant.SPLIT_OPERATOR.COMMA))
    }
  })
}

// 编辑一个节点（包括新增）
// 传theOrder且为-1.代表无theOrder字段，其他情况需要对theOrder字段进行赋值处理
const editOneNode = async (keyWords, node) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/editOneNode',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      node: safeStringify(node)
    }
  })
}

// 获得所有父节点
const getAllParentIndex = async (keyWords, nodeId) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/getAllParentIndex',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      nodeId
    }
  })
}

// 获得当前节点的直接父亲节点
const getAllBrotherIndex = async (keyWords, nodeId) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/getAllBrotherIndex',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      nodeId
    }
  })
}

// 获得当前节点所有子节点ID构成的集合
const getAllChildIndex = async (keyWords, nodeId) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/dataTree/getAllChildIndex',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      nodeId
    }
  })
}

// 树结构条件的列表查询
const commonSearch = ({ treeInfo, listKeyWords, searchKey, regKey, pageInfo, sortJson }) => {
  return request({
    url: '/dataTree/commonSearch',
    method: 'post',
    data: {
      treeInfo,
      listKeyWords,
      searchKey,
      regKey,
      pageInfo,
      sortJson
    }
  })
}

/** 判断部门子树下是否仍有未删除人员 */
const hasUndeletedUsersInDepartmentSubtree = (departmentId) => {
  return request({
    url: '/dataTree/hasUndeletedUsersInDepartmentSubtree',
    method: 'post',
    data: { departmentId }
  })
}

export default {
  getAllNodes,
  delOneNode,
  delManyNode,
  changeTwoNodes,
  editOneNode,
  getAllBrotherIndex,
  getAllParentIndex,
  getAllChildIndex,
  commonSearch,
  hasUndeletedUsersInDepartmentSubtree
}
