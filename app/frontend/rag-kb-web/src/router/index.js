import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes.js'
import { useAuth } from '@/composables/useAuth.js'

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫 - 权限控制
router.beforeEach(async (to, from, next) => {
  const auth = useAuth()

  // 首次加载：获取用户信息
  if (!auth.currentUser.value && !auth.isLoading.value) {
    await auth.loadUser()
  }

  // 检查是否有权限访问目标页面
  if (!auth.canAccess(to.path)) {
    // 无权限访问维修工单，重定向到首页
    if (to.path === '/orders') {
      // 显示提示（可以通过 query 参数传递）
      return next({ path: '/', query: { noPermission: '1' } })
    }
    return next('/')
  }

  next()
})

export default router
