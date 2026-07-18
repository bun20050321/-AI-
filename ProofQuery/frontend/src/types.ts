export type VerificationStatus = 'verified' | 'uncertain' | 'not_required'
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export interface ColumnProfile {
  name: string
  physical_type: string
  null_count: number
  null_rate: number
  distinct_count: number
  minimum: JsonValue | null
  maximum: JsonValue | null
  samples: JsonValue[]
  warnings: string[]
}

export interface DatasetMetadata {
  filename: string
  size_bytes: number
  row_count: number
  column_count: number
}

export interface DatasetProfile {
  filename: string
  size_bytes: number
  row_count: number
  columns: ColumnProfile[]
  warnings: string[]
  suggested_questions: string[]
}

export interface QueryResult {
  columns: string[]
  rows: JsonValue[][]
  row_count: number
  duration_ms: number
  truncated: boolean
}

export interface QueryEvidence {
  sql: string
  result: QueryResult
}

export interface ChartEncoding {
  field: string
  type: 'quantitative' | 'temporal' | 'nominal' | 'ordinal'
  title?: string | null
}

export interface ChartSpec {
  mark: 'bar' | 'line' | 'area' | 'point' | 'arc'
  x?: ChartEncoding | null
  y?: ChartEncoding | null
  color?: ChartEncoding | null
  title?: string | null
}

export interface Evidence {
  status: VerificationStatus
  primary: QueryEvidence
  verification?: QueryEvidence | null
}

export interface Answer {
  conclusion: string
  limitations: string[]
  chart?: ChartSpec | null
  evidence: Evidence
}

export interface ErrorBody {
  code: string
  message: string
  details: Record<string, JsonValue>
}

export interface RunEvent {
  type: 'progress' | 'answer' | 'error'
  stage?: 'planning' | 'querying' | 'charting' | 'verifying' | 'complete' | null
  message?: string | null
  answer?: Answer | null
  error?: ErrorBody | null
}

