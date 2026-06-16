import { describe, expect, it } from 'vitest'
import { buildRecordMovedToastMessage } from '../utils/recordActionToastMessages'

describe('buildRecordMovedToastMessage', () => {
  it('explains when a failed record is hidden by the active status filter', () => {
    expect(
      buildRecordMovedToastMessage('Failed', {
        activeFilterCount: 1,
        statusFilter: 'Open',
        searchInput: '',
      }),
    ).toBe('Marked as Failed. Hidden from this view because Status: Open is active.')
  })

  it('uses current-filter copy when filters are active but status does not hide the record', () => {
    expect(
      buildRecordMovedToastMessage('Failed', {
        activeFilterCount: 1,
        statusFilter: 'Failed',
        searchInput: '',
      }),
    ).toBe('Marked as Failed. Record list refreshed with current filters.')
  })

  it('uses current-filter copy when only search is active', () => {
    expect(
      buildRecordMovedToastMessage('Failed', {
        activeFilterCount: 0,
        statusFilter: 'all',
        searchInput: 'ACME',
      }),
    ).toBe('Marked as Failed. Record list refreshed with current filters.')
  })

  it('uses plain refresh copy when no filters are active', () => {
    expect(
      buildRecordMovedToastMessage('Failed', {
        activeFilterCount: 0,
        statusFilter: 'all',
        searchInput: '',
      }),
    ).toBe('Marked as Failed. Record list refreshed.')
  })
})
