import type { Answer } from '../types'

export const verifiedAnswer: Answer = {
  conclusion: 'East revenue was 30.',
  limitations: [],
  chart: {
    mark: 'bar',
    x: { field: 'region', type: 'nominal', title: 'Region' },
    y: { field: 'total', type: 'quantitative', title: 'Revenue' },
    title: 'Revenue by region',
  },
  evidence: {
    status: 'verified',
    primary: {
      sql: 'select region, sum(revenue) total from dataset group by region',
      result: {
        columns: ['region', 'total'],
        rows: [
          ['East', 30],
          ['West', 20],
        ],
        row_count: 2,
        duration_ms: 4,
        truncated: false,
      },
    },
    verification: {
      sql: "select sum(revenue) total from dataset where region = 'East'",
      result: {
        columns: ['total'],
        rows: [[30]],
        row_count: 1,
        duration_ms: 2,
        truncated: false,
      },
    },
  },
}

export const uncertainAnswer: Answer = {
  ...verifiedAnswer,
  limitations: ['独立验证未能支持该数值结论。'],
  evidence: {
    ...verifiedAnswer.evidence,
    status: 'uncertain',
  },
}
