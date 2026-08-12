import React, { useState } from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilBriefcase, cilCalendar, cilCheckCircle, cilHistory, cilPeople } from '@coreui/icons'
import { formatFirstTouchDate } from '../clientFirstTouchUtils'

const icons = {
  origin: cilCheckCircle,
  evidence: cilHistory,
  review: cilCheckCircle,
  withdrawal: cilHistory,
  inquiry: cilHistory,
  meeting: cilPeople,
  award: cilBriefcase,
}

const compactTimeline = (timeline, initialLimit) => {
  if (timeline.length <= initialLimit) return timeline
  return [timeline[0], ...timeline.slice(-(initialLimit - 1))]
}

const FirstTouchTimeline = ({ firstTouch, entries = [], initialLimit = 4 }) => {
  const [showAll, setShowAll] = useState(false)
  const auditEntries = firstTouch
    ? [
        firstTouch.submittedAt
          ? {
              id: `evidence-submitted-${firstTouch.id || 'current'}`,
              date: firstTouch.submittedAt,
              title: 'First-touch evidence recorded',
              description: `Recorded by ${firstTouch.submittedBy || 'Staff'} as the current first touch.`,
              type: 'evidence',
            }
          : null,
      ].filter(Boolean)
    : []
  const fallbackEntries = firstTouch
    ? [
        {
          id: 'origin',
          date: firstTouch.occurredAt,
          time: firstTouch.occurredTime || '',
          title: 'First-touch claim',
          description: firstTouch.notes || 'Documented first encounter with Amiosh.',
          type: 'origin',
        },
      ]
    : []
  const timeline = [...(entries.length ? entries : fallbackEntries), ...auditEntries].sort(
    (left, right) => new Date(left.date || 0).getTime() - new Date(right.date || 0).getTime(),
  )
  const visibleTimeline = showAll ? timeline : compactTimeline(timeline, initialLimit)
  const hiddenCount = timeline.length - visibleTimeline.length

  if (!timeline.length) {
    return (
      <div className="first-touch-empty-state py-5">
        <CIcon icon={cilCalendar} size="xl" aria-hidden="true" />
        <h2 className="h5 mt-3 mb-1">No relationship events documented</h2>
        <p className="text-muted mb-0">
          The timeline will begin when first-touch evidence is recorded.
        </p>
      </div>
    )
  }

  return (
    <section aria-labelledby="first-touch-timeline-title">
      <h2 id="first-touch-timeline-title" className="h5 mb-1">
        Relationship timeline
      </h2>
      <p className="text-muted mb-4">First touch and the later commercial milestones.</p>
      <ol className="first-touch-timeline list-unstyled mb-0">
        {visibleTimeline.map((entry) => (
          <li className="first-touch-timeline__item" key={entry.id}>
            <span className="first-touch-timeline__marker" aria-hidden="true">
              <CIcon icon={icons[entry.type] || cilHistory} />
            </span>
            <div className="first-touch-timeline__content">
              <div className="small text-muted">
                {formatFirstTouchDate(entry.date)}
                {entry.time ? ` at ${entry.time}` : ''}
              </div>
              <div className="fw-semibold mt-1">{entry.title}</div>
              <div className="text-muted mt-1">{entry.description}</div>
            </div>
          </li>
        ))}
      </ol>
      {hiddenCount > 0 ? (
        <CButton color="secondary" variant="ghost" size="sm" onClick={() => setShowAll(true)}>
          Show {hiddenCount} earlier event{hiddenCount === 1 ? '' : 's'}
        </CButton>
      ) : null}
      {showAll && timeline.length > initialLimit ? (
        <CButton color="secondary" variant="ghost" size="sm" onClick={() => setShowAll(false)}>
          Show less
        </CButton>
      ) : null}
    </section>
  )
}

export default FirstTouchTimeline
