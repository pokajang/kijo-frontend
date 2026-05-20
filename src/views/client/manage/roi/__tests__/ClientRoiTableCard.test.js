import { describe, expect, it } from 'vitest'
import { formatRoiPercent } from '../ClientRoiTableCard'

describe('formatRoiPercent', () => {
  it('keeps unavailable ROI values blank instead of rendering zero percent', () => {
    expect(formatRoiPercent(null)).toBe('-')
    expect(formatRoiPercent(undefined)).toBe('-')
    expect(formatRoiPercent('')).toBe('-')
  })

  it('formats available ROI values', () => {
    expect(formatRoiPercent(172.73)).toBe('172.73%')
    expect(formatRoiPercent(0)).toBe('0%')
  })
})
