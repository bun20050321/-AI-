import { AlertTriangle, Columns3, Database } from 'lucide-react'

import type { DatasetProfile, JsonValue } from '../types'

interface DatasetPanelProps {
  profile: DatasetProfile
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatSample(value: JsonValue) {
  if (value === null) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function DatasetPanel({ profile }: DatasetPanelProps) {
  return (
    <div className="dataset-panel">
      <div className="panel-heading">
        <div className="panel-heading-icon" aria-hidden="true">
          <Database size={18} />
        </div>
        <div>
          <h2 title={profile.filename}>{profile.filename}</h2>
          <p>
            <strong>{profile.row_count.toLocaleString('zh-CN')} 行</strong>
            <span>{formatBytes(profile.size_bytes)}</span>
          </p>
        </div>
      </div>

      {profile.warnings.length ? (
        <div className="quality-callout">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{profile.warnings.length} 项数据质量提示</span>
        </div>
      ) : null}

      <div className="field-heading">
        <Columns3 size={16} aria-hidden="true" />
        <h3>字段</h3>
        <span>{profile.columns.length}</span>
      </div>
      <div className="field-list">
        {profile.columns.map((column) => (
          <div className="field-row" key={column.name}>
            <div className="field-row-top">
              <strong title={column.name}>{column.name}</strong>
              <span className="type-label">{column.physical_type}</span>
            </div>
            <div className="field-meta">
              <span>{column.distinct_count.toLocaleString('zh-CN')} 个值</span>
              <span className={column.null_count ? 'has-warning' : ''}>
                {column.null_count
                  ? `${Math.round(column.null_rate * 100)}% 缺失`
                  : '完整'}
              </span>
            </div>
            {column.samples.length ? (
              <div className="sample-list" aria-label={`${column.name} 样例`}>
                {column.samples.slice(0, 3).map((sample, index) => (
                  <span key={`${column.name}-${index}`} title={formatSample(sample)}>
                    {formatSample(sample)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
