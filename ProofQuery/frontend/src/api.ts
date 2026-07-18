import type { DatasetProfile, ErrorBody, RunEvent } from './types'

export class ApiError extends Error {
  readonly code: string
  readonly details: ErrorBody['details']

  constructor(body: ErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.code = body.code
    this.details = body.details
  }
}

export interface ProofQueryApi {
  createSession(): Promise<{ id: string }>
  uploadDataset(sessionId: string, file: File): Promise<DatasetProfile>
  deleteSession(sessionId: string): Promise<void>
  askQuestion(sessionId: string, question: string): Promise<{ run_id: string }>
  streamRun(
    sessionId: string,
    runId: string,
    onEvent: (event: RunEvent) => void,
  ): Promise<void>
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const fallback: ErrorBody = {
      code: 'NETWORK_ERROR',
      message: '请求未能完成，请稍后重试。',
      details: {},
    }
    const body = await response.json().catch(() => fallback)
    throw new ApiError(body as ErrorBody)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

export const proofQueryApi: ProofQueryApi = {
  async createSession() {
    return parseResponse<{ id: string }>(
      await fetch('/api/sessions', { method: 'POST' }),
    )
  },

  async uploadDataset(sessionId, file) {
    const body = new FormData()
    body.append('file', file)
    return parseResponse<DatasetProfile>(
      await fetch(`/api/sessions/${sessionId}/dataset`, {
        method: 'POST',
        body,
      }),
    )
  },

  async deleteSession(sessionId) {
    await parseResponse<void>(
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' }),
    )
  },

  async askQuestion(sessionId, question) {
    return parseResponse<{ run_id: string }>(
      await fetch(`/api/sessions/${sessionId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      }),
    )
  },

  async streamRun(sessionId, runId, onEvent) {
    const response = await fetch(
      `/api/sessions/${sessionId}/runs/${runId}/events`,
      { headers: { Accept: 'text/event-stream' } },
    )
    if (!response.ok) {
      await parseResponse<void>(response)
      return
    }
    if (!response.body) {
      throw new ApiError({
        code: 'STREAM_UNAVAILABLE',
        message: '分析事件流不可用。',
        details: {},
      })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, '\n')
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''
      for (const block of blocks) {
        const data = block
          .split('\n')
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trimStart())
          .join('\n')
        if (data) onEvent(JSON.parse(data) as RunEvent)
      }
      if (done) break
    }
  },
}
