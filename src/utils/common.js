/** 封装一些常用的、全局调用的js方法 */
// import CONSTANT from '@/constant'
import _ from 'lodash'
import moment from 'moment'
// 获取导入/导出文件名及导入文件模板id
export function getTemplateFile(keywords, suffix = '') {
  switch (keywords) {
    case '校级报名表':
      return { name: '校级报名表' + suffix, id: null }
    // case 'TblMenuInfo': // 菜单管理
    //   return { name: '菜单' + suffix, id: null }
    // case 'TblRoleInfo': // 角色管理
    //   return { name: '角色' + suffix, id: null }
    // case 'TblDepartmentInfo': // 部门管理
    //   return { name: '部门' + suffix, id: null }
    // case 'TblJobInfo': // 岗位管理
    //   return { name: '岗位' + suffix, id: null }
    // case 'TblUserInfo': // 平台员工管理
    //   return { name: '员工' + suffix, id: CONSTANT.TEMPLATE.STAFF_ID }
    default:
      return { name: '导出数据' + suffix, id: null }
  }
}

export function convertDateStr(inputDate, simple) {
  let date = inputDate
  if (date == null) {
    date = new Date()
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const strDate = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return simple
    ? `${year}-${month}-${strDate}`
    : `${year}-${month}-${strDate} ${hour}:${minute}:${second}`
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {string|Date|moment.Moment} dateStr - 日期字符串、Date 对象或 moment 对象
 * @returns {string} 格式化后的日期字符串，如果输入为空则返回空字符串
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  return moment(dateStr).format('YYYY-MM-DD')
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss 格式（后端已统一返回北京时间，直接格式化即可）
 * @param {string|Date|moment.Moment} time - 时间字符串、Date 对象或 moment 对象
 * @returns {string} 格式化后的时间字符串，如果输入为空则返回 '-'
 */
export function formatDateTime(time) {
  if (!time) return '-'
  // 后端已统一返回北京时间，直接格式化，无需转换
  return moment(time).format('YYYY-MM-DD HH:mm:ss')
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm 格式（用于表格显示，后端已统一返回北京时间，直接格式化即可）
 * @param {string|Date|moment.Moment} time - 时间字符串、Date 对象或 moment 对象
 * @returns {string} 格式化后的时间字符串，如果输入为空则返回 '--'
 */
export function formatDateTimeShort(time) {
  if (!time) return '--'
  // 后端已统一返回北京时间，直接格式化，无需转换
  return moment(time).format('YYYY-MM-DD HH:mm')
}

export function compareTime(gettime) {
  const today = new Date()
  const endTime = new Date(gettime.replace(/-/g, '/'))
  return today.getTime() <= endTime.getTime()
}

export function arrangeButton(compareObj, transObj) {
  if (compareObj === undefined) {
    return transObj
  }
  Object.keys(transObj).forEach(key1 => {
    if (compareObj[key1] === undefined) return
    Object.keys(transObj[key1]).forEach(key2 => {
      if (compareObj[key1][key2] !== undefined) {
        transObj[key1][key2] = compareObj[key1][key2]
      }
    })
  })
  return transObj
}

// 去除字符串首尾逗号
export function commaTrim(str) {
  return str.replace(/^(,)+|(,)+$/g, '')
}

// 获取数值的类型
// instanceof运算符返回一个布尔值，表示指定对象是否为某个构造函数的实例
// instanceof运算符只能用于对象，不适用原始类型的值
export function getValueType(value) {
  if (typeof value !== 'object') {
    return typeof value
  }
  if (value instanceof Array) {
    return 'array'
  }
  if (value instanceof Object) {
    return 'object'
  }
  return 'null'
}

function _customize(obj, src) {
  let ret
  if (typeof obj !== 'undefined') {
    ret = _.cloneDeep(obj)
  }
  if (typeof src === 'undefined') {
    return ret
  }
  if (Array.isArray(src)) {
    if (typeof obj === 'undefined') {
      ret = Object.values(_.merge(ret, src))
    }
    return ret
  }
  const srcKeys = Object.keys(src)
  if (srcKeys.length === 1 && typeof obj === 'undefined') {
    return _.merge(ret, src)
  }
  if (typeof obj === 'undefined') {
    if (typeof src === 'object') {
      return _.merge(ret, src)
    }
    return src
  }
  if (typeof src === 'string') {
    return _.merge(ret, src)
  }
  srcKeys.forEach(key => {
    const ob = {}
    _.set(ob, key, _customize(obj[key], src[key]))
    ret = _.merge(ret, ob)
  })
  return ret
}
export function customize(obj, src) {
  const ret = _.cloneDeep(_customize(obj, src))
  return ret
}

// 将数值重置为初始类型（用于清空表单操作）
export function resetForm(form) {
  const theOrder = form.theOrder === -1
  Object.keys(form).forEach(key => {
    const type = getValueType(form[key])
    if (type === 'number') {
      form[key] = null
    } else if (type === 'string') {
      form[key] = ''
    } else if (type === 'boolean') {
      form[key] = false
    } else if (type === 'undefined') {
      form[key] = undefined
    } else if (type === 'null') {
      form[key] = null
    } else if (type === 'array') {
      form[key] = []
    } else if (type === 'object') {
      form[key] = {}
    }
  })
  if (theOrder) { form.theOrder = -1 }
  return form
}

// 判断对象中的值是否全部为空
export function isObjEmpty(obj) {
  const arr = Object.values(obj)
  const arr_v2 = []
  arr.forEach(item => {
    if (!item) { arr_v2.push(item) }
  })
  const flag = arr_v2.length === arr.length
  return flag
}

// 树结构重命名
export function treeReconfiguration(list) {
  const arr = []
  list.forEach(item => {
    const node = {
      id: item.id,
      label: item.name,
      children: []
    }
    if (item.children.length > 0) {
      const children = treeReconfiguration(item.children)
      node.children = children
    }
    arr.push(node)
  })
  return arr
}
// 清除富文本内所有标签、样式、图片
export function removeHtmlStyle(html) {
  const relStyle = /style\s*?=\s*?([‘"])[\s\S]*?\1/g // 去除样式
  const relTag = /<.+?>/g // 去除标签
  const relClass = /class\s*?=\s*?([‘"])[\s\S]*?\1/g// 清除类名
  const relSpace = /&nbsp;|\\n|\\r|&quot;|&amp;|&lt;|&gt;/g // 清除html转义字符
  let newHtml = ''
  if (html) {
    newHtml = html.replace(relStyle, '')
    newHtml = newHtml.replace(relTag, '')
    newHtml = newHtml.replace(relClass, '')
    newHtml = newHtml.replaceAll(relSpace, '')
  }
  return newHtml
}

/**
 * 规范化表单数据用于显示：将字符串类型的空值（null, undefined, ''）替换为 '-'
 * @param {Object} formData - 要处理的对象
 * @param {Object} options - 配置选项
 * @param {Array<string>} options.excludeFields - 排除的字段列表（这些字段不会被处理）
 * @param {Array<string>} options.includeFields - 只处理这些字段（如果提供，则只处理这些字段）
 * @param {string} options.defaultValue - 默认替换值，默认为 '-'
 * @returns {Object} 处理后的新对象（深拷贝）
 */
export function normalizeFormForDisplay(formData, options = {}) {
  if (!formData || typeof formData !== 'object') {
    return formData
  }

  const {
    excludeFields = [],
    includeFields = null,
    defaultValue = '-'
  } = options

  // 深拷贝对象，避免修改原对象
  const normalized = _.cloneDeep(formData)

  Object.keys(normalized).forEach(key => {
    const value = normalized[key]

    // 如果指定了 includeFields，只处理列表中的字段
    if (includeFields && !includeFields.includes(key)) {
      return
    }

    // 排除指定的字段
    if (excludeFields.includes(key)) {
      return
    }

    // 只处理字符串类型的空值
    // null, undefined, '' 都视为空值
    if (typeof value === 'string' && (value === '' || value === null || value === undefined)) {
      normalized[key] = defaultValue
    } else if (value === null || value === undefined) {
      // 对于非字符串类型，如果是 null 或 undefined，也替换为默认值
      normalized[key] = defaultValue
    }
    // 其他类型（number, boolean, object, array）保持不变
  })

  return normalized
}