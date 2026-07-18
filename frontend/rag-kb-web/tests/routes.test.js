import { describe, expect, it } from 'vitest'
import { routes } from '../src/router/routes.js'

describe('application routes', () => {
  it('exposes the three required page entries', () => {
    expect(routes.map((route) => route.meta?.label)).toEqual([
      '维修工单',
      '知识文档',
      'AI 问答'
    ])
  })

  it('uses stable paths for the three entries', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '/',
      '/documents',
      '/ai'
    ])
  })
})
