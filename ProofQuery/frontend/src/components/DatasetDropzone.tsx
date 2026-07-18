import { useId, useState } from 'react'
import { FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'

interface DatasetDropzoneProps {
  onUpload(file: File): void
  status: 'idle' | 'uploading'
  filename?: string
}

const MAX_BYTES = 50 * 1024 * 1024

export function DatasetDropzone({
  onUpload,
  status,
  filename,
}: DatasetDropzoneProps) {
  const inputId = useId()
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  function acceptFiles(files: FileList | File[]) {
    const selected = Array.from(files)
    if (selected.length !== 1) {
      setError('一次只能分析一个 CSV')
      return
    }
    const file = selected[0]
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('请选择 CSV 文件')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('CSV 不能超过 50 MB')
      return
    }
    setError(null)
    onUpload(file)
  }

  return (
    <div className="dropzone-wrap">
      <div
        className={`dropzone${dragging ? ' is-dragging' : ''}`}
        data-testid="csv-dropzone"
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          acceptFiles(event.dataTransfer.files)
        }}
      >
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          disabled={status === 'uploading'}
          aria-label="选择 CSV 文件"
          onChange={(event) => {
            if (event.target.files) acceptFiles(event.target.files)
            event.target.value = ''
          }}
        />
        <div className="dropzone-icon" aria-hidden="true">
          {status === 'uploading' ? (
            <LoaderCircle className="spin" size={22} />
          ) : (
            <FileSpreadsheet size={22} />
          )}
        </div>
        <div className="dropzone-copy">
          <strong>{status === 'uploading' ? '正在建立数据画像' : '添加 CSV 数据'}</strong>
          <span>{status === 'uploading' ? filename : '最大 50 MB · 会话结束后自动清除'}</span>
        </div>
        <label className="command-button" htmlFor={inputId}>
          <Upload size={17} aria-hidden="true" />
          选择文件
        </label>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
