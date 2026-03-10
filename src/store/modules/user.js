import userAPI from '@/api/user'
import listAPI from '@/api/list'
import { setToken, removeToken } from '@/utils/auth'
import router, { resetRouter } from '@/router'

const state = {
  token: '',
  userInfo: {},
  roles: [],
  contestTypes: []
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
  }
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
      
      // 如果用户信息中没有 schoolId，但有 departmentId，则查询部门信息获取 schoolId
      if (!res.data.userInfo.schoolId && res.data.userInfo.departmentId) {
        try {
          const deptRes = await listAPI.getSomeRecords({
            keyWords: 'BaseDepartment',
            searchKey: { id: res.data.userInfo.departmentId },
            pageInfo: { page: 1, size: 1 }
          })
          if (deptRes && deptRes.data && deptRes.data.content && deptRes.data.content.length > 0) {
            const department = deptRes.data.content[0]
            // 如果部门信息中有 schoolId，则添加到用户信息中
            if (department.schoolId) {
              res.data.userInfo.schoolId = department.schoolId
            }
          }
        } catch (error) {
          console.warn('获取部门信息失败，无法获取 schoolId:', error)
        }
      }
      
      commit('SET_USERINFO', res.data.userInfo)
      commit('SET_ROLES', res.data.roles)
      // commit('SET_CONTESTTYPES', res.data.contestTypes)
      return Promise.resolve(res.data)
    } catch (error) {
      return Promise.reject(error)
    }
  },

  // 用户登出
  async logout({ commit, dispatch }) {
    try {
      await userAPI.logout()
    } catch (error) {
      console.warn('logout request failed, continue clearing session', error)
    }
    commit('SET_USERINFO', {})
    commit('SET_ROLES', [])
    commit('SET_CONTESTTYPES', [])
    removeToken()
    resetRouter()
    await dispatch('tagsView/delAllViews', null, { root: true })
    return true
  },

  // 删除 token roles
  resetToken({ commit }) {
    return new Promise(resolve => {
      commit('SET_ROLES', [])
      removeToken()
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

