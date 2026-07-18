import request from './request.js'

export const BACKEND_DISCONNECTED_TEXT = '后端服务未连接'

export async function checkBackendHealth() {
  try {
    const response = await request.get('/api/health')

    return {
      connected: true,
      message: '后端服务已连接',
      data: response.data
    }
  } catch {
    return {
      connected: false,
      message: BACKEND_DISCONNECTED_TEXT,
      data: null
    }
  }
}
