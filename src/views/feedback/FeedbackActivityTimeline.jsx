import React from 'react'
import PropTypes from 'prop-types'
import { CCard, CCardBody, CCardHeader } from '@coreui/react'
import { getFeedbackEventLabel } from './feedbackWorkflow'

const FIELD_LABELS = {
  feedback: 'Feedback',
  status: 'Status',
  resolution_track: 'Resolution Track',
  action_date: 'Action Date',
  remarks: 'Remarks',
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(String(value).replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString()
}

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const FeedbackActivityTimeline = ({ history = [], loading = false }) => (
  <CCard className="mt-3">
    <CCardHeader>
      <strong>Activity</strong>
    </CCardHeader>
    <CCardBody>
      {loading ? (
        <div className="text-muted">Loading activity...</div>
      ) : history.length === 0 ? (
        <div className="text-muted">No activity has been recorded.</div>
      ) : (
        <div className="d-grid gap-3" data-testid="feedback-activity-timeline">
          {history.map((event) => (
            <article key={event.id} className="border-start border-3 ps-3 py-1">
              <div className="d-flex flex-wrap justify-content-between gap-2">
                <strong>{getFeedbackEventLabel(event.event_type)}</strong>
                <small className="text-muted">{formatDateTime(event.created_at)}</small>
              </div>
              <div className="small text-muted">{event.actor_name || 'System'}</div>
              {event.message ? <div className="mt-2 text-break">{event.message}</div> : null}
              {Object.entries(event.changes || {}).length > 0 ? (
                <dl className="small mt-2 mb-0">
                  {Object.entries(event.changes).map(([field, change]) => (
                    <div key={field} className="d-flex flex-wrap gap-1">
                      <dt>{FIELD_LABELS[field] || field}:</dt>
                      <dd className="mb-1">
                        {displayValue(change?.from)} → {displayValue(change?.to)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </CCardBody>
  </CCard>
)

FeedbackActivityTimeline.propTypes = {
  history: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
}

export default FeedbackActivityTimeline
