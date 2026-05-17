import { describe, expect, it } from 'vitest'
import { filterMeetings, normalizeMeetingRows } from './meetingsRecordUtils'

const rows = [
  {
    id: 1,
    meeting_title: 'Draft Sync',
    meeting_type: 'Ad Hoc',
    meeting_datetime: '2026-05-17 09:00:00',
    record_status: 'Draft',
    is_draft: true,
    action_items: '',
  },
  {
    id: 2,
    meeting_title: 'Final Sync',
    meeting_type: 'Weekly',
    meeting_datetime: '2026-05-16 09:00:00',
    record_status: 'Complete',
    is_draft: false,
    action_items: '',
  },
]

describe('meetingsRecordUtils draft handling', () => {
  it('normalizes draft status for table rows', () => {
    const normalized = normalizeMeetingRows(rows)

    expect(normalized[0]).toMatchObject({
      isDraft: true,
      recordStatus: 'Draft',
      title: 'Draft Sync',
    })
    expect(normalized[1]).toMatchObject({
      isDraft: false,
      recordStatus: 'Complete',
    })
  })

  it('filters by draft and complete status', () => {
    expect(filterMeetings(rows, { recordStatusFilter: 'Draft' }).map((row) => row.id)).toEqual([1])
    expect(filterMeetings(rows, { recordStatusFilter: 'Complete' }).map((row) => row.id)).toEqual([
      2,
    ])
  })
})
