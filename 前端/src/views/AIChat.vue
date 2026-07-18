<template>
  <div class="ai-chat-page">
    <el-card shadow="never" class="chat-card">
      <!-- Chat Messages -->
      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message-row', msg.role]"
        >
          <div class="message-avatar">
            <el-avatar
              :size="36"
              :icon="msg.role === 'user' ? UserFilled : ChatRound"
              :style="{ background: msg.role === 'user' ? '#409eff' : '#67c23a' }"
            />
          </div>
          <div class="message-content">
            <div class="message-label">{{ msg.role === 'user' ? '您' : 'AI 助手' }}</div>
            <div class="message-bubble" v-html="renderContent(msg.content)"></div>
          </div>
        </div>

        <!-- Typing indicator -->
        <div v-if="isTyping" class="message-row assistant">
          <div class="message-avatar">
            <el-avatar :size="36" :icon="ChatRound" :style="{ background: '#67c23a' }" />
          </div>
          <div class="message-content">
            <div class="message-label">AI 助手</div>
            <div class="message-bubble typing">
              <span class="dot"></span>
              <span class="dot"></span>
              <span class="dot"></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="chat-input-area">
        <!-- Quick Questions -->
        <div class="quick-questions" v-if="messages.length <= 1">
          <span class="quick-label">快捷问题：</span>
          <el-tag
            v-for="q in quickQuestions"
            :key="q"
            class="quick-tag"
            effect="plain"
            type="primary"
            @click="sendMessage(q)"
          >
            {{ q }}
          </el-tag>
        </div>

        <div class="input-row">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="2"
            placeholder="请输入您的问题，AI 助手将为您解答..."
            resize="none"
            @keydown.enter.prevent="handleEnter"
          />
          <el-button
            type="primary"
            :icon="Promotion"
            :loading="isTyping"
            @click="handleSend"
            class="send-btn"
          >
            发送
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { UserFilled, ChatRound, Promotion } from '@element-plus/icons-vue'

const inputMessage = ref('')
const isTyping = ref(false)
const messagesRef = ref(null)

const messages = ref([
  {
    role: 'assistant',
    content: '您好！我是 AI 智能助手，可以帮您查询家电使用说明、故障排查方法以及维修相关知识。请问有什么可以帮您？'
  }
])

const quickQuestions = [
  '洗衣机不进水怎么办？',
  '冰箱制冷效果不好怎么处理？',
  '空调显示 E1 错误是什么意思？',
  '电饭煲显示 E0 怎么解决？'
]

const renderContent = (content) => {
  return content.replace(/\n/g, '<br>')
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

watch(messages, scrollToBottom, { deep: true })

const handleEnter = (e) => {
  if (!e.shiftKey) {
    handleSend()
  }
}

const handleSend = () => {
  const text = inputMessage.value.trim()
  if (!text || isTyping.value) return

  // Add user message
  messages.value.push({ role: 'user', content: text })
  inputMessage.value = ''
  isTyping.value = true

  // Simulate AI response
  setTimeout(() => {
    isTyping.value = false
    const responses = [
      '根据家电维修知识库，该问题通常由以下原因导致：1. 电源连接异常 2. 传感器故障 3. 控制板问题。建议您先检查电源和插头连接是否正常。',
      '这个问题比较常见。您可以尝试以下步骤排查：首先确认设备已正确通电，然后检查相关设置是否正确。如果问题仍然存在，建议预约专业维修人员上门检查。',
      '收到您的问题！根据相关资料，该故障代码通常表示通信异常或传感器故障。您可以先尝试重启设备，如果问题持续存在，请通过「维修工单」页面提交报修申请。'
    ]
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    messages.value.push({ role: 'assistant', content: randomResponse })
  }, 1200 + Math.random() * 1000)
}

const sendMessage = (text) => {
  inputMessage.value = text
  handleSend()
}
</script>

<style scoped>
.ai-chat-page {
  max-width: 900px;
  margin: 0 auto;
  height: calc(100vh - 136px);
}

.chat-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: #fafbfc;
}

.message-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  animation: messageIn 0.3s ease;
}

.message-row.user {
  flex-direction: row-reverse;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
}

.message-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.message-row.user .message-label {
  text-align: right;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: #333;
  background: #fff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.message-row.user .message-bubble {
  background: #ecf5ff;
  border-color: #d9ecff;
}

.message-bubble.typing {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 20px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: bounce 1.4s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* Input Area */
.chat-input-area {
  border-top: 1px solid #e4e7ed;
  padding: 16px 20px;
  background: #fff;
}

.quick-questions {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.quick-label {
  font-size: 12px;
  color: #999;
}

.quick-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.quick-tag:hover {
  background: #ecf5ff;
}

.input-row {
  display: flex;
  gap: 12px;
}

.input-row :deep(.el-textarea__inner) {
  border-radius: 8px;
}

.send-btn {
  align-self: flex-end;
  height: 54px;
  padding: 0 24px;
}
</style>
