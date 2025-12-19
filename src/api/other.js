import request from '@/utils/request'
import { getEncryptKeyWord } from '@/utils/rsaEncrypt'

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

// 校级管理员申请
const applyUniAdmin = (node) => {
  return request({
    url: '/apply/applyUniAdmin',
    method: 'post',
    data: {
      node: JSON.stringify(node)
    }
  })
}

// 竞赛创建
const createContestFoundInfo = (node) => {
  return request({
    url: '/ContestFlow/createFoundInfo',
    method: 'post',
    data: {
      node: JSON.stringify(node)
    }
  })
}

// 报名队伍创建/修改保存
const applyRegisterTeam = (node) => {
  return request({
    url: '/apply/applyRegisterTeam',
    method: 'post',
    data: {
      node: JSON.stringify(node)
    }
  })
}

// 校赛/初赛推荐
const recommendTeams = (userId, node) => {
  return request({
    url: '/apply/recommendTeams',
    method: 'post',
    data: {
      userId,
      node: JSON.stringify(node)
    }
  })
}

// 专家分配/重新分配
const allocateAllExperts = (experts, contest, teamStatus) => {
  return request({
    url: '/ContestFlow/allocateAllExperts',
    method: 'post',
    data: {
      experts,
      contest,
      teamStatus
    }
  })
}

// 专家分配/重新分配（按组）
const allocateAllExpertswithGroup = (contest, groups, teamStatus) => {
  return request({
    url: '/ContestFlow/allocateAllExpertswithGroup',
    method: 'post',
    data: {
      contest,
      groups,
      teamStatus
    }
  })
}

// 计算/重算总分
const calculateAllContestScore = (contestInfoId, flowTypeId) => {
  return request({
    url: '/ContestFlow/calculateAllContestScore',
    method: 'post',
    data: { contestInfoId, flowTypeId }
  })
}

// 计算/重算晋级情况
const calculatePromotion = (data) => {
  return request({
    url: '/ContestFlow/calculatePromotion',
    method: 'post',
    data
  })
}

// 生成证书
const createCertificate = async ({ keyWords, pageInfo, treeInfo, searchKey, sort, reg, andor }) => {
  const encryptedKeyWords = await getEncryptKeyWord(keyWords)
  return request({
    url: '/ContestFlow/createCertificate',
    method: 'post',
    data: {
      keyWords: encryptedKeyWords,
      pageInfo,
      treeInfo,
      searchKey: await getEncryptKeyWord(JSON.stringify(searchKey)),
      sort,
      reg: await getEncryptKeyWord(JSON.stringify(reg)),
      andor
    }
  })
}

/**
 * 下载中心，附件生成至富文本框
 * @param {*} id 栏目内容id
 * @returns
 */
const autoInitText = (id) => {
  return request({
    url: '/channel/auto-init-text',
    method: 'post',
    data: { id }
  })
}

export default {
  getKey,
  getWholeKey,
  applyUniAdmin,
  createContestFoundInfo,
  applyRegisterTeam,
  recommendTeams,
  allocateAllExperts,
  calculateAllContestScore,
  calculatePromotion,
  allocateAllExpertswithGroup,
  createCertificate,
  autoInitText
}
