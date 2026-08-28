import { describe, expect, it } from 'vitest'
import { formatCount, formatMoney, formatNumber, toFiniteNumber } from './numberFormatters'

describe('numberFormatters', () => {
  it('formats monetary values with Malaysian grouping and two decimal places', () => {
    expect(formatMoney(1234567.8)).toBe('RM 1,234,567.80')
    expect(formatMoney('5128.75')).toBe('RM 5,128.75')
    expect(formatMoney(-1234.5)).toBe('RM -1,234.50')
  })

  it('formats general numbers with configurable precision', () => {
    expect(formatNumber(12345.678)).toBe('12,345.68')
    expect(
      formatNumber(12345.6, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ).toBe('12,345.60')
  })

  it('formats rounded integer counts with grouping', () => {
    expect(formatCount(12345.6)).toBe('12,346')
  })

  it('uses safe defaults and caller-provided fallbacks for invalid values', () => {
    expect(formatMoney(null)).toBe('RM 0.00')
    expect(formatMoney(Number.NaN)).toBe('RM 0.00')
    expect(formatMoney(Number.POSITIVE_INFINITY, { fallback: '-' })).toBe('-')
    expect(formatNumber(undefined, { fallback: '-' })).toBe('-')
    expect(formatCount('not-a-number')).toBe('0')
  })

  it('normalizes finite numeric values without parsing formatted display strings', () => {
    expect(toFiniteNumber('1234.5')).toBe(1234.5)
    expect(toFiniteNumber('1,234.50', 99)).toBe(99)
  })
})
