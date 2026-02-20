// 加密密钥
const CRYPT = 'o7H8uIM2O5qv65l2'

// 文件大小限制
const FILE_MAX_SIZE = 20 // 文件上传大小（MB）
const IMAGE_MAX_SIZE = 5 // 图片上传大小（MB）

// 输入框的最大长度设置
const INFO_MAX_LENGTH = 50 // 名称、编码
const REMARKS_MAX_LENGTH = 1000 // 备注、拒绝原因

// 搜索操作符
const SEARCH_OPERATOR = Object.freeze({
  OR: '||',
  AND: '&&',
  NOT: '!',
  LT: '<',
  GT: '>',
  EQ: '=',
  LE: '<=',
  GE: '>=',
  NE: '!=',
  LIKE: '≈',
  IN: '()',
  NOT_IN: '!()',
  RANGE: '<=>'
})

// 分割操作符
const SPLIT_OPERATOR = Object.freeze({
  VERTICALLINE: '|',
  COMMA: ',',
  DOT: '.'
})

// 角色表
const ROLE_TABLE = Object.freeze({
  SUPER_ADMIN: 1,              // 超级管理员
  SCHOOL_ADMIN: 2,            // 学校管理员
  ACADEMIC_AFFAIRS_ADMIN: 3,   // 教务处管理员
  DEPARTMENT_ADMIN: 4,         // 院系管理员
  COMPANY_ADMIN: 5,            // 企业管理员
  COMPANY_TUTOR: 6,            // 企业导师
  SCHOOL_TEACHER: 7,           // 学校教师
  STUDENT: 8                   // 学生
})

// 实习流程类型
const PROCESS_TYPE = Object.freeze({
  INTERNSHIP_PLAN_MAKE: 'INTERNSHIP_PLAN_MAKE', // 实习计划制定
  STUDENT_SELECT_INTERNSHIP: 'STUDENT_SELECT_INTERNSHIP', // 学生选择实习项目
  INTERNAL_TEACHER_SELECT_PROJECT: 'INTERNAL_TEACHER_SELECT_PROJECT', // 校内实习-老师选择实习项目
  INTERNAL_TEACHER_DECLARE_TOPIC: 'INTERNAL_TEACHER_DECLARE_TOPIC', // 校内实习-老师申报毕设题目
  INTERNAL_STUDENT_TEACHER_MATCH: 'INTERNAL_STUDENT_TEACHER_MATCH', // 校内实习-师生互选
  EXTERNAL_ENTERPRISE_POST_DECLARATION: 'EXTERNAL_ENTERPRISE_POST_DECLARATION', // 校外实习-企业岗位申报
  EXTERNAL_STUDENT_SELECT_POST: 'EXTERNAL_STUDENT_SELECT_POST', // 校外实习-学生选择岗位
  EXTERNAL_ASSIGN_INTERNAL_TUTOR: 'EXTERNAL_ASSIGN_INTERNAL_TUTOR', // 校外实习-分配校内指导老师
  EXTERNAL_ENTERPRISE_ASSIGN_TUTOR: 'EXTERNAL_ENTERPRISE_ASSIGN_TUTOR' // 校外实习-企业分配指导老师
})

// 审核级别
const VERIFY_LEVEL = Object.freeze({
  NO_VERIFY: 1,      // 无需审核
  ONE_VERIFY: 2,     // 一级审核
  TWO_VERIFYS: 3,    // 二级审核
  THREE_VERIFYS: 4,  // 三级审核
  FOUR_VERIFYS: 5,   // 四级审核
  FIVE_VERIFYS: 6    // 五级审核
})

// 文件类型
const FILE_TYPE = Object.freeze({
  PDF: ['pdf'],
  DOC: ['doc', 'docx'],
  IMG: ['png', 'jpg', 'jpeg', 'gif']
})

// 审核状态
const AUDIT_STATUS = Object.freeze({
  SAVE: -1,  SAVENAME: '待提交',
  SUBMIT: 0,  SUBMITNAME: '待审核',
  PASS: 1,  PASSNAME: '审核通过',
  NOTPASS: 2,  NOTPASSNAME: '审核不通过',
  BACK: 3,  BACKNAME: '审核退回'
})

export default Object.freeze({
  CRYPT,
  FILE_TYPE,
  SEARCH_OPERATOR,
  SPLIT_OPERATOR,
  ROLE_TABLE,
  PROCESS_TYPE,
  VERIFY_LEVEL,
  FILE_MAX_SIZE,
  IMAGE_MAX_SIZE,
  REMARKS_MAX_LENGTH,
  INFO_MAX_LENGTH,
  AUDIT_STATUS
})
