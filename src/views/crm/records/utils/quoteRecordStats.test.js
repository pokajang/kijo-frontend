import { describe, expect, it } from 'vitest'
import { buildQuoteRecordStatsItems, buildServiceQuoteRecordStatsItems } from './quoteRecordStats'

const baseRecord = (overrides = {}) => ({
  status: 'Open',
  amount: '0.00',
  followUps: [],
  ...overrides,
})

describe('quote record stats', () => {
  it('keeps the general quote stats cards unchanged', () => {
    const stats = buildQuoteRecordStatsItems([
      baseRecord({ amount: '100.00', createdByCode: 'AZA' }),
      baseRecord({ amount: '200.00', status: 'Awarded', createdByCode: 'NAB' }),
    ])

    expect(stats.map((item) => item.label)).toEqual([
      'Total Value',
      'Awarded',
      'Pending Follow-up',
      'Top Creator',
    ])
  })

  it('ranks standalone service cards by quote count with total value as the tie-breaker', () => {
    const stats = buildServiceQuoteRecordStatsItems(
      [
        baseRecord({ amount: '100.00', formData: { serviceTitle: 'Noise Monitoring' } }),
        baseRecord({ amount: '500.00', formData: { serviceTitle: 'Chemical Exposure' } }),
        baseRecord({ amount: '200.00', formData: { serviceTitle: 'Noise Monitoring' } }),
        baseRecord({ amount: '400.00', formData: { serviceTitle: 'Chemical Exposure' } }),
      ],
      {
        topLabel: 'Top IH Service',
        secondLabel: '2nd Top IH Service',
        getServiceLabel: (record) => record?.formData?.serviceTitle,
      },
    )

    expect(stats.map((item) => item.label)).toEqual([
      'Total Value',
      'Awarded',
      'Top IH Service',
      '2nd Top IH Service',
    ])
    expect(stats[2]).toMatchObject({
      value: 'Chemical Exposure',
      sublabel: '2 quotes | RM 900.00',
    })
    expect(stats[3]).toMatchObject({
      value: 'Noise Monitoring',
      sublabel: '2 quotes | RM 300.00',
    })
  })

  it('ranks equipment cards by line item occurrences and line total', () => {
    const stats = buildServiceQuoteRecordStatsItems(
      [
        baseRecord({
          amount: '999.00',
          lineItems: [
            { itemName: 'Gas Detector', lineTotal: '1000.00' },
            { itemName: 'Tripod', lineTotal: '500.00' },
          ],
        }),
        baseRecord({
          amount: '999.00',
          lineItems: [{ itemName: 'Gas Detector', lineTotal: '1200.00' }],
        }),
        baseRecord({
          amount: '999.00',
          lineItems: [{ itemName: 'Tripod', lineTotal: '2000.00' }],
        }),
      ],
      {
        topLabel: 'Top Equipment',
        secondLabel: '2nd Top Equipment',
        countSingular: 'item',
        countPlural: 'items',
        getServiceEntries: (record) =>
          record.lineItems.map((item) => ({
            label: item.itemName,
            amount: item.lineTotal,
          })),
      },
    )

    expect(stats[2]).toMatchObject({
      label: 'Top Equipment',
      value: 'Tripod',
      sublabel: '2 items | RM 2,500.00',
    })
    expect(stats[3]).toMatchObject({
      label: '2nd Top Equipment',
      value: 'Gas Detector',
      sublabel: '2 items | RM 2,200.00',
    })
  })
})
