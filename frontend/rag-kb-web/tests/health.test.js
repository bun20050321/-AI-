import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/api/request.js', () => ({
  default: {
    get: vi.fn()
  }
}))

const request = (await import('../src/api/request.js')).default
const { checkBackendHealth, BACKEND_DISCONNECTED_TEXT } = await import('../src/api/health.js')

describe('checkBackendHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests /api/health and reports the backend as connected', async () => {
    request.get.mockResolvedValueOnce({
      code: 0,
      data: {
        status: 'ok'
      }
    })

    await expect(checkBackendHealth()).resolves.toEqual({
      connected: true,
      message: '后端服务已连接',
      data: {
        status: 'ok'
      }
    })
    expect(request.get).toHaveBeenCalledWith('/api/health')
  })

  it('returns the required disconnected message when the backend request fails', async () => {
    request.get.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    await expect(checkBackendHealth()).resolves.toEqual({
      connected: false,
      message: BACKEND_DISCONNECTED_TEXT,
      data: null
    })
  })
})
