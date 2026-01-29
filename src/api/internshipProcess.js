import request from '@/utils/request'
import { getEncryptKeyWord } from '@/utils/rsaEncrypt'
import CONSTANT from '@/utils/constant'

// 推进审核流程
async function auditProcess(node) {
  return request({
    url: '/internshipProcess/auditProcess',
    method: 'post',
    data: {
      node: JSON.stringify(node)
    }
  })
}

async function activateProcess() {
  return request({
    url: 'internshipProcess/activateProcess',
    method: 'post'
  })
}

export default {
    auditProcess,
    activateProcess
}
