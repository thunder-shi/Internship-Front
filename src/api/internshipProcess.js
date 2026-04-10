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
    url: '/internshipProcess/activateProcess',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

async function getVerifyUserIds(params) {
  return request({
    url: '/internshipProcess/getVerifyUserIds',
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

/** 本学院校外实习报名统计（仅 intTypeName=校外实习） */
function listExternalInternshipCollegeStats(node) {
  return request({
    url: '/internshipProcess/listExternalInternshipCollegeStats',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/** 指定校外实习项目下已通过审核的岗位列表 */
function listApprovedExternalInternshipPosts(node) {
  return request({
    url: '/internshipProcess/listApprovedExternalInternshipPosts',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/**
 * 指定校外实习项目学生选岗明细（含分类统计）
 * @param {Object} node — { internshipId, departmentId?, status: 'all'|'notSelected'|'selectedPendingAudit'|'postApproved', pageInfo }
 */
function getExternalInternshipStudentPostBreakdown(node) {
  return request({
    url: '/internshipProcess/getExternalInternshipStudentPostBreakdown',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/** 学生查看最近一条选题不通过记录 */
function getLatestRejectedTitleSelection(node) {
  return request({
    url: '/internshipProcess/getLatestRejectedTitleSelection',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/** 学生确认不通过后清理选题记录 */
function acknowledgeRejectedTitleSelection(node) {
  return request({
    url: '/internshipProcess/acknowledgeRejectedTitleSelection',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

export default {
  auditProcess,
  activateProcess,
  getVerifyUserIds,
  initTeacherStudentByInternshipId,
  initEnterpriseTutorByInternshipId,
  listExternalInternshipCollegeStats,
  listApprovedExternalInternshipPosts,
  getExternalInternshipStudentPostBreakdown,
  getLatestRejectedTitleSelection,
  acknowledgeRejectedTitleSelection,
  // getNowInternship
};
