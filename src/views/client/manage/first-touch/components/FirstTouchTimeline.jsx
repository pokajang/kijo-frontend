import React, { useState } from 'react'
import { CButton, CFormSelect } from '@coreui/react'
import { DataTableEmbeddedList, DataTableSortHeader } from '../../../../../components/datatable'
import { formatFirstTouchDate } from '../clientFirstTouchUtils'

const activityFilters = [
  { value: 'all', label: 'All activity' },
  { value: 'first_touch', label: 'First touch' },
  { value: 'quotation', label: 'Quotations' },
  { value: 'follow_up', label: 'Follow-ups' },
  { value: 'project', label: 'Projects' },
  { value: 'financial', label: 'Invoices & payments' },
]

const matchesActivityFilter = (entry, filter) => {
  if (filter === 'all') return true
  if (filter === 'first_touch') return entry.kind === 'first_touch' || entry.type === 'origin'
  if (filter === 'quotation') return entry.kind === 'quotation_created'
  if (filter === 'follow_up') return entry.kind === 'follow_up_recorded'
  if (filter === 'project') return entry.kind === 'project_awarded' || entry.type === 'award'
  return ['invoice_issued', 'payment_received'].includes(entry.kind)
}

const timelineTimestamp = (entry) =>
  new Date(`${entry.date || '1970-01-01'}T${entry.time || '00:00:00'}`).getTime()

const timelineHeaderClassName = 'fw-normal text-body-secondary'

const FirstTouchTimeline = ({ firstTouch, entries = [], initialLimit = 4 }) => {
  const [showAll, setShowAll] = useState(false)
  const [activityFilter, setActivityFilter] = useState('all')
  const [dateSortDirection, setDateSortDirection] = useState('desc')
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
  const timeline = [...(entries.length ? entries : fallbackEntries)]
  const filteredTimeline = timeline
    .filter((entry) => matchesActivityFilter(entry, activityFilter))
    .sort((left, right) => {
      const difference = timelineTimestamp(left) - timelineTimestamp(right)
      return dateSortDirection === 'asc' ? difference : -difference
    })
  const visibleTimeline = showAll ? filteredTimeline : filteredTimeline.slice(0, initialLimit)
  const hiddenCount = filteredTimeline.length - visibleTimeline.length

  const staffLabel = (entry) => {
    if (Array.isArray(entry.staff) && entry.staff.length) {
      return entry.staff
        .map((staff) => {
          const person = [staff.name, staff.code ? `(${staff.code})` : ''].filter(Boolean).join(' ')
          return staff.role ? `${staff.role}: ${person}` : person
        })
        .filter(Boolean)
        .join(' · ')
    }
    const staff = [entry.staffName, entry.staffCode ? `(${entry.staffCode})` : '']
      .filter(Boolean)
      .join(' ')
    if (!staff) return '—'
    return entry.staffRole ? `${entry.staffRole}: ${staff}` : staff
  }

  const eventContext = (entry) => entry.context || entry.description || '—'

  const columns = [
    {
      key: 'date',
      label: (
        <DataTableSortHeader
          label="Date"
          field="date"
          sortField="date"
          sortDir={dateSortDirection}
          onSort={() =>
            setDateSortDirection((direction) => (direction === 'desc' ? 'asc' : 'desc'))
          }
        />
      ),
      mobileLabel: 'Date',
      width: '180px',
      headerClassName: timelineHeaderClassName,
      render: (entry) => (
        <>
          {formatFirstTouchDate(entry.date)}
          {entry.time ? ` at ${entry.time}` : ''}
        </>
      ),
    },
    {
      key: 'interaction',
      label: 'Interaction',
      width: '180px',
      headerClassName: timelineHeaderClassName,
      render: (entry) => <span className="fw-medium">{entry.title}</span>,
    },
    {
      key: 'context',
      label: 'Client / quotation / project',
      headerClassName: timelineHeaderClassName,
      render: (entry) => (
        <>
          <div>{eventContext(entry)}</div>
          {entry.remarks ? (
            <div className="small text-muted text-truncate" title={entry.remarks}>
              {entry.remarks}
            </div>
          ) : null}
        </>
      ),
    },
    {
      key: 'staff',
      label: 'Amiosh staff / role',
      headerClassName: timelineHeaderClassName,
      render: (entry) => staffLabel(entry),
    },
  ]

  return (
    <section aria-label="Relationship timeline">
      {timeline.length ? (
        <>
          <div className="d-flex align-items-center gap-3 py-2">
            <h2 className="h6 mb-0">Relationship timeline</h2>
            <label className="visually-hidden" htmlFor="client-relationship-activity-filter">
              Filter relationship activity
            </label>
            <CFormSelect
              id="client-relationship-activity-filter"
              size="sm"
              className="w-auto ms-auto"
              value={activityFilter}
              onChange={(event) => {
                setActivityFilter(event.target.value)
                setShowAll(false)
              }}
            >
              {activityFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </CFormSelect>
          </div>
          <DataTableEmbeddedList
            rows={visibleTimeline}
            columns={columns}
            getRowKey={(entry) => entry.id}
            emptyMessage="No matching relationship events."
            tableClassName="mb-0 align-middle first-touch-timeline-table"
            desktopBreakpoint="md"
          />
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
          Show {hiddenCount} more event{hiddenCount === 1 ? '' : 's'}
        </CButton>
      ) : null}
      {showAll && filteredTimeline.length > initialLimit ? (
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
