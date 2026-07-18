import { AlertTriangle, Info, ScrollText, ShieldCheck } from 'lucide-react'

import type { Answer } from '../types'
import { ChartView, buildVegaSpec } from './ChartView'
import { ResultTable } from './ResultTable'

interface AnswerBlockProps {
  answer: Answer
  onEvidence(): void
}

const statusCopy = {
  verified: { label: '已验证', icon: ShieldCheck },
  uncertain: { label: '结果存在不确定性', icon: AlertTriangle },
  not_required: { label: '无需数值验证', icon: Info },
} as const

export function AnswerBlock({ answer, onEvidence }: AnswerBlockProps) {
  const status = statusCopy[answer.evidence.status]
  const StatusIcon = status.icon
  const hasValidChart = buildVegaSpec(answer) !== null

  return (
    <article className={`answer-block status-${answer.evidence.status}`}>
      <div className="answer-status">
        <StatusIcon size={15} aria-hidden="true" />
        <span>{status.label}</span>
      </div>
      <p className="answer-conclusion">{answer.conclusion}</p>
      {hasValidChart ? (
        <ChartView answer={answer} />
      ) : (
        <ResultTable result={answer.evidence.primary.result} />
      )}
      {answer.limitations.length ? (
        <div className="answer-limitations">
          <AlertTriangle size={15} aria-hidden="true" />
          <ul>
            {answer.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
        </div>
      ) : null}
      <div className="answer-actions">
        <button type="button" onClick={onEvidence}>
          <ScrollText size={16} aria-hidden="true" />
          查看证据
        </button>
      </div>
    </article>
  )
}
