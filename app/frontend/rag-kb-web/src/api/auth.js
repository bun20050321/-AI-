import request from './request.js'

/**
 * 认证与权限 API
 * 
 * 后端需要提供以下接口：
 * 
 * GET /api/auth/me          - 获取当前登录用户信息（含角色）
 * POST /api/auth/login      - 登录
 * POST /api/auth/logout     - 登出
 * GET /api/auth/menu        - 获取当前用户可见菜单
 */

// 角色常量
export const ROLES = {
  USER: 'user',      // 普通用户（客户）
  STAFF: 'staff'     // 员工（维修人员/管理员）
}

// 角色名称映射
export const ROLE_NAMES = {
  [ROLES.USER]: '普通用户',
  [ROLES.STAFF]: '员工'
}

/**
 * 获取当前用户信息
 * 后端返回: { id, name, phone, role: 'user'|'staff' }
 */
export async function getCurrentUser() {
  return request.get('/api/auth/me')
}

/**
 * 用户登录
 * 后端接收: { phone, password }
 * 后端返回: { token, user: { id, name, role } }
 */
export async function login(data) {
  return request.post('/api/auth/login', data)
}

/**
 * 登出
 */
export async function logout() {
  return request.post('/api/auth/logout')
}

/**
 * 获取用户菜单权限
 * 后端返回: ['/repair', '/documents', '/ai', '/orders'] 等路径数组
 */
export async function getUserMenus() {
  return request.get('/api/auth/menu')
}
