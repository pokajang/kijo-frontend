import { getPendingItemsCount, getPendingPicCounts } from './meetingActionItems'
import { formatDateTime } from './meetingDateUtils'

const getMeetingDate = (meeting) =>
  new Date(String(meeting?.meeting_datetime || '').replace(' ', 'T'))

export const getMeetingYearOptions = (meetings) => {
  const years = new Set()
  ;(Array.isArray(meetings) ? meetings : []).forEach((meeting) => {
    if (!meeting?.meeting_datetime) return
    const date = getMeetingDate(meeting)
    if (!Number.isNaN(date.getTime())) {
      years.add(String(date.getFullYear()))
    }
  })
  return Array.from(years).sort((a, b) => Number(b) - Number(a))
}

export const filterMeetings = (
  meetings,
  { recordSearch = '', yearFilter = '', meetingTypeFilter = '', recordStatusFilter = '' },
) => {
  const term = recordSearch.trim().toLowerCase()

  return (Array.isArray(meetings) ? meetings : []).filter((meeting) => {
    const matchesYear = (() => {
      if (!yearFilter) return true
      const date = getMeetingDate(meeting)
      return !Number.isNaN(date.getTime()) && String(date.getFullYear()) === yearFilter
    })()
    const matchesType =
      !meetingTypeFilter || String(meeting.meeting_type || 'Ad Hoc') === meetingTypeFilter
    const isDraft = Boolean(meeting?.is_draft) || String(meeting?.record_status || '') === 'Draft'
    const matchesStatus =
      !recordStatusFilter ||
      (recordStatusFilter === 'Draft' && isDraft) ||
      (recordStatusFilter === 'Complete' && !isDraft)
    if (!matchesYear || !matchesType || !matchesStatus) return false
    if (!term) return true

    const attendeeText = (meeting.attendees || [])
      .map((attendee) =>
        `${attendee?.staff_name || ''} ${attendee?.staff_code || ''}`.toLowerCase(),
      )
      .join(' ')
    const guestText = String(meeting.guest_attendees_text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
    const haystack = [
      meeting.meeting_title,
      meeting.meeting_type,
      meeting.venue,
      meeting.agenda,
      meeting.minutes_text,
      meeting.action_items,
      attendeeText,
      guestText,
    ]
      .map((value) => String(value || '').toLowerCase())
      .join(' ')

    return haystack.includes(term)
  })
}

export const normalizeMeetingRows = (meetings) =>
  (Array.isArray(meetings) ? meetings : []).map((meeting) => {
    const pendingItems = getPendingItemsCount(meeting.action_items)
    const pendingPicCounts = getPendingPicCounts(meeting.action_items)
    const isDraft = Boolean(meeting?.is_draft) || String(meeting?.record_status || '') === 'Draft'
    const pendingCodeCountSummary = pendingPicCounts
      .filter((item) => item.code !== 'Unassigned')
      .map((item) => `${item.code} (${item.count})`)
      .join(', ')

    return {
      ...meeting,
      isDraft,
      recordStatus: isDraft ? 'Draft' : 'Complete',
      title: meeting.meeting_title || '-',
      meetingDate: meeting.meeting_datetime || '',
      meetingDateDisplay: formatDateTime(meeting.meeting_datetime),
      meetingType: meeting.meeting_type || 'Ad Hoc',
      pendingItems,
      pendingPicCounts,
      pendingItemsDisplay: `${pendingItems}${pendingCodeCountSummary ? ` - ${pendingCodeCountSummary}` : ''}`,
    }
  })
