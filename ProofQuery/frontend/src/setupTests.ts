import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('vega-embed', () => ({
  default: vi.fn().mockResolvedValue({ finalize: vi.fn() }),
}))
