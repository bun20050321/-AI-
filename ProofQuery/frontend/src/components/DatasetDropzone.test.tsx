import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DatasetDropzone } from './DatasetDropzone'


describe('DatasetDropzone', () => {
  it('rejects multiple dropped files before making a request', () => {
    const onUpload = vi.fn()
    render(<DatasetDropzone onUpload={onUpload} status="idle" />)
    const files = [
      new File(['a\n1\n'], 'first.csv', { type: 'text/csv' }),
      new File(['a\n2\n'], 'second.csv', { type: 'text/csv' }),
    ]

    fireEvent.drop(screen.getByTestId('csv-dropzone'), {
      dataTransfer: { files },
    })

    expect(screen.getByText('一次只能分析一个 CSV')).toBeVisible()
    expect(onUpload).not.toHaveBeenCalled()
  })

  it('rejects a non-CSV file locally', async () => {
    const onUpload = vi.fn()
    render(<DatasetDropzone onUpload={onUpload} status="idle" />)

    fireEvent.change(screen.getByLabelText('选择 CSV 文件'), {
      target: {
        files: [new File(['hello'], 'notes.txt', { type: 'text/plain' })],
      },
    })

    expect(screen.getByText('请选择 CSV 文件')).toBeVisible()
    expect(onUpload).not.toHaveBeenCalled()
  })
})
