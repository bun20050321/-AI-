<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Assistant</p>
      <h3>AI 问答</h3>
      <p>基于 Spring AI + Elasticsearch 的智能问答，可检索知识库并生成回答</p>
    </div>

    <!-- 模式切换提示 -->
    <el-alert
      :title="modeAlertTitle"
      :type="apiMode === 'rag' ? 'success' : apiMode === 'stream' ? 'primary' : 'info'"
      :closable="false"
      style="margin-bottom: 12px; max-width: 900px;"
    >
      <template #default>
        <span v-if="apiMode === 'rag'">
          RAG 模式：Spring AI 生成回答 + ES 知识库检索
          <el-tag size="small" type="success" style="margin-left: 8px;">ES + Spring AI</el-tag>
        </span>
        <span v-else-if="apiMode === 'stream'">
          流式模式：Spring AI 原生对话
          <el-tag size="small" type="primary" style="margin-left: 8px;">Spring AI</el-tag>
        </span>
        <span v-else>
          本地模拟模式（后端未连接）
          <el-button link type="primary" size="small" @click="testApi">测试后端连接</el-button>
        </span>
      </template>
    </el-alert>

    <!-- 对话模式选择 -->
    <el-radio-group v-model="chatMode" size="small" style="margin-bottom: 12px;" :disabled="isTyping">
      <el-radio-button label="rag">
        <el-icon><Search /></el-icon> 知识库问答 (RAG)
      </el-radio-button>
      <el-radio-button label="stream">
        <el-icon><ChatRound /></el-icon> AI 自由对话
      </el-radio-button>
    </el-radio-group>

    <el-card shadow="never" class="chat-card">
      <!-- Messages -->
      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :class="['message-row', msg.role]"
        >
          <div class="message-avatar">
            <el-avatar
              :size="36"
              :icon="msg.role === 'user' ? UserFilled : (msg.role === 'system' ? InfoFilled : ChatRound)"
              :style="{ background: avatarBg(msg.role) }"
            />
          </div>
          <div class="message-content">
            <div class="message-label">{{ msg.role === 'user' ? '您' : msg.role === 'system' ? '系统' : 'AI 助手' }}</div>
            <div class="message-bubble" v-html="renderContent(msg.content)"></div>
            <!-- RAG 引用来源 -->
            <div v-if="msg.sources && msg.sources.length" class="rag-sources">
              <div class="rag-sources-title">
                <el-icon><Document /></el-icon> 知识库引用 ({{ msg.sources.length }}条)
              </div>
              <div
                v-for="(src, sIdx) in msg.sources"
                :key="sIdx"
                class="rag-source-item"
                @click="showSourceDetail(src)"
              >
                <span class="rag-source-num">{{ sIdx + 1 }}</span>
                <span class="rag-source-title">{{ src.title || '知识片段' }}</span>
                <el-tag v-if="src.score" size="small" type="info" class="rag-source-score">{{ (src.score * 100).toFixed(1) }}%</el-tag>
              </div>
            </div>
          </div>
        </div>

        <!-- Typing / Streaming -->
        <div v-if="isTyping" class="message-row assistant">
          <div class="message-avatar">
            <el-avatar :size="36" :icon="ChatRound" :style="{ background: '#409eff' }" />
          </div>
          <div class="message-content">
            <div class="message-label">AI 助手</div>
            <div class="message-bubble">
              <span v-if="!streamContent" class="typing-dots-inline">
                <i></i><i></i><i></i>
              </span>
              <span v-else v-html="renderContent(streamContent)"></span>
            </div>
            <!-- 实时显示检索到的知识库片段 -->
            <div v-if="currentSources.length" class="rag-sources typing">
              <div class="rag-sources-title">
                <el-icon><Document /></el-icon> 已检索到 {{ currentSources.length }} 条知识
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="chat-input-area">
        <div class="quick-questions" v-if="messages.length <= 1">
          <span class="quick-label">快捷问题：</span>
          <el-tag
            v-for="q in quickQuestionsList"
            :key="q"
            class="quick-tag"
            effect="plain"
            type="primary"
            @click="sendMsg(q)"
          >{{ q }}</el-tag>
        </div>
        <div class="input-row">
          <el-input
            v-model="inputMsg"
            type="textarea"
            :rows="2"
            :placeholder="inputPlaceholder"
            resize="none"
            @keydown.enter.prevent="handleEnter"
          />
          <el-button
            type="primary"
            :icon="Promotion"
            :loading="isTyping"
            @click="sendMessage"
            class="send-btn"
          >发送</el-button>
        </div>
        <div class="input-hint">
          <el-icon v-if="chatMode === 'rag'" color="#67c23a"><Search /></el-icon>
          <el-icon v-else color="#409eff"><ChatRound /></el-icon>
          <span v-if="chatMode === 'rag'">RAG 模式：先检索 ES 知识库，再由 Spring AI 生成回答</span>
          <span v-else>自由对话：直接调用 Spring AI 生成回答</span>
        </div>
      </div>
    </el-card>

    <!-- 知识库引用详情弹窗 -->
    <el-dialog v-model="sourceDialogVisible" title="知识库原文" width="560px" destroy-on-close>
      <div v-if="currentSource" class="source-detail">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="标题">{{ currentSource.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="相关度">
            <el-tag v-if="currentSource.score" :type="sourceScoreType(currentSource.score)">
              {{ (currentSource.score * 100).toFixed(1) }}%
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="内容" v-if="currentSource.content">
            <div class="source-content">{{ currentSource.content }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </section>
</template>

<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, ChatRound, Promotion, InfoFilled, Search, Document } from '@element-plus/icons-vue'
import { chatStream, chatRagStream, searchKnowledgeBase } from '@/api/ai.js'
import { checkBackendHealth } from '@/api/health.js'

// ===== 状态 =====
const messages = ref([{
  role: 'assistant',
  content: '您好！我是 AI 智能助手，基于 **Spring AI + Elasticsearch** 为您提供服务。\n\n我可以帮您：\n1. 查询家电使用说明和故障排查方法\n2. 检索知识库中的维修记录和解决方案\n3. 基于历史工单数据为您提供建议\n\n请选择「知识库问答」模式以获取精准回答，或选择「AI 自由对话」进行开放式交流。'
}])
const isTyping = ref(false)
const inputMsg = ref('')
const messagesRef = ref(null)
const streamContent = ref('')
const apiMode = ref('local')        // 'local' | 'stream' | 'rag'
const chatMode = ref('rag')        // 'rag' | 'stream'
const chatHistory = ref([])
const currentSources = ref([])      // 当前流式输出的知识来源
const sourceDialogVisible = ref(false)
const currentSource = ref(null)

const quickQuestionsList = [
  '洗衣机不进水怎么办？',
  '冰箱制冷效果不好怎么处理？',
  '空调显示 E1 错误是什么意思？'
]

const modeAlertTitle = computed(() => {
  if (apiMode.value === 'rag') return '已连接后端：RAG 模式（ES + Spring AI）'
  if (apiMode.value === 'stream') return '已连接后端：流式对话模式（Spring AI）'
  return '后端未连接：本地模拟模式'
})

const inputPlaceholder = computed(() => {
  if (chatMode.value === 'rag') return '请输入问题，将先从 ES 知识库检索相关文档，再由 Spring AI 生成回答...'
  return '请输入问题，由 Spring AI 直接生成回答...'
})

function avatarBg(role) {
  if (role === 'user') return '#1c785f'
  if (role === 'system') return '#e6a23c'
  return '#409eff'
}

function sourceScoreType(score) {
  if (score >= 0.8) return 'success'
  if (score >= 0.5) return 'warning'
  return 'info'
}

// ===== 初始化：检测后端是否可用 =====
async function testApi() {
  const health = await checkBackendHealth()
  if (health.connected) {
    apiMode.value = chatMode.value === 'rag' ? 'rag' : 'stream'
    ElMessage.success('后端已连接（Spring AI + ES）')
  } else {
    apiMode.value = 'local'
    ElMessage.info('后端未连接，保持本地模拟')
  }
}
testApi()

watch(chatMode, (newMode) => {
  if (apiMode.value !== 'local') {
    apiMode.value = newMode
  }
})

// ===== 渲染消息（转义HTML + 换行 + 粗体）=====
function renderContent(content) {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')
}

// ===== 滚动到底部 =====
function scrollToBottom() {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}
watch(messages, scrollToBottom, { deep: true })
watch(streamContent, scrollToBottom)

function handleEnter(e) {
  if (!e.shiftKey) sendMessage()
}

function sendMsg(text) {
  inputMsg.value = text
  sendMessage()
}

function showSourceDetail(src) {
  currentSource.value = src
  sourceDialogVisible.value = true
}

// ===== 本地模拟回复（fallback）=====
function getLocalResponse(question) {
  const q = question.toLowerCase()
  if (q.includes('不进水') || q.includes('e1')) {
    return '【本地模拟】洗衣机不进水（显示E1）的常见原因：\n\n1. **水龙头未打开** - 检查进水阀门是否开启\n2. **进水阀堵塞** - 清理进水阀过滤网\n3. **进水管弯折** - 理顺进水管路\n4. **进水阀故障** - 需要更换进水阀\n\n> 连接后端后可从 **ES 知识库** 检索历史维修工单获取更精准的解决方案。'
  }
  if (q.includes('制冷') || q.includes('不冷')) {
    return '【本地模拟】冰箱制冷效果差的可能原因：\n\n1. **温控器设置不当** - 冷藏室建议 2-5°C，冷冻室 -18°C\n2. **门封条老化** - 检查密封条是否漏气\n3. **冷凝器积灰** - 清理背部冷凝器灰尘\n4. **制冷剂泄漏** - 需要专业人员检修\n\n> 连接后端后可使用 **RAG 模式** 检索历史维修知识库获取专业建议。'
  }
  if (q.includes('e1') || q.includes('error') || q.includes('错误')) {
    return '【本地模拟】E1 错误代码通常表示通信故障或传感器异常。\n\n**排查步骤：**\n1. 断电重启设备\n2. 检查电源线和插座\n3. 检查室内外机连接线\n4. 如仍报错，记录完整错误代码后联系售后\n\n> 建议连接后端（**Spring AI + ES**）以获取基于知识库的精准诊断。'
  }
  return '【本地模拟】感谢您的提问！\n\n> 当前未连接后端，仅返回模拟回复。\n> 连接 **Spring AI + Elasticsearch** 后可实现：\n> - ES 知识库语义检索\n> - Spring AI 智能回答生成\n> - 基于历史维修工单的精准建议'
}

// ===== 发送消息 =====
async function sendMessage() {
  const text = inputMsg.value.trim()
  if (!text || isTyping.value) return

  messages.value.push({ role: 'user', content: text })
  inputMsg.value = ''
  isTyping.value = true
  streamContent.value = ''
  currentSources.value = []

  // 维护历史记录（最多保留10轮）
  chatHistory.value.push({ role: 'user', content: text })
  if (chatHistory.value.length > 20) {
    chatHistory.value = chatHistory.value.slice(-20)
  }

  // ===== 模式1: RAG 流式（ES + Spring AI）=====
  if (apiMode.value === 'rag' && chatMode.value === 'rag') {
    let fullContent = ''
    let sources = []
    try {
      await chatRagStream(
        { message: text, history: chatHistory.value },
        {
          onChunk: (chunk) => {
            fullContent += chunk
            streamContent.value = fullContent
          },
          onSources: (srcs) => {
            sources = srcs
            currentSources.value = srcs
          },
          onDone: () => {
            isTyping.value = false
            streamContent.value = ''
            currentSources.value = []
            messages.value.push({ role: 'assistant', content: fullContent, sources })
            chatHistory.value.push({ role: 'assistant', content: fullContent })
          },
          onError: (err) => {
            console.error('RAG Error:', err)
            handleBackendError(text)
          }
        }
      )
    } catch {
      handleBackendError(text)
    }
    return
  }

  // ===== 模式2: SSE 流式（Spring AI 原生）=====
  if (apiMode.value === 'stream' || chatMode.value === 'stream') {
    let fullContent = ''
    try {
      await chatStream(
        { message: text, history: chatHistory.value },
        {
          onChunk: (chunk) => {
            fullContent += chunk
            streamContent.value = fullContent
          },
          onDone: () => {
            isTyping.value = false
            streamContent.value = ''
            messages.value.push({ role: 'assistant', content: fullContent })
            chatHistory.value.push({ role: 'assistant', content: fullContent })
          },
          onError: (err) => {
            console.error('SSE Error:', err)
            handleBackendError(text)
          }
        }
      )
    } catch {
      handleBackendError(text)
    }
    return
  }

  // ===== 模式3: 本地模拟（无后端时）=====
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
  isTyping.value = false
  const response = getLocalResponse(text)
  messages.value.push({ role: 'assistant', content: response })
  chatHistory.value.push({ role: 'assistant', content: response })
}

function handleBackendError(text) {
  isTyping.value = false
  streamContent.value = ''
  currentSources.value = []
  apiMode.value = 'local'
  const fallback = getLocalResponse(text)
  messages.value.push({
    role: 'assistant',
    content: '⚠️ 后端连接中断（Spring AI / ES），已切换为本地模拟模式。\n\n' + fallback
  })
}

// ===== 独立知识库搜索（调试用）=====
async function doKbSearch(query) {
  try {
    const res = await searchKnowledgeBase({ query, topK: 3 })
    return res.data?.documents || []
  } catch {
    ElMessage.warning('知识库搜索失败')
    return []
  }
}
</script>

<style scoped>
.eyebrow { margin: 0 0 4px; color: #1c785f; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.chat-card { max-width: 900px; }
.chat-messages { height: calc(100vh - 420px); min-height: 300px; overflow-y: auto; padding: 16px; background: #fafbfc; }
.message-row { display: flex; gap: 12px; margin-bottom: 16px; animation: messageIn 0.3s ease; }
.message-row.user { flex-direction: row-reverse; }
.message-row.assistant { justify-content: flex-start; }
@keyframes messageIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.message-avatar { flex-shrink: 0; }
.message-content { max-width: 75%; }
.message-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.message-row.user .message-label { text-align: right; }
.message-bubble { padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.7; color: #333; background: #fff; border: 1px solid #e4e7ed; box-shadow: 0 1px 3px rgba(0,0,0,0.04); word-break: break-word; }
.message-row.user .message-bubble { background: #ecf5ff; border-color: #d9ecff; }

/* RAG 知识来源 */
.rag-sources { margin-top: 8px; padding: 8px 12px; background: #f0f9eb; border: 1px solid #e1f3d8; border-radius: 8px; }
.rag-sources.typing { opacity: 0.7; }
.rag-sources-title { font-size: 12px; color: #67c23a; font-weight: 600; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; }
.rag-source-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; cursor: pointer; transition: all 0.2s; }
.rag-source-item:hover { opacity: 0.8; }
.rag-source-num { width: 18px; height: 18px; border-radius: 50%; background: #67c23a; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.rag-source-title { font-size: 12px; color: #333; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rag-source-score { flex-shrink: 0; font-size: 11px; }

.typing-dots-inline { display: inline-flex; align-items: center; gap: 4px; }
.typing-dots-inline i { width: 6px; height: 6px; border-radius: 50%; background: #c0c4cc; animation: bounce 1.4s ease-in-out infinite; }
.typing-dots-inline i:nth-child(2) { animation-delay: 0.2s; }
.typing-dots-inline i:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }

.chat-input-area { border-top: 1px solid #e4e7ed; padding: 16px 20px; background: #fff; }
.quick-questions { margin-bottom: 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.quick-label { font-size: 12px; color: #999; }
.quick-tag { cursor: pointer; transition: all 0.2s; }
.quick-tag:hover { background: #ecf5ff; }
.input-row { display: flex; gap: 12px; }
.send-btn { align-self: flex-end; height: 54px; padding: 0 24px; }
.input-hint { margin-top: 8px; font-size: 11px; color: #999; display: flex; align-items: center; gap: 4px; }

/* 知识库原文弹窗 */
.source-detail { font-size: 13px; }
.source-content { max-height: 300px; overflow-y: auto; line-height: 1.8; padding: 8px; background: #f5f7fa; border-radius: 4px; white-space: pre-wrap; }
</style>
