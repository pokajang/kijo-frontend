export const FEEDBACK_STATUSES = [
  'Pending',
  'Fixed Pending Pushed',
  'In Progress',
  'Fixed Completed',
  'Resolved',
]

export const DEVELOPER_STATUS_OPTIONS = FEEDBACK_STATUSES.filter((status) => status !== 'Resolved')

export const RESOLUTION_TRACK_OPTIONS = [
  'Needs Triage',
  '30-Day Fix',
  'Next Upgrade',
  'Roadmap / Backlog',
  'Not Actionable',
  'Rejected',
]

export const FEEDBACK_EVENT_LABELS = {
  report_received: 'Report received',
  legacy_state_imported: 'Existing state imported',
  report_edited: 'Report updated',
  developer_updated: 'Developer updated triage',
  fix_ready: 'Developer marked the fix completed',
  comment_added: 'Comment added',
  fix_rejected: 'Reporter rejected the fix',
  reporter_resolved: 'Reporter confirmed the issue resolved',
}

export const normalizeFeedbackValue = (value) => (value ?? '').toString().trim().toLowerCase()

export const getFeedbackStatusTone = (status) => {
  const normalized = normalizeFeedbackValue(status)
  if (normalized === 'fixed completed' || normalized === 'resolved') return 'success'
  if (normalized === 'pending' || normalized === 'fixed pending pushed') return 'warning'
  return 'info'
}

export const getResolutionTrackTone = (track) => {
  const normalized = normalizeFeedbackValue(track)
  if (normalized === '30-day fix') return 'primary'
  if (normalized === 'needs triage') return 'warning'
  if (normalized === 'rejected') return 'danger'
  if (normalized === 'not actionable') return 'secondary'
  return 'info'
}

export const getFeedbackEventLabel = (eventType) =>
  FEEDBACK_EVENT_LABELS[eventType] || 'Feedback updated'
