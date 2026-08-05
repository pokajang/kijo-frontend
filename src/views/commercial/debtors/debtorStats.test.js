import { describe, expect, it } from 'vitest'

import { buildDebtorStats } from './debtorStats'

const rows = [
  {
    sourceType: 'manual',
    invoiceDate: '2026-07-01',
    lastPaymentDate: '2026-08-01',
    grandTotal: 1000,
    paidTotal: 300,
    outstandingAmount: 700,
    ageDays: 35,
    overdueDays: 5,
    status: 'Partially Paid',
  },
  {
    sourceType: 'invoice',
    invoiceDate: '2026-06-01',
    lastPaymentDate: '2026-07-15',
    grandTotal: 500,
    paidTotal: 500,
    outstandingAmount: 0,
    ageDays: 65,
    overdueDays: 35,
    status: 'Paid',
  },
]

describe('debtor lifecycle stats', () => {
  it('summarizes partial-payment progress without treating paid totals as outstanding', () => {
    const stats = buildDebtorStats([rows[0]], 'partial', '2026-08-05')

    expect(stats.find((item) => item.key === 'partial-collected')?.value).toBe('RM 300.00')
    expect(stats.find((item) => item.key === 'partial-outstanding')?.value).toBe('RM 700.00')
  })

  it('summarizes paid closure dates and collected totals', () => {
    const stats = buildDebtorStats([rows[1]], 'paid', '2026-08-05')

    expect(stats.find((item) => item.key === 'paid-collected')?.value).toBe('RM 500.00')
    expect(stats.find((item) => item.key === 'paid-recent')?.value).toBe('1')
    expect(stats.find((item) => item.key === 'paid-average-days')?.value).toBe('44d')
  })

  it('reconciles billed, collected and outstanding totals in the All scope', () => {
    const stats = buildDebtorStats(rows, 'all', '2026-08-05')

    expect(stats.find((item) => item.key === 'all-billed')?.value).toBe('RM 1,500.00')
    expect(stats.find((item) => item.key === 'all-collected')?.value).toBe('RM 800.00')
    expect(stats.find((item) => item.key === 'all-outstanding')?.value).toBe('RM 700.00')
  })
})
