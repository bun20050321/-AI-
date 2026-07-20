import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RepairOrders from '@/views/RepairOrders.vue'
import http from '@/utils/http'

vi.mock('@/utils/http', () => ({
  default: {
    get: vi.fn()
  }
}))

describe('RepairOrders health status', () => {
  beforeEach(() => {
    http.get.mockReset()
  })

  it('shows the connected service for a valid health response', async () => {
    http.get.mockResolvedValue({
      code: 0,
      message: 'success',
      data: {
        status: 'ok',
        service: 'rag-kb-demo'
      }
    })

    const wrapper = mount(RepairOrders)
    await flushPromises()

    expect(http.get).toHaveBeenCalledWith('/api/health')
    expect(wrapper.get('[data-testid="health-status"]').text()).toContain('后端服务已连接')
    expect(wrapper.text()).toContain('rag-kb-demo')
  })

  it.each([
    ['request rejection', () => Promise.reject(new Error('network unavailable'))],
    ['non-zero code', () => Promise.resolve({ code: 500, message: 'error', data: null })],
    ['missing data', () => Promise.resolve({ code: 0, message: 'success', data: null })],
    ['missing status', () => Promise.resolve({ code: 0, message: 'success', data: { service: 'rag-kb-demo' } })]
  ])('shows the disconnected message for %s', async (_label, responseFactory) => {
    http.get.mockImplementation(responseFactory)

    const wrapper = mount(RepairOrders)
    await flushPromises()

    expect(wrapper.get('[data-testid="health-status"]').text()).toBe('后端服务未连接')
  })
})
