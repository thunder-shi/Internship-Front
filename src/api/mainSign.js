import request from '@/utils/request';

/**
 * 学生打卡提交后生成审核记录
 * @param {number|string} signId — MainSign.id
 * @param {number|string} [internshipId] — 实习项目 id
 */
export function submitSignAudit(signId, internshipId) {
  const node = { signId: Number(signId) };
  if (internshipId != null && internshipId !== '') {
    node.internshipId = Number(internshipId);
  }
  return request({
    url: '/main-sign/submit-audit',
    method: 'post',
    data: { node },
  });
}
