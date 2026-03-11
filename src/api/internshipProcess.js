import request from '@/utils/request';
import { getEncryptKeyWord } from '@/utils/rsaEncrypt';
import CONSTANT from '@/utils/constant';

// 推进审核流程
async function auditProcess(node) {
  return request({
    url: '/internshipProcess/auditProcess',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

async function activateProcess(params) {
  return request({
    url: 'internshipProcess/activateProcess',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

async function getVerifyUserIds(params) {
  return request({
    url: 'internshipProcess/getVerifyUserIds',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

// 获取满足当前要求的实习项目
// async function getNowInternship(processTypeCode) {
//   return request({
//     url: '/internshipProcess/getNowInternship',
//     method: 'post',
//     data: {
//       processTypeCode: processTypeCode
//     }
//   })
// }

export default {
  auditProcess,
  activateProcess,
  getVerifyUserIds,
  // getNowInternship
};
