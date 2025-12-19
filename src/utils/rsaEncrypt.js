import CryptoJS from 'crypto-js'
import constant from '@/utils/constant'
import otherAPI from '@/api/other'

// 默认解密密钥
const defaultKey = CryptoJS.enc.Utf8.parse(constant.CRYPT)

// 加密函数
const Encrypt = async (word) => {
  const keyData = await otherAPI.getKey()
  const wholeKey = otherAPI.getWholeKey(keyData.data.key, keyData.data.value)
  const key = CryptoJS.enc.Utf8.parse(wholeKey)
  
  const srcs = CryptoJS.enc.Utf8.parse(word)
  const encrypted = CryptoJS.AES.encrypt(srcs, key, { 
    mode: CryptoJS.mode.ECB, 
    padding: CryptoJS.pad.Pkcs7 
  })

  const formattedValue = keyData.data.value > 9 
    ? keyData.data.value 
    : `0${keyData.data.value}`
  
  return encrypted.toString() + formattedValue
}

// 解密函数
const Decrypt = (word) => {
  const decrypt = CryptoJS.AES.decrypt(word, defaultKey, { 
    mode: CryptoJS.mode.ECB, 
    padding: CryptoJS.pad.Pkcs7 
  })
  return CryptoJS.enc.Utf8.stringify(decrypt).toString()
}

// 获取加密关键词
const getEncryptKeyWord = async (keyword) => {
  return await Encrypt(keyword)
}

export {
  Decrypt,
  Encrypt,
  getEncryptKeyWord
}
