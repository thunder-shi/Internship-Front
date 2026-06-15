import request from '@/utils/request'

/** 学生提交 / 重新提交日志（首次新建，退回后就地更新） */
export function submitDiary(node) {
  return request({ url: '/diary/submit', method: 'post', data: { node } })
}

/** 获取学生的期数列表（学生视角）：每项含 periodIndex + diary(Merge视图|null) */
export function getStudentPeriods(node) {
  return request({ url: '/diary/periods', method: 'post', data: { node } })
}

/** 获取实习项目的期次列表（老师视角）：返回 MainDiaryPeriod 列表，按 periodIndex 升序 */
export function getInternshipPeriods(node) {
  return request({ url: '/diary/internship-periods', method: 'post', data: { node } })
}

/** 获取某期所有学生日志（老师视角）：每项含学生信息 + diary(Merge视图|null) */
export function getPeriodStudents(node) {
  return request({ url: '/diary/period-students', method: 'post', data: { node } })
}

/** 生成期次（管理员端）：cron 与 periodNum 二选一；清空重建，非追加 */
export function generatePeriods(node) {
  return request({ url: '/diary/generatePeriods', method: 'post', data: { node } })
}

/** 新增或编辑单条期次（id=null 新增，id 有值编辑）；保存后后端自动按 beginTime 重建 periodIndex */
export function savePeriod(node) {
  return request({ url: '/diary/period/save', method: 'post', data: { node } })
}

/** 删除期次（支持批量），有已提交日志时后端返回 400 */
export function deletePeriods(node) {
  return request({ url: '/diary/period/delete', method: 'post', data: { node } })
}

/** 给指定实习项目的所有学生初始化 MainDiary 占位记录（安排导师后调用） */
export function initDiariesByInternship(node) {
  return request({ url: '/diary/init-by-internship', method: 'post', data: { node } })
}

/** AI 批阅实习日志（耗时较长，由弹窗内局部遮罩展示进度） */
export function aiReviewDiary(node) {
  return request({ url: '/diary/ai-review', method: 'post', data: { node }, loadingMask: false })
}
