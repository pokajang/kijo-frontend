import React, { useState } from 'react'
import { CButton, CTable, CTableBody, CTableHead, CTableHeaderCell, CTableRow } from '@coreui/react'
import { formatFirstTouchDate } from '../clientFirstTouchUtils'

const compactTimeline = (timeline, initialLimit) => {
  if (timeline.length <= initialLimit) return timeline
  return [timeline[0], ...timeline.slice(-(initialLimit - 1))]
}

const FirstTouchTimeline = ({ firstTouch, entries = [], initialLimit = 4 }) => {
  const [showAll, setShowAll] = useState(false)
  const fallbackEntries = firstTouch
    ? [
        {
          id: 'origin',
          date: firstTouch.occurredAt,
          time: firstTouch.occurredTime || '',
          title: 'First documented encounter',
          context: firstTouch.clientContact || firstTouch.sourceValue || '',
          staffName: firstTouch.amioshContact || firstTouch.referrerName || '',
          staffCode: firstTouch.amioshContactCode || firstTouch.referrerCode || '',
          staffRole: firstTouch.amioshContact ? 'Handled by' : 'Referred through',
          type: 'origin',
        },
      ]
    : []
  const timeline = [...(entries.length ? entries : fallbackEntries)].sort(
    (left, right) => new Date(left.date || 0).getTime() - new Date(right.date || 0).getTime(),
  )
  const visibleTimeline = showAll ? timeline : compactTimeline(timeline, initialLimit)
  const hiddenCount = timeline.length - visibleTimeline.length

  const staffLabel = (entry) => {
    const staff = [entry.staffName, entry.staffCode ? `(${entry.staffCode})` : '']
      .filter(Boolean)
      .join(' ')
    if (!staff) return '—'
    return entry.staffRole ? `${entry.staffRole}: ${staff}` : staff
  }

  const eventContext = (entry) => entry.context || entry.description || '—'

  return (
    <section aria-label="Relationship timeline">
      {timeline.length ? (
        <>
          <div className="d-none d-md-block table-responsive">
            <CTable className="mb-0 align-middle first-touch-timeline-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell scope="col">Date</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Interaction</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Client / project</CTableHeaderCell>
                  <CTableHeaderCell scope="col">Amiosh staff involved</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {visibleTimeline.map((entry) => (
                  <CTableRow key={entry.id}>
                    <td>
                      {formatFirstTouchDate(entry.date)}
                      {entry.time ? ` at ${entry.time}` : ''}
                    </td>
                    <td className="fw-medium">{entry.title}</td>
                    <td>{eventContext(entry)}</td>
                    <td>{staffLabel(entry)}</td>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
          <div className="d-md-none first-touch-timeline-mobile">
            {visibleTimeline.map((entry) => (
              <div className="first-touch-timeline-mobile__row" key={entry.id}>
                <div className="small text-muted">
                  {formatFirstTouchDate(entry.date)}
                  {entry.time ? ` at ${entry.time}` : ''}
                </div>
                <div className="fw-medium">{entry.title}</div>
                <div>{eventContext(entry)}</div>
                <div className="small text-muted mt-1">{staffLabel(entry)}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="px-3 py-4 text-muted">No relationship events recorded.</div>
      )}
      {hiddenCount > 0 ? (
        <CButton
          className="m-3"
          color="secondary"
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
        >
          Show {hiddenCount} earlier event{hiddenCount === 1 ? '' : 's'}
        </CButton>
      ) : null}
      {showAll && timeline.length > initialLimit ? (
        <CButton
          className="m-3"
          color="secondary"
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(false)}
        >
          Show less
        </CButton>
      ) : null}
    </section>
  )
}

export default FirstTouchTimeline
