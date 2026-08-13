import { describe, expect, it } from 'vitest'

import {
  buildStoredInvoiceSummaryRows,
  formatInvoiceMoney,
  resolveStoredInvoiceTotals,
} from './invoiceStoredTotals'

describe('stored invoice totals', () => {
  it('uses authoritative totals for a discounted invoice without SST', () => {
    const totals = resolveStoredInvoiceTotals({
      raw: { amount: 3000, sst_amount: 0, grand_total: 2950 },
    })

    expect(totals).toEqual({
      subtotalBeforeSst: 2950,
      sstAmount: 0,
      sstPercent: 0,
      grandTotal: 2950,
    })
  })

  it('derives the before-SST subtotal without summing breakdown rows', () => {
    const totals = resolveStoredInvoiceTotals({
      raw: { amount: 3050, sst_percent: 8, sst_amount: 236, grand_total: 3186 },
      breakdown: [{ subtotal: 999999 }],
    })

    expect(totals.subtotalBeforeSst).toBe(2950)
    expect(totals.sstPercent).toBe(8)
  })

  it('builds an SST row only when stored SST is applicable', () => {
    expect(
      buildStoredInvoiceSummaryRows({ raw: { sst_amount: 0, grand_total: 500 } }).map(
        (row) => row.key,
      ),
    ).toEqual(['subtotal-before-sst', 'grand-total'])

    expect(
      buildStoredInvoiceSummaryRows({
        raw: { sst_percent: 8, sst_amount: 40, grand_total: 540 },
      }).map((row) => row.key),
    ).toEqual(['subtotal-before-sst', 'sst', 'grand-total'])
  })

  it('formats Malaysian Ringgit consistently', () => {
    expect(formatInvoiceMoney(2950)).toBe('RM 2,950.00')
  })

  it('falls back to mapped totals when legacy raw fields are missing', () => {
    expect(
      resolveStoredInvoiceTotals({
        raw: { grand_total: null, sst_amount: '' },
        grandTotal: '1080.00',
        sstAmount: '80.00',
        sstPercent: '8',
      }),
    ).toEqual({
      subtotalBeforeSst: 1000,
      sstAmount: 80,
      sstPercent: 8,
      grandTotal: 1080,
    })
  })

  it('returns a safe empty summary while an invoice is loading', () => {
    expect(resolveStoredInvoiceTotals(null)).toEqual({
      subtotalBeforeSst: 0,
      sstAmount: 0,
      sstPercent: 0,
      grandTotal: 0,
    })
  })
})
