import { ref, nextTick } from 'vue'
import { manuals, quickQuestions, AI_CONFIG } from '@/data/manuals.js'

const repairKeywords = ['坏了', '不能', '无法', '不工作', '不启动', '不加热', '不制冷', '不转', '不亮', '漏水', '异响', '故障灯', 'e1', 'e2', 'e3', 'e0']

export function useChat(currentManualId) {
  const messages = ref([{
    id: 'welcome',
    role: 'system',
    content: '您好！我是AI说明书助手。\n\n您可以询问使用步骤、功能介绍、故障排查或维护方法。如果故障无法自行解决，我可以帮您预约上门维修服务。'
  }])
  const chatHistory = ref([])
  const isTyping = ref(false)
  const lastDiagnosis = ref('')
  const inputMessage = ref('')
  const showChips = ref(true)

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  }

  function renderMessage(msg) {
    const cls = msg.role === 'user' ? 'message-row user' : 'message-row'
    const avatarCls = `msg-avatar ${msg.role}`
    const bubbleCls = `msg-bubble ${msg.role}`
    const avatar = msg.role === 'user' ? '\u{1F464}' : (msg.role === 'system' ? '\u{1F4AC}' : '\u{1F916}')
    return `<div class="${cls}"><div class="${avatarCls}">${avatar}</div><div class="${bubbleCls}">${escapeHtml(msg.content)}</div></div>`
  }

  function getLocalResponse(manualId, question) {
    const m = manuals[manualId], q = question.toLowerCase()
    lastDiagnosis.value = ''
    const needsRepair = repairKeywords.some(kw => q.includes(kw))
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
    } else if (q.includes('功能') || q.includes('特色') || q.includes('模式') || q.includes('菜单')) {
      response = `${m.name}的核心功能介绍：\n\n暂无详细功能数据，数据将由后端数据库导入。\n\n您可以查看说明书的「操作面板说明」章节了解具体使用方法。`
    } else if (q.includes('时间') || q.includes('温度') || q.includes('设置') || q.includes('怎么设') || q.includes('多少度') || q.includes('多久')) {
      const items = m.sections.find(s => s[0].includes('操作'))?.[1] || ['参考说明书中的推荐参数', '根据实际使用情况适当调整']
      response = `关于${m.name}的设置建议：\n\n${items.map((item, i) => (i + 1) + '. ' + item).join('\n')}\n\n💡 小贴士：不同食材和用量可能需要微调参数，多试几次就能掌握最佳设置。`
    } else {
      const defaults = [
        `关于您的提问，我建议您参考${m.name}说明书的以下内容：\n\n${m.sections.map(s => '• **' + s[0] + '**：' + s[1][0]).join('\n')}\n\n如果还有疑问，可以点击快捷问题或继续输入咨询。`,
        `好的，关于${m.name}的问题，您可以查看说明书中的「${m.sections[0][0]}」章节。\n\n需要我详细介绍哪个部分吗？`,
        `收到！根据${m.name}的说明书，我为您整理了相关信息。\n\n建议您重点关注：\n1. ${m.sections[0][0]}\n2. ${m.sections[1][0]}\n3. 故障修理板块\n\n还有什么可以帮您的吗？`
      ]
      response = defaults[Math.floor(Math.random() * defaults.length)]
    }

    if (needsRepair) {
      lastDiagnosis.value = response
      response += '\n\n---\n\n🔴 根据您的描述，该故障可能涉及硬件问题，建议预约专业维修人员上门检测。您可以点击下方按钮提交维修预约，我们的工程师将尽快与您联系。'
    }
    return response
  }

  async function sendMessage(text) {
    if (!text.trim() || isTyping.value) return
    const userMsg = { id: 'user-' + Date.now(), role: 'user', content: text.trim() }
    messages.value.push(userMsg)
    inputMessage.value = ''
    isTyping.value = true

    if (messages.value.length > 2) showChips.value = false

    const mode = AI_CONFIG.mode
    const apiUrl = AI_CONFIG.apiBaseUrl

    if (mode === 'api' && apiUrl) {
      try {
        const response = await fetch(apiUrl + '/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text.trim(), manualId: currentManualId.value, history: chatHistory.value })
        })
        if (!response.ok) throw new Error('HTTP ' + response.status)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let fullText = ''
        messages.value.push({ id: 'ai-' + Date.now(), role: 'assistant', content: '' })

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.content) {
                  fullText += data.content
                  const lastMsg = messages.value[messages.value.length - 1]
                  if (lastMsg && lastMsg.role === 'assistant') lastMsg.content = fullText
                }
              } catch (e) { }
            }
          }
        }
        isTyping.value = false
        chatHistory.value.push({ role: 'user', content: text.trim() })
        const lastAIMsg = messages.value[messages.value.length - 1]
        if (lastAIMsg?.role === 'assistant' && lastAIMsg.content) {
          chatHistory.value.push({ role: 'assistant', content: lastAIMsg.content })
        }
        if (chatHistory.value.length > 12) chatHistory.value = chatHistory.value.slice(-12)
      } catch (e) {
        isTyping.value = false
        messages.value.push({
          id: 'ai-err-' + Date.now(),
          role: 'assistant',
          content: '❌ API调用失败：' + e.message + '\n\n已自动切换到本地模拟模式回答。'
        })
      }
    } else {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 600))
      isTyping.value = false
      const response = getLocalResponse(currentManualId.value, text.trim())
      messages.value.push({ id: 'ai-' + Date.now(), role: 'assistant', content: response })
    }
  }

  function resetChat(manualId) {
    messages.value = [{
      id: 'welcome',
      role: 'system',
      content: '您好！我是AI说明书助手。\n\n您可以询问使用步骤、功能介绍、故障排查或维护方法。如果故障无法自行解决，我可以帮您预约上门维修服务。'
    }]
    chatHistory.value = []
    lastDiagnosis.value = ''
    showChips.value = true
  }

  return {
    messages,
    isTyping,
    lastDiagnosis,
    inputMessage,
    showChips,
    quickQuestions,
    sendMessage,
    resetChat,
    renderMessage,
    escapeHtml
  }
}
