/**
 * 实习安排/审核页面公共配置预设
 * 表格列、keyWord 等，供四个 Assignment 页面复用
 */

/** 列表 keyWord，四个页面一致 */
export const ASSIGNMENT_KEY_WORD = {
  edit: 'RelIntershipUser',
  view: 'ViewVerifyProcessRelIntershipUserMerge',
};

/** 安排页 - 学生：表格列 */
export const ASSIGNMENT_STUDENT_COLUMNS = [
  { id: 1, showName: '学生姓名', tableColumnName: 'userName', sortable: true },
  { id: 2, showName: '联系电话', tableColumnName: 'phone', sortable: true },
  { id: 3, showName: '开始时间', tableColumnName: 'startTime', sortable: true },
  { id: 4, showName: '结束时间', tableColumnName: 'endTime', sortable: true },
  { id: 5, showName: '当前状态', tableColumnName: 'customize-status', sortable: true },
];

/** 安排页 - 老师：表格列 */
export const ASSIGNMENT_TEACHER_COLUMNS = [
  { id: 1, showName: '指导老师', tableColumnName: 'userName', sortable: true },
  { id: 2, showName: '联系电话', tableColumnName: 'phone', sortable: true },
  { id: 3, showName: '开始时间', tableColumnName: 'startTime', sortable: true },
  { id: 4, showName: '结束时间', tableColumnName: 'endTime', sortable: true },
  { id: 5, showName: '当前状态', tableColumnName: 'customize-status', sortable: true },
];

/** 审核页 - 学生：表格列 */
export const VERIFY_STUDENT_COLUMNS = [
  { id: 2, showName: '实习项目名称', theOrder: 2, tableColumnName: 'internshipName' },
  { id: 3, showName: '学生姓名', theOrder: 3, tableColumnName: 'userName' },
  { id: 4, showName: '流程开始时间', theOrder: 4, tableColumnName: 'startTime' },
  { id: 5, showName: '流程结束时间', theOrder: 5, tableColumnName: 'endTime' },
  { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'customize-status' },
  { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' },
];

/** 审核页 - 老师：表格列 */
export const VERIFY_TEACHER_COLUMNS = [
  { id: 2, showName: '指导项目名称', theOrder: 2, tableColumnName: 'internshipName' },
  { id: 3, showName: '指导老师', theOrder: 3, tableColumnName: 'userName' },
  { id: 4, showName: '流程开始时间', theOrder: 4, tableColumnName: 'startTime' },
  { id: 5, showName: '流程结束时间', theOrder: 5, tableColumnName: 'endTime' },
  { id: 6, showName: '当前状态', theOrder: 6, tableColumnName: 'customize-status' },
  { id: 7, showName: '审核理由', theOrder: 7, tableColumnName: 'reason' },
];
