import request from '@/utils/request';

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

// 按实习项目初始化师生分配（系统分配，异步启动）
async function initTeacherStudentByInternshipId(params) {
  return request({
    url: '/internshipProcess/initTeacherStudentByInternshipId',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

/** 查询系统分配校内导师任务进度 */
async function getInitTeacherStudentTaskStatus(params) {
  return request({
    url: '/internshipProcess/getInitTeacherStudentTaskStatus',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
    loadingMask: false,
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

// 手动分配师生
async function manualAssignTeacherStudent(params) {
  return request({
    url: '/internshipProcess/manualAssignTeacherStudent',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

async function listAssignableTeachers(params) {
  return request({
    url: '/internshipProcess/listAssignableTeachers',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
  });
}

async function listAssignableStudents(params) {
  return request({
    url: '/internshipProcess/listAssignableStudents',
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

/** 本学院校内实习报名与选题统计 */
function listInternalInternshipCollegeStats(node) {
  return request({
    url: '/internshipProcess/listInternalInternshipCollegeStats',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/**
 * 指定校内实习项目学生选题明细（含分类统计）
 * @param {Object} node — { internshipId, departmentId?, status: 'all'|'notSubmitted'|'pendingAudit'|'titleApproved', pageInfo }
 *   departmentId 与 listInternalInternshipCollegeStats 下钻一致；省略表示全校汇总口径（由登录角色决定范围）
 */
function getInternalInternshipTitleSelectionBreakdown(node) {
  return request({
    url: '/internshipProcess/getInternalInternshipTitleSelectionBreakdown',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/**
 * 指定校内实习项目下尚未提交题目的老师列表
 * @param {Object} node — { internshipId, departmentId?, pageInfo }，departmentId 与统计下钻一致，省略为全校口径
 */
function listInternalInternshipTeachersNotSubmittedTopic(node) {
  return request({
    url: '/internshipProcess/listInternalInternshipTeachersNotSubmittedTopic',
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

/**
 * 为未选岗学生随机分配岗位（异步启动，立即返回 taskId）
 * @param {Object} node — { internshipId }
 */
function randomAssignPostsForUnselectedStudents(node) {
  return request({
    url: '/internshipProcess/randomAssignPostsForUnselectedStudents',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/**
 * 查询随机分配岗位任务进度
 * @param {Object} node — { taskId }
 */
function getRandomAssignPostsTaskStatus(node) {
  return request({
    url: '/internshipProcess/getRandomAssignPostsTaskStatus',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
    loadingMask: false,
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

/** 老师最终确认学生自主选题（可选入口，auditProcess 通过也会触发后端确认） */
function confirmStudentTopicSelection(node) {
  return request({
    url: '/internshipProcess/confirmStudentTopicSelection',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/**
 * 幂等创建自主实习虚拟岗位（通常不需要手动调用，后端在创建校外项目时自动创建）
 * @param {Number} internshipId
 * @returns {Promise<{data: { postId, created }}>}
 */
function createSelfInternshipPost(internshipId) {
  return request({
    url: '/internshipProcess/createSelfInternshipPost',
    method: 'post',
    data: {
      node: JSON.stringify({ internshipId }),
    },
  });
}

/**
 * 学生提交自主实习申请（首次或 NOTPASS 重投）
 * - 同一项目同一学生已有 SAVE/SUBMIT/PASS/BACK → 后端返回 400，前端按 message 提示
 * - NOTPASS → 后端自动原地覆盖，返回 created:false，旧附件已清空需重传
 * @param {Object} node - { internshipId, selfCompanyName, selfPostName, selfAddress, selfRemarks }
 * @returns {Promise<{data: { relStuInternshipPostId, isAudit, verifyTypeId, created }}>}
 */
function applySelfInternship(node) {
  return request({
    url: '/internshipProcess/applySelfInternship',
    method: 'post',
    data: {
      node: JSON.stringify(node),
    },
  });
}

/**
 * Excel 导入实习项目安排（RelIntershipUser）
 * @param {Object} params
 * @param {File} params.file - .xls / .xlsx
 * @param {number|string} params.internshipId
 * @param {number|string} params.processId
 * @param {number|string} params.createUserId
 * @param {string} params.role - student / teacher
 * @param {number|string} [params.verifyRoleId]
 * @param {number|string} [params.currentVerifyTypeId]
 */
function importRelIntershipUserByExcel(params) {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('internshipId', params.internshipId);
  formData.append('processId', params.processId);
  formData.append('createUserId', params.createUserId);
  formData.append('role', params.role);
  if (params.verifyRoleId != null && params.verifyRoleId !== '') {
    formData.append('verifyRoleId', params.verifyRoleId);
  }
  if (params.currentVerifyTypeId != null && params.currentVerifyTypeId !== '') {
    formData.append('currentVerifyTypeId', params.currentVerifyTypeId);
  }
  return request({
    url: '/internshipProcess/importRelIntershipUserByExcel',
    method: 'post',
    data: formData,
    timeout: 300000,
  });
}

/** 下载实习项目安排 Excel 导入模板 */
function downloadRelIntershipUserImportTemplate(role) {
  const formData = new FormData();
  formData.append('role', role);
  return request({
    url: '/internshipProcess/downloadRelIntershipUserImportTemplate',
    method: 'post',
    data: formData,
    responseType: 'blob',
  });
}

/**
 * Excel 导入手动分配师生（异步启动，立即返回 taskId）
 * @param {Object} params
 * @param {File} params.file
 * @param {number|string} params.internshipId
 * @param {number|string} params.processId
 * @param {number|string} params.createUserId
 * @param {number|string} [params.verifyRoleId]
 * @param {number|string} [params.currentVerifyTypeId]
 */
function importManualAssignTeacherStudentByExcel(params) {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('internshipId', params.internshipId);
  formData.append('processId', params.processId);
  formData.append('createUserId', params.createUserId);
  if (params.verifyRoleId != null && params.verifyRoleId !== '') {
    formData.append('verifyRoleId', params.verifyRoleId);
  }
  if (params.currentVerifyTypeId != null && params.currentVerifyTypeId !== '') {
    formData.append('currentVerifyTypeId', params.currentVerifyTypeId);
  }
  return request({
    url: '/internshipProcess/importManualAssignTeacherStudentByExcel',
    method: 'post',
    data: formData,
    timeout: 300000,
  });
}

/** 查询 Excel 导入分配任务进度 */
function getImportManualAssignTeacherStudentTaskStatus(params) {
  return request({
    url: '/internshipProcess/getImportManualAssignTeacherStudentTaskStatus',
    method: 'post',
    data: {
      node: JSON.stringify(params),
    },
    loadingMask: false,
  });
}

/** 下载手动分配师生 Excel 导入模板 */
function downloadManualAssignTeacherStudentImportTemplate() {
  return request({
    url: '/internshipProcess/downloadManualAssignTeacherStudentImportTemplate',
    method: 'post',
    responseType: 'blob',
  });
}

export default {
  auditProcess,
  activateProcess,
  getVerifyUserIds,
  initTeacherStudentByInternshipId,
  getInitTeacherStudentTaskStatus,
  initEnterpriseTutorByInternshipId,
  manualAssignTeacherStudent,
  listAssignableTeachers,
  listAssignableStudents,
  listExternalInternshipCollegeStats,
  listInternalInternshipCollegeStats,
  getInternalInternshipTitleSelectionBreakdown,
  listInternalInternshipTeachersNotSubmittedTopic,
  listApprovedExternalInternshipPosts,
  getExternalInternshipStudentPostBreakdown,
  randomAssignPostsForUnselectedStudents,
  getRandomAssignPostsTaskStatus,
  getLatestRejectedTitleSelection,
  acknowledgeRejectedTitleSelection,
  confirmStudentTopicSelection,
  createSelfInternshipPost,
  applySelfInternship,
  importRelIntershipUserByExcel,
  downloadRelIntershipUserImportTemplate,
  importManualAssignTeacherStudentByExcel,
  getImportManualAssignTeacherStudentTaskStatus,
  downloadManualAssignTeacherStudentImportTemplate,
  // getNowInternship
};
