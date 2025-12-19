import { createRouter, createWebHistory } from 'vue-router'


/**
 * constantRoutes
 * 没有权限要求的页面
 * 所有权限通用的公共页面
 */
export const constantRoutes = [
  // 如果需要主页，把下面声明打开
  // {
  //   path: '/',
  //   component: Layout,
  //   redirect: '/Homepage',
  //   children: [
  //     {
  //       path: 'Homepage',
  //       component: (resolve) => require(['@/views/Homepage.vue'], resolve),
  //       name: 'Homepage',
  //       meta: { title: '主页', icon: 'axt-homepage', affix: true, noCache: true }
  //     }
  //   ]
  // },
  {
    path: '/',
    redirect: '/Login'
  },
  {
    path: '/Login',
    name: 'Login',
    meta: { title: '登录', noCache: true },
    component: () => import('@/views/user/Login.vue'),
    hidden: true
  },
  {
    path: '/404',
    name: 'Page404',
    meta: { title: '404', noCache: true },
    component: () => import('@/views/404.vue'),
    hidden: true
  }
]

/**
 * asyncRoutes
 * 根据用户权限设置的动态路由
 */
export const asyncRoutes = [
  // 404 page must be placed at the end !!!
  { path: '/:pathMatch(.*)*', redirect: '/404', hidden: true }
]

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ y: 0 }),
  routes: constantRoutes
})
export function resetRouter() {
  // 在 Vue Router 4 中，我们需要重新创建路由实例
  // 或者清除动态添加的路由
  const newRouter = createRouter({
    history: createWebHistory(),
    scrollBehavior: () => ({ y: 0 }),
    routes: constantRoutes
  })
  // 重置路由
  router.getRoutes().forEach(route => {
    if (route.name && !['Login', 'Page404'].includes(route.name)) {
      router.removeRoute(route.name)
    }
  })
}

export default router