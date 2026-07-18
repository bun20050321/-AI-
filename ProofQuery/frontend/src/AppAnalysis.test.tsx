import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from './App'
import type { ProofQueryApi } from './api'
import { verifiedAnswer } from './test/fixtures'
import type { DatasetProfile } from './types'


const profile: DatasetProfile = {
  filename: 'sales.csv',
  size_bytes: 32,
  row_count: 2,
  columns: [
    {
      name: 'revenue',
      physical_type: 'DOUBLE',
      null_count: 0,
      null_rate: 0,
      distinct_count: 2,
      minimum: 10,
      maximum: 20,
      samples: [10, 20],
      warnings: [],
    },
  ],
  warnings: [],
  suggested_questions: ['收入合计是多少？'],
}


describe('analysis workflow', () => {
  it('submits a question, streams an answer, and opens evidence', async () => {
    const api = {
      createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
      uploadDataset: vi.fn().mockResolvedValue(profile),
      deleteSession: vi.fn().mockResolvedValue(undefined),
      askQuestion: vi.fn().mockResolvedValue({ run_id: 'run-1' }),
      streamRun: vi.fn().mockImplementation(async (_session, _run, onEvent) => {
        onEvent({
          type: 'progress',
          stage: 'querying',
          message: '正在执行只读查询',
        })
        onEvent({ type: 'answer', answer: verifiedAnswer })
      }),
    } as unknown as ProofQueryApi
    const user = userEvent.setup()
    render(<App api={api} />)
    await user.upload(
      await screen.findByLabelText('选择 CSV 文件'),
      new File(['revenue\n10\n20\n'], 'sales.csv', { type: 'text/csv' }),
    )
    await screen.findByText('2 行')

    await user.type(screen.getByRole('textbox', { name: '分析问题' }), '收入合计是多少？')
    await user.click(screen.getByRole('button', { name: '发送问题' }))

    expect(await screen.findByText('East revenue was 30.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '查看证据' }))
    expect(screen.getByRole('heading', { name: '验证查询' })).toBeVisible()
  })
})
