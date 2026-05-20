import { describe, expect, it } from 'vitest'
import {
  normalizeInvoiceRows,
  normalizePaymentRows,
  normalizeQuoteRows,
} from '../ClientRoiDetailPage'
import {
  buildClientRoiDetailSearch,
  buildClientRoiListPath,
  getPeriodRangeFromSearchParams,
} from '../clientRoiRouteUtils'

describe('ClientRoiDetailPage helpers', () => {
  it('defaults missing query dates to all-time period', () => {
    expect(getPeriodRangeFromSearchParams(new URLSearchParams(), 'all')).toEqual({
      preset: 'all',
      startDate: '',
      endDate: '',
    })
  })

  it('can default missing query dates to year-to-date for the list page', () => {
    const today = new Date(2026, 4, 19)
    expect(getPeriodRangeFromSearchParams(new URLSearchParams(), 'ytd', today)).toEqual({
      preset: 'ytd',
      startDate: '2026-01-01',
      endDate: '2026-05-19',
    })
  })

  it('recognizes generated year-to-date params as the default period', () => {
    const today = new Date(2026, 4, 19)
    const params = new URLSearchParams('start=2026-01-01&end=2026-05-19')
    expect(getPeriodRangeFromSearchParams(params, 'all', today)).toEqual({
      preset: 'ytd',
      startDate: '2026-01-01',
      endDate: '2026-05-19',
    })
  })

  it('maps API rows into table display rows', () => {
    expect(
      normalizePaymentRows([
        {
          source_type: 'manual_debtor',
          invoice_ref_no: 'MAN-001',
          project_name: '',
          paid_amount: '100.50',
          grand_total: '150.00',
          paid_date: '2026-05-18',
          payment_days: 6,
        },
      ])[0],
    ).toEqual(
      expect.objectContaining({
        ref: 'MAN-001',
        source: 'Manual Debtor',
        project: '-',
        paidAmount: 100.5,
        grandTotal: 150,
        paidDate: '2026-05-18',
        paymentDays: 6,
      }),
    )

    expect(
      normalizeInvoiceRows([
        { source_type: 'system_invoice', invoice_ref_no: 'INV-001', status: 'Paid' },
      ])[0],
    ).toEqual(expect.objectContaining({ ref: 'INV-001', source: 'System Invoice', status: 'Paid' }))

    expect(
      normalizeQuoteRows([
        { quote_ref_no: 'QT-001', service_type: 'Training', grand_total: '1000.00' },
      ])[0],
    ).toEqual(
      expect.objectContaining({ quoteRef: 'QT-001', service: 'Training', grandTotal: 1000 }),
    )
  })

  it('builds period query params for detail fetches', () => {
    expect(buildClientRoiDetailSearch({ startDate: '2026-01-01', endDate: '2026-05-19' })).toBe(
      '?start=2026-01-01&end=2026-05-19',
    )
    expect(buildClientRoiListPath({ startDate: '2026-01-01', endDate: '2026-05-19' })).toBe(
      '/client/roi?start=2026-01-01&end=2026-05-19',
    )
  })
})
