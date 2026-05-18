import { describe, expect, it } from 'vitest'
import {
  buildPipelineRecordActiveChips,
  buildPipelineRecordStats,
  formatPipelineCurrency,
  getPipelineEntryTypeTone,
  getPipelineRecordMobileMeta,
  getPipelineRecordSortValue,
  normalizePipelineRecord,
} from './pipelineRecordsUtils'

describe('pipeline record utilities', () => {
  it('normalizes pipeline rows and formats display helpers', () => {
    const normalized = normalizePipelineRecord({
      entryDate: '2026-04-05T09:00:00',
      entryType: 'proposal',
      prospectName: '',
      source: '',
      segmentType: 'special_project',
      serviceCategory: 'consultancy_ihoh',
      estimatedRm: '12500.5',
      ownerStaffCode: 'AA',
      ownerStaffName: 'Alice',
      notes: 'Follow up',
    })

    expect(normalized.entryDateDisplay).toBe('2026-04-05')
    expect(normalized.entryTypeLabel).toBe('Proposal')
    expect(normalized.prospectName).toBe('-')
    expect(normalized.prospectNameValue).toBe('')
    expect(normalized.source).toBe('-')
    expect(normalized.segmentType).toBe('Special Project')
    expect(normalized.serviceCategory).toBe('Consultancy - IHOH')
    expect(normalized.estimatedRm).toBe(12500.5)
    expect(getPipelineRecordMobileMeta(normalized)).toBe('2026-04-05 | AA | Follow up')
    expect(formatPipelineCurrency(normalized.estimatedRm)).toBe('RM 12,500.50')
    expect(getPipelineEntryTypeTone('proposal')).toBe('warning')
    expect(getPipelineRecordSortValue(normalized, 'estimatedRm')).toBe(12500.5)
  })

  it('builds stats from normalized pipeline entries', () => {
    const rows = [
      normalizePipelineRecord({
        entryType: 'lead',
        prospectName: 'Alpha',
        ownerStaffCode: 'AA',
        estimatedRm: 1000,
      }),
      normalizePipelineRecord({
        entryType: 'lead',
        prospectName: 'Beta',
        ownerStaffCode: 'AA',
        estimatedRm: 2000,
      }),
      normalizePipelineRecord({
        entryType: 'qualified',
        prospectName: 'Gamma',
        ownerStaffCode: 'BB',
        estimatedRm: 5000,
      }),
      normalizePipelineRecord({
        entryType: 'meeting_pitching',
        prospectName: 'Delta',
        ownerStaffCode: 'CC',
        estimatedRm: 0,
      }),
    ]

    const stats = buildPipelineRecordStats(rows)
    expect(stats.find((item) => item.key === 'total-leads')?.value).toBe('2')
    expect(stats.find((item) => item.key === 'total-qualified')?.value).toBe('1')
    expect(stats.find((item) => item.key === 'total-meetings')?.value).toBe('1')
    expect(stats.find((item) => item.key === 'top-leads')?.value).toBe('AA')
  })

  it('builds active chips for search, filters, and custom period range', () => {
    const chips = buildPipelineRecordActiveChips({
      filters: {
        q: 'alpha',
        entry_type: 'proposal',
        staff_code: 'AA',
        source: 'WhatsApp Personal',
        segment_type: 'special_project',
        service_category: 'training',
      },
      periodRange: {
        preset: 'custom',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      },
      searchInput: 'alpha',
      staffOptions: [{ value: 'AA', label: 'Alice (AA)' }],
    })

    expect(chips.map((chip) => chip.key)).toEqual([
      'search',
      'entry_type',
      'staff_code',
      'source',
      'segment_type',
      'service_category',
      'period',
    ])
    expect(chips.find((chip) => chip.key === 'staff_code')?.label).toBe('Owner: Alice (AA)')
  })
})
