import router, { constantRoutes } from '@/router/index'
import Layout from '@/layout/Index.vue'

/**
 * 递归权限过滤和数据转换
 * @param routes
 * @param parentId
 */

export const filterAsyncRoutes = (routes, parentPath = '') => {
  // 先按 theOrder 字段排序
  const sortedRoutes = [...routes].sort((a, b) => {
    const orderA = a.theOrder || 0
    const orderB = b.theOrder || 0
    return orderA - orderB
  })

  const result = []
  sortedRoutes.forEach(route => {
    const temp = generateRoute(route, parentPath)
    // 如果父级路由包含子路由，递归调用 filterAsyncRoutes
    if (route.children && route.children.length) {
      const children = filterAsyncRoutes(route.children, route.path)
      temp.children = children
    }
    result.push(temp)

    // 添加路由规则
    // 如果 parentPath 不为空，则说明是子级路由
    if (parentPath) {
      // console.log(parentName, '添加一条新的路由规则记录作为现有路由的子路由')
      // // 添加一条新的路由规则记录作为现有路由的子路由
      // router.addRoute(parentName, route)
    } else {
      // 否则为父级路由
      // 添加一条新路由规则
      router.addRoute(temp)
    }
  })
  return result
}

// 生成路由格式
export const generateRoute = (route, parentPath) => {
  const path = parentPath ? parentPath + '/' + route.path : route.path
  const tempRoute = {
    path: path,
    name: path.replace(/\//g, ''), // 去除 path 中的 /
    meta: {
      title: route.name,
      icon: route.icon,
      activeMenu: route.activeMenu,
      isBreadcrumb: true,
      affix: false,
      // noCache: true
      isCache: true
    },
    hidden: route.hidden
  }
  tempRoute.component = route.component === 'Layout' ? Layout : loadView(route.component)  
  return tempRoute
}

export const loadView = (view) => {
  // 动态导入视图组件
  // view 参数的格式应该是 "system-manage/Menu" 这样的路径
  // console.log('Loading view:', view)
  
  // 使用 glob 模式导入所有可能的视图
  const modules = import.meta.glob('../../views/**/*.vue', { eager: false })
  
  // 构建完整的路径
  const viewPath = `../../views/${view}.vue`
  const normalizedPath = viewPath.replace(/\\/g, '/')
  
  // 查找匹配的模块
  const modulePath = Object.keys(modules).find(path => {
    const normalizedKey = path.replace(/\\/g, '/')
    return normalizedKey === normalizedPath || normalizedKey.includes(view.replace(/\\/g, '/'))
  })
  
  if (modulePath && modules[modulePath]) {
    return () => modules[modulePath]()
  }
  
  console.warn(`View not found: ${viewPath}, using 404 as fallback`)
  // 如果找不到，返回 404 页面
  const fallbackPath = Object.keys(modules).find(path => path.includes('404.vue'))
  return () => modules[fallbackPath] ? modules[fallbackPath]() : Promise.resolve({ default: () => null })
}

const permission = {
  namespaced: true,
  state: {
    routes: constantRoutes,
    addRoutes: []
  },
  mutations: {
    SET_ROUTES: (state, routes) => {
      const errorPage = [{ path: '/:pathMatch(.*)*', redirect: '/404', hidden: true }]
      state.addRoutes = routes
      state.routes = constantRoutes.concat(routes).concat(errorPage)      
    }
  },
  actions: {
    // 获取路由
    async generateRoutes({ commit }, asyncRoutes) {
      try {
        // 确保所有路由都已添加到路由器
        if (asyncRoutes && asyncRoutes.length > 0) {
          // 先移除所有动态添加的路由（除了常量路由）
          const currentRoutes = router.getRoutes()
          currentRoutes.forEach(route => {
            if (!constantRoutes.find(cr => cr.path === route.path)) {
              router.removeRoute(route.name || route.path)
            }
          })
          
          // 重新添加所有动态路由
          asyncRoutes.forEach(route => {
            try {
              router.addRoute(route)
              // console.log(`路由已添加: ${route.path}`)
            } catch (error) {
              // console.warn(`添加路由失败 ${route.path}:`, error)
            }
          })
        }
        commit('SET_ROUTES', asyncRoutes)
        // console.log('路由生成完成，加载的动态路由数量:', asyncRoutes.length)
        // console.log('所有可用路由:', router.getRoutes().map(r => r.path))
      } catch (error) {
        // console.error('生成路由时发生错误:', error)
      }
    }
  }
}

export default permission