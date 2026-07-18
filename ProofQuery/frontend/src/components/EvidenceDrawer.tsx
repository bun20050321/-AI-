import { Check, Copy, ScrollText, X } from 'lucide-react'
import { useState } from 'react'

import type { Answer, QueryEvidence } from '../types'

interface EvidenceDrawerProps {
  answer: Answer
  onClose(): void
}

function EvidenceSection({ title, evidence }: { title: string; evidence: QueryEvidence }) {
  const [copied, setCopied] = useState(false)

  async function copySql() {
    try {
      await navigator.clipboard.writeText(evidence.sql)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="evidence-section">
      <div className="evidence-section-heading">
        <h3>{title}</h3>
        <button
          type="button"
          className="mini-icon-button"
          aria-label={`复制${title}`}
          title={`复制${title}`}
          onClick={() => void copySql()}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre><code>{evidence.sql}</code></pre>
      <div className="evidence-meta">
        <span>{evidence.result.row_count} 行 · {evidence.result.duration_ms} ms</span>
        {evidence.result.truncated ? <span>结果已截断</span> : null}
      </div>
    </section>
  )
}

export function EvidenceDrawer({ answer, onClose }: EvidenceDrawerProps) {
  return (
    <div className="evidence-drawer">
      <div className="evidence-heading">
        <ScrollText size={17} aria-hidden="true" />
        <h2>证据</h2>
        <button
          type="button"
          className="mini-icon-button evidence-close"
          aria-label="关闭证据"
          title="关闭证据"
          onClick={onClose}
        >
          <X size={16} />
        </button>
      </div>
      <div className="evidence-summary">
        <span className={`evidence-status status-${answer.evidence.status}`}>
          {answer.evidence.status === 'verified'
            ? '验证通过'
            : answer.evidence.status === 'uncertain'
              ? '验证未通过'
              : '无需数值验证'}
        </span>
        <p>{answer.conclusion}</p>
      </div>
      <EvidenceSection title="主查询" evidence={answer.evidence.primary} />
      {answer.evidence.verification ? (
        <EvidenceSection title="验证查询" evidence={answer.evidence.verification} />
      ) : null}
      {answer.limitations.length ? (
        <section className="evidence-limitations">
          <h3>限制</h3>
          <ul>{answer.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
    </div>
  )
}
