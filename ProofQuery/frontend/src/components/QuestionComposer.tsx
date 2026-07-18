import { LoaderCircle, Send } from 'lucide-react'

interface QuestionComposerProps {
  value: string
  disabled: boolean
  onChange(value: string): void
  onSubmit(): void
}

export function QuestionComposer({
  value,
  disabled,
  onChange,
  onSubmit,
}: QuestionComposerProps) {
  const canSubmit = value.trim().length > 0 && !disabled

  return (
    <form
      className="composer-shell"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) onSubmit()
      }}
    >
      <label htmlFor="analysis-question">分析问题</label>
      <textarea
        id="analysis-question"
        aria-label="分析问题"
        rows={2}
        value={value}
        disabled={disabled}
        placeholder="例如：哪个地区的收入最高？"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && canSubmit) {
            event.preventDefault()
            onSubmit()
          }
        }}
      />
      <button type="submit" aria-label="发送问题" disabled={!canSubmit} title="发送问题">
        {disabled ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
      </button>
    </form>
  )
}
