import request from '@/utils/request';

/**
 * 学生打卡提交后生成审核记录
 * @param {number|string} signId — MainSign.id
 */
export function submitSignAudit(signId) {
  return request({
    url: '/main-sign/submit-audit',
    method: 'post',
    data: {
      node: { signId: Number(signId) },
    },
  });
}
