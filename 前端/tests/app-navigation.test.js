import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import { routes } from '@/router'

vi.mock('@/utils/http', () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      code: 0,
      message: 'success',
      data: {
        status: 'ok',
        service: 'rag-kb-demo'
      }
    })
  }
}))

async function mountAt(path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    global: {
      plugins: [router]
    }
  })
  await flushPromises()
  return { router, wrapper }
}

describe('application navigation', () => {
  it('redirects the root route to repair orders', async () => {
    const { router, wrapper } = await mountAt('/')

    expect(router.currentRoute.value.path).toBe('/repair-orders')
    expect(wrapper.text()).toContain('电器维修知识系统')
    expect(wrapper.text()).toContain('维修工单')
  })

  it.each([
    ['/repair-orders', '维修工单'],
    ['/knowledge-docs', '知识文档'],
    ['/ai-chat', 'AI 问答']
  ])('renders %s as %s', async (path, heading) => {
    const { wrapper } = await mountAt(path)

    expect(wrapper.get('h1').text()).toBe(heading)
  })

  it('redirects unknown routes to repair orders', async () => {
    const { router } = await mountAt('/missing')

    expect(router.currentRoute.value.path).toBe('/repair-orders')
  })
})
