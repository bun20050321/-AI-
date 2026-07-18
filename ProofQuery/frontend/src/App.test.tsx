import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import App from './App'
import type { ProofQueryApi } from './api'
import type { DatasetProfile } from './types'


const profile: DatasetProfile = {
  filename: 'sales.csv',
  size_bytes: 48,
  row_count: 3,
  columns: [
    {
      name: 'region',
      physical_type: 'VARCHAR',
      null_count: 0,
      null_rate: 0,
      distinct_count: 3,
      minimum: 'East',
      maximum: 'West',
      samples: ['East', 'North', 'West'],
      warnings: [],
    },
    {
      name: 'revenue',
      physical_type: 'DOUBLE',
      null_count: 1,
      null_rate: 1 / 3,
      distinct_count: 2,
      minimum: 10,
      maximum: 20,
      samples: [10, 20],
      warnings: ['33% 的值缺失'],
    },
  ],
  warnings: ['33% 的值缺失'],
  suggested_questions: ['按 region 比较 revenue'],
}


function fakeApi(): ProofQueryApi {
  return {
    createSession: vi.fn().mockResolvedValue({ id: 'session-1' }),
    uploadDataset: vi.fn().mockResolvedValue(profile),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    askQuestion: vi.fn().mockResolvedValue({ run_id: 'run-1' }),
    streamRun: vi.fn().mockResolvedValue(undefined),
  }
}


describe('ProofQuery workspace', () => {
  it('uploads one CSV and reveals its profile', async () => {
    const api = fakeApi()
    const user = userEvent.setup()
    render(<App api={api} />)
    const file = new File(['region,revenue\nEast,10\n'], 'sales.csv', {
      type: 'text/csv',
    })

    await user.upload(await screen.findByLabelText('选择 CSV 文件'), file)

    expect(await screen.findByText('3 行')).toBeVisible()
    expect(screen.getByRole('heading', { name: '字段' })).toBeVisible()
    expect(screen.getByText('revenue')).toBeVisible()
    expect(screen.getByText('33% 缺失')).toBeVisible()
    expect(screen.getByRole('textbox', { name: '分析问题' })).toBeEnabled()
    expect(api.uploadDataset).toHaveBeenCalledWith('session-1', file)
  })

  it('resets the current session and returns to upload state', async () => {
    const api = fakeApi()
    const user = userEvent.setup()
    render(<App api={api} />)
    const file = new File(['a,b\n1,2\n'], 'sales.csv', { type: 'text/csv' })
    await user.upload(await screen.findByLabelText('选择 CSV 文件'), file)
    await screen.findByText('3 行')

    await user.click(screen.getByRole('button', { name: '重置会话' }))

    await waitFor(() => expect(api.deleteSession).toHaveBeenCalledWith('session-1'))
    expect(await screen.findByLabelText('选择 CSV 文件')).toBeVisible()
  })

  it('switches workspace regions through mobile navigation', async () => {
    const api = fakeApi()
    const user = userEvent.setup()
    render(<App api={api} />)
    const file = new File(['a,b\n1,2\n'], 'sales.csv', { type: 'text/csv' })
    await user.upload(await screen.findByLabelText('选择 CSV 文件'), file)
    await screen.findByText('3 行')

    expect(screen.getByRole('tab', { name: '数据集' })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    await user.click(screen.getByRole('tab', { name: '证据' }))

    expect(screen.getByRole('tab', { name: '证据' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('region', { name: '证据' })).toHaveAttribute(
      'data-mobile-active',
      'true',
    )
  })
})
