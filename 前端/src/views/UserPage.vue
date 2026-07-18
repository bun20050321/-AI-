<template>
  <div class="user-page">
    <!-- Top Navigation -->
    <div class="top-nav">
      <h1>&#127968; 家电说明书助手</h1>
      <div class="nav-links">
        <router-link to="/" class="nav-link" exact-active-class="active">&#128100; 用户端</router-link>
        <router-link to="/repair" class="nav-link" active-class="active">&#128295; 我的维修</router-link>
      </div>
    </div>

    <!-- Service Bar -->
    <section class="service-bar">
      <div class="brand">
        <div class="brand-header">
          <div class="brand-icon">&#128161;</div>
          <div>
            <h1>智能家电助手</h1>
            <p class="brand-sub">查阅说明书 · AI问答 · 预约维修</p>
          </div>
        </div>
      </div>
      <div class="selector-block">
        <label>选择电器型号</label>
        <select v-model="currentManualId" @change="handleSelectChange">
          <option v-for="id in applianceOrder" :key="id" :value="id">
            {{ manuals[id].icon }} {{ manuals[id].name }}
          </option>
        </select>
        <div class="quick-tags">
          <button
            v-for="id in applianceOrder"
            :key="id"
            class="quick-tag"
            :class="{ active: currentManualId === id }"
            @click="selectManual(id)"
          >
            <span>{{ manuals[id].icon }}</span>
            <span>{{ manuals[id].name }}</span>
          </button>
        </div>
      </div>
      <aside :class="['model-card', manual.catClass]">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:22px;">{{ manual.icon }}</span>
            <strong>{{ manual.name }}</strong>
          </div>
          <p id="modelMeta">{{ manual.meta }}</p>
          <div :class="['feat-count', colorMap[manual.catClass]]">
            <span>&#9889;</span>
            <span>{{ manual.sections.length }} 项使用说明</span>
          </div>
        </div>
      </aside>
    </section>

    <!-- Workspace -->
    <section class="workspace">
      <!-- Left: Manual Panel -->
      <article class="panel">
        <header class="panel-header">
          <p class="kicker">&#128214; {{ manual.category }}</p>
          <h2>{{ manual.title }}</h2>
        </header>
        <div class="panel-body">
          <!-- 功能特色 + 故障修理 双栏 -->
          <div class="section-pair">
            <!-- 功能特色 -->
            <div class="info-section">
              <div class="info-section-header">
                <h3>&#11088; 功能特色</h3>
              </div>
              <div class="info-section-body">
                <div v-if="loadingFeatures" class="loading-state">
                  <div class="spinner"></div>
                  <p>正在加载功能特色...</p>
                </div>
                <div v-else-if="features.length > 0" class="feature-grid">
                  <div v-for="(f, i) in features" :key="i" class="feature-card">
                    <div class="feature-card-inner">
                      <div class="f-icon">{{ f.icon || '&#11088;' }}</div>
                      <div class="f-info">
                        <h4>{{ f.title }}</h4>
                        <p>{{ f.desc }}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state">
                  <p>暂无功能特色数据</p>
                  <p style="font-size:11px;color:var(--muted)">数据将由后端数据库导入</p>
                </div>
              </div>
            </div>
            <!-- 故障修理 -->
            <div class="info-section">
              <div class="info-section-header troubleshooting-header">
                <h3>&#128295; 故障修理</h3>
              </div>
              <div class="info-section-body troubleshooting">
                <div v-if="loadingTroubles" class="loading-state">
                  <div class="spinner"></div>
                  <p>正在加载常见故障...</p>
                </div>
                <div v-else-if="currentTroubleItems.length > 0" class="trouble-list">
                  <a
                    v-for="(t, i) in currentTroubleItems"
                    :key="i"
                    class="trouble-item"
                    @click.prevent="scrollToTrouble(t.title)"
                    href="#"
                  >
                    <span class="t-icon">{{ t.icon }}</span>
                    <span class="t-text">{{ t.title }}</span>
                    <span class="t-arrow">&rarr;</span>
                  </a>
                </div>
                <div v-else class="empty-state">
                  <p>暂无故障数据</p>
                  <p style="font-size:11px;color:var(--muted)">数据将由后端数据库导入</p>
                </div>
                <div class="submit-fault-bar">
                  <button class="submit-fault-btn" @click="openRepairModal">
                    &#128295; 提出故障 / 报修
                  </button>
                </div>
              </div>
            </div>
          </div>
          <!-- TOC + Manual Sections -->
          <div v-html="tocHtml"></div>
          <div v-html="sectionsHtml"></div>
        </div>
      </article>

      <!-- Right: AI Chat Panel -->
      <aside class="panel chat-panel">
        <div class="chat-header">
          <div class="chat-header-icon">&#10024;</div>
          <div>
            <h2>AI 智能助手</h2>
            <p>AI 服务运行中</p>
          </div>
        </div>
        <div class="chat-body">
          <div class="chat-stream" ref="chatStreamRef">
            <div
              v-for="(msg, idx) in messages"
              :key="msg.id || idx"
              :class="['message-row', msg.role]"
            >
              <div :class="['msg-avatar', msg.role]">
                {{ msg.role === 'user' ? '&#128100;' : (msg.role === 'system' ? '&#128172;' : '&#129302;') }}
              </div>
              <div :class="['msg-bubble', msg.role]" v-html="escapeHtml(msg.content)"></div>
            </div>
            <!-- Typing Indicator -->
            <div v-if="isTyping" class="message-row">
              <div class="msg-avatar assistant">&#129302;</div>
              <div class="typing-indicator">
                <svg class="spinner-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2">
                  <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
                </svg>
                <span>正在思考</span>
                <div class="typing-dots"><i></i><i></i><i></i></div>
              </div>
            </div>
          </div>
          <!-- Quick Questions -->
          <div class="question-chips" v-show="showChips">
            <p class="chips-label">快捷问题</p>
            <div class="chips-wrap">
              <button
                v-for="q in currentQuestions"
                :key="q"
                class="chip-btn"
                @click="sendMessage(q)"
              >{{ q }}</button>
            </div>
          </div>
          <!-- Chat Input -->
          <form class="chat-input" @submit.prevent="handleChatSubmit">
            <input
              v-model="inputMessage"
              type="text"
              placeholder="询问关于此电器的使用问题..."
              autocomplete="off"
              :disabled="isTyping"
            />
            <button class="send-btn" type="submit" :disabled="isTyping || !inputMessage.trim()">
              &#10148; 发送
            </button>
          </form>
        </div>
      </aside>
    </section>

    <footer><p>家电说明书助手 · AI 智能问答 · 维修预约服务 · 数据仅供参考，请以实物说明书为准</p></footer>

    <!-- Repair Modal -->
    <div class="modal-overlay" :class="{ active: repairModalOpen }" @click.self="closeRepairModal">
      <div class="modal">
        <div class="modal-header">
          <span style="font-size:22px;">&#128295;</span>
          <h2>{{ modalTitle }}</h2>
          <button class="modal-close" @click="closeRepairModal">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Form -->
          <form v-if="!submitSuccess" id="repairForm" @submit.prevent="submitRepair">
            <div class="form-group">
              <label>报修电器</label>
              <input type="text" class="form-input" :value="manual.name" readonly style="background:#f8fbfe;">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>您的姓名 <span class="required">*</span></label>
                <input type="text" class="form-input" v-model="repairForm.name" placeholder="请输入姓名" required>
              </div>
              <div class="form-group">
                <label>联系电话 <span class="required">*</span></label>
                <input type="tel" class="form-input" v-model="repairForm.phone" placeholder="请输入手机号" required>
              </div>
            </div>
            <div class="form-group">
              <label>上门地址 <span class="required">*</span></label>
              <input type="text" class="form-input" v-model="repairForm.address" placeholder="请输入详细地址" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>期望上门日期</label>
                <input type="date" class="form-input" v-model="repairForm.date">
              </div>
              <div class="form-group">
                <label>期望时间段</label>
                <select class="form-select" v-model="repairForm.time">
                  <option value="">请选择</option>
                  <option value="morning">上午 (8:00-12:00)</option>
                  <option value="afternoon">下午 (12:00-18:00)</option>
                  <option value="evening">晚上 (18:00-21:00)</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>故障描述 <span class="required">*</span></label>
              <textarea class="form-textarea" v-model="repairForm.desc" placeholder="请描述设备故障现象，如：开机无反应、显示错误代码等" required></textarea>
            </div>
            <div class="form-group">
              <label>AI 诊断记录</label>
              <textarea class="form-textarea" :value="lastDiagnosis || '用户通过AI助手咨询'" readonly style="background:#f8fbfe;color:var(--muted);"></textarea>
            </div>
            <button type="submit" class="submit-btn" :disabled="submitting">
              {{ submitting ? '提交中...' : '&#128295; 提交维修预约' }}
            </button>
          </form>
          <!-- Success -->
          <div v-else class="success-msg">
            <div class="icon">&#9989;</div>
            <h3>预约提交成功！</h3>
            <p>您的维修预约已收到，预约编号：<strong>#{{ submittedId }}</strong></p>
            <p>我们的维修工程师将尽快与您联系，确认上门时间。</p>
            <button class="submit-btn" @click="closeRepairModal">确定</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { manuals, troubleIcons, colorMap, applianceOrder, AI_CONFIG } from '@/data/manuals.js'
import { useManual } from '@/composables/useManual.js'
import { useChat } from '@/composables/useChat.js'

const {
  currentManualId,
  manual,
  features,
  currentTroubleItems,
  loadingFeatures,
  loadingTroubles,
  selectManual,
  loadRemoteData,
  renderSections,
  renderToc
} = useManual()

const {
  messages,
  isTyping,
  lastDiagnosis,
  inputMessage,
  showChips,
  quickQuestions,
  sendMessage,
  resetChat,
  escapeHtml
} = useChat(currentManualId)

const chatStreamRef = ref(null)

const tocHtml = computed(() => {
  const toc = renderToc(currentManualId.value)
  return toc ? `<div class="toc"><span class="toc-label">目录导航</span>${toc}</div>` : ''
})

const sectionsHtml = computed(() => renderSections(currentManualId.value))

const currentQuestions = computed(() => quickQuestions[currentManualId.value] || [])

// Watch messages to scroll to bottom
watch(messages, () => {
  nextTick(() => {
    if (chatStreamRef.value) {
      chatStreamRef.value.scrollTop = chatStreamRef.value.scrollHeight
    }
  })
}, { deep: true })

// Watch manual change
watch(currentManualId, (newId) => {
  resetChat(newId)
})

function handleSelectChange(e) {
  selectManual(e.target.value)
}

function handleChatSubmit() {
  sendMessage(inputMessage.value)
}

function scrollToTrouble(title) {
  sendMessage('我的电器出现' + title + '，请问怎么处理？')
  document.querySelector('.chat-panel')?.scrollIntoView({ behavior: 'smooth' })
}

// Repair Modal
const repairModalOpen = ref(false)
const modalTitle = ref('预约上门维修')
const submitSuccess = ref(false)
const submitting = ref(false)
const submittedId = ref('')
const repairForm = ref({
  name: '', phone: '', address: '', date: '', time: '', desc: ''
})

function openRepairModal() {
  repairModalOpen.value = true
  submitSuccess.value = false
  modalTitle.value = '预约上门维修'
  // Set default date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  repairForm.value.date = tomorrow.toISOString().split('T')[0]
}

function closeRepairModal() {
  repairModalOpen.value = false
  if (submitSuccess.value) {
    repairForm.value = { name: '', phone: '', address: '', date: '', time: '', desc: '' }
    submitSuccess.value = false
  }
}

async function submitRepair() {
  submitting.value = true
  const data = {
    userName: repairForm.value.name,
    userPhone: repairForm.value.phone,
    userAddress: repairForm.value.address,
    applianceId: currentManualId.value,
    applianceModel: manual.value.name,
    faultDescription: repairForm.value.desc,
    aiDiagnosis: lastDiagnosis.value || '用户通过AI助手咨询',
    preferredDate: repairForm.value.date,
    preferredTime: repairForm.value.time
  }

  try {
    const res = await fetch((AI_CONFIG.apiBaseUrl || '') + '/api/repair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (res.ok) {
      const result = await res.json()
      submittedId.value = result.id
    } else {
      throw new Error('API Error')
    }
  } catch (err) {
    const appointments = JSON.parse(localStorage.getItem('repair_appointments') || '[]')
    const newAppt = { id: Date.now(), ...data, status: 'pending', createdAt: new Date().toISOString() }
    appointments.push(newAppt)
    localStorage.setItem('repair_appointments', JSON.stringify(appointments))
    submittedId.value = newAppt.id
  }

  submitting.value = false
  submitSuccess.value = true
}
</script>

<style scoped>
/* ===== Original UI Styles - Preserved ===== */
.user-page {
  --page: #f4f7fa; --surface: #ffffff; --text: #182635; --muted: #667789;
  --line: #d9e4ee; --primary: #2f6fae; --accent: #25a7d7;
  --success: #36a269; --warning: #f59e42; --error: #dc2626;
  --shadow: 0 18px 45px rgba(35, 57, 78, 0.08);
  background: radial-gradient(circle at 12% 8%, rgba(37,167,215,0.06), transparent 30%), var(--page);
  min-height: 100vh;
  font-family: "Microsoft YaHei","PingFang SC","Segoe UI",Arial,sans-serif;
  -webkit-font-smoothing: antialiased;
  padding: 24px 0;
}

:deep(*) { box-sizing: border-box; }
:deep(button, select, input, textarea) { font: inherit; }

.top-nav {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px; padding: 0 4px;
  max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto;
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

.service-bar {
  display: grid; grid-template-columns: minmax(200px,0.8fr) minmax(300px,1.2fr) minmax(260px,0.9fr);
  gap: 18px; align-items: stretch; padding: 20px;
  border: 1px solid var(--line); border-radius: 12px;
  background: linear-gradient(135deg,#fff,#f7fbff); box-shadow: var(--shadow);
  margin-bottom: 18px;
  max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto;
}
.brand h1 { font-size: 22px; color: var(--text); }
.brand-sub { font-size: 12px; color: var(--muted); }
.brand-header { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.brand-icon { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg,var(--primary),var(--accent)); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; box-shadow: 0 2px 8px rgba(47,111,174,0.25); }

.selector-block label { display: block; margin-bottom: 8px; color: var(--muted); font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
.selector-block select { width: 100%; min-height: 44px; padding: 0 14px; border: 1px solid #c4d5e4; border-radius: 8px; background: var(--surface); color: var(--text); font-size: 14px; cursor: pointer; }

.quick-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.quick-tag { display: flex; align-items: center; gap: 4px; border: 1px solid #c8dce9; border-radius: 999px; background: #f7fbff; color: var(--primary); padding: 7px 12px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s; border: none; }
.quick-tag:hover { border-color: var(--accent); background: #e8f7fc; }
.quick-tag.active { border-color: var(--accent); background: #e8f7fc; color: #096d91; box-shadow: 0 1px 4px rgba(37,167,215,0.12); }

.model-card { display: flex; align-items: center; gap: 14px; border-radius: 10px; padding: 16px; transition: all 0.3s; }
.model-card.kitchen { border: 1px solid #fed7aa; background: linear-gradient(135deg,#fff7ed,#ffedd5); }
.model-card.care { border: 1px solid #bfdbfe; background: linear-gradient(135deg,#eff6ff,#dbeafe); }
.model-card.cool { border: 1px solid #a5f3fc; background: linear-gradient(135deg,#ecfeff,#cffafe); }
.model-card.env { border: 1px solid #bbf7d0; background: linear-gradient(135deg,#f0fdf4,#dcfce7); }
.model-card strong { display: block; margin-bottom: 4px; color: var(--primary); font-size: 15px; }
.model-card p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.6; }
.feat-count { display: flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 12px; font-weight: 600; }
.feat-count.kitchen-c { color: #c2410c; } .feat-count.care-c { color: #1d4ed8; } .feat-count.cool-c { color: #0e7490; } .feat-count.env-c { color: #15803d; }

.workspace { display: grid; grid-template-columns: minmax(0,1.65fr) minmax(340px,0.9fr); gap: 18px; align-items: start;
  max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto;
}
.panel { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); overflow: hidden; }
.panel-header { padding: 18px 22px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg,#fbfdff,#f5faff); }
.panel-header .kicker { display: flex; align-items: center; gap: 6px; margin: 0 0 4px; color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.panel-header h2 { margin: 0; font-size: 20px; color: var(--text); }
.panel-body { padding: 22px; }

.section-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
.info-section { border: 1px solid var(--line); border-radius: 12px; background: linear-gradient(135deg,#fff,#f7fbff); overflow: hidden; }
.info-section-header { padding: 14px 18px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg,#fbfdff,#f5faff); display: flex; align-items: center; gap: 10px; }
.info-section-header h3 { margin: 0; font-size: 16px; display: flex; align-items: center; gap: 8px; }
.info-section-header h3::before { content: ''; width: 4px; height: 18px; background: var(--accent); border-radius: 2px; }
.info-section-header.troubleshooting-header { background: linear-gradient(135deg,#fef2f2,#fee2e2); }
.info-section-header.troubleshooting-header h3::before { background: var(--error); }
.info-section-body { padding: 16px 18px; }
.info-section-body.troubleshooting { background: linear-gradient(135deg,#fff,#fef2f2); }

.feature-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }
.feature-card { padding: 14px; border-radius: 10px; border: 1px solid var(--line); background: white; transition: all 0.3s; }
.feature-card:hover { box-shadow: 0 4px 16px rgba(35,57,78,0.06); border-color: rgba(37,167,215,0.3); }
.feature-card-inner { display: flex; align-items: flex-start; gap: 10px; }
.f-icon { width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg,var(--primary),var(--accent)); display: flex; align-items: center; justify-content: center; font-size: 16px; color: white; flex-shrink: 0; }
.f-info h4 { font-size: 13px; font-weight: 600; margin-bottom: 3px; }
.f-info p { font-size: 11px; color: var(--muted); line-height: 1.5; margin: 0; }

.trouble-list { display: flex; flex-direction: column; gap: 8px; }
.trouble-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid #fecaca; background: white; cursor: pointer; transition: all 0.2s; text-decoration: none; color: var(--text); }
.trouble-item:hover { background: #fee2e2; border-color: var(--error); transform: translateX(4px); }
.trouble-item .t-icon { font-size: 16px; flex-shrink: 0; }
.trouble-item .t-text { font-size: 13px; font-weight: 500; }
.trouble-item .t-arrow { margin-left: auto; font-size: 12px; color: var(--error); }

.submit-fault-bar { margin-top: 14px; padding-top: 14px; border-top: 1px dashed #fecaca; }
.submit-fault-btn { width: 100%; min-height: 40px; border: 1px solid var(--error); border-radius: 8px; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.submit-fault-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(220,38,38,0.3); }

.loading-state { text-align: center; padding: 30px 20px; color: var(--muted); font-size: 13px; }
.spinner { width: 24px; height: 24px; border: 2px solid #c4d5e4; border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 10px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-svg { animation: spin 1s linear infinite; }
.empty-state { text-align: center; padding: 30px 20px; }
.empty-state p { font-size: 12px; color: var(--muted); margin-top: 8px; }

/* TOC & Manual Sections */
:deep(.toc) { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
:deep(.toc-label) { width: 100%; font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 4px; }
:deep(.toc a) { color: var(--primary); text-decoration: none; border: 1px solid #cfe0ee; border-radius: 999px; padding: 7px 14px; background: #f8fbfe; font-size: 13px; font-weight: 500; }
:deep(.toc a:hover) { background: #e8f7fc; border-color: var(--accent); }
:deep(.manual-section) { padding: 18px 0; border-bottom: 1px solid #edf2f7; }
:deep(.manual-section:last-child) { border-bottom: 0; }
:deep(.manual-section h3) { margin: 0 0 10px; font-size: 16px; display: flex; align-items: center; gap: 8px; color: var(--text); }
:deep(.section-num) { width: 26px; height: 26px; border-radius: 6px; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
:deep(.manual-section ul) { margin: 0; padding-left: 18px; list-style: none; }
:deep(.manual-section li) { color: #31465a; line-height: 1.8; font-size: 14px; position: relative; padding-left: 16px; margin-bottom: 4px; }
:deep(.manual-section li::before) { content: ''; position: absolute; left: 0; top: 10px; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
:deep(.notice) { margin-top: 12px; padding: 12px 14px; border-radius: 8px; border: 1px solid; line-height: 1.7; font-size: 13px; display: flex; align-items: flex-start; gap: 8px; }
:deep(.notice.warning) { border-color: #f7d4ac; background: #fff6ec; color: #87500d; }
:deep(.notice.tip) { border-color: #bfe5ce; background: #f0fbf4; color: #19633b; }
:deep(.diagram) { min-height: 140px; margin-top: 14px; border: 1px dashed #adc7dc; border-radius: 10px; background: repeating-linear-gradient(135deg,#f3f8fc,#f3f8fc 10px,#eaf3fa 10px,#eaf3fa 20px); overflow: hidden; }
:deep(.diagram-inner) { display: grid; grid-template-columns: minmax(140px,0.5fr) 1fr; gap: 18px; align-items: center; min-height: 140px; padding: 18px; }
:deep(.panel-visual) { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; padding: 14px; border: 2px solid #9fc5dd; border-radius: 8px; background: #fff; }
:deep(.panel-visual span) { display: block; height: 16px; border-radius: 999px; background: #d7e8f2; }
:deep(.panel-visual span:nth-child(1), .panel-visual span:nth-child(5)) { background: var(--primary); }
:deep(.panel-visual span:nth-child(4)) { background: var(--accent); }

/* Chat Panel */
.chat-panel { position: sticky; top: 24px; }
.chat-header { padding: 16px 20px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg,#fbfdff,#f5faff); display: flex; align-items: center; gap: 10px; }
.chat-header-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; }
.chat-header h2 { margin: 0; font-size: 16px; color: var(--text); }
.chat-header p { margin: 0; font-size: 11px; color: var(--muted); }

.chat-body { display: flex; flex-direction: column; height: calc(100vh - 200px); max-height: 640px; min-height: 400px; }
.chat-stream { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.chat-stream::-webkit-scrollbar { width: 4px; }
.chat-stream::-webkit-scrollbar-thumb { background: #c4d5e4; border-radius: 2px; }

.message-row { display: flex; gap: 10px; }
.message-row.user { flex-direction: row-reverse; }
.msg-avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px; }
.msg-avatar.system { background: #eef6fc; color: var(--primary); }
.msg-avatar.user { background: var(--accent); color: white; }
.msg-avatar.assistant { background: var(--primary); color: white; }
.msg-bubble { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 13px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }
.msg-bubble.system { background: #eef6fc; border: 1px solid #d1e5f3; color: #244b68; border-bottom-left-radius: 4px; }
.msg-bubble.user { background: var(--accent); color: white; border-bottom-right-radius: 4px; }
.msg-bubble.assistant { background: white; border: 1px solid var(--line); color: #31465a; border-bottom-left-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }

.typing-indicator { display: flex; align-items: center; gap: 6px; background: white; border: 1px solid var(--line); border-radius: 14px; border-bottom-left-radius: 4px; padding: 10px 14px; }
.typing-indicator span { font-size: 12px; color: var(--muted); }
.typing-dots { display: flex; gap: 3px; }
.typing-dots i { width: 5px; height: 5px; border-radius: 50%; background: var(--primary); animation: bounce 1s infinite; }
.typing-dots i:nth-child(2) { animation-delay: 0.15s; }
.typing-dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-4px)} }

.question-chips { padding: 0 16px 12px; }
.chips-label { font-size: 11px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
.chips-wrap { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-btn { border: 1px solid #c8dce9; border-radius: 999px; background: #f7fbff; color: var(--primary); padding: 6px 12px; cursor: pointer; font-size: 12px; font-weight: 500; transition: all 0.2s; }
.chip-btn:hover { background: #e8f7fc; border-color: var(--accent); }

.chat-input { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 12px 16px; border-top: 1px solid var(--line); background: #fbfdff; }
.chat-input input { min-height: 40px; border: 1px solid #c4d5e4; border-radius: 8px; padding: 0 12px; font-size: 13px; outline: none; }
.chat-input input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,167,215,0.12); }
.send-btn { min-width: 64px; min-height: 40px; border: 0; border-radius: 8px; background: var(--primary); color: #fff; cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 4px; transition: background 0.2s; }
.send-btn:hover { background: #24588e; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.form-group label .required { color: var(--error); }
.form-input, .form-select, .form-textarea { width: 100%; min-height: 40px; padding: 0 12px; border: 1px solid #c4d5e4; border-radius: 8px; font-size: 13px; outline: none; transition: all 0.2s; }
.form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,167,215,0.12); }
.form-textarea { min-height: 80px; padding: 10px 12px; resize: vertical; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.submit-btn { width: 100%; min-height: 44px; border: 0; border-radius: 10px; background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(47,111,174,0.3); }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

.success-msg { text-align: center; padding: 20px; }
.success-msg .icon { font-size: 48px; margin-bottom: 12px; }
.success-msg h3 { font-size: 18px; margin-bottom: 8px; color: var(--text); }
.success-msg p { font-size: 13px; color: var(--muted); margin-bottom: 16px; }

footer { margin-top: 28px; text-align: center; padding-bottom: 20px; max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto; }
footer p { font-size: 12px; color: var(--muted); }

@media (max-width: 1100px) {
  .service-bar, .workspace { grid-template-columns: 1fr; }
  .section-pair { grid-template-columns: 1fr; }
  .chat-panel { position: static; }
  .chat-body { max-height: 480px; }
  .feature-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .workspace { padding: 16px; }
  .top-nav { flex-direction: column; gap: 10px; align-items: flex-start; }
}
</style>
