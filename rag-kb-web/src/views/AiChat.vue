<template>
  <section class="workspace-page">
    <div class="page-heading">
      <p class="eyebrow">Assistant</p>
      <h3>AI 问答</h3>
      <p>AI智能助手，可查询家电使用说明、故障排查方法及维修相关知识</p>
    </div>

    <!-- 模式切换提示（开发调试，后端完成后可隐藏） -->
    <el-alert
      :title="apiMode === 'stream' ? '当前：SSE流式模式（调用后端API）' : '当前：本地模拟模式（无后端）'"
      :type="apiMode === 'stream' ? 'success' : 'info'"
      :closable="false"
      style="margin-bottom: 12px; max-width: 900px;"
    >
      <template #default>
        <span v-if="apiMode === 'stream'">正在调用后端 /api/ai/chat/stream 接口</span>
        <span v-else>
          后端未连接，使用本地模拟回复。
          <el-button link type="primary" size="small" @click="testApi">测试后端连接</el-button>
        </span>
      </template>
    </el-alert>

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
              :icon="msg.role === 'user' ? UserFilled : ChatRound"
              :style="{ background: msg.role === 'user' ? '#1c785f' : '#409eff' }"
            />
          </div>
          <div class="message-content">
            <div class="message-label">{{ msg.role === 'user' ? '您' : 'AI 助手' }}</div>
            <div class="message-bubble" v-html="renderContent(msg.content)"></div>
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
            placeholder="请输入您的问题，AI助手将为您解答..."
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
      </div>
    </el-card>
  </section>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UserFilled, ChatRound, Promotion } from '@element-plus/icons-vue'
import { chatStream } from '@/api/ai.js'
import { checkBackendHealth } from '@/api/health.js'

// ===== 状态 =====
const messages = ref([{
  role: 'assistant',
  content: '您好！我是 AI 智能助手，可以帮您查询家电使用说明、故障排查方法以及维修相关知识。请问有什么可以帮您？'
}])
const isTyping = ref(false)
const inputMsg = ref('')
const messagesRef = ref(null)
const streamContent = ref('')       // 流式输出累积内容
const apiMode = ref('local')        // 'local' | 'stream' | 'simple'
const chatHistory = ref([])         // 对话历史，传给后端

const quickQuestionsList = [
  '洗衣机不进水怎么办？',
  '冰箱制冷效果不好怎么处理？',
  '空调显示 E1 错误是什么意思？'
]

// ===== 初始化：检测后端是否可用 =====
async function testApi() {
  const health = await checkBackendHealth()
  if (health.connected) {
    apiMode.value = 'stream'
    ElMessage.success('后端已连接，切换为流式模式')
  } else {
    apiMode.value = 'local'
    ElMessage.info('后端未连接，保持本地模拟')
  }
}
testApi() // 自动检测一次

// ===== 渲染消息（转义HTML + 换行）=====
function renderContent(content) {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
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

// ===== 本地模拟回复（fallback）=====
function getLocalResponse(question) {
  const q = question.toLowerCase()
  if (q.includes('不进水') || q.includes('e1')) {
    return '洗衣机不进水（显示E1）的常见原因：\n\n1. **水龙头未打开** - 检查进水阀门是否开启\n2. **进水阀堵塞** - 清理进水阀过滤网\n3. **进水管弯折** - 理顺进水管路\n4. **进水阀故障** - 需要更换进水阀\n\n建议先检查前三项，如仍无法解决请联系维修人员。'
  }
  if (q.includes('制冷') || q.includes('不冷')) {
    return '冰箱制冷效果差的可能原因：\n\n1. **温控器设置不当** - 冷藏室建议 2-5°C，冷冻室 -18°C\n2. **门封条老化** - 检查密封条是否漏气\n3. **冷凝器积灰** - 清理背部冷凝器灰尘\n4. **制冷剂泄漏** - 需要专业人员检修\n\n您可以先尝试调整温度设置和清洁冷凝器。'
  }
  if (q.includes('e1') || q.includes('error') || q.includes('错误')) {
    return 'E1 错误代码通常表示通信故障或传感器异常。\n\n**排查步骤：**\n1. 断电重启设备\n2. 检查电源线和插座\n3. 检查室内外机连接线\n4. 如仍报错，记录完整错误代码后联系售后\n\n不同品牌E1含义可能不同，建议同时查看说明书故障代码表。'
  }
  return '感谢您的提问！我已经记录了您的问题，会尽快为您查找相关资料。\n\n如果故障无法自行解决，建议：\n1. 查看设备说明书的故障排查章节\n2. 通过「提出故障」功能提交维修申请\n3. 拨打售后服务热线\n\n请问还有其他可以帮您的吗？'
}

// ===== 发送消息 =====
async function sendMessage() {
  const text = inputMsg.value.trim()
  if (!text || isTyping.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputMsg.value = ''
  isTyping.value = true
  streamContent.value = ''

  // 维护历史记录（最多保留10轮）
  chatHistory.value.push({ role: 'user', content: text })
  if (chatHistory.value.length > 20) {
    chatHistory.value = chatHistory.value.slice(-20)
  }

  // ===== 模式1: SSE 流式输出（推荐，需后端支持）=====
  if (apiMode.value === 'stream') {
    let fullContent = ''
    try {
      await chatStream(
        {
          message: text,
          history: chatHistory.value,
          // manualId: currentManualId // 如有需要可传当前设备ID
        },
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
            isTyping.value = false
            streamContent.value = ''
            // 出错时降级到本地模拟
            const fallback = getLocalResponse(text)
            messages.value.push({
              role: 'assistant',
              content: '⚠️ 后端连接中断，已切换为本地模式。\n\n' + fallback
            })
            apiMode.value = 'local'
          }
        }
      )
    } catch (err) {
      isTyping.value = false
      streamContent.value = ''
      apiMode.value = 'local'
      const fallback = getLocalResponse(text)
      messages.value.push({ role: 'assistant', content: fallback })
    }
    return
  }

  // ===== 模式2: 本地模拟（无后端时）=====
  await new Promise(r => setTimeout(r, 800 + Math.random() * 600))
  isTyping.value = false
  const response = getLocalResponse(text)
  messages.value.push({ role: 'assistant', content: response })
  chatHistory.value.push({ role: 'assistant', content: response })
}
</script>

<style scoped>
.eyebrow { margin: 0 0 4px; color: #1c785f; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.chat-card { max-width: 900px; }
.chat-messages { height: calc(100vh - 380px); min-height: 300px; overflow-y: auto; padding: 16px; background: #fafbfc; }
.message-row { display: flex; gap: 12px; margin-bottom: 16px; animation: messageIn 0.3s ease; }
.message-row.user { flex-direction: row-reverse; }
.message-row.assistant { justify-content: flex-start; }
@keyframes messageIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
.message-avatar { flex-shrink: 0; }
.message-content { max-width: 70%; }
.message-label { font-size: 12px; color: #999; margin-bottom: 4px; }
.message-row.user .message-label { text-align: right; }
.message-bubble { padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.7; color: #333; background: #fff; border: 1px solid #e4e7ed; box-shadow: 0 1px 3px rgba(0,0,0,0.04); word-break: break-word; }
.message-row.user .message-bubble { background: #ecf5ff; border-color: #d9ecff; }
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
</style>
