import { describe, expect, it } from 'vitest'
import {
  buildInquiryRecordActiveChips,
  buildInquiryRecordStats,
  filterInquiryRecords,
  getInquiryRecordMobileMeta,
  getInquiryRecordSortValue,
  normalizeInquiryRecord,
} from './inquiryRecordsUtils'

const periodRange = {
  preset: 'custom',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
}

describe('inquiry record utilities', () => {
  it('filters inquiries by period, status, service, source, and search text', () => {
    const records = [
      {
        inquiryDate: '2026-03-02',
        status: 'qualified',
        source: 'WhatsApp Personal',
        serviceRequired: 'training',
        companyName: 'Alpha Safety',
        ownerStaffCode: 'AA',
      },
      {
        inquiryDate: '2026-03-03',
        status: 'new',
        source: 'Email Marketing',
        serviceRequired: 'training',
        companyName: 'Beta Health',
        ownerStaffCode: 'BB',
      },
      {
        inquiryDate: '2025-12-31',
        status: 'qualified',
        source: 'WhatsApp Personal',
        serviceRequired: 'training',
        companyName: 'Old Safety',
        ownerStaffCode: 'AA',
      },
    ]

    const filtered = filterInquiryRecords(
      records,
      {
        q: 'alpha',
        status: 'qualified',
        source: 'WhatsApp Personal',
        serviceRequired: 'training',
      },
      periodRange,
    )

    expect(filtered).toHaveLength(1)
    expect(filtered[0].companyName).toBe('Alpha Safety')
  })

  it('normalizes records and derives mobile metadata and sort values', () => {
    const normalized = normalizeInquiryRecord({
      inquiryDate: '2026-03-02T10:30:00',
      status: 'quote_created',
      serviceRequired: 'equipment_supply',
      companyName: '',
      ssmNumber: '123-A',
      mobile: '601234',
      email: 'ops@example.com',
      ownerStaffCode: 'AA',
      ownerAssignedByName: 'Manager',
      proofCount: '2',
    })

    expect(normalized.companyName).toBe('-')
    expect(normalized.companyNameValue).toBe('')
    expect(normalized.inquiryDateDisplay).toBe('2026-03-02')
    expect(normalized.statusLabel).toBe('Quote Created')
    expect(normalized.serviceRequiredLabel).toBe('Equipment Supply')
    expect(normalized.proofCount).toBe(2)
    expect(getInquiryRecordMobileMeta(normalized)).toBe(
      '2026-03-02 | 123-A | 601234 | ops@example.com',
    )
    expect(getInquiryRecordSortValue(normalized, 'status')).toBe('Quote Created')
  })

  it('builds stats and active chips for filtered inquiry records', () => {
    const rows = [
      normalizeInquiryRecord({
        status: 'new',
        ownerStaffCode: 'AA',
        companyName: 'Alpha',
        inquiryDate: '2026-01-01',
      }),
      normalizeInquiryRecord({
        status: 'quote_created',
        ownerStaffCode: 'AA',
        companyName: 'Beta',
        inquiryDate: '2026-01-02',
      }),
      normalizeInquiryRecord({
        status: 'converted_client',
        ownerStaffCode: 'BB',
        companyName: 'Gamma',
        inquiryDate: '2026-01-03',
      }),
    ]

    const stats = buildInquiryRecordStats(rows)
    expect(stats.find((item) => item.key === 'inquiries')?.value).toBe('3')
    expect(stats.find((item) => item.key === 'open')?.value).toBe('2')
    expect(stats.find((item) => item.key === 'quote-created')?.value).toBe('2')
    expect(stats.find((item) => item.key === 'top-pic')?.value).toBe('AA')

    const chips = buildInquiryRecordActiveChips({
      filters: {
        q: 'alpha',
        status: 'qualified',
        source: 'WhatsApp Personal',
        serviceRequired: 'training',
      },
      periodRange,
      searchInput: 'alpha',
    })

    expect(chips.map((chip) => chip.key)).toEqual([
      'search',
      'status',
      'source',
      'serviceRequired',
      'period',
    ])
  })
})
