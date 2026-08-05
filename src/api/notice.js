import request from '@/utils/request'

/** 当前老师可发通知的实习项目 */
export function getMyInternships() {
  return request({
    url: '/notice/my-internships',
    method: 'post',
    data: { node: {} },
  })
}

/** 绑定学生列表（勾选弹窗） */
export function getBoundStudents(internshipId) {
  return request({
    url: '/notice/bound-students',
    method: 'post',
    data: { node: { internshipId: Number(internshipId) } },
  })
}

/** 发布通知 */
export function publishNotice(node) {
  return request({
    url: '/notice/publish',
    method: 'post',
    data: { node },
  })
}

/** 老师已发列表 */
export function getMyPublished(node = {}) {
  return request({
    url: '/notice/my-published',
    method: 'post',
    data: { node },
  })
}

/** 学生收件箱 */
export function getMyInbox(node = {}) {
  return request({
    url: '/notice/my-inbox',
    method: 'post',
    data: { node },
  })
}

/** 标记已读 */
export function markRead(node) {
  return request({
    url: '/notice/mark-read',
    method: 'post',
    data: { node },
  })
}

/** 未读数 */
export function getUnreadCount(internshipId) {
  const node = {}
  if (internshipId) node.internshipId = Number(internshipId)
  return request({
    url: '/notice/unread-count',
    method: 'post',
    data: { node },
  })
}

/** 详情 */
export function getNoticeDetail(noticeId) {
  return request({
    url: '/notice/detail',
    method: 'post',
    data: { node: { noticeId: Number(noticeId) } },
  })
}

/** 软删 */
export function deleteNotice(noticeId) {
  return request({
    url: '/notice/delete',
    method: 'post',
    data: { node: { noticeId: Number(noticeId) } },
  })
}

const noticeAPI = {
  getMyInternships,
  getBoundStudents,
  publishNotice,
  getMyPublished,
  getMyInbox,
  markRead,
  getUnreadCount,
  getNoticeDetail,
  deleteNotice,
}

export default noticeAPI
