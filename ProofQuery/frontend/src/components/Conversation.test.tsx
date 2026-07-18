import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { uncertainAnswer, verifiedAnswer } from '../test/fixtures'
import { AnswerBlock } from './AnswerBlock'
import { Conversation, type AnalysisEntry } from './Conversation'


describe('Conversation', () => {
  it('shows progress and a verified answer with evidence access', async () => {
    const onEvidence = vi.fn()
    const running: AnalysisEntry = {
      id: 'run-1',
      question: '按地区比较收入',
      status: 'running',
      stage: 'querying',
      message: '正在执行只读查询',
    }
    const { rerender } = render(
      <Conversation entries={[running]} onEvidence={onEvidence} />,
    )
    expect(screen.getByText('正在执行只读查询')).toBeVisible()

    rerender(
      <Conversation
        entries={[{ ...running, status: 'complete', answer: verifiedAnswer }]}
        onEvidence={onEvidence}
      />,
    )
    expect(screen.getByText('已验证')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: '查看证据' }))
    expect(onEvidence).toHaveBeenCalledWith('run-1')
  })

  it('labels failed verification without verified styling', () => {
    render(<AnswerBlock answer={uncertainAnswer} onEvidence={vi.fn()} />)

    expect(screen.getByText('结果存在不确定性')).toBeVisible()
    expect(screen.queryByText('已验证')).not.toBeInTheDocument()
  })
})
