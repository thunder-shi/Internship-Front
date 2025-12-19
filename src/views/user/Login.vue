<template>
  <el-container>
    <el-header height="68px">
      <img src="@/assets/img/logo.png" style="height:60px;width:60px" />
      <span class="title-span">{{ title }}</span>
    </el-header>
    <el-main>
      <el-form ref="loginForm" :model="loginForm" :rules="loginRules" class="login-form" auto-complete="off" label-position="right">
        <h1 style="margin-top: 0">用户登录</h1>
        <el-form-item prop="account">
          <el-input v-model="loginForm.account" type="text" auto-complete="on" placeholder="手机号/用户名" @focus="accountFocus = true" @blur="accountFocus = false">
            <template #prefix>
              <svg-icon icon-class="axt-s-user" :class="accountFocus ? 'active': ''" />
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="loginForm.password" type="password" auto-complete="on" placeholder="密码" show-password @keyup.enter="handleLogin" @focus="passwordFocus = true" @blur="passwordFocus = false">
            <template #prefix>
              <svg-icon icon-class="axt-s-password" :class="passwordFocus ? 'active': ''" />
            </template>
          </el-input>
        </el-form-item>
        <!-- <div class="display-flex">
          <el-checkbox v-model="loginForm.rememberMe" label="记住密码" />
          <el-link @click="forgetPassword">
            <span>忘记密码？</span>
            <span class="text-color">点我找回</span>
          </el-link>
        </div> -->
        <div>
          <el-button :loading="loading" type="primary" class="button-login" @click.prevent="handleLogin">
            {{ loading?'登 录 中...':'登 录' }}
          </el-button>
        </div>
        <!-- <div align="center">
          <el-link @click="Register">
            <span>没有账号？</span>
            <span class="text-color">点我注册</span>
          </el-link>
        </div> -->
      </el-form>
    </el-main>
  </el-container>
</template>

<script>
import authAPI from '@/utils/auth'
import defaultSettings from '@/utils/settings'
import { filterAsyncRoutes } from '@/store/modules/permission'


export default {
  name: 'Login',
  data() {
    return {
      loginForm: { account: '', password: '', rememberMe: false },
      // loginForm: { account: '15505096851', password: 'Axt-1234', rememberMe: false },
      // loginForm: { account: 'admin', password: 'Axt-1234', rememberMe: false },
      //userInfo: { ...this.$store.getters.userInfo },
      loginRules: {
        // 登录规则
        account: [{ required: true, message: '请输入手机号/用户名', trigger: ['blur', 'change'] }],
        password: [{ required: true, trigger: ['blur', 'change'], message: '密码不能为空' }]
      },
      loading: false, // 加载中
      passwordType: 'password',
      redirect: undefined,
      accountFocus: false, // 账号输入框焦点
      passwordFocus: false // 密码输入框焦点
    }
  },
  computed: {
    title() {
      return defaultSettings.title
    }
  },
  watch: {
    $route: {
      handler(route) {
        this.redirect = route.query && route.query.redirect        
      },
      immediate: true
    }
  },
  created() {
    if (typeof authAPI.getAccount() === 'object') {
      this.loginForm = { ...authAPI.getAccount() }
    }
  },
  methods: {
    async handleLogin() {
      this.$refs.loginForm.validate(async valid => {
        if (valid) {
          this.loading = true
          try {
            // 1. 登录
            await this.$store.dispatch('user/login', this.loginForm)            
            // 2. 获取用户信息和菜单
            const userInfo = await this.$store.dispatch('user/getUserInfo')            
            // 3. 如果有菜单列表，加载动态路由
            if (userInfo && userInfo.menuList && userInfo.menuList.length > 0) {
              const asyncRoutes = filterAsyncRoutes(userInfo.menuList)
              // 添加 404 路由 - 注意：这个应该只添加一次
              const notFoundRoute = this.$router.getRoutes().find(r => r.path === '/:pathMatch(.*)*')
              if (!notFoundRoute) {
                this.$router.addRoute({ path: '/:pathMatch(.*)*', redirect: '/404', hidden: true })
              }
              // 保存路由到 store - 改为await确保完成
              await this.$store.dispatch('permission/generateRoutes', asyncRoutes)              
              // 强制等待路由完全加载
              await new Promise(resolve => setTimeout(resolve, 100))             
            }
            
            // 4. 保存账号信息
            if (this.loginForm.rememberMe) {
              authAPI.setAccount(this.loginForm)
            } else {
              authAPI.removeAccount()
            }
            this.$message.success('登录成功')            
            // 5. 跳转到目标页面
            // 修改前：默认跳转到 /Homepage
            // const redirectPath = this.redirect || '/Homepage'            
            // 修改后：优先使用第一个动态路由作为跳转目标
            let redirectPath = this.redirect            
            // 如果没有指定重定向路径，使用第一个动态路由
            if (!redirectPath) {
              // 递归查找第一个叶子路由（实际页面路由），构建完整路径
              const findFirstLeafRoute = (routes, parentPath = '') => {
                for (const route of routes) {
                  // 排除常量路由
                  if (
                    route.path === '/' || 
                    route.path === '/Login' || 
                    route.path === '/404' || 
                    route.path === '/:pathMatch(.*)*' ||
                    route.hidden
                  ) {
                    continue
                  }
                  
                  // 构建当前路由的完整路径
                  let currentPath = route.path
                  // 如果父路径存在且当前路径不是绝对路径，则拼接
                  if (parentPath) {
                    if (!route.path.startsWith('/')) {
                      currentPath = parentPath + '/' + route.path
                    } else {
                      currentPath = route.path
                    }
                  } else if (!route.path.startsWith('/')) {
                    currentPath = '/' + route.path
                  }
                  
                  // 如果路由有子路由，优先递归查找子路由（子路由是实际页面）
                  if (route.children && route.children.length > 0) {
                    const childRoute = findFirstLeafRoute(route.children, currentPath)
                    if (childRoute) {
                      return childRoute
                    }
                  }
                  
                  // 如果路由没有子路由，说明这是叶子路由（实际页面）
                  if (!route.children || route.children.length === 0) {
                    return { ...route, path: currentPath }
                  }
                }
                return null
              }
              
              // 获取当前已加载的所有路由
              const allRoutes = this.$router.getRoutes()
              
              // 过滤出动态路由（排除常量路由如Login、404等）
              const dynamicRoutes = allRoutes.filter(route => 
                route.path !== '/' && 
                route.path !== '/Login' && 
                route.path !== '/404' && 
                route.path !== '/:pathMatch(.*)*' &&
                !route.hidden
              )
              
              console.log('dynamicRoutes', dynamicRoutes)
              
              // 查找第一个叶子路由（实际页面路由）
              const firstLeafRoute = findFirstLeafRoute(dynamicRoutes)
              
              if (firstLeafRoute) {
                redirectPath = firstLeafRoute.path
                console.log('使用第一个动态路由作为跳转目标:', redirectPath, firstLeafRoute)
              } else {
                // 如果没有找到叶子路由，提供一个备用页面（如果存在）
                redirectPath = '/Dashboard'
                console.log('没有找到动态路由，使用备用路径:', redirectPath)
              }
            }            
            // 使用修改后的跳转逻辑
            setTimeout(() => {
              // 检查路由是否存在
              const routeExists = this.$router.getRoutes().some(route => 
                route.path === redirectPath || route.name === redirectPath
              )              
              if (routeExists) {
                this.$router.replace(redirectPath).catch(error => {
                  console.error('路由跳转失败:', error)
                  // 使用location.href作为最后的备选方案
                  window.location.href = window.location.origin + '/#/' + redirectPath.replace(/^\//, '')
                })
              } else {
                console.warn(`目标路由 ${redirectPath} 不存在，尝试使用第一个可用路由`)                
                // 获取所有可用路由
                const allRoutes = this.$router.getRoutes()
                const availableRoutes = allRoutes.filter(route => 
                  route.path !== '/' && 
                  route.path !== '/Login' && 
                  route.path !== '/404' && 
                  route.path !== '/:pathMatch(.*)*'
                )                
                if (availableRoutes.length > 0) {
                  const fallbackPath = availableRoutes[0].path
                  this.$router.replace(fallbackPath).catch(() => {
                    window.location.href = window.location.origin + '/#/' + fallbackPath.replace(/^\//, '')
                  })
                } else {
                  // 如果真的没有任何可用路由，至少显示一个提示
                  this.$message.error('系统未配置任何可用页面路由')
                  this.loading = false
                }
              }
            }, 200) // 增加等待时间，确保路由完全加载
          } catch (error) {
            this.$message.error(error?.message || '登录失败')
          } finally {
            this.loading = false
          }
        } else {
          return false
        }
      })
    },
    // 忘记密码
    forgetPassword() {
      this.$router.replace('/Forget')
    },
    Register() {
      this.$router.replace('/Register')
    }
  }
}
</script>

<style lang="scss" scoped>
@use "@/assets/css/login.scss" as *;
</style>