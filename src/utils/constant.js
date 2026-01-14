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
  SUPER_ADMIN: 1,
  CONTEST_ADMIN: 5,
  UNIVERSITY_ADMIN: 7,
  STUDENT: 3,
  TEACHER: 2,
  EXPERT: 4
})

// 文件类型
const FILE_TYPE = Object.freeze({
  PDF: ['pdf'],
  DOC: ['doc', 'docx'],
  IMG: ['png', 'jpg', 'jpeg', 'gif']
})

// 审核状态
const AUDIT_STATUS = Object.freeze({
  SAVE: -1,
  SAVENAME: '保存未提交',
  SUBMIT: 0,
  SUBMITNAME: '提交待审核',
  PASS: 1,
  PASSNAME: '审核通过',
  NOTPASS: 2,
  NOTPASSNAME: '审核不通过',
  BACK: 3,
  BACKNAME: '审核退回'
})

export default Object.freeze({
  CRYPT,
  FILE_TYPE,
  SEARCH_OPERATOR,
  SPLIT_OPERATOR,
  ROLE_TABLE,
  FILE_MAX_SIZE,
  IMAGE_MAX_SIZE,
  REMARKS_MAX_LENGTH,
  INFO_MAX_LENGTH,
  AUDIT_STATUS
})
