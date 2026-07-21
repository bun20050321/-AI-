<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Work orders</p>
      <h3>维修工单</h3>
      <p>工单列表、检索和处理入口（员工权限）</p>
    </div>

    <!-- Query Area -->
    <el-card shadow="never" class="query-card">
      <el-row :gutter="12">
        <el-col :xs="24" :sm="12" :md="6">
          <el-input v-model="queryForm.id" placeholder="工单编号" clearable />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-input v-model="queryForm.groupCode" placeholder="组号 group_code" clearable />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-input v-model="queryForm.equipmentName" placeholder="设备名称" clearable />
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <el-input v-model="queryForm.faultTitle" placeholder="故障标题" clearable />
        </el-col>
      </el-row>
      <el-row style="margin-top: 12px;" justify="end">
        <el-button @click="resetQuery">重置</el-button>
        <el-button type="primary" @click="doQuery">查询</el-button>
        <el-button type="success" @click="openAddModal">+ 新增工单</el-button>
      </el-row>
    </el-card>

    <!-- Stats Cards -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="24" :md="8">
        <el-card shadow="never"><template #header>待处理</template><strong>{{ statPending }}</strong></el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never"><template #header>处理中</template><strong>{{ statProcessing }}</strong></el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never"><template #header>已完成</template><strong>{{ statCompleted }}</strong></el-card>
      </el-col>
    </el-row>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table :data="filteredList" stripe style="width: 100%" empty-text="暂无数据">
        <el-table-column prop="id" label="工单编号" width="130" />
        <el-table-column prop="groupCode" label="组号" width="90" />
        <el-table-column prop="equipmentName" label="设备名称" width="140" />
        <el-table-column prop="faultTitle" label="故障标题" min-width="160" show-overflow-tooltip />
        <el-table-column prop="repairPerson" label="维修人员" width="100" />
        <el-table-column prop="repairTime" label="维修时间" width="150" />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="statusType(row.handleResult)" size="small">{{ statusText(row.handleResult) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <el-button link type="success" size="small" :loading="indexingIds.has(row.id)" @click="createKnowledgeIndex(row)">生成知识索引</el-button>
            <el-button link type="danger" size="small" @click="deleteOrder(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-bar">
        <span class="page-info">共 {{ filteredList.length }} 条</span>
      </div>
    </el-card>

    <!-- Add Modal -->
    <el-dialog v-model="showAddModal" title="新增工单" width="560px" destroy-on-close>
      <el-form :model="form" label-width="100px">
        <el-form-item label="设备名称" required>
          <el-input v-model="form.equipmentName" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="故障标题" required>
          <el-input v-model="form.faultTitle" placeholder="请输入故障标题" />
        </el-form-item>
        <el-form-item label="故障现象" required>
          <el-input v-model="form.faultPhenomenon" type="textarea" :rows="3" placeholder="请描述故障现象" />
        </el-form-item>
        <el-form-item label="故障原因">
          <el-input v-model="form.faultCause" type="textarea" :rows="2" placeholder="请分析故障原因" />
        </el-form-item>
        <el-form-item label="处理方式">
          <el-input v-model="form.handleMethod" type="textarea" :rows="2" placeholder="请描述处理方式" />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="处理结果">
              <el-select v-model="form.handleResult" placeholder="请选择" style="width: 100%">
                <el-option label="待处理" value="待处理" />
                <el-option label="处理中" value="处理中" />
                <el-option label="已完成" value="已完成" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="维修人员" required>
              <el-input v-model="form.repairPerson" placeholder="维修人员姓名" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="closeAddModal">取消</el-button>
        <el-button type="primary" @click="submitOrder" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- Index Management -->
    <el-card shadow="never" class="table-card" style="margin-top: 16px;">
      <template #header>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 14px; font-weight: 600;">&#128218; 知识索引管理</span>
          <span style="font-size: 12px; color: #64748b;">共 {{ indexRecords.length }} 条索引记录</span>
        </div>
      </template>
      <el-table :data="indexRecords" stripe style="width: 100%" empty-text="暂无索引记录，请在上方工单列表中点击「生成知识索引」">
        <el-table-column prop="orderId" label="工单编号" width="130" />
        <el-table-column prop="equipmentName" label="设备名称" width="140" />
        <el-table-column prop="faultTitle" label="故障标题" min-width="140" show-overflow-tooltip />
        <el-table-column prop="document_id" label="文档 ID" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="id-code">{{ row.document_id || '-' }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="chunk_id" label="分片 ID" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="id-code">{{ row.chunk_id || '-' }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="es_doc_id" label="ES 文档 ID" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="id-code">{{ row.es_doc_id || '-' }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'info'" size="small">{{ row.status || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="生成时间" width="150" />
        <el-table-column label="操作" width="90" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" size="small" @click="deleteIndexRecord(row.orderId)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Index Result Modal -->
    <el-dialog v-model="showIndexModal" title="知识索引生成结果" width="480px" destroy-on-close @closed="closeIndexModal">
      <div v-if="indexResult" class="index-result-content">
        <el-alert type="success" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            <span style="font-size: 13px;">该维修工单已经转换为知识分片，并写入 Elasticsearch。</span>
          </template>
        </el-alert>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="文档 ID (document_id)">
            <code style="font-size: 12px;">{{ indexResult.document_id || '-' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="分片 ID (chunk_id)">
            <code style="font-size: 12px;">{{ indexResult.chunk_id || '-' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="ES 文档 ID (es_doc_id)">
            <code style="font-size: 12px;">{{ indexResult.es_doc_id || '-' }}</code>
          </el-descriptions-item>
          <el-descriptions-item label="状态 (status)">
            <el-tag :type="indexResult.status === 'success' ? 'success' : 'info'" size="small">{{ indexResult.status || '-' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- Detail Modal -->
    <el-dialog v-model="showDetailModal" title="工单详情" width="520px" destroy-on-close>
      <div v-if="currentItem" class="detail-content">
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item"><label>工单编号</label><span>{{ currentItem.id }}</span></div>
            <div class="detail-item"><label>组号</label><span>{{ currentItem.groupCode || '-' }}</span></div>
            <div class="detail-item"><label>设备名称</label><span>{{ currentItem.equipmentName }}</span></div>
            <div class="detail-item"><label>故障标题</label><span>{{ currentItem.faultTitle }}</span></div>
            <div class="detail-item"><label>维修人员</label><span>{{ currentItem.repairPerson }}</span></div>
            <div class="detail-item"><label>维修时间</label><span>{{ currentItem.repairTime }}</span></div>
            <div class="detail-item"><label>状态</label>
              <el-tag :type="statusType(currentItem.handleResult)" size="small">{{ statusText(currentItem.handleResult) }}</el-tag>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h4>故障详情</h4>
          <div class="detail-item full"><label>故障现象</label><p>{{ currentItem.faultPhenomenon || '-' }}</p></div>
          <div class="detail-item full"><label>故障原因</label><p>{{ currentItem.faultCause || '-' }}</p></div>
          <div class="detail-item full"><label>处理方式</label><p>{{ currentItem.handleMethod || '-' }}</p></div>
        </div>
        <!-- Status Edit -->
        <div class="detail-section">
          <h4>状态管理</h4>
          <el-row :gutter="12" align="middle">
            <el-col :span="10">
              <span style="font-size: 12px; color: #64748b;">当前：</span>
              <el-tag :type="statusType(currentItem.handleResult)" size="small">{{ statusText(currentItem.handleResult) }}</el-tag>
            </el-col>
            <el-col :span="14">
              <el-select v-model="editStatus" placeholder="修改状态" size="small" style="width: 120px;">
                <el-option label="待处理" value="待处理" />
                <el-option label="处理中" value="处理中" />
                <el-option label="已完成" value="已完成" />
              </el-select>
              <el-button type="primary" size="small" @click="updateStatus" :disabled="editStatus === currentItem.handleResult || !editStatus" style="margin-left: 8px;">更新</el-button>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeMount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuth } from '@/composables/useAuth.js'

const router = useRouter()
const { isStaff } = useAuth()

// 权限守卫
onBeforeMount(() => {
  if (!isStaff.value) {
    ElMessage.warning('维修工单页面仅对员工开放')
    router.replace('/')
  }
})

const STORAGE_KEY = 'repair_orders'
const INDEX_STORAGE_KEY = 'knowledge_index_records'

// ===== 查询表单（输入即搜索，实时过滤）=====
const queryForm = ref({ id: '', groupCode: '', equipmentName: '', faultTitle: '' })

// ===== 新增表单 =====
const form = ref({ equipmentName: '', faultTitle: '', faultPhenomenon: '', faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: '' })

// ===== 数据 =====
const orderList = ref([])
const showAddModal = ref(false)
const showDetailModal = ref(false)
const currentItem = ref(null)
const editStatus = ref('')
const submitting = ref(false)

// ===== 知识索引 =====
const indexingIds = ref(new Set())
const showIndexModal = ref(false)
const indexResult = ref(null)
const indexRecords = ref([])

// ===== 状态映射 =====
const statusMap = { '待处理': '待处理', '处理中': '处理中', '已完成': '已完成', 'pending': '待处理', 'processing': '处理中', 'completed': '已完成' }
const statusTypeMap = { '待处理': 'warning', '处理中': 'primary', '已完成': 'success', 'pending': 'warning', 'processing': 'primary', 'completed': 'success' }
function statusText(val) { return statusMap[val] || val || '待处理' }
function statusType(val) { return statusTypeMap[val] || 'info' }

// ===== 统计 =====
const statPending = computed(() => orderList.value.filter(i => i.handleResult === '待处理' || i.handleResult === 'pending').length)
const statProcessing = computed(() => orderList.value.filter(i => i.handleResult === '处理中' || i.handleResult === 'processing').length)
const statCompleted = computed(() => orderList.value.filter(i => i.handleResult === '已完成' || i.handleResult === 'completed').length)

// ===== 过滤列表（输入即搜索，基于 queryForm 实时过滤）=====
const filteredList = computed(() => {
  const q = queryForm.value
  const hasQuery = q.id || q.groupCode || q.equipmentName || q.faultTitle
  if (!hasQuery) return orderList.value

  return orderList.value.filter(item => {
    const itemId = String(item.id || '').toLowerCase()
    const queryId = q.id.trim().toLowerCase()
    if (queryId && !itemId.includes(queryId)) return false

    const itemGroupCode = String(item.groupCode || '').toLowerCase()
    const queryGroupCode = q.groupCode.trim().toLowerCase()
    if (queryGroupCode && !itemGroupCode.includes(queryGroupCode)) return false

    const itemEquipmentName = String(item.equipmentName || '').toLowerCase()
    const queryEquipmentName = q.equipmentName.trim().toLowerCase()
    if (queryEquipmentName && !itemEquipmentName.includes(queryEquipmentName)) return false

    const itemFaultTitle = String(item.faultTitle || '').toLowerCase()
    const queryFaultTitle = q.faultTitle.trim().toLowerCase()
    if (queryFaultTitle && !itemFaultTitle.includes(queryFaultTitle)) return false

    return true
  })
})

// ===== 数据初始化 =====
function initData() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    orderList.value = JSON.parse(saved)
    // 迁移旧数据，修复缺失的 groupCode
    if (migrateData(orderList.value)) saveData()
  }
  else {
    orderList.value = [
      { id: 'WO-2026001', groupCode: 'G001', equipmentName: '滚筒洗衣机 W9', faultTitle: '不进水，显示E1错误', faultPhenomenon: '开机后进水阀无反应', faultCause: '进水阀电磁铁损坏', handleMethod: '更换进水阀', handleResult: '已完成', repairPerson: '张师傅', repairTime: '2026-07-15 14:30' },
      { id: 'WO-2026002', groupCode: 'G002', equipmentName: '智能冰箱 F3', faultTitle: '制冷效果差', faultPhenomenon: '内部温度偏高', faultCause: '冷凝器灰尘过多', handleMethod: '清洁冷凝器', handleResult: '已完成', repairPerson: '李师傅', repairTime: '2026-07-16 09:00' },
      { id: 'WO-2026003', groupCode: 'G001', equipmentName: '变频空调 G8', faultTitle: '不制冷，显示E1', faultPhenomenon: '无冷风输出', faultCause: '通信线路接触不良', handleMethod: '检查通信线路', handleResult: '处理中', repairPerson: '王师傅', repairTime: '2026-07-18 10:00' },
      { id: 'WO-2026004', groupCode: 'G003', equipmentName: '空气炸锅 K7', faultTitle: '设备无法启动', faultPhenomenon: '插电后无反应', faultCause: '电源开关触点氧化', handleMethod: '更换电源开关', handleResult: '待处理', repairPerson: '赵师傅', repairTime: '2026-07-20 08:30' },
      { id: 'WO-2026005', groupCode: 'G002', equipmentName: '微波炉 M3', faultTitle: '加热不均匀', faultPhenomenon: '部分区域未加热', faultCause: '磁控管老化', handleMethod: '更换磁控管', handleResult: '待处理', repairPerson: '刘师傅', repairTime: '2026-07-21 13:00' }
    ]
    saveData()
  }
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(orderList.value)) }

// 数据迁移：修复旧数据中可能缺失的 groupCode
function migrateData(list) {
  let changed = false
  list.forEach(item => {
    if (!item.groupCode) {
      const name = String(item.equipmentName || '').toLowerCase()
      if (name.includes('空调') || name.includes('ac')) item.groupCode = 'G-AIR'
      else if (name.includes('洗衣机') || name.includes('washer')) item.groupCode = 'G-WASH'
      else if (name.includes('冰箱') || name.includes('fridge')) item.groupCode = 'G-FRIDGE'
      else if (name.includes('电饭煲') || name.includes('rice')) item.groupCode = 'G-RICE'
      else if (name.includes('微波炉') || name.includes('micro')) item.groupCode = 'G-MW'
      else if (name.includes('炸锅')) item.groupCode = 'G-AIRFRY'
      else item.groupCode = 'G-OTHER'
      changed = true
    }
  })
  return changed
}
function generateId() { const maxId = orderList.value.reduce((max, item) => { const num = parseInt(item.id.replace('WO-', '')); return num > max ? num : max }, 2026000); return 'WO-' + (maxId + 1) }
function getCurrentTime() { const now = new Date(); return now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') }

// ===== 查询 =====
function doQuery() {
  // 输入即搜索已自动过滤，点击查询给用户反馈
  ElMessage.success('查询完成，共 ' + filteredList.value.length + ' 条结果')
}
function resetQuery() {
  queryForm.value = { id: '', groupCode: '', equipmentName: '', faultTitle: '' }
}

// ===== 新增 =====
function openAddModal() { form.value = { equipmentName: '', faultTitle: '', faultPhenomenon: '', faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: '' }; showAddModal.value = true }
function closeAddModal() { showAddModal.value = false }
// 根据设备名称推断组号
function inferGroupCode(equipmentName) {
  const name = String(equipmentName || '').toLowerCase()
  if (name.includes('空调') || name.includes('ac')) return 'G-AIR'
  if (name.includes('洗衣机') || name.includes('washer')) return 'G-WASH'
  if (name.includes('冰箱') || name.includes('fridge')) return 'G-FRIDGE'
  if (name.includes('电饭煲') || name.includes('rice')) return 'G-RICE'
  if (name.includes('微波炉') || name.includes('micro')) return 'G-MW'
  if (name.includes('炸锅')) return 'G-AIRFRY'
  return 'G-OTHER'
}

function submitOrder() {
  if (!form.value.equipmentName || !form.value.faultTitle || !form.value.faultPhenomenon || !form.value.repairPerson) return
  submitting.value = true
  const groupCode = inferGroupCode(form.value.equipmentName)
  const newOrder = { id: generateId(), groupCode, ...form.value, repairTime: getCurrentTime() }
  orderList.value.unshift(newOrder)
  saveData()
  submitting.value = false
  closeAddModal()
}

// ===== 详情 + 状态修改 =====
function openDetail(item) { currentItem.value = item; editStatus.value = item.handleResult || '待处理'; showDetailModal.value = true }
function updateStatus() {
  if (!currentItem.value || !editStatus.value || editStatus.value === currentItem.value.handleResult) return
  const idx = orderList.value.findIndex(i => i.id === currentItem.value.id)
  if (idx > -1) {
    orderList.value[idx].handleResult = editStatus.value
    currentItem.value.handleResult = editStatus.value
    saveData()
    ElMessage.success('状态已更新为「' + statusText(editStatus.value) + '」')
  }
}

// ===== 生成知识索引 =====
async function createKnowledgeIndex(row) {
  if (indexingIds.value.has(row.id)) return
  indexingIds.value.add(row.id)
  try {
    const res = await fetch('/api/repair-orders/' + row.id + '/index', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || err.error || '索引生成失败')
    }
    const result = await res.json()
    indexResult.value = result
    // 保存索引记录到管理列表
    addIndexRecord(row, result)
    showIndexModal.value = true
    ElMessage.success('知识索引生成成功')
  } catch (e) {
    ElMessage.error(e.message || '请求失败，请稍后重试')
  } finally {
    indexingIds.value.delete(row.id)
  }
}
function closeIndexModal() { showIndexModal.value = false; indexResult.value = null }

// ===== 索引记录管理 =====
function loadIndexRecords() {
  const saved = localStorage.getItem(INDEX_STORAGE_KEY)
  indexRecords.value = saved ? JSON.parse(saved) : []
}
function saveIndexRecords() { localStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(indexRecords.value)) }
function addIndexRecord(row, result) {
  const idx = indexRecords.value.findIndex(r => r.orderId === row.id)
  const record = {
    orderId: row.id,
    equipmentName: row.equipmentName || '',
    faultTitle: row.faultTitle || '',
    document_id: result.document_id || '',
    chunk_id: result.chunk_id || '',
    es_doc_id: result.es_doc_id || '',
    status: result.status || 'success',
    createdAt: getCurrentTime()
  }
  if (idx > -1) { indexRecords.value[idx] = record }
  else { indexRecords.value.unshift(record) }
  saveIndexRecords()
}
function deleteIndexRecord(orderId) {
  ElMessageBox.confirm('确定要删除该索引记录吗？此操作仅删除本地记录，不影响 ES 中的索引。', '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    .then(() => {
      const idx = indexRecords.value.findIndex(r => r.orderId === orderId)
      if (idx > -1) { indexRecords.value.splice(idx, 1); saveIndexRecords(); ElMessage.success('索引记录已删除') }
    })
    .catch(() => {})
}

// ===== 删除 =====
function deleteOrder(id) {
  ElMessageBox.confirm('确定要删除该工单吗？此操作不可恢复。', '确认删除', { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' })
    .then(() => {
      const idx = orderList.value.findIndex(i => i.id === id)
      if (idx > -1) { orderList.value.splice(idx, 1); saveData(); ElMessage.success('已删除') }
    })
    .catch(() => {})
}

onMounted(() => { initData(); loadIndexRecords() })
</script>

<style scoped>
.eyebrow { margin: 0 0 4px; color: #1c785f; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.query-card { margin-bottom: 16px; }
.stats-row { margin-bottom: 16px; }
.stats-row strong { display: block; color: #1c785f; font-size: 34px; line-height: 1; }
.table-card { margin-bottom: 16px; }
.pagination-bar { margin-top: 12px; display: flex; justify-content: flex-end; }
.page-info { font-size: 12px; color: #64748b; }

.detail-content { font-size: 13px; }
.detail-section { margin-bottom: 16px; }
.detail-section h4 { font-size: 13px; color: #64748b; font-weight: 700; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #e4e7ed; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-item label { font-size: 11px; color: #64748b; font-weight: 600; }
.detail-item span, .detail-item p { font-size: 13px; color: #1f2937; margin: 0; }

.index-result-content { font-size: 13px; }
.index-result-content code { background: #f5f7fa; padding: 2px 6px; border-radius: 4px; word-break: break-all; }

.id-code { background: #f5f7fa; padding: 1px 4px; border-radius: 3px; font-size: 11px; color: #1f2937; word-break: break-all; }
</style>
