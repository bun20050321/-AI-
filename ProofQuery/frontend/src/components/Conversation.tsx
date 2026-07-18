import { AlertCircle, LoaderCircle, ScrollText } from 'lucide-react'

import type { AnalysisEntry } from '../state'
import { AnswerBlock } from './AnswerBlock'

export type { AnalysisEntry } from '../state'

interface ConversationProps {
  entries: AnalysisEntry[]
  onEvidence(runId: string): void
}

export function Conversation({ entries, onEvidence }: ConversationProps) {
  if (!entries.length) {
    return (
      <div className="conversation-empty">
        <div className="conversation-glyph" aria-hidden="true">
          <ScrollText size={22} />
        </div>
        <strong>分析记录</strong>
        <span>暂无查询</span>
      </div>
    )
  }

  return (
    <div className="conversation-feed" aria-live="polite">
      {entries.map((entry) => (
        <div className="conversation-turn" key={entry.id}>
          <div className="question-bubble">{entry.question}</div>
          {entry.status === 'running' ? (
            <div className="analysis-progress">
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
              <span>{entry.message ?? '正在分析'}</span>
            </div>
          ) : null}
          {entry.status === 'complete' && entry.answer ? (
            <AnswerBlock
              answer={entry.answer}
              onEvidence={() => onEvidence(entry.id)}
            />
          ) : null}
          {entry.status === 'error' ? (
            <div className="analysis-error" role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <span>{entry.error ?? '分析未能完成。'}</span>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
