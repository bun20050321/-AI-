<template>
  <div class="user-page">
    <!-- Top Navigation -->
    <div class="top-nav">
      <h1>&#127968; 家电说明书助手</h1>
      <div class="nav-links">
        <router-link to="/" class="nav-link active" exact-active-class="active">&#128100; 用户端</router-link>
        <router-link to="/repair" class="nav-link">&#128295; 我的维修</router-link>
        <router-link v-if="isStaff" to="/orders" class="nav-link">&#128203; 维修工单</router-link>
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
          <option v-for="id in applianceOrder" :key="id" :value="id">{{ manuals[id].icon }} {{ manuals[id].name }}</option>
        </select>
        <div class="quick-tags">
          <button v-for="id in applianceOrder" :key="id" class="quick-tag" :class="{ active: currentManualId === id }" @click="selectManual(id)">
            <span>{{ manuals[id].icon }}</span><span>{{ manuals[id].name }}</span>
          </button>
        </div>
      </div>
      <aside :class="['model-card', manual.catClass]">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-size:22px;">{{ manual.icon }}</span>
            <strong>{{ manual.name }}</strong>
          </div>
          <p>{{ manual.meta }}</p>
          <div :class="['feat-count', colorMap[manual.catClass]]">
            <span>&#9889;</span><span>{{ manual.sections.length }} 项使用说明</span>
          </div>
        </div>
      </aside>
    </section>

    <!-- Workspace -->
    <section class="workspace">
      <article class="panel">
        <header class="panel-header">
          <p class="kicker">&#128214; {{ manual.category }}</p>
          <h2>{{ manual.title }}</h2>
        </header>
        <div class="panel-body">
          <div class="section-pair">
            <div class="info-section">
              <div class="info-section-header"><h3>&#11088; 功能特色</h3></div>
              <div class="info-section-body">
                <div v-if="loadingFeatures" class="loading-state"><div class="spinner"></div><p>正在加载...</p></div>
                <div v-else-if="features.length > 0" class="feature-grid">
                  <div v-for="(f, i) in features" :key="i" class="feature-card">
                    <div class="feature-card-inner">
                      <div class="f-icon">{{ f.icon || '&#11088;' }}</div>
                      <div class="f-info"><h4>{{ f.title }}</h4><p>{{ f.desc }}</p></div>
                    </div>
                  </div>
                </div>
                <div v-else class="empty-state"><p>暂无功能特色数据</p><p style="font-size:11px;color:var(--muted)">数据将由后端数据库导入</p></div>
              </div>
            </div>
            <div class="info-section">
              <div class="info-section-header troubleshooting-header"><h3>&#128295; 故障修理</h3></div>
              <div class="info-section-body troubleshooting">
                <div v-if="loadingTroubles" class="loading-state"><div class="spinner"></div><p>正在加载...</p></div>
                <div v-else-if="currentTroubleItems.length > 0" class="trouble-list">
                  <a v-for="(t, i) in currentTroubleItems" :key="i" class="trouble-item" @click.prevent="scrollToTrouble(t.title)" href="#">
                    <span class="t-icon">{{ t.icon }}</span><span class="t-text">{{ t.title }}</span><span class="t-arrow">&rarr;</span>
                  </a>
                </div>
                <div v-else class="empty-state"><p>暂无故障数据</p><p style="font-size:11px;color:var(--muted)">数据将由后端数据库导入</p></div>
                <div class="submit-fault-bar">
                  <button class="submit-fault-btn" @click="openRepairModal">&#128295; 提出故障 / 报修</button>
                </div>
              </div>
            </div>
          </div>
          <div v-html="tocHtml"></div>
          <div v-html="sectionsHtml"></div>
        </div>
      </article>

      <aside class="panel chat-panel">
        <div class="chat-header">
          <div class="chat-header-icon">&#10024;</div>
          <div><h2>AI 智能助手</h2><p>AI 服务运行中</p></div>
        </div>
        <div class="chat-body">
          <div class="chat-stream" ref="chatStreamRef">
            <div v-for="(msg, idx) in messages" :key="msg.id || idx" :class="['message-row', msg.role]">
              <div :class="['msg-avatar', msg.role]">{{ msg.role === 'user' ? '&#128100;' : (msg.role === 'system' ? '&#128172;' : '&#129302;') }}</div>
              <div :class="['msg-bubble', msg.role]" v-html="escapeHtml(msg.content)"></div>
            </div>
            <div v-if="isTyping" class="message-row">
              <div class="msg-avatar assistant">&#129302;</div>
              <div class="typing-indicator">
                <svg class="spinner-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg>
                <span>正在思考</span>
                <div class="typing-dots"><i></i><i></i><i></i></div>
              </div>
            </div>
          </div>
          <div class="question-chips" v-show="showChips">
            <p class="chips-label">快捷问题</p>
            <div class="chips-wrap">
              <button v-for="q in currentQuestions" :key="q" class="chip-btn" @click="sendMessage(q)">{{ q }}</button>
            </div>
          </div>
          <form class="chat-input" @submit.prevent="handleChatSubmit">
            <input v-model="inputMessage" type="text" placeholder="询问关于此电器的使用问题..." autocomplete="off" :disabled="isTyping" />
            <button class="send-btn" type="submit" :disabled="isTyping || !inputMessage.trim()">&#10148; 发送</button>
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
          <form v-if="!submitSuccess" @submit.prevent="submitRepair">
            <div class="form-group"><label>报修电器</label><input type="text" class="form-input" :value="manual.name" readonly style="background:#f8fbfe;"></div>
            <div class="form-row">
              <div class="form-group"><label>您的姓名 <span class="required">*</span></label><input type="text" class="form-input" v-model="repairForm.name" placeholder="请输入姓名" required></div>
              <div class="form-group"><label>联系电话 <span class="required">*</span></label><input type="tel" class="form-input" v-model="repairForm.phone" placeholder="请输入手机号" required></div>
            </div>
            <div class="form-group"><label>上门地址 <span class="required">*</span></label><input type="text" class="form-input" v-model="repairForm.address" placeholder="请输入详细地址" required></div>
            <div class="form-row">
              <div class="form-group"><label>期望上门日期</label><input type="date" class="form-input" v-model="repairForm.date"></div>
              <div class="form-group"><label>期望时间段</label>
                <select class="form-input" v-model="repairForm.time">
                  <option value="">请选择</option><option value="morning">上午 (8:00-12:00)</option><option value="afternoon">下午 (12:00-18:00)</option><option value="evening">晚上 (18:00-21:00)</option>
                </select>
              </div>
            </div>
            <div class="form-group"><label>故障描述 <span class="required">*</span></label><textarea class="form-textarea" v-model="repairForm.desc" placeholder="请描述设备故障现象" required></textarea></div>
            <div class="form-group"><label>AI 诊断记录</label><textarea class="form-textarea" :value="lastDiagnosis || '用户通过AI助手咨询'" readonly style="background:#f8fbfe;color:var(--muted);"></textarea></div>
            <button type="submit" class="submit-btn" :disabled="submitting">{{ submitting ? '提交中...' : '&#128295; 提交维修预约' }}</button>
          </form>
          <div v-else class="success-msg">
            <div class="icon">&#9989;</div><h3>预约提交成功！</h3><p>您的维修预约已收到，预约编号：<strong>#{{ submittedId }}</strong></p><p>我们的维修工程师将尽快与您联系。</p>
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
import { useAuth } from '@/composables/useAuth.js'

const { isStaff } = useAuth()

const currentManualId = ref('air')
const features = ref([])
const troubles = ref([])
const loadingFeatures = ref(false)
const loadingTroubles = ref(false)
const manual = computed(() => manuals[currentManualId.value])

const currentTroubleItems = computed(() => {
  const m = manuals[currentManualId.value]
  return m?.troubleItems?.map(t => ({ title: t, icon: troubleIcons[t] || '\u{1F527}' })) || []
})

function selectManual(id) {
  currentManualId.value = id
}
function handleSelectChange(e) { currentManualId.value = e.target.value }

// Sections HTML
function renderSections(key) {
  const m = manuals[key]
  if (!m) return ''
  return m.sections.map(([title, items], idx) => {
    const list = items.map(item => `<li>${item}</li>`).join('')
    const noticeClass = idx === 1 ? 'warning' : 'tip'
    const noticeText = idx === 1 ? '安全提示：使用前请完整阅读本章节。' : '提示：不同批次产品的显示文案可能略有差异，请以实物为准。'
    let diagramHtml = ''
    if (idx === 2) diagramHtml = `<div class="diagram"><div class="diagram-inner"><div class="panel-visual" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div><div style="font-size:13px;color:var(--muted);font-weight:600;">${m.diagram}</div></div></div>`
    return `<section class="manual-section" id="section-${key}-${idx}"><h3><span class="section-num">${idx + 1}</span>${title}</h3><ul>${list}</ul>${diagramHtml}<div class="notice ${noticeClass}"><span>${noticeText}</span></div></section>`
  }).join('')
}

function renderToc(key) {
  const m = manuals[key]
  if (!m) return ''
  return `<div class="toc"><span class="toc-label">目录导航</span>${m.sections.map(([title], idx) => `<a href="#section-${key}-${idx}">${title}</a>`).join('')}</div>`
}

const tocHtml = computed(() => renderToc(currentManualId.value))
const sectionsHtml = computed(() => renderSections(currentManualId.value))
const currentQuestions = computed(() => ({ air: ['首次使用要注意什么？', '怎么清洁？', '出现故障灯怎么办？'], washer: ['首次使用准备？', '怎么选程序？', '显示E1怎么办？'], fridge: ['第一次怎么用？', '温度怎么设？', '有异响怎么回事？'], rice: ['煮饭放多少水？', '怎么预约煮饭？', '内胆脱落怎么办？'], ac: ['怎么设最省电？', '滤网怎么拆洗？', '不制冷怎么办？'], microwave: ['哪些容器可用？', '怎么解冻？', '加热不均怎么办？'] }[currentManualId.value] || []))

// Chat
const messages = ref([{ id: 'welcome', role: 'system', content: '您好！我是AI说明书助手。\n\n您可以询问使用步骤、功能介绍、故障排查或维护方法。如果故障无法自行解决，我可以帮您预约上门维修服务。' }])
const chatHistory = ref([])
const isTyping = ref(false)
const lastDiagnosis = ref('')
const inputMessage = ref('')
const showChips = ref(true)
const chatStreamRef = ref(null)

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function getLocalResponse(manualId, question) {
  const m = manuals[manualId], q = question.toLowerCase()
  lastDiagnosis.value = ''
  const needsRepair = ['坏了', '不能', '无法', '不工作', '不启动', '不加热', '不制冷', '不转', '不亮', '漏水', '异响', '故障灯', 'e1', 'e2', 'e3', 'e0'].some(kw => q.includes(kw))
  let response = ''
  if (q.includes('首次') || q.includes('第一次') || q.includes('准备')) {
    const part = m.name.includes('冰箱') ? '内胆和隔板' : m.name.includes('洗衣机') ? '内筒' : m.name.includes('电饭煲') ? '内胆' : m.name.includes('空调') ? '滤网' : m.name.includes('微波炉') ? '炉腔和转盘' : '炸篮'
    response = `欢迎使用${m.name}！首次使用前建议您：\n\n1. 仔细阅读安全注意事项章节\n2. 检查配件是否齐全，设备外观有无损坏\n3. 进行空载运行测试，确认正常工作\n4. 清洁可拆卸部件（如${part}）\n\n有具体问题随时问我！`
  } else if (q.includes('清洁') || q.includes('清洗') || q.includes('保养') || q.includes('维护')) {
    const items = m.sections.find(s => s[0].includes('清洁'))?.[1] || ['定期清洁设备外观和可拆卸部件', '使用中性清洁剂和软布擦拭', '清洁前务必断开电源']
    response = `${m.name}的清洁保养方法：\n\n${items.map((item, i) => (i + 1) + '. ' + item).join('\n')}\n\n💡 建议：每次使用后及时清洁，可延长设备使用寿命。`
  } else if (q.includes('故障') || q.includes('错误') || q.includes('不工作') || q.includes('坏了') || q.includes('灯') || q.includes('代码') || q.includes('e1') || q.includes('e2') || q.includes('e3') || q.includes('e0')) {
    const items = m.sections.find(s => s[0].includes('故障'))?.[1] || ['检查电源连接是否正常', '确认操作步骤是否正确', '重启设备后再试']
    response = `遇到故障不要慌，请按以下步骤排查：\n\n${items.map((item, i) => (i + 1) + '. ' + item).join('\n')}\n\n⚠️ 如以上方法均无效，说明该故障可能需要专业维修人员处理。`
  } else if (q.includes('安全') || q.includes('注意') || q.includes('危险')) {
    const items = m.sections.find(s => s[0].includes('安全'))?.[1] || ['请严格按照说明书操作', '发现异常立即停止使用']
    response = `${m.name}的安全使用须知：\n\n${items.map((item, i) => (i + 1) + '. ' + item).join('\n')}\n\n🔒 安全提示：使用前请完整阅读安全章节。`
  } else {
    response = `关于${m.name}的问题，我建议您参考说明书的以下内容：\n\n${m.sections.map(s => '• **' + s[0] + '**：' + s[1][0]).join('\n')}\n\n如果还有疑问，可以点击快捷问题或继续输入咨询。`
  }
  if (needsRepair) {
    lastDiagnosis.value = response
    response += '\n\n---\n\n🔴 根据您的描述，该故障可能涉及硬件问题，建议预约专业维修人员上门检测。您可以点击下方按钮提交维修预约，我们的工程师将尽快与您联系。'
  }
  return response
}

async function sendMessage(text) {
  if (!text.trim() || isTyping.value) return
  messages.value.push({ id: 'user-' + Date.now(), role: 'user', content: text.trim() })
  inputMessage.value = ''
  isTyping.value = true
  if (messages.value.length > 2) showChips.value = false
  await new Promise(r => setTimeout(r, 600 + Math.random() * 600))
  isTyping.value = false
  const response = getLocalResponse(currentManualId.value, text.trim())
  messages.value.push({ id: 'ai-' + Date.now(), role: 'assistant', content: response })
}

function handleChatSubmit() { sendMessage(inputMessage.value) }
function scrollToTrouble(title) { sendMessage('我的电器出现' + title + '，请问怎么处理？'); document.querySelector('.chat-panel')?.scrollIntoView({ behavior: 'smooth' }) }

watch(messages, () => { nextTick(() => { if (chatStreamRef.value) chatStreamRef.value.scrollTop = chatStreamRef.value.scrollHeight }) }, { deep: true })
watch(currentManualId, () => { messages.value = [{ id: 'welcome', role: 'system', content: '您好！我是AI说明书助手。\n\n您可以询问使用步骤、功能介绍、故障排查或维护方法。如果故障无法自行解决，我可以帮您预约上门维修服务。' }]; chatHistory.value = []; lastDiagnosis.value = ''; showChips.value = true })

// Repair Modal
const repairModalOpen = ref(false)
const modalTitle = ref('预约上门维修')
const submitSuccess = ref(false)
const submitting = ref(false)
const submittedId = ref('')
const repairForm = ref({ name: '', phone: '', address: '', date: '', time: '', desc: '' })

function openRepairModal() {
  repairModalOpen.value = true; submitSuccess.value = false; modalTitle.value = '预约上门维修'
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  repairForm.value = { name: '', phone: '', address: '', date: tomorrow.toISOString().split('T')[0], time: '', desc: '' }
}
function closeRepairModal() { repairModalOpen.value = false; if (submitSuccess.value) { repairForm.value = { name: '', phone: '', address: '', date: '', time: '', desc: '' }; submitSuccess.value = false } }

async function submitRepair() {
  submitting.value = true
  const data = { userName: repairForm.value.name, userPhone: repairForm.value.phone, userAddress: repairForm.value.address, applianceId: currentManualId.value, applianceModel: manual.value.name, faultDescription: repairForm.value.desc, aiDiagnosis: lastDiagnosis.value || '用户通过AI助手咨询', preferredDate: repairForm.value.date, preferredTime: repairForm.value.time }
  try {
    const res = await fetch((AI_CONFIG.apiBaseUrl || '') + '/api/repair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (res.ok) { const result = await res.json(); submittedId.value = result.id }
    else throw new Error('API Error')
  } catch {
    const orders = JSON.parse(localStorage.getItem('repair_orders') || '[]')
    const newAppt = { id: Date.now(), ...data, equipmentName: data.applianceModel, deviceName: data.applianceModel, faultTitle: data.faultDescription?.substring(0, 30) || '', faultPhenomenon: data.faultDescription, faultCause: '', handleMethod: '', handleResult: '待处理', repairPerson: data.userName, repairTime: (data.preferredDate || '') + ' ' + (data.preferredTime === 'morning' ? '上午' : data.preferredTime === 'afternoon' ? '下午' : data.preferredTime === 'evening' ? '晚上' : ''), status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    orders.unshift(newAppt)
    localStorage.setItem('repair_orders', JSON.stringify(orders))
    submittedId.value = newAppt.id
  }
  submitting.value = false; submitSuccess.value = true
}
</script>

<style scoped>
.user-page { --page: #f4f7fa; --surface: #ffffff; --text: #182635; --muted: #667789; --line: #d9e4ee; --primary: #2f6fae; --accent: #25a7d7; --success: #36a269; --warning: #f59e42; --error: #dc2626; --shadow: 0 18px 45px rgba(35, 57, 78, 0.08); background: radial-gradient(circle at 12% 8%, rgba(37,167,215,0.06), transparent 30%), var(--page); min-height: 100vh; font-family: "Microsoft YaHei","PingFang SC","Segoe UI",Arial,sans-serif; -webkit-font-smoothing: antialiased; padding: 24px 0; }
.top-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; padding: 0 4px; max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto; }
.top-nav h1 { font-size: 20px; display: flex; align-items: center; gap: 8px; color: var(--text); }
.nav-links { display: flex; gap: 10px; }
.nav-link { font-size: 13px; padding: 8px 16px; border-radius: 8px; background: white; border: 1px solid var(--line); color: var(--primary); text-decoration: none; font-weight: 600; transition: all 0.2s; cursor: pointer; }
.nav-link:hover, .nav-link.active { background: var(--primary); color: white; border-color: var(--primary); }

.service-bar { display: grid; grid-template-columns: minmax(200px,0.8fr) minmax(300px,1.2fr) minmax(260px,0.9fr); gap: 18px; align-items: stretch; padding: 20px; border: 1px solid var(--line); border-radius: 12px; background: linear-gradient(135deg,#fff,#f7fbff); box-shadow: var(--shadow); margin-bottom: 18px; max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto; }
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

.workspace { display: grid; grid-template-columns: minmax(0,1.65fr) minmax(340px,0.9fr); gap: 18px; align-items: start; max-width: min(1440px, calc(100% - 32px)); margin-left: auto; margin-right: auto; }
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
.empty-state { text-align: center; padding: 30px 20px; }
.empty-state p { font-size: 12px; color: var(--muted); margin-top: 8px; }

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

.chat-panel { position: sticky; top: 24px; }
.chat-header { padding: 16px 20px; border-bottom: 1px solid var(--line); background: linear-gradient(135deg,#fbfdff,#f5faff); display: flex; align-items: center; gap: 10px; }
.chat-header-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--primary); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; }
.chat-header h2 { margin: 0; font-size: 16px; color: var(--text); }
.chat-header p { margin: 0; font-size: 11px; color: var(--muted); }
.chat-body { display: flex; flex-direction: column; height: calc(100vh - 200px); max-height: 640px; min-height: 400px; }
.chat-stream { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
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
.spinner-svg { animation: spin 1s linear infinite; }

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
.form-input, .form-textarea { width: 100%; min-height: 40px; padding: 0 12px; border: 1px solid #c4d5e4; border-radius: 8px; font-size: 13px; outline: none; transition: all 0.2s; }
.form-input:focus, .form-textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,167,215,0.12); }
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
