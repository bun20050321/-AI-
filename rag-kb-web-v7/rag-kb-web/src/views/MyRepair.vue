<template>
  <div class="repair-page">
    <!-- Top Nav -->
    <div class="top-nav">
      <h1>&#128295; 我的维修</h1>
      <div class="nav-links">
        <router-link to="/" class="nav-link">&#127968; 首页</router-link>
        <router-link to="/repair" class="nav-link active" exact-active-class="active">&#128295; 我的维修</router-link>
        <router-link to="/orders" class="nav-link">&#128203; 维修工单</router-link>
      </div>
    </div>

    <!-- Query Area -->
    <div class="query-area">
      <div class="query-row">
        <div class="query-item">
          <label>组号 (group_code)</label>
          <input v-model="query.groupCode" type="text" class="query-input" placeholder="请输入组号" />
        </div>
        <div class="query-item">
          <label>设备名称</label>
          <input v-model="query.equipmentName" type="text" class="query-input" placeholder="请输入设备名称" />
        </div>
        <div class="query-item">
          <label>故障标题</label>
          <input v-model="query.faultTitle" type="text" class="query-input" placeholder="请输入故障标题" />
        </div>
      </div>
      <div class="query-actions">
        <button class="btn-secondary" @click="resetQuery">重置</button>
        <button class="btn-primary" @click="handleQuery">查询</button>
        <button class="btn-primary" @click="openAddModal">&#10133; 新增工单</button>
      </div>
    </div>

    <!-- List Area -->
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>工单编号</th>
            <th>设备名称</th>
            <th>故障标题</th>
            <th>维修人员</th>
            <th>维修时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in filteredList" :key="item.id" @click="openDetail(item)">
            <td><strong>{{ item.id }}</strong></td>
            <td>{{ item.equipmentName }}</td>
            <td>{{ item.faultTitle }}</td>
            <td>{{ item.repairPerson }}</td>
            <td>{{ item.repairTime }}</td>
            <td>
              <span :class="['status-badge', statusClass(item.handleResult)]">{{ statusText(item.handleResult) }}</span>
            </td>
            <td>
              <button class="btn-link" @click.stop="openDetail(item)">查看</button>
            </td>
          </tr>
          <tr v-if="filteredList.length === 0">
            <td colspan="7" class="empty-cell">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Modal -->
    <div class="modal-overlay" :class="{ active: showAddModal }" @click.self="closeAddModal">
      <div class="modal" style="width: min(560px, calc(100% - 32px));">
        <div class="modal-header">
          <h2>&#10133; 新增工单</h2>
          <button class="modal-close" @click="closeAddModal">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitOrder">
            <div class="form-row">
              <div class="form-group"><label>设备名称 <span class="required">*</span></label><input type="text" class="form-input" v-model="form.equipmentName" placeholder="请输入设备名称" required /></div>
              <div class="form-group"><label>故障标题 <span class="required">*</span></label><input type="text" class="form-input" v-model="form.faultTitle" placeholder="请输入故障标题" required /></div>
            </div>
            <div class="form-group"><label>故障现象 <span class="required">*</span></label><textarea class="form-textarea" v-model="form.faultPhenomenon" placeholder="请描述故障现象" required></textarea></div>
            <div class="form-group"><label>故障原因</label><textarea class="form-textarea" v-model="form.faultCause" placeholder="请分析故障原因"></textarea></div>
            <div class="form-group"><label>处理方式</label><textarea class="form-textarea" v-model="form.handleMethod" placeholder="请描述处理方式"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>处理结果</label>
                <select class="form-input" v-model="form.handleResult">
                  <option value="待处理">待处理</option><option value="处理中">处理中</option><option value="已完成">已完成</option>
                </select>
              </div>
              <div class="form-group"><label>维修人员 <span class="required">*</span></label><input type="text" class="form-input" v-model="form.repairPerson" placeholder="请输入维修人员" required /></div>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="closeAddModal">取消</button>
              <button type="submit" class="btn-primary" :disabled="submitting">{{ submitting ? '提交中...' : '提交' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div class="modal-overlay" :class="{ active: showDetailModal }" @click.self="closeDetailModal">
      <div class="modal" style="width: min(520px, calc(100% - 32px));">
        <div class="modal-header"><h2>&#128203; 工单详情</h2><button class="modal-close" @click="closeDetailModal">&times;</button></div>
        <div class="modal-body" v-if="currentItem">
          <div class="detail-section">
            <h4>基本信息</h4>
            <div class="detail-grid">
              <div class="detail-item"><label>工单编号</label><span>{{ currentItem.id }}</span></div>
              <div class="detail-item"><label>组号</label><span>{{ currentItem.groupCode || '-' }}</span></div>
              <div class="detail-item"><label>设备名称</label><span>{{ currentItem.equipmentName }}</span></div>
              <div class="detail-item"><label>故障标题</label><span>{{ currentItem.faultTitle }}</span></div>
              <div class="detail-item"><label>维修人员</label><span>{{ currentItem.repairPerson }}</span></div>
              <div class="detail-item"><label>维修时间</label><span>{{ currentItem.repairTime }}</span></div>
            </div>
          </div>
          <div class="detail-section">
            <h4>故障详情</h4>
            <div class="detail-item full"><label>故障现象</label><p class="detail-text">{{ currentItem.faultPhenomenon || '-' }}</p></div>
            <div class="detail-item full"><label>故障原因</label><p class="detail-text">{{ currentItem.faultCause || '-' }}</p></div>
            <div class="detail-item full"><label>处理方式</label><p class="detail-text">{{ currentItem.handleMethod || '-' }}</p></div>
            <div class="detail-item full"><label>处理结果</label><span :class="['status-badge', statusClass(currentItem.handleResult)]">{{ statusText(currentItem.handleResult) }}</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'repair_orders'

const query = ref({ groupCode: '', equipmentName: '', faultTitle: '' })
const form = ref({ equipmentName: '', faultTitle: '', faultPhenomenon: '', faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: '' })
const orderList = ref([])
const showAddModal = ref(false)
const showDetailModal = ref(false)
const currentItem = ref(null)
const submitting = ref(false)

const statusMap = { '待处理': '待处理', '处理中': '处理中', '已完成': '已完成', 'pending': '待处理', 'processing': '处理中', 'completed': '已完成' }
const statusTypeMap = { '待处理': 'pending', '处理中': 'processing', '已完成': 'completed', 'pending': 'pending', 'processing': 'processing', 'completed': 'completed' }

function statusText(val) { return statusMap[val] || val || '待处理' }
function statusClass(val) { return statusTypeMap[val] || 'pending' }

const filteredList = computed(() => {
  return orderList.value.filter(item => {
    const q = query.value
    const matchGroup = !q.groupCode || (item.groupCode || '').toLowerCase().includes(q.groupCode.toLowerCase())
    const matchEquip = !q.equipmentName || item.equipmentName.toLowerCase().includes(q.equipmentName.toLowerCase())
    const matchFault = !q.faultTitle || item.faultTitle.toLowerCase().includes(q.faultTitle.toLowerCase())
    return matchGroup && matchEquip && matchFault
  })
})

function initData() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) { orderList.value = JSON.parse(saved) }
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
function generateId() { const maxId = orderList.value.reduce((max, item) => { const num = parseInt(item.id.replace('WO-', '')); return num > max ? num : max }, 2026000); return 'WO-' + (maxId + 1) }
function getCurrentTime() { const now = new Date(); return now.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(/\//g, '-') }

function handleQuery() {}
function resetQuery() { query.value = { groupCode: '', equipmentName: '', faultTitle: '' } }

function openAddModal() { form.value = { equipmentName: '', faultTitle: '', faultPhenomenon: '', faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: '' }; showAddModal.value = true }
function closeAddModal() { showAddModal.value = false }
function submitOrder() {
  submitting.value = true
  const newOrder = { id: generateId(), groupCode: query.value.groupCode || 'DEFAULT', ...form.value, repairTime: getCurrentTime() }
  orderList.value.unshift(newOrder)
  saveData()
  submitting.value = false
  closeAddModal()
}

function openDetail(item) { currentItem.value = item; showDetailModal.value = true }
function closeDetailModal() { showDetailModal.value = false; currentItem.value = null }

onMounted(initData)
</script>

<style scoped>
.repair-page { --page: #f4f7fa; --surface: #ffffff; --text: #182635; --muted: #667789; --line: #d9e4ee; --primary: #2f6fae; --accent: #25a7d7; --success: #36a269; --warning: #f59e42; --error: #dc2626; --shadow: 0 18px 45px rgba(35, 57, 78, 0.08); min-height: 100vh; background: var(--page); font-family: "Microsoft YaHei","PingFang SC","Segoe UI",Arial,sans-serif; padding: 20px; }
.top-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; max-width: 1200px; margin-left: auto; margin-right: auto; }
.top-nav h1 { font-size: 20px; color: var(--text); display: flex; align-items: center; gap: 8px; margin: 0; }
.nav-links { display: flex; gap: 10px; }
.nav-link { font-size: 13px; padding: 8px 16px; border-radius: 8px; background: white; border: 1px solid var(--line); color: var(--primary); text-decoration: none; font-weight: 600; transition: all 0.2s; cursor: pointer; }
.nav-link:hover, .nav-link.active { background: var(--primary); color: white; border-color: var(--primary); }

.query-area { max-width: 1200px; margin: 0 auto 16px; background: white; border-radius: 12px; border: 1px solid var(--line); box-shadow: var(--shadow); padding: 16px 20px; }
.query-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px; }
.query-item { display: flex; flex-direction: column; gap: 4px; }
.query-item label { font-size: 12px; font-weight: 600; color: var(--muted); }
.query-input { min-height: 36px; padding: 0 12px; border: 1px solid #c4d5e4; border-radius: 8px; font-size: 13px; outline: none; }
.query-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,167,215,0.12); }
.query-actions { display: flex; gap: 10px; justify-content: flex-end; }

.btn-primary { min-height: 34px; padding: 0 16px; border: 0; border-radius: 8px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(47,111,174,0.25); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { min-height: 34px; padding: 0 16px; border: 1px solid var(--line); border-radius: 8px; background: #e2e8f0; color: #475569; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-secondary:hover { background: #cbd5e1; }
.btn-link { font-size: 12px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 6px; background: white; color: var(--primary); cursor: pointer; font-weight: 600; }
.btn-link:hover { background: var(--primary); color: white; }

.table-wrapper { max-width: 1200px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid var(--line); box-shadow: var(--shadow); overflow: hidden; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead th { padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--muted); background: #f8fbfe; border-bottom: 1px solid var(--line); text-transform: uppercase; letter-spacing: 0.5px; }
.data-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; cursor: pointer; }
.data-table tbody tr:hover { background: #f8fbff; }
.data-table tbody td { padding: 14px 16px; color: var(--text); }
.empty-cell { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 14px; }

.status-badge { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #cffafe; color: #0e7490; }
.status-badge.completed { background: #d1fae5; color: #065f46; }

.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal-overlay.active { display: flex; }
.modal { background: white; border-radius: 16px; width: min(520px, calc(100% - 32px)); max-height: 85vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.2); animation: modalIn 0.25s ease-out; }
@keyframes modalIn { from { opacity:0; transform:scale(0.92) translateY(16px);} to { opacity:1; transform:scale(1) translateY(0);} }
.modal-header { padding: 20px 24px 0; display: flex; align-items: center; justify-content: space-between; }
.modal-header h2 { margin: 0; font-size: 18px; color: var(--text); }
.modal-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); background: #f8fbfe; color: var(--muted); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: #fee2e2; color: var(--error); }
.modal-body { padding: 16px 24px 24px; }

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.form-group label .required { color: var(--error); }
.form-input, .form-textarea { width: 100%; min-height: 40px; padding: 0 12px; border: 1px solid #c4d5e4; border-radius: 8px; font-size: 13px; outline: none; transition: all 0.2s; }
.form-input:focus, .form-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,167,215,0.12); }
.form-textarea { min-height: 80px; padding: 10px 12px; resize: vertical; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

.detail-section { margin-bottom: 20px; }
.detail-section h4 { font-size: 13px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-item label { font-size: 11px; color: var(--muted); font-weight: 600; }
.detail-item span { font-size: 13px; color: var(--text); }
.detail-text { font-size: 13px; color: var(--text); line-height: 1.6; margin: 4px 0 0; }

@media (max-width: 768px) {
  .query-row { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .data-table { font-size: 12px; }
  .data-table tbody td { padding: 10px 8px; }
}
</style>
