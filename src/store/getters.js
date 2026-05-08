const getters = {
  collapsed: state => !state.app.sideBar.opened,
  sideBar: state => state.app.sideBar,
  device: state => state.app.device,
  // fresh: state => state.app.fresh,
  token: state => state.user.token,
  // visitedViews: state => state.tagsView.visitedViews,
  // cachedViews: state => state.tagsView.cachedViews,
  userInfo: state => state.user.userInfo,
  roles: state => state.user.roles,
  contestTypes: state => state.user.contestTypes,
  studentInternshipType: state => state.user.studentInternshipType,
  permission_routes: state => state.permission.routes,
  /** axios 列表区域 loading 遮罩进行中请求数（>0 表示显示） */
  requestMaskCount: (state) => state.requestMask.count,
  // updateStore: state => state.webSite.isSave,
  // updateNav: state => state.webSite.routeList
}
export default getters
