<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Work orders</p>
      <h3>维修工单</h3>
      <p>工单列表、检索和处理入口</p>
    </div>

    <!-- Query Area -->
    <el-card shadow="never" class="query-card">
      <el-form :model="query" inline>
        <el-form-item label="工单编号">
          <el-input v-model="query.id" placeholder="请输入工单编号" clearable />
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="query.equipmentName" placeholder="请输入设备名称" clearable />
        </el-form-item>
        <el-form-item label="故障标题">
          <el-input v-model="query.faultTitle" placeholder="请输入故障标题" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery">查询</el-button>
          <el-button @click="resetQuery">重置</el-button>
          <el-button type="success" @click="openAddModal">+ 新增工单</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Stats Cards -->
    <el-row :gutter="16" class="stats-row">
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>待处理</template>
          <strong>{{ statPending }}</strong>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>处理中</template>
          <strong>{{ statProcessing }}</strong>
        </el-card>
      </el-col>
      <el-col :xs="24" :md="8">
        <el-card shadow="never">
          <template #header>已完成</template>
          <strong>{{ statCompleted }}</strong>
        </el-card>
      </el-col>
    </el-row>

    <!-- Table -->
    <el-card shadow="never" class="table-card">
      <el-table :data="filteredList" stripe style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="工单编号" width="140" />
        <el-table-column prop="equipmentName" label="设备名称" width="160" />
        <el-table-column prop="faultTitle" label="故障标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="repairPerson" label="维修人员" width="120" />
        <el-table-column prop="repairTime" label="维修时间" width="160" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.handleResult)" size="small">
              {{ statusText(row.handleResult) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
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
        <el-form-item label="处理结果">
          <el-select v-model="form.handleResult" placeholder="请选择">
            <el-option label="待处理" value="待处理" />
            <el-option label="处理中" value="处理中" />
            <el-option label="已完成" value="已完成" />
          </el-select>
        </el-form-item>
        <el-form-item label="维修人员" required>
          <el-input v-model="form.repairPerson" placeholder="请输入维修人员" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeAddModal">取消</el-button>
        <el-button type="primary" @click="submitOrder" :loading="submitting">提交</el-button>
      </template>
    </el-dialog>

    <!-- Detail Modal -->
    <el-dialog v-model="showDetailModal" title="工单详情" width="520px" destroy-on-close>
      <div v-if="currentItem" class="detail-content">
        <div class="detail-section">
          <h4>基本信息</h4>
          <div class="detail-grid">
            <div class="detail-item"><label>工单编号</label><span>{{ currentItem.id }}</span></div>
            <div class="detail-item"><label>设备名称</label><span>{{ currentItem.equipmentName }}</span></div>
            <div class="detail-item"><label>故障标题</label><span>{{ currentItem.faultTitle }}</span></div>
            <div class="detail-item"><label>维修人员</label><span>{{ currentItem.repairPerson }}</span></div>
            <div class="detail-item"><label>维修时间</label><span>{{ currentItem.repairTime }}</span></div>
            <div class="detail-item"><label>状态</label>
              <el-tag :type="statusType(currentItem.handleResult)" size="small">
                {{ statusText(currentItem.handleResult) }}
              </el-tag>
            </div>
          </div>
        </div>
        <div class="detail-section">
          <h4>故障详情</h4>
          <div class="detail-item full"><label>故障现象</label><p>{{ currentItem.faultPhenomenon || '-' }}</p></div>
          <div class="detail-item full"><label>故障原因</label><p>{{ currentItem.faultCause || '-' }}</p></div>
          <div class="detail-item full"><label>处理方式</label><p>{{ currentItem.handleMethod || '-' }}</p></div>
        </div>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'repair_orders'
const loading = ref(false)

// Query
const query = ref({ id: '', equipmentName: '', faultTitle: '' })

// Form
const form = ref({
  equipmentName: '', faultTitle: '', faultPhenomenon: '',
  faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: ''
})

// Data
const orderList = ref([])
const showAddModal = ref(false)
const showDetailModal = ref(false)
const currentItem = ref(null)
const submitting = ref(false)

// Status map - 中英文都映射为中文
const statusMap = {
  '待处理': '待处理',
  '处理中': '处理中',
  '已完成': '已完成',
  'pending': '待处理',
  'processing': '处理中',
  'completed': '已完成'
}

const statusTypeMap = {
  '待处理': 'warning',
  '处理中': 'primary',
  '已完成': 'success',
  'pending': 'warning',
  'processing': 'primary',
  'completed': 'success'
}

function statusText(val) {
  return statusMap[val] || val || '待处理'
}

function statusType(val) {
  return statusTypeMap[val] || 'info'
}

// Stats
const statPending = computed(() => orderList.value.filter(i => {
  const s = i.handleResult
  return s === '待处理' || s === 'pending'
}).length)

const statProcessing = computed(() => orderList.value.filter(i => {
  const s = i.handleResult
  return s === '处理中' || s === 'processing'
}).length)

const statCompleted = computed(() => orderList.value.filter(i => {
  const s = i.handleResult
  return s === '已完成' || s === 'completed'
}).length)

// Filtered list
const filteredList = computed(() => {
  return orderList.value.filter(item => {
    const qId = query.value.id.trim().toLowerCase()
    const qEquip = query.value.equipmentName.trim().toLowerCase()
    const qFault = query.value.faultTitle.trim().toLowerCase()
    const matchId = !qId || item.id.toLowerCase().includes(qId)
    const matchEquip = !qEquip || item.equipmentName.toLowerCase().includes(qEquip)
    const matchFault = !qFault || item.faultTitle.toLowerCase().includes(qFault)
    return matchId && matchEquip && matchFault
  })
})

// Init
function initData() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    orderList.value = JSON.parse(saved)
  } else {
    orderList.value = [
      { id: 'WO-2026001', equipmentName: '滚筒洗衣机 W9', faultTitle: '不进水，显示E1错误', faultPhenomenon: '开机后进水阀无反应', faultCause: '进水阀电磁铁损坏', handleMethod: '更换进水阀', handleResult: '已完成', repairPerson: '张师傅', repairTime: '2026-07-15 14:30' },
      { id: 'WO-2026002', equipmentName: '智能冰箱 F3', faultTitle: '制冷效果差', faultPhenomenon: '内部温度偏高', faultCause: '冷凝器灰尘过多', handleMethod: '清洁冷凝器', handleResult: '已完成', repairPerson: '李师傅', repairTime: '2026-07-16 09:00' },
      { id: 'WO-2026003', equipmentName: '变频空调 G8', faultTitle: '不制冷，显示E1', faultPhenomenon: '无冷风输出', faultCause: '通信线路接触不良', handleMethod: '检查通信线路', handleResult: '处理中', repairPerson: '王师傅', repairTime: '2026-07-18 10:00' },
      { id: 'WO-2026004', equipmentName: '空气炸锅 K7', faultTitle: '设备无法启动', faultPhenomenon: '插电后无反应', faultCause: '电源开关触点氧化', handleMethod: '更换电源开关', handleResult: '待处理', repairPerson: '赵师傅', repairTime: '2026-07-20 08:30' },
      { id: 'WO-2026005', equipmentName: '微波炉 M3', faultTitle: '加热不均匀', faultPhenomenon: '部分区域未加热', faultCause: '磁控管老化', handleMethod: '更换磁控管', handleResult: '待处理', repairPerson: '刘师傅', repairTime: '2026-07-21 13:00' }
    ]
    saveData()
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orderList.value))
}

function generateId() {
  const maxId = orderList.value.reduce((max, item) => {
    const num = parseInt(item.id.replace('WO-', ''))
    return num > max ? num : max
  }, 2026000)
  return 'WO-' + (maxId + 1)
}

function getCurrentTime() {
  const now = new Date()
  return now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-')
}

// Query
function handleQuery() {
  // reactive auto-update
}

function resetQuery() {
  query.value = { id: '', equipmentName: '', faultTitle: '' }
}

// Add
function openAddModal() {
  form.value = { equipmentName: '', faultTitle: '', faultPhenomenon: '', faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: '' }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function submitOrder() {
  if (!form.value.equipmentName || !form.value.faultTitle || !form.value.faultPhenomenon || !form.value.repairPerson) {
    return
  }
  submitting.value = true
  const newOrder = {
    id: generateId(),
    ...form.value,
    repairTime: getCurrentTime()
  }
  orderList.value.unshift(newOrder)
  saveData()
  submitting.value = false
  closeAddModal()
}

// Detail
function openDetail(item) {
  currentItem.value = item
  showDetailModal.value = true
}

onMounted(initData)
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
</style>
