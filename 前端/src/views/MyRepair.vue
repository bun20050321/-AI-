<template>
  <div class="repair-page">
    <!-- Top Navigation -->
    <div class="top-nav">
      <h1>&#128295; 我的维修</h1>
      <div class="nav-links">
        <router-link to="/" class="nav-link">&#128100; 用户端</router-link>
        <router-link to="/repair" class="nav-link active" exact-active-class="active">&#128295; 我的维修</router-link>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-bar">
      <div class="summary-card all">
        <div class="summary-value">{{ statAll }}</div>
        <div class="summary-label">全部工单</div>
      </div>
      <div class="summary-card pending">
        <div class="summary-value">{{ statPending }}</div>
        <div class="summary-label">待处理</div>
      </div>
      <div class="summary-card completed">
        <div class="summary-value">{{ statCompleted }}</div>
        <div class="summary-label">已结束</div>
      </div>
    </div>

    <!-- Repair List -->
    <div class="list-panel">
      <div class="list-header">
        <h2>&#128203; 我的维修工单</h2>
        <span class="list-count">共 {{ appointments.length }} 条</span>
      </div>
      <div class="repair-list" v-if="appointments.length > 0">
        <div v-for="a in sortedAppointments" :key="a.id" class="repair-item">
          <div class="repair-info">
            <h4>{{ a.applianceModel || '-' }} <span style="font-size:12px;color:var(--muted);font-weight:500;">#{{ a.id || '-' }}</span></h4>
            <div class="repair-meta">
              <span>&#128205; {{ a.userAddress || '-' }}</span>
              <span>&#128172; {{ truncate(a.faultDescription, 30) }}</span>
            </div>
          </div>
          <div class="repair-time">
            <div class="time-label">预约时间</div>
            <div class="time-value" v-html="formatTime(a)"></div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="repair-status">
              <span :class="['status-badge', statusClass(a.status)]">{{ statusLabel(a.status) }}</span>
            </div>
            <button class="detail-btn" @click="openDetail(a.id)">详情</button>
          </div>
        </div>
      </div>
      <!-- Empty State -->
      <div v-else class="empty-state">
        <div class="icon">&#128221;</div>
        <h3>暂无维修工单</h3>
        <p>您还没有提交过维修预约</p>
        <router-link to="/" class="go-home">&#127968; 前往提交报修</router-link>
      </div>
    </div>

    <footer><p>家电说明书助手 · 我的维修 · 用户个人工单管理</p></footer>

    <!-- Detail Modal -->
    <div class="modal-overlay" :class="{ active: detailModalOpen }" @click.self="closeDetailModal">
      <div class="modal" v-if="currentAppt">
        <div class="modal-header">
          <span style="font-size:22px;">&#128295;</span>
          <h2>工单详情 #{{ currentAppt.id }}</h2>
          <button class="modal-close" @click="closeDetailModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h4>工单信息</h4>
            <div class="detail-grid">
              <div class="detail-item"><label>工单编号</label><span>#{{ currentAppt.id || '-' }}</span></div>
              <div class="detail-item"><label>当前状态</label><span :class="['status-badge', statusClass(currentAppt.status)]">{{ statusLabel(currentAppt.status) }}</span></div>
              <div class="detail-item"><label>报修电器</label><span>{{ currentAppt.applianceModel || '-' }}</span></div>
              <div class="detail-item"><label>预约上门</label><span v-html="formatTime(currentAppt)"></span></div>
            </div>
          </div>
          <div class="detail-section">
            <h4>联系信息</h4>
            <div class="detail-grid">
              <div class="detail-item"><label>姓名</label><span>{{ currentAppt.userName || '-' }}</span></div>
              <div class="detail-item"><label>电话</label><span>{{ currentAppt.userPhone || '-' }}</span></div>
              <div class="detail-item full"><label>地址</label><span>{{ currentAppt.userAddress || '-' }}</span></div>
            </div>
          </div>
          <div class="detail-section">
            <h4>故障信息</h4>
            <div class="detail-grid">
              <div class="detail-item full"><label>故障描述</label><span>{{ currentAppt.faultDescription || '-' }}</span></div>
              <div class="detail-item full"><label>AI 诊断记录</label><div class="ai-diag">{{ currentAppt.aiDiagnosis || '无记录' }}</div></div>
            </div>
          </div>
          <div class="detail-section">
            <h4>进度追踪</h4>
            <div class="detail-grid">
              <div class="detail-item"><label>提交时间</label><span>{{ formatDate(currentAppt.createdAt) }}</span></div>
              <div class="detail-item"><label>最后更新</label><span>{{ formatDate(currentAppt.updatedAt) }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { statusLabels, statusClasses } from '@/data/manuals.js'

const appointments = ref([])
const detailModalOpen = ref(false)
const currentAppt = ref(null)

const statAll = computed(() => appointments.value.length)
const statPending = computed(() => appointments.value.filter(a => ['pending', 'confirmed', 'assigned', 'processing'].includes(a.status)).length)
const statCompleted = computed(() => appointments.value.filter(a => a.status === 'completed').length)

const sortedAppointments = computed(() => [...appointments.value].sort((a, b) => (b.id || 0) - (a.id || 0)))

function statusClass(status) { return statusClasses[status] || 'pending' }
function statusLabel(status) { return statusLabels[status] || status }

function truncate(text, len) {
  if (!text) return '-'
  return text.length > len ? text.substring(0, len) + '...' : text
}

function formatTime(a) {
  if (!a.preferredDate) return '<span style="color:var(--muted)">未指定</span>'
  const timeMap = { morning: '上午', afternoon: '下午', evening: '晚上' }
  return a.preferredDate + ' ' + (timeMap[a.preferredTime] || '')
}

function formatDate(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN')
}

function openDetail(id) {
  const a = appointments.value.find(x => x.id === id)
  if (!a) return
  currentAppt.value = a
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
  currentAppt.value = null
}

async function loadAppointments() {
  // Try API first
  try {
    const res = await fetch('http://localhost:3000/api/repair/my', {
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      appointments.value = await res.json()
      return
    }
  } catch (e) {}
  // Fallback: localStorage
  appointments.value = JSON.parse(localStorage.getItem('repair_appointments') || '[]')
}

onMounted(loadAppointments)
</script>

<style scoped>
.repair-page {
  --page: #f4f7fa; --surface: #ffffff; --text: #182635; --muted: #667789;
  --line: #d9e4ee; --primary: #2f6fae; --accent: #25a7d7;
  --success: #36a269; --warning: #f59e42; --error: #dc2626;
  --shadow: 0 18px 45px rgba(35, 57, 78, 0.08);
  background: var(--page);
  min-height: 100vh;
  font-family: "Microsoft YaHei","PingFang SC","Segoe UI",Arial,sans-serif;
  padding: 24px 0;
}

.top-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; padding: 0 4px;
  max-width: min(1200px, calc(100% - 32px)); margin-left: auto; margin-right: auto;
}
.top-nav h1 { font-size: 20px; display: flex; align-items: center; gap: 8px; color: var(--text); }
.nav-links { display: flex; gap: 10px; }
.nav-link {
  font-size: 13px; padding: 8px 16px; border-radius: 8px;
  background: white; border: 1px solid var(--line);
  color: var(--primary); text-decoration: none; font-weight: 600;
  transition: all 0.2s; cursor: pointer;
}
.nav-link:hover, .nav-link.active { background: var(--primary); color: white; border-color: var(--primary); }

.summary-bar {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  margin-bottom: 24px;
  max-width: min(1200px, calc(100% - 32px)); margin-left: auto; margin-right: auto;
}
.summary-card {
  padding: 20px; border-radius: 12px; border: 1px solid var(--line);
  background: white; box-shadow: var(--shadow); text-align: center; transition: transform 0.2s;
}
.summary-card:hover { transform: translateY(-2px); }
.summary-value { font-size: 32px; font-weight: 700; margin-bottom: 4px; }
.summary-label { font-size: 13px; color: var(--muted); font-weight: 600; }
.summary-card.all .summary-value { color: var(--primary); }
.summary-card.pending .summary-value { color: var(--warning); }
.summary-card.completed .summary-value { color: var(--success); }

.list-panel {
  background: white; border-radius: 12px; border: 1px solid var(--line);
  box-shadow: var(--shadow); overflow: hidden;
  max-width: min(1200px, calc(100% - 32px)); margin-left: auto; margin-right: auto;
}
.list-header {
  padding: 18px 24px; border-bottom: 1px solid var(--line);
  background: linear-gradient(135deg,#fbfdff,#f5faff);
  display: flex; align-items: center; justify-content: space-between;
}
.list-header h2 { font-size: 16px; margin: 0; color: var(--text); }
.list-count { font-size: 12px; color: var(--muted); font-weight: 600; }

.repair-item {
  padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s; display: grid;
  grid-template-columns: 1fr auto auto; gap: 16px; align-items: center;
}
.repair-item:last-child { border-bottom: 0; }
.repair-item:hover { background: #f8fbff; }
.repair-info h4 { font-size: 15px; margin: 0 0 6px; display: flex; align-items: center; gap: 8px; color: var(--text); }
.repair-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: var(--muted); }
.repair-meta span { display: flex; align-items: center; gap: 4px; }
.repair-time { text-align: center; min-width: 140px; }
.time-label { font-size: 11px; color: var(--muted); font-weight: 600; margin-bottom: 4px; }
.time-value { font-size: 13px; color: var(--text); font-weight: 500; }
.status-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600;
}
.status-badge.pending { background: #fef3c7; color: #92400e; }
.status-badge.processing { background: #cffafe; color: #0e7490; }
.status-badge.completed { background: #d1fae5; color: #065f46; }
.status-badge.cancelled { background: #fee2e2; color: #991b1b; }
.detail-btn {
  font-size: 12px; padding: 6px 14px; border-radius: 8px;
  border: 1px solid var(--line); background: white;
  color: var(--primary); cursor: pointer; font-weight: 600;
  transition: all 0.15s; margin-left: 8px;
}
.detail-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-state .icon { font-size: 56px; margin-bottom: 16px; }
.empty-state h3 { font-size: 16px; color: var(--text); margin-bottom: 8px; }
.empty-state p { font-size: 13px; color: var(--muted); margin-bottom: 20px; }
.go-home {
  display: inline-block; padding: 10px 24px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  color: white; text-decoration: none; border-radius: 8px;
  font-size: 13px; font-weight: 600; transition: all 0.2s;
}
.go-home:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(47,111,174,0.25); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
.modal-overlay.active { display: flex; }
.modal { background: white; border-radius: 16px; width: min(520px, calc(100% - 32px)); max-height: 85vh; overflow-y: auto; box-shadow: 0 24px 60px rgba(0,0,0,0.2); animation: modalIn 0.25s ease-out; }
@keyframes modalIn { from { opacity:0; transform:scale(0.92) translateY(16px);} to { opacity:1; transform:scale(1) translateY(0);} }
.modal-header { padding: 20px 24px 0; display: flex; align-items: center; gap: 10px; }
.modal-header h2 { margin: 0; font-size: 18px; color: var(--text); }
.modal-close { margin-left: auto; width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--line); background: #f8fbfe; color: var(--muted); font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-close:hover { background: #fee2e2; color: var(--error); border-color: #fecaca; }
.modal-body { padding: 16px 24px 24px; }

.detail-section { margin-bottom: 20px; }
.detail-section h4 { font-size: 13px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.detail-item { display: flex; flex-direction: column; gap: 2px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-item label { font-size: 11px; color: var(--muted); font-weight: 600; }
.detail-item span { font-size: 13px; color: var(--text); }
.ai-diag { background: #f8fbfe; padding: 10px 14px; border-radius: 8px; border: 1px solid var(--line); font-size: 13px; line-height: 1.6; max-height: 120px; overflow-y: auto; }

footer { margin-top: 28px; text-align: center; padding-bottom: 20px; max-width: min(1200px, calc(100% - 32px)); margin-left: auto; margin-right: auto; }
footer p { font-size: 12px; color: var(--muted); }

@media (max-width: 768px) {
  .summary-bar { grid-template-columns: 1fr; }
  .repair-item { grid-template-columns: 1fr; gap: 10px; }
  .detail-grid { grid-template-columns: 1fr; }
  .top-nav { flex-direction: column; gap: 10px; align-items: flex-start; }
}
</style>
