const HISTORY_FIELD_LABELS = {
  meeting_title: 'Meeting Title',
  meeting_type: 'Meeting Type',
  meeting_datetime: 'Meeting Date & Time',
  venue: 'Venue',
  attendees: 'Tick Attendees',
  guest_attendees_text: 'Guest Attendees (Optional)',
  agenda: 'Agenda',
  minutes_text: 'Minutes (Required)',
  action_items: 'Action Items',
  verification_status: 'Verification Status',
  attachment: 'Attachment',
}

export const formatChangedFieldLabels = (fields) => {
  const normalized = Array.isArray(fields) ? fields : []
  const labels = normalized
    .map((field) => {
      const key = String(field || '').trim()
      if (!key) return ''
      if (HISTORY_FIELD_LABELS[key]) return HISTORY_FIELD_LABELS[key]
      return key
    })
    .filter(Boolean)
  return Array.from(new Set(labels))
}
