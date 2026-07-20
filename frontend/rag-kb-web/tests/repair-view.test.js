import ElementPlus from 'element-plus'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/api/repair.js', () => ({
  listRepairs: vi.fn(),
  createRepair: vi.fn(),
  getRepair: vi.fn()
}))

const { createRepair, getRepair, listRepairs } = await import('../src/api/repair.js')
const RepairOrders = (await import('../src/views/RepairOrders.vue')).default

describe('RepairOrders workspace', () => {
  const repair = {
    id: 1,
    groupCode: 'G01',
    equipmentName: '空压机',
    faultTitle: '无法启动',
    faultDesc: '按下按钮无响应',
    createdAt: '2026-07-20T10:00:00'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    listRepairs.mockResolvedValue({ records: [repair], total: 1, current: 1, size: 10 })
    createRepair.mockResolvedValue({ ...repair, id: 2 })
    getRepair.mockResolvedValue(repair)
  })

  it('filters, creates in a dialog, refreshes and opens details', async () => {
    const wrapper = mount(RepairOrders, { global: { plugins: [ElementPlus] } })
    await flushPromises()

    await wrapper.get('[data-testid="repair-group-code"]').setValue('G01')
    await wrapper.get('[data-testid="repair-search"]').trigger('click')
    await flushPromises()
    expect(listRepairs).toHaveBeenLastCalledWith(expect.objectContaining({ groupCode: 'G01' }))

    await wrapper.get('[data-testid="open-create-repair"]').trigger('click')
    await wrapper.get('[data-testid="repair-equipment-name"]').setValue('空压机')
    await wrapper.get('[data-testid="repair-fault-title"]').setValue('无法启动')
    await wrapper.get('[data-testid="repair-fault-desc"]').setValue('按下按钮无响应')
    await wrapper.get('[data-testid="repair-submit"]').trigger('click')
    await flushPromises()
    expect(createRepair).toHaveBeenCalledWith(expect.objectContaining({ equipmentName: '空压机', faultTitle: '无法启动' }))
    expect(listRepairs).toHaveBeenCalledTimes(3)

    await wrapper.get('[data-testid="view-repair-1"]').trigger('click')
    await flushPromises()
    expect(getRepair).toHaveBeenCalledWith(1)
    expect(wrapper.text()).toContain('按下按钮无响应')
  })
})
