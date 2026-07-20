import { afterEach, describe, expect, it, vi } from 'vitest'

describe('http client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('reads its base URL from VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:9090')

    const { default: http } = await import('@/utils/http')

    expect(http.defaults.baseURL).toBe('http://localhost:9090')
  })

  it('resolves successful requests to the response body', async () => {
    const payload = { code: 0, message: 'success', data: { status: 'ok' } }
    const { default: http } = await import('@/utils/http')
    http.defaults.adapter = async (config) => ({
      data: payload,
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    })

    await expect(http.get('/api/health')).resolves.toEqual(payload)
  })
})
