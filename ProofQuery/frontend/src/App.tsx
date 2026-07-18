import { useCallback, useEffect, useReducer, useState } from 'react'
import { LoaderCircle, RotateCcw } from 'lucide-react'

import { proofQueryApi, type ProofQueryApi } from './api'
import { DatasetDropzone } from './components/DatasetDropzone'
import { DatasetPanel } from './components/DatasetPanel'
import { Conversation } from './components/Conversation'
import { EvidenceDrawer } from './components/EvidenceDrawer'
import { MobileTabs } from './components/MobileTabs'
import { QuestionComposer } from './components/QuestionComposer'
import { initialState, workspaceReducer } from './state'
import './styles.css'

interface AppProps {
  api?: ProofQueryApi
}

export default function App({ api = proofQueryApi }: AppProps) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const startSession = useCallback(async () => {
    dispatch({ type: 'boot' })
    try {
      const session = await api.createSession()
      dispatch({ type: 'session-created', sessionId: session.id })
    } catch (error) {
      dispatch({
        type: 'failed',
        message: error instanceof Error ? error.message : '无法建立分析会话。',
      })
    }
  }, [api])

  useEffect(() => {
    void startSession()
  }, [startSession])

  async function upload(file: File) {
    if (state.status !== 'empty') return
    const sessionId = state.sessionId
    dispatch({ type: 'upload-started', filename: file.name })
    try {
      const profile = await api.uploadDataset(sessionId, file)
      dispatch({ type: 'upload-succeeded', profile })
    } catch (error) {
      dispatch({
        type: 'failed',
        message: error instanceof Error ? error.message : 'CSV 未能读取。',
      })
    }
  }

  async function reset() {
    const sessionId = 'sessionId' in state ? state.sessionId : null
    dispatch({ type: 'boot' })
    setDraft('')
    setSubmitting(false)
    try {
      if (sessionId) await api.deleteSession(sessionId)
    } finally {
      await startSession()
    }
  }

  async function submitQuestion(question = draft) {
    if (state.status !== 'ready' || state.activeRunId || submitting) return
    const normalizedQuestion = question.trim()
    if (!normalizedQuestion) return
    setSubmitting(true)
    setDraft('')
    let runId = `local-${Date.now()}`
    try {
      const started = await api.askQuestion(state.sessionId, normalizedQuestion)
      runId = started.run_id
      dispatch({ type: 'run-started', runId, question: normalizedQuestion })
      await api.streamRun(state.sessionId, runId, (event) => {
        dispatch({ type: 'run-event', runId, event })
      })
    } catch (error) {
      dispatch({
        type: 'run-failed',
        runId,
        question: normalizedQuestion,
        message: error instanceof Error ? error.message : '分析未能完成。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const ready = state.status === 'ready' ? state : null
  const selectedAnswer = ready?.entries.find(
    (entry) => entry.id === ready.selectedAnswerId,
  )?.answer

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">P</div>
          <div>
            <h1>ProofQuery</h1>
            <span>证据化 CSV 分析</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="session-state"><span />仅本次会话</span>
          {ready ? (
            <button
              className="icon-button"
              type="button"
              aria-label="重置会话"
              title="重置会话"
              onClick={() => void reset()}
            >
              <RotateCcw size={18} />
            </button>
          ) : null}
        </div>
      </header>

      {state.status === 'booting' ? (
        <main className="center-state" aria-live="polite">
          <LoaderCircle className="spin" size={24} />
          <span>正在建立临时会话</span>
        </main>
      ) : null}

      {state.status === 'empty' || state.status === 'uploading' ? (
        <main className="empty-workspace">
          <div className="empty-heading">
            <span className="eyebrow">新分析</span>
            <h2>从一个 CSV 开始</h2>
            <p>数据仅在本机临时会话中处理。</p>
          </div>
          <DatasetDropzone
            status={state.status === 'uploading' ? 'uploading' : 'idle'}
            filename={state.status === 'uploading' ? state.filename : undefined}
            onUpload={(file) => void upload(file)}
          />
          <div className="intake-facts" aria-label="接入限制">
            <span>单文件</span>
            <span>只读查询</span>
            <span>独立验证</span>
          </div>
        </main>
      ) : null}

      {state.status === 'failed' ? (
        <main className="center-state error-state" role="alert">
          <strong>暂时无法继续</strong>
          <p>{state.message}</p>
          <button className="command-button" type="button" onClick={() => void reset()}>
            <RotateCcw size={17} />
            重新开始
          </button>
        </main>
      ) : null}

      {ready ? (
        <>
          <MobileTabs
            active={ready.activeSection}
            onChange={(section) => dispatch({ type: 'section-selected', section })}
          />
          <div className="workspace-grid">
            <aside
              className="dataset-region"
              role="region"
              aria-label="数据集"
              data-mobile-active={ready.activeSection === 'dataset'}
            >
              <DatasetPanel profile={ready.profile} />
            </aside>

            <main
              className="analysis-region"
              role="region"
              aria-label="分析"
              data-mobile-active={ready.activeSection === 'analysis'}
            >
              <div className="analysis-heading">
                <div>
                  <span className="eyebrow">分析会话</span>
                  <h2>向数据提问</h2>
                </div>
                <span className="verification-key"><span />查询后验证</span>
              </div>
              <div className="suggestion-row">
                {ready.profile.suggested_questions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    disabled={submitting || ready.activeRunId !== null}
                    onClick={() => void submitQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
              <Conversation
                entries={ready.entries}
                onEvidence={(runId) => dispatch({ type: 'evidence-selected', runId })}
              />
              <QuestionComposer
                value={draft}
                disabled={submitting || ready.activeRunId !== null}
                onChange={setDraft}
                onSubmit={() => void submitQuestion()}
              />
            </main>

            <aside
              className="evidence-region"
              role="region"
              aria-label="证据"
              data-mobile-active={ready.activeSection === 'evidence'}
            >
              {selectedAnswer ? (
                <EvidenceDrawer
                  answer={selectedAnswer}
                  onClose={() => dispatch({ type: 'evidence-closed' })}
                />
              ) : (
                <>
                  <div className="evidence-heading"><h2>证据</h2></div>
                  <div className="evidence-empty"><span>暂无证据</span></div>
                </>
              )}
            </aside>
          </div>
        </>
      ) : null}
    </div>
  )
}
