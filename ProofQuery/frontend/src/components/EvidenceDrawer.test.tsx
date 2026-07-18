import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { verifiedAnswer } from '../test/fixtures'
import { buildVegaSpec } from './ChartView'
import { EvidenceDrawer } from './EvidenceDrawer'


describe('EvidenceDrawer', () => {
  it('shows primary and verification evidence', () => {
    render(<EvidenceDrawer answer={verifiedAnswer} onClose={vi.fn()} />)

    expect(screen.getByRole('heading', { name: '主查询' })).toBeVisible()
    expect(screen.getByText(verifiedAnswer.evidence.primary.sql)).toBeVisible()
    expect(screen.getByRole('heading', { name: '验证查询' })).toBeVisible()
    expect(screen.getByText(verifiedAnswer.evidence.verification!.sql)).toBeVisible()
    expect(screen.getByText('2 行 · 4 ms')).toBeVisible()
  })

  it('rejects chart encodings that reference missing result fields', () => {
    expect(buildVegaSpec(verifiedAnswer)).not.toBeNull()
    expect(
      buildVegaSpec({
        ...verifiedAnswer,
        chart: {
          ...verifiedAnswer.chart!,
          y: { field: 'not-a-column', type: 'quantitative' },
        },
      }),
    ).toBeNull()
  })
})
