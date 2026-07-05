// 公共的表单校验规则

// 身份证号详细校验规则
export function IdentityCodeValid(code) {
  const city = { 11: '北京', 12: '天津', 13: '河北', 14: '山西', 15: '内蒙古', 21: '辽宁',
    22: '吉林', 23: '黑龙江 ', 31: '上海', 32: '江苏', 33: '浙江', 34: '安徽',
    35: '福建', 36: '江西', 37: '山东', 41: '河南', 42: '湖北 ', 43: '湖南', 44: '广东',
    45: '广西', 46: '海南', 50: '重庆', 51: '四川', 52: '贵州', 53: '云南', 54: '西藏 ',
    61: '陕西', 62: '甘肃', 63: '青海', 64: '宁夏', 65: '新疆', 71: '台湾', 81: '香港', 82: '澳门', 91: '国外'
  }
  let tip = ''
  let pass = true
  if (!code || !/^\d{6}(18|19|20)?\d{2}(0[1-9]|1[012])(0[1-9]|[12]\d|3[01])\d{3}(\d|X)$/i.test(code)) {
    tip = '身份证号格式错误'
    pass = false
  } else if (!city[code.substring(0, 2)]) {
    tip = '地址编码错误'
    pass = false
  } else {
    // 18位身份证需要验证最后一位校验位if(code.length == 18){
    code = code.split('')
    // ∑(ai×Wi)(mod 11)//加权因子
    const factor = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    // 校验位
    const parity = [1, 0, 'X', 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    let ai = 0
    let wi = 0
    for (let i = 0; i < 17; i++) {
      ai = code[i]
      wi = factor[i]
      sum += ai * wi
    }
    const last = parity[sum % 11]
    if (last !== parseInt(code[17])) {
      tip = '校验位错误'
      pass = false
    }
  }
  return { pass, tip }
}

// 表单身份证号校验
export function checkIDCard(rule, value, callback) {
  if (!value) {
    callback(new Error('请输入身份证号'))
    return
  }
  const res = IdentityCodeValid(value)
  if (!res.pass) {
    callback(new Error(res.tip))
  } else {
    callback()
  }
}

// 特殊字符
const SPECIAL_CHAR_REG = /[`~!@#$%^&*()_\-+=<>?:"{}|,.\/;'\\[\]·~！@#￥%……&*（）——\-+={}|《》？：“”【】、；‘’，。、]/;

/**
 * 弱密码校验（有值时才校验）：长度不小于 8 位，且含字母、数字、特殊符号
 * @returns {string|null} 不通过时返回错误文案，通过或空密码返回 null
 */
export function getWeakPasswordReason(password) {
  const value = String(password ?? '').trim();
  if (!value) return null;
  if (value.length < 8) return '密码长度应不小于8位';
  if (!/[a-zA-Z]/.test(value)) return '密码应包含字母';
  if (!/\d/.test(value)) return '密码应包含数字';
  if (!SPECIAL_CHAR_REG.test(value)) return '密码应包含特殊符号';
  return null;
}

/** 表单用：密码为空则跳过，有值则校验强度 */
export function checkOptionalStrongPassword(rule, value, callback) {
  const reason = getWeakPasswordReason(value);
  if (reason) {
    callback(new Error(reason));
    return;
  }
  callback();
}

// 手机号验证
export function checkPhone(rule, value, callback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    callback(new Error('手机号不能为空'))
    return
  }
  // 手机号（2021年）
  const phoneReg = /^1[0-9]{10}$/
  if (!phoneReg.test(String(value))) {
    callback(new Error('手机号码格式不正确'))
    return
  }
  callback()
}

// 限制只能输入英文和数字
// export function checkAccount(rule, value, callback) {
//   if (value.trim() === '') {
//     callback(new Error('账号不能为空'))
//   }
//   const reg = /^[a-zA-Z][a-zA-Z0-9_]{4,15}$/ // 5-16位以字母开头、数字或_
//   if (!/^[a-zA-Z].*/.test(value)) {
//     callback(new Error('以字母开头'))
//   }
//   if (!/^[A-Za-z0-9]+$/.test(value)) {
//     console.log(/^[a-zA-Z0-9_]$/.test(value), '/^[a-zA-Z0-9_]$/.test(value)')
//     callback(new Error('请输入字母、数字或_'))
//   }
//   if (!reg.test(value)) {
//     callback(new Error('请输入5-16位……'))
//   }
//   callback()
// }

// 限制只能输入英文和数字（账号校验）
export function checkAccount(rule, value, callback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    callback(new Error('账号不能为空'))
    return
  }
  const reg = /^\+?[A-Z0-9a-z_]*$/ // 英文字母、数字和_
  if (!reg.test(String(value))) {
    callback(new Error('请输入英文或数字'))
    return
  }
  callback()
}

// 密码验证-只适用于表单的选择，对应callback
export function checkPassword(rule, value, callback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    callback(new Error('密码不能为空'))
    return
  }
  // // 8-24位包含大小写字母、数字和特殊字符
  // const passwordValue = String(value).trim()
  // if (passwordValue.length < 8 || passwordValue.length > 24) {
  //   callback(new Error('密码长度必须8-24位'))
  //   return
  // }
  // // 数字
  // if (specialReg.test(passwordValue) && /(\d)+/.test(passwordValue) && /[a-z]+/.test(passwordValue) && /[A-Z]+/.test(passwordValue)) {
  //   callback()
  // } else {
  //   callback(new Error('必须是数字、小写字母、大写字母以及特殊字符的组合'))
  // }
  callback()
}

// 确认密码验证（需要与密码字段对比）
// 注意：这个函数需要在组件中包装，以便访问表单数据
// 使用示例：
// validatePass2: (rule, value, callback) => {
//   if (value !== form.password) {
//     callback(new Error('两次输入密码不一致'))
//   } else {
//     callback()
//   }
// }
export function validatePass2(rule, value, callback) {
  if (value === undefined || value === null || String(value).trim() === '') {
    callback(new Error('请再次输入密码'))
    return
  }
  // 注意：这里无法直接访问表单数据，需要在组件中创建包装函数
  // 或者通过 rule 对象传递表单数据
  // 如果 rule.source 存在，可以从中获取 password 字段
  const form = rule.source || {}
  if (form.password && value !== form.password) {
    callback(new Error('两次输入密码不一致'))
    return
  }
  callback()
}

export function checkIsNumber(str) {
  const reg = /^[0-9]*$/ // 数字
  if (!reg.test(str)) {
    return false
  }
  return true
}

// 首尾空格验证
export function checkIsEmpty(str) {
  if (str === undefined || str === null) {
    return false
  }
  if (String(str).trim() === '') {
    return false
  }
  return true
}
