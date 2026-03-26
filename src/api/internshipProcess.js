import request from '@/utils/request';
import { getEncryptKeyWord } from '@/utils/rsaEncrypt';
import CONSTANT from '@/utils/constant';

// 推进审核流程（单条传对象，批量传对象数组）
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

// 按实习项目初始化师生分配（系统分配）
async function initTeacherStudentByInternshipId(params) {
  return request({
    url: '/internshipProcess/initTeacherStudentByInternshipId',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

// 选择实习项目后初始化校内导师相关数据
async function initEnterpriseTutorByInternshipId(params) {
  return request({
    url: '/internshipProcess/initEnterpriseTutorByInternshipId',
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
  initTeacherStudentByInternshipId,
  initEnterpriseTutorByInternshipId,
  // getNowInternship
};
