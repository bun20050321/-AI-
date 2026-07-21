/**
 * AI 大模型对话 API (Spring AI + Elasticsearch)
 *
 * ============================================================================
 * 后端接口说明（Spring Boot + Spring AI + ES）
 * ============================================================================
 *
 * 【1】知识库检索（ES）
 * POST /api/kb/search
 * 请求体: { query: string, topK?: number, filters?: { category?: string, deviceType?: string } }
 * 响应:   { documents: Array<{ id, content, title, score, metadata }> }
 *
 * 【2】RAG 流式对话（Spring AI + ES）
 * POST /api/ai/chat/rag/stream
 * 请求体: { message: string, history?: Array<{role, content}>, useKb?: boolean, topK?: number }
 * 响应:   SSE 数据流，格式: data: { content: "片段文本", done: false, sources?: Array }
 *          结束时: data: { content: "", done: true, sources: [...] }
 *
 * 【3】普通流式对话（Spring AI）
 * POST /api/ai/chat/stream
 * 请求体: { message: string, history?: Array<{role, content}> }
 * 响应:   SSE 数据流，格式: data: { content: "片段文本", done: false }
 *          结束时: data: { content: "", done: true }
 *
 * 【4】非流式对话（Spring AI）
 * POST /api/ai/chat
 * 请求体: { message: string, history?: Array<{role, content}> }
 * 响应:   { content: string }
 *
 * ============================================================================
 */

import request from './request.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

// ===== SSE 通用解析器 =====
async function parseSSE(response, { onChunk, onDone, onError, onSources }) {
  try {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

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
          if (data.sources) onSources?.(data.sources)
          if (data.done) {
            onDone?.()
            return
          }
        } catch {
          onChunk?.(dataStr)
        }
      }
    }
    onDone?.()
  } catch (error) {
    onError?.(error)
  }
}

// ===== 1. 知识库检索（ES）=====
/**
 * 从 Elasticsearch 检索知识库文档
 * 后端: POST /api/kb/search
 * 请求体: { query, topK, filters }
 * 响应: { documents: [{ id, content, title, score, metadata }] }
 */
export async function searchKnowledgeBase(params) {
  return request.post('/api/kb/search', params)
}

/**
 * 带 SSE 的知识库检索（流式返回文档片段）
 * 后端: POST /api/kb/search/stream
 */
export async function searchKnowledgeBaseStream(params, { onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/kb/search/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await parseSSE(response, { onChunk, onDone, onError })
  } catch (error) {
    onError?.(error)
  }
}

// ===== 2. RAG 流式对话（Spring AI + ES）=====
/**
 * RAG 模式：先检索 ES 知识库，再用 Spring AI 生成回答（SSE 流式）
 * 后端: POST /api/ai/chat/rag/stream
 * 请求体: { message, history, useKb, topK }
 * 响应: SSE { content, done, sources: [{ title, score, content }] }
 */
export async function chatRagStream(params, { onChunk, onDone, onError, onSources }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat/rag/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ useKb: true, topK: 3, ...params })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await parseSSE(response, { onChunk, onDone, onError, onSources })
  } catch (error) {
    onError?.(error)
  }
}

// ===== 3. 普通流式对话（Spring AI）=====
/**
 * SSE 流式对话（Spring AI 原生）
 * 后端: POST /api/ai/chat/stream
 * 请求体: { message, history }
 * 响应: SSE { content, done }
 */
export async function chatStream(params, { onChunk, onDone, onError }) {
  try {
    const response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    await parseSSE(response, { onChunk, onDone, onError })
  } catch (error) {
    onError?.(error)
  }
}

// ===== 4. 非流式对话（Spring AI）=====
/**
 * 非流式对话（Spring AI）
 * 后端: POST /api/ai/chat
 * 请求体: { message, history }
 * 响应: { content: string }
 */
export async function chatSimple(params) {
  return request.post('/api/ai/chat', params)
}
