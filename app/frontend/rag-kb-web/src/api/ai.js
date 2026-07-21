/**
 * AI 大模型对话 API
 *
 * 后端需要提供以下接口：
 *
 * POST /api/ai/chat       - 非流式对话（简易模式）
 * POST /api/ai/chat/stream - SSE 流式对话（推荐）
 *
 * 请求体: { message: string, history?: Array<{role, content}>, manualId?: string }
 * 响应:   SSE 数据流，格式: data: { content: "片段文本", done: false }
 *         结束时: data: { content: "", done: true }
 */

import request from './request.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

/**
 * 非流式对话（简易模式）
 * 后端返回: { content: string }
 */
export async function chatSimple(params) {
  return request.post('/api/ai/chat', params)
}

/**
 * SSE 流式对话（推荐模式）
 * 后端通过 Server-Sent Events 逐字返回 AI 回复
 *
 * @param {Object} params - { message, history, manualId }
 * @param {Function} onChunk - 每次收到数据回调 (chunk: string) => void
 * @param {Function} onDone - 完成回调 () => void
 * @param {Function} onError - 错误回调 (error) => void
 */
export async function chatStream(params, { onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data: ')) continue

        const dataStr = trimmed.slice(6)
        if (dataStr === '[DONE]') {
          onDone?.()
          return
        }

        try {
          const data = JSON.parse(dataStr)
          if (data.content) onChunk?.(data.content)
          if (data.done) {
            onDone?.()
            return
          }
        } catch {
          // 非JSON格式，直接作为文本
          onChunk?.(dataStr)
        }
      }
    }

    onDone?.()
  } catch (error) {
    onError?.(error)
  }
}
