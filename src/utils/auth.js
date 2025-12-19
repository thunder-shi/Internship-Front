import Config from '@/utils/settings'
import Cookies from 'js-cookie'

const TokenKey = Config.TokenKey
const AccountKey = Config.AccountKey

export function getToken() {
  return Cookies.get(TokenKey)
}

export function setToken(token) {
  return Cookies.set(TokenKey, token)
}

export function removeToken() {
  return Cookies.remove(TokenKey)
}

// 记住登录账号与密码
export function getAccount() {
  const account = Cookies.get(AccountKey)
  return account ? JSON.parse(account) : null
}

export function setAccount(account) {
  return Cookies.set(AccountKey, JSON.stringify(account), { expires: Config.passCookieExpires })
}

export function removeAccount() {
  return Cookies.remove(AccountKey)
}

export default {
  getToken,
  setToken,
  removeToken,
  getAccount,
  setAccount,
  removeAccount
}