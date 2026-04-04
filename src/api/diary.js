import request from '@/utils/request'

/** 学生提交 / 重新提交日志（首次新建，退回后就地更新） */
export function submitDiary(node) {
  return request({ url: '/diary/submit', method: 'post', data: { node } })
}

/** 获取学生的期数列表（学生视角）：每项含 periodIndex + diary(Merge视图|null) */
export function getStudentPeriods(node) {
  return request({ url: '/diary/periods', method: 'post', data: { node } })
}

/** 获取实习项目的总期数（老师视角）：返回 { totalPeriods: N } */
export function getInternshipPeriods(node) {
  return request({ url: '/diary/internship-periods', method: 'post', data: { node } })
}

/** 获取某期所有学生日志（老师视角）：每项含学生信息 + diary(Merge视图|null) */
export function getPeriodStudents(node) {
  return request({ url: '/diary/period-students', method: 'post', data: { node } })
}
