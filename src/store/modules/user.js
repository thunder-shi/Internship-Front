import userAPI from '@/api/user'
import listAPI from '@/api/list'
import { setToken, removeToken } from '@/utils/auth'
import router, { resetRouter } from '@/router'
import { clearEnterpriseMineCache } from '@/utils/enterpriseAccess'

const state = {
  token: '',
  userInfo: {},
  roles: [],
  contestTypes: [],
  // 学生实习类型：null | 'external' | 'internal' | 'both'
  studentInternshipType: null,
  /** 登录后检测到初始密码，需强制修改 */
  forceChangeInitialPassword: false,
}

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token
  },
  SET_USERINFO: (state, userInfo) => {
    state.userInfo = userInfo
  },
  SET_ROLES: (state, roles) => {
    state.roles = roles
  },
  SET_CONTESTTYPES: (state, types) => {
    state.contestTypes = types
  },
  SET_STUDENT_INTERNSHIP_TYPE: (state, type) => {
    state.studentInternshipType = type
  },
  SET_FORCE_CHANGE_INITIAL_PASSWORD: (state, value) => {
    state.forceChangeInitialPassword = !!value
  },
}

const actions = {
  // 用户登录
  login({ commit }, userInfo) {
    userInfo.account = userInfo.account.trim()
    userInfo.password = userInfo.password.trim()
    userInfo.rememberMe = userInfo.rememberMe ? true : false
    return new Promise((resolve, reject) => {
      userAPI.login(userInfo).then(resp => {
        const token = resp.data
        setToken(token)
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },
  // 获取用户信息
  async getUserInfo({ commit, dispatch }) {
    try {
      const res = await userAPI.getUserInfo()
        if (!res.data) {
        throw new Error('验证失败，请重新登录')
        }
        // 主题色为空的更改
        if (res.data.userInfo.themeColor == 'default' || res.data.userInfo.themeColor == '')
           res.data.userInfo.themeColor = '#009140'
      
      // 如果有 departmentId，查询部门信息获取 schoolId 和 departmentName
      if (res.data.userInfo.departmentId) {
        try {
          const deptRes = await listAPI.getSomeRecords({
            keyWords: 'BaseDepartment',
            searchKey: { id: res.data.userInfo.departmentId },
            pageInfo: { page: 1, size: 1 }
          })
          if (deptRes && deptRes.data && deptRes.data.content && deptRes.data.content.length > 0) {
            const department = deptRes.data.content[0]
            if (!res.data.userInfo.schoolId && department.schoolId) {
              res.data.userInfo.schoolId = department.schoolId
            }
            res.data.userInfo.departmentName = department.name || ''
            // 保存部门类型（typeId=1 表示企业），用于企业用户数据权限判断
            if (department.typeId != null) {
              res.data.userInfo.departmentTypeId = department.typeId
            }
          }
        } catch (error) {
          console.warn('获取部门信息失败:', error)
        }
      }
      
        commit('SET_USERINFO', res.data.userInfo)
        commit('SET_ROLES', res.data.roles)
        commit('SET_STUDENT_INTERNSHIP_TYPE', res.data.userInfo.internshipType ?? null)
        // commit('SET_CONTESTTYPES', res.data.contestTypes)
      await dispatch('checkInitialPassword')
      return Promise.resolve(res.data)
    } catch (error) {
      return Promise.reject(error)
    }
  },

  /** 查询是否初始密码，是则置强制改密标记 */
  async checkInitialPassword({ commit, state }) {
    const userId = state.userInfo?.id
    if (userId == null || userId === '') {
      commit('SET_FORCE_CHANGE_INITIAL_PASSWORD', false)
      return false
    }
    try {
      const res = await userAPI.isInitialPassword(userId)
      const data = res?.data ?? {}
      const needChange = data.isInitialPassword === true
      commit('SET_FORCE_CHANGE_INITIAL_PASSWORD', needChange)
      return needChange
    } catch (error) {
      console.warn('检查初始密码失败:', error)
      commit('SET_FORCE_CHANGE_INITIAL_PASSWORD', false)
      return false
    }
  },

  // 用户登出
  async logout({ commit, dispatch }) {
    try {
      await userAPI.logout()
    } catch (error) {
      console.warn('logout request failed, continue clearing session', error)
    }
    commit('SET_TOKEN', '')
    commit('SET_USERINFO', {})
    commit('SET_ROLES', [])
    commit('SET_CONTESTTYPES', [])
    commit('SET_STUDENT_INTERNSHIP_TYPE', null)
    commit('SET_FORCE_CHANGE_INITIAL_PASSWORD', false)
    removeToken()
    resetRouter()
    // 清空模块级用户态缓存，避免下一个登录用户读到上一个用户的 currentApproved
    clearEnterpriseMineCache()
    await dispatch('tagsView/delAllViews', null, { root: true })
    return true
  },

  // 删除 token roles
  resetToken({ commit }) {
    return new Promise(resolve => {
      commit('SET_ROLES', [])
      removeToken()
      clearEnterpriseMineCache()
      resolve()
    })
  },

  // 更新用户信息
  updateUserInfo({ commit }, userInfo) {
    return commit('SET_USERINFO', userInfo)
  },

  // 动态编辑权限
  async changeRoles({ commit, dispatch }, role) {
    // const token = role + '-token'
    // commit('SET_TOKEN', token)
    // setToken(token)

    const { roles } = await dispatch('getUserInfo')
    resetRouter()
    // generate accessible routes map based on roles
    const accessRoutes = await dispatch('permission/generateRoutes', roles, { root: true })
    // dynamically add accessible routes
    accessRoutes.forEach(route => {
      router.addRoute(route)
    })

    // reset visited views and cached views
    dispatch('tagsView/delAllViews', null, { root: true })
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}

