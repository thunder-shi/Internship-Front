import router, { constantRoutes } from './router/index'
import store from './store'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { getToken } from '@/utils/auth' // get token from cookie
import { filterAsyncRoutes } from '@/store/modules/permission'
NProgress.configure({ showSpinner: false }) // NProgress Configuration
const whiteList = ['/Login', '/Forget', '/Register'] // no redirect whitelist
router.beforeEach(async(to, from, next) => {
  NProgress.start()
  // if (!store.state.webSite.isSave) {
  //   const list = await getcolumn()
  //   const websiteRoutes = await generateRoutes(list)    
  //   store.dispatch('updateStoreChange', true)
  //   store.dispatch('Nav', websiteRoutes)
  //   await addWebsiteRoutes(websiteRoutes, next, to)    
  // }
  // 确定用户是否已经登录
  const hasToken = getToken()
  if (hasToken) {
    if (to.path === '/Login') {
      const val = '/Homepage'
      const nextUrl = constantRoutes.filter((i) => {
        return val === i.redirect
      })
      if (nextUrl.length) {
        // 只有在 constantRoutes 中确实存在 Homepage 路由时才跳转
        next('/Homepage')
      } else {
        // constantRoutes 中没有 Homepage，需要加载动态路由
        const { menuList } = await store.dispatch('user/getUserInfo')
        const asyncRoutes = await filterAsyncRoutes(menuList)
        router.addRoute({ path: '/:pathMatch(.*)*', redirect: '/404', hidden: true })
        await store.dispatch('permission/generateRoutes', asyncRoutes)        
        
        // 安全地获取第一个路由路径并跳转
        const firstRoute = asyncRoutes && asyncRoutes.length > 0 ? asyncRoutes[0] : null
        if (firstRoute && firstRoute.children && firstRoute.children.length > 0) {
          next(firstRoute.children[0].path)
        } else if (firstRoute) {
          next(firstRoute.path)
        } else {
          // 如果仍然没有路由，尝试访问根路径，后续逻辑会处理
          next('/')
        }
      }
      NProgress.done()
    } else {
      // 确定用户是否通过 getUserInfo 获取了权限角色
      const hasRoles = store.getters.roles && store.getters.roles.length > 0
      if (hasRoles) {
        next()
      } else {
        try {
          // 获取菜单信息及用户信息
          const { menuList } = await store.dispatch('user/getUserInfo')
          await loadMenus(menuList, next, to)
        } catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch('user/resetToken')
          ElMessage.error(error.message || '功能获取失败，请联系管理员审核权限！')
          next(`/Login?redirect=${to.path}`)
          NProgress.done()
          // await store.dispatch('user/logout')
          // location.reload() // 为了重新实例化vue-router对象 避免bug
        }
      }
    }
  } else {
    // has no token
    if ((whiteList.indexOf(to.path) !== -1 || to.path.includes('website')) && !to.path.includes('website-')) {
      // 如果需要跳转的页面在 whiteList 中，就直接跳转
      next()
    } else {
      // 否则重定向到登录页
      next(`/Login?redirect=${to.path}`)
      // next('/website/homepage')
      NProgress.done()
    }
  }
})

const loadMenus = async(roles, next, to) => {
  const asyncRoutes = await filterAsyncRoutes(roles)  
  router.addRoute({ path: '/:pathMatch(.*)*', redirect: '/404', hidden: true })
  await store.dispatch('permission/generateRoutes', asyncRoutes)
  if (to.path === '/' || to.path === '/Homepage') {
    // 安全地跳转到第一个可用的路由
    if (asyncRoutes && asyncRoutes.length > 0) {
      const firstRoute = asyncRoutes[0]
      if (firstRoute.children && firstRoute.children.length > 0) {
        next(firstRoute.children[0].path)
      } else if (firstRoute.path) {
        next(firstRoute.path)
      } else {
        next('/')
      }
    } else {
      next('/')
    }
  } else {
    next({
      ...to
    })
  }
}

router.afterEach(() => {
  NProgress.done()
})
