import { useEffect, useMemo, useRef, useState } from 'react'
import type { VisualizationSpec } from 'vega-embed'

import type { Answer, ChartEncoding } from '../types'
import { ResultTable } from './ResultTable'

interface ChartViewProps {
  answer: Answer
}

type VegaEncoding = Record<string, { field: string; type: string; title?: string }>

export function buildVegaSpec(answer: Answer): VisualizationSpec | null {
  const chart = answer.chart
  if (!chart) return null
  const result = answer.evidence.primary.result
  const available = new Set(result.columns)
  const encoding: VegaEncoding = {}

  for (const channel of ['x', 'y', 'color'] as const) {
    const definition: ChartEncoding | null | undefined = chart[channel]
    if (!definition) continue
    if (!available.has(definition.field)) return null
    encoding[channel] = {
      field: definition.field,
      type: definition.type,
      ...(definition.title ? { title: definition.title } : {}),
    }
  }
  if (!Object.keys(encoding).length) return null

  const values = result.rows.map((row) =>
    Object.fromEntries(result.columns.map((column, index) => [column, row[index]])),
  )
  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
    width: 'container',
    height: 220,
    autosize: { type: 'fit', contains: 'padding' },
    background: 'transparent',
    data: { values },
    mark: { type: chart.mark, tooltip: true },
    encoding,
    ...(chart.title ? { title: chart.title } : {}),
    config: {
      font: 'Inter, ui-sans-serif, system-ui, sans-serif',
      axis: { labelColor: '#5f6962', titleColor: '#3d4740', gridColor: '#e6eae6' },
      view: { stroke: null },
      range: { category: ['#2d67d3', '#18724d', '#a76412', '#7656a8', '#b44d53'] },
    },
  }
}

export function ChartView({ answer }: ChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const spec = useMemo(() => buildVegaSpec(answer), [answer])

  useEffect(() => {
    if (!spec || !containerRef.current) return
    let disposed = false
    let finalize: (() => void) | undefined
    setFailed(false)
    void import('vega-embed')
      .then(({ default: vegaEmbed }) =>
        vegaEmbed(containerRef.current!, spec, {
          actions: false,
          renderer: 'svg',
        }),
      )
      .then((result) => {
        if (disposed) result.finalize()
        else {
          containerRef.current?.setAttribute('role', 'img')
          containerRef.current?.setAttribute(
            'aria-label',
            answer.chart?.title ?? '分析图表',
          )
          finalize = () => result.finalize()
        }
      })
      .catch(() => setFailed(true))
    return () => {
      disposed = true
      finalize?.()
    }
  }, [answer.chart?.title, spec])

  if (!spec || failed) {
    return <ResultTable result={answer.evidence.primary.result} />
  }
  return <div className="chart-view" ref={containerRef} aria-label="分析图表" />
}
