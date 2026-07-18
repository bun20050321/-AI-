import type { QueryResult } from '../types'

interface ResultTableProps {
  result: QueryResult
}

function formatCell(value: QueryResult['rows'][number][number]) {
  if (value === null) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function ResultTable({ result }: ResultTableProps) {
  return (
    <div className="result-table-wrap">
      <table className="result-table">
        <thead>
          <tr>
            {result.columns.map((column) => <th key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 12).map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, columnIndex) => (
                <td key={`${rowIndex}-${result.columns[columnIndex]}`}>
                  {formatCell(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated ? <p className="result-note">结果已截断为 500 行</p> : null}
    </div>
  )
}
