import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/api/request.js', () => ({
  default: { get: vi.fn(), post: vi.fn() }
}))

const request = (await import('../src/api/request.js')).default
const { createRepair, getRepair, listRepairs } = await import('../src/api/repair.js')

describe('repair order API', () => {
  const repair = {
    id: 1,
    group_code: 'G01',
    equipment_name: '空压机',
    fault_title: '无法启动',
    fault_desc: '按下按钮无响应',
    created_at: '2026-07-20T10:00:00'
  }

  beforeEach(() => vi.clearAllMocks())

  it('requests the paged repair endpoint with mapped filters', async () => {
    request.get.mockResolvedValueOnce({ code: 0, data: { records: [repair], total: 1, current: 2, size: 10 } })

    await expect(listRepairs({ groupCode: 'G01', equipmentName: '空压', faultTitle: '启动', pageNum: 2, pageSize: 10 }))
      .resolves.toMatchObject({ total: 1, current: 2, records: [{ equipmentName: '空压机' }] })
    expect(request.get).toHaveBeenCalledWith('/api/repair-orders', {
      params: { group_code: 'G01', equipment_name: '空压', fault_title: '启动', pageNum: 2, pageSize: 10 }
    })
  })

  it('creates and retrieves repair orders through the unified API', async () => {
    request.post.mockResolvedValueOnce({ code: 0, data: repair })
    request.get.mockResolvedValueOnce({ code: 0, data: repair })

    await expect(createRepair({ groupCode: 'G01', equipmentName: '空压机', faultTitle: '无法启动', faultDesc: '按下按钮无响应' }))
      .resolves.toMatchObject({ faultTitle: '无法启动' })
    await expect(getRepair(1)).resolves.toMatchObject({ id: 1, faultDesc: '按下按钮无响应' })
    expect(request.post).toHaveBeenCalledWith('/api/repair-orders', {
      group_code: 'G01', equipment_name: '空压机', fault_title: '无法启动', fault_desc: '按下按钮无响应'
    })
    expect(request.get).toHaveBeenCalledWith('/api/repair-orders/1')
  })
})
