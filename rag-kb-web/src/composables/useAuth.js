import { ref, computed } from 'vue'
import { ROLES } from '@/api/auth.js'

// ===== 权限管理 Composable =====
// 
// 使用方式:
// 1. 后端控制: 修改 getCurrentUser() 调用后端 /api/auth/me 接口
// 2. 本地测试: 通过 localStorage 的 'mock_role' 字段切换角色
//
// 切换角色测试方法（浏览器控制台）:
// localStorage.setItem('mock_role', 'staff')  // 切换为员工
// localStorage.setItem('mock_role', 'user')    // 切换为用户
// location.reload()

const currentUser = ref(null)
const isLoading = ref(false)

// 本地模拟用户（后端开发完成后可删除此段）
function getMockUser() {
  const mockRole = localStorage.getItem('mock_role') || ROLES.USER
  return {
    id: mockRole === ROLES.STAFF ? 'S001' : 'U001',
    name: mockRole === ROLES.STAFF ? '员工张三' : '客户李四',
    phone: '13800138000',
    role: mockRole
  }
}

/**
 * 加载当前用户信息
 * 后端开发完成后，替换为真实 API 调用
 */
async function loadUser() {
  isLoading.value = true
  try {
    // TODO: 后端完成后取消注释，删除 mock
    // const res = await getCurrentUser()
    // currentUser.value = res

    // 本地模拟（仅前端开发测试用）
    await new Promise(r => setTimeout(r, 200))
    currentUser.value = getMockUser()
  } catch (e) {
    console.error('获取用户信息失败:', e)
    currentUser.value = null
  } finally {
    isLoading.value = false
  }
}

/**
 * 登出
 */
function clearUser() {
  currentUser.value = null
  localStorage.removeItem('token')
  localStorage.removeItem('mock_role')
}

// ===== Computed 权限判断 =====

const isLoggedIn = computed(() => !!currentUser.value)
const userRole = computed(() => currentUser.value?.role || null)
const isStaff = computed(() => userRole.value === ROLES.STAFF)
const isUser = computed(() => userRole.value === ROLES.USER)

/**
 * 检查是否有权限访问某路径
 */
function canAccess(path) {
  // 未登录：只允许访问首页（用户端）
  if (!isLoggedIn.value) return path === '/'

  // 员工：可以访问所有页面
  if (isStaff.value) return true

  // 普通用户：不能访问维修工单
  if (path === '/orders') return false

  return true
}

/**
 * 获取当前角色可见的菜单
 */
function getVisibleMenus(allMenus) {
  return allMenus.filter(item => {
    // 维修工单仅员工可见
    if (item.path === '/orders') return isStaff.value
    return true
  })
}

/**
 * 检查是否有权限执行某操作
 */
function can(action) {
  const permissions = {
    // 文档相关
    'doc.preview': isLoggedIn.value,              // 预览文档：登录即可
    'doc.download': isLoggedIn.value,             // 下载文档：登录即可
    'doc.upload': isStaff.value,                  // 上传文档：仅员工
    'doc.delete': isStaff.value,                  // 删除文档：仅员工
    // 工单相关
    'order.create': isLoggedIn.value,             // 创建工单：登录即可
    'order.viewAll': isStaff.value,               // 查看所有工单：仅员工
    'order.manage': isStaff.value,                // 管理工单：仅员工
    // 系统管理
    'user.manage': isStaff.value                  // 用户管理：仅员工
  }
  return permissions[action] || false
}

export function useAuth() {
  return {
    // State
    currentUser,
    isLoading,
    isLoggedIn,
    userRole,
    isStaff,
    isUser,

    // Actions
    loadUser,
    clearUser,

    // Permission checks
    canAccess,
    can,
    getVisibleMenus
  }
}
