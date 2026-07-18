import type { Answer, DatasetProfile, RunEvent } from './types'

export type MobileSection = 'dataset' | 'analysis' | 'evidence'

export interface AnalysisEntry {
  id: string
  question: string
  status: 'running' | 'complete' | 'error'
  stage?: RunEvent['stage']
  message?: string
  answer?: Answer
  error?: string
}

interface BaseState {
  activeSection: MobileSection
}

export type WorkspaceState =
  | (BaseState & { status: 'booting' })
  | (BaseState & { status: 'empty'; sessionId: string })
  | (BaseState & {
      status: 'uploading'
      sessionId: string
      filename: string
    })
  | (BaseState & {
      status: 'ready'
      sessionId: string
      profile: DatasetProfile
      entries: AnalysisEntry[]
      activeRunId: string | null
      selectedAnswerId: string | null
    })
  | (BaseState & {
      status: 'failed'
      sessionId: string | null
      message: string
    })

export type WorkspaceAction =
  | { type: 'boot' }
  | { type: 'session-created'; sessionId: string }
  | { type: 'upload-started'; filename: string }
  | { type: 'upload-succeeded'; profile: DatasetProfile }
  | { type: 'failed'; message: string }
  | { type: 'section-selected'; section: MobileSection }
  | { type: 'run-started'; runId: string; question: string }
  | { type: 'run-event'; runId: string; event: RunEvent }
  | { type: 'run-failed'; runId: string; question: string; message: string }
  | { type: 'evidence-selected'; runId: string }
  | { type: 'evidence-closed' }

export const initialState: WorkspaceState = {
  status: 'booting',
  activeSection: 'analysis',
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case 'boot':
      return { status: 'booting', activeSection: 'analysis' }
    case 'session-created':
      return {
        status: 'empty',
        sessionId: action.sessionId,
        activeSection: 'analysis',
      }
    case 'upload-started':
      if (state.status !== 'empty') return state
      return {
        status: 'uploading',
        sessionId: state.sessionId,
        filename: action.filename,
        activeSection: state.activeSection,
      }
    case 'upload-succeeded':
      if (state.status !== 'uploading') return state
      return {
        status: 'ready',
        sessionId: state.sessionId,
        profile: action.profile,
        activeSection: 'dataset',
        entries: [],
        activeRunId: null,
        selectedAnswerId: null,
      }
    case 'failed':
      return {
        status: 'failed',
        sessionId: 'sessionId' in state ? state.sessionId : null,
        message: action.message,
        activeSection: state.activeSection,
      }
    case 'section-selected':
      return { ...state, activeSection: action.section }
    case 'run-started':
      if (state.status !== 'ready') return state
      return {
        ...state,
        activeRunId: action.runId,
        entries: [
          ...state.entries,
          {
            id: action.runId,
            question: action.question,
            status: 'running',
            stage: 'planning',
            message: '正在规划分析',
          },
        ],
      }
    case 'run-event':
      if (state.status !== 'ready') return state
      return {
        ...state,
        activeRunId:
          action.event.type === 'progress' ? state.activeRunId : null,
        entries: state.entries.map((entry) => {
          if (entry.id !== action.runId) return entry
          if (action.event.type === 'progress') {
            return {
              ...entry,
              stage: action.event.stage,
              message: action.event.message ?? undefined,
            }
          }
          if (action.event.type === 'answer' && action.event.answer) {
            return { ...entry, status: 'complete', answer: action.event.answer }
          }
          return {
            ...entry,
            status: 'error',
            error: action.event.error?.message ?? '分析未能完成。',
          }
        }),
      }
    case 'run-failed':
      if (state.status !== 'ready') return state
      return {
        ...state,
        activeRunId: null,
        entries: [
          ...state.entries.filter((entry) => entry.id !== action.runId),
          {
            id: action.runId,
            question: action.question,
            status: 'error',
            error: action.message,
          },
        ],
      }
    case 'evidence-selected':
      if (state.status !== 'ready') return state
      return {
        ...state,
        selectedAnswerId: action.runId,
        activeSection: 'evidence',
      }
    case 'evidence-closed':
      if (state.status !== 'ready') return state
      return {
        ...state,
        selectedAnswerId: null,
        activeSection: state.activeSection === 'evidence' ? 'analysis' : state.activeSection,
      }
  }
}
