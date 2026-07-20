import request from './request.js'

const REPAIR_ORDERS_PATH = '/api/repair-orders'

export async function listRepairs(filters = {}) {
  const response = await request.get(REPAIR_ORDERS_PATH, {
    params: {
      group_code: clean(filters.groupCode),
      equipment_name: clean(filters.equipmentName),
      fault_title: clean(filters.faultTitle),
      pageNum: filters.pageNum ?? 1,
      pageSize: filters.pageSize ?? 10
    }
  })
  return normalizePage(response?.data ?? response)
}

export async function createRepair(repair) {
  const response = await request.post(REPAIR_ORDERS_PATH, {
    group_code: clean(repair.groupCode),
    equipment_name: clean(repair.equipmentName),
    fault_title: clean(repair.faultTitle),
    fault_desc: clean(repair.faultDesc)
  })
  return normalizeRepair(response?.data ?? response)
}

export async function getRepair(id) {
  const response = await request.get(`${REPAIR_ORDERS_PATH}/${id}`)
  return normalizeRepair(response?.data ?? response)
}

function normalizePage(page = {}) {
  const records = Array.isArray(page.records) ? page.records.map(normalizeRepair) : []
  return {
    records,
    total: Number(page.total ?? records.length),
    current: Number(page.current ?? 1),
    size: Number(page.size ?? 10)
  }
}

function normalizeRepair(repair = {}) {
  return {
    id: repair.id,
    groupCode: repair.group_code ?? repair.groupCode ?? '',
    equipmentName: repair.equipment_name ?? repair.equipmentName ?? '',
    faultTitle: repair.fault_title ?? repair.faultTitle ?? '',
    faultDesc: repair.fault_desc ?? repair.faultDesc ?? '',
    createdAt: repair.created_at ?? repair.createdAt ?? '',
    updatedAt: repair.updated_at ?? repair.updatedAt ?? ''
  }
}

function clean(value) {
  const normalized = typeof value === 'string' ? value.trim() : value
  return normalized || undefined
}
