import { describe, expect, it } from 'vitest'

import {
  ensureQuoteResultSuccess,
  isQuoteResultSuccess,
  normalizeQuoteResult,
  readQuoteResultMeta,
  readQuoteResultRow,
} from './quoteApi'

describe('quoteApi result helpers', () => {
  it('treats common successful quote payload shapes as success', () => {
    expect(isQuoteResultSuccess({ status: 'success' })).toBe(true)
    expect(isQuoteResultSuccess({ success: true })).toBe(true)
    expect(isQuoteResultSuccess({ data: [{ id: 5 }] })).toBe(true)
    expect(isQuoteResultSuccess([{ id: 7 }])).toBe(true)
    expect(isQuoteResultSuccess({ message: 'nope' })).toBe(false)
  })

  it('reads a row from object and array payload shapes', () => {
    expect(readQuoteResultRow({ data: { id: 11, quote_ref_no: 'Q-1' } })).toEqual({
      id: 11,
      quote_ref_no: 'Q-1',
    })
    expect(readQuoteResultRow({ data: [{ id: 12 }, { id: 13 }] })).toEqual({ id: 12 })
    expect(readQuoteResultRow([{ id: 14 }])).toEqual({ id: 14 })
    expect(readQuoteResultRow(null)).toBeNull()
  })

  it('reads quote metadata from nested payloads', () => {
    expect(
      readQuoteResultMeta({
        data: {
          quote: {
            quotation_id: 21,
            quoteRefNo: 'QTR-21',
          },
        },
      }),
    ).toEqual({
      quoteId: 21,
      quoteRefNo: 'QTR-21',
    })
  })

  it('normalizes and upgrades successful payloads for downstream consumers', () => {
    expect(normalizeQuoteResult({ data: { quote_id: 9 }, status: 'success' })).toEqual({
      quote_id: 9,
      data: { quote_id: 9 },
      status: 'success',
    })
    expect(ensureQuoteResultSuccess([{ id: 1 }])).toEqual({
      data: [{ id: 1 }],
      success: true,
    })
  })
})
