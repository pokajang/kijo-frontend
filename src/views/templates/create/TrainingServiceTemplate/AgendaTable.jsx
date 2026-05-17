import React from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CFormTextarea,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormInput,
  CButton,
  CButtonGroup,
} from '@coreui/react'

const DURATION_OPTIONS = [
  { label: '1 hour', value: '1hour' },
  { label: '2 hours', value: '2hour' },
  { label: '3 hours', value: '3hour' },
  { label: 'Half Day (AM)', value: 'halfday_am' },
  { label: 'Half Day (PM)', value: 'halfday_pm' },
  { label: '1 Day', value: '1day' },
  { label: '2 Days', value: '2day' },
  { label: '3 Days', value: '3day' },
]

// Duration token to number of agenda days.
const getDayCountFromDuration = (token) => {
  switch (token) {
    case '2day':
      return 2
    case '3day':
      return 3
    default:
      return 1
  }
}

const toMinutes = (timeStr) => {
  const [h, m] = (timeStr || '').split(':').map(Number)
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN
}

const isValidTime = (timeStr) => /^\d{2}:\d{2}$/.test(timeStr || '')

// Keep existing rows whenever possible when the day count changes.
const adjustAgendaForDayCount = (prevRows, nextDayCount) => {
  const clone = [...prevRows]
  const currentMaxDay = clone.length ? Math.max(...clone.map((r) => Number(r.day) || 1)) : 0

  if (nextDayCount > currentMaxDay) {
    for (let day = currentMaxDay + 1; day <= nextDayCount; day++) {
      clone.push({ day, start: '09:00', end: '', topic: '' })
    }
    return clone
  }

  if (nextDayCount < currentMaxDay) {
    const keep = clone.filter((r) => (Number(r.day) || 1) <= nextDayCount)
    const move = clone
      .filter((r) => (Number(r.day) || 1) > nextDayCount)
      .map((r) => ({ ...r, day: nextDayCount }))
    return [...keep, ...move]
  }

  return clone
}

const AgendaTable = ({ agendaRows, setAgendaRows, duration, setDuration }) => {
  const handleDurationSelect = (nextToken) => {
    if (nextToken === duration) return

    const nextDays = getDayCountFromDuration(nextToken)
    setDuration(nextToken)

    setAgendaRows((prev) => {
      const adjusted = adjustAgendaForDayCount(prev, nextDays)
      return [...adjusted].sort((a, b) => {
        const dayA = Number(a.day) || 1
        const dayB = Number(b.day) || 1
        if (dayA !== dayB) return dayA - dayB
        const minA = toMinutes(a.start)
        const minB = toMinutes(b.start)
        if (Number.isNaN(minA) || Number.isNaN(minB)) return 0
        return minA - minB
      })
    })
  }

  const handleAgendaChange = (index, field, value) => {
    setAgendaRows((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Add row to the selected day.
  const handleAddRowToDay = (day) => {
    setAgendaRows((prev) => {
      const dayNum = Number(day) || 1
      const rowsForDay = prev.filter((r) => Number(r.day) === dayNum)

      let nextStart = '09:00'
      if (rowsForDay.length > 0) {
        const last = rowsForDay[rowsForDay.length - 1]
        if (isValidTime(last.end)) nextStart = last.end
        else if (isValidTime(last.start)) nextStart = last.start
      }

      return [...prev, { day: dayNum, start: nextStart, end: '', topic: '' }]
    })
  }

  const handleRemoveRow = (index) => {
    setAgendaRows((prev) => prev.filter((_, idx) => idx !== index))
  }

  const groupedByDay = agendaRows.reduce((acc, row, index) => {
    const day = Number(row.day) || 1
    if (!acc[day]) acc[day] = []
    acc[day].push({ ...row, _idx: index })
    return acc
  }, {})

  const sortedDayKeys = Object.keys(groupedByDay)
    .map((n) => Number(n))
    .sort((a, b) => a - b)

  return (
    <CRow className="mb-3">
      <CCol>
        <CFormLabel>Select Training Duration</CFormLabel>
        <CButtonGroup className="mb-3 d-block">
          {DURATION_OPTIONS.map(({ label, value }) => (
            <CButton
              key={value}
              color={duration === value ? 'primary' : 'secondary'}
              variant={duration === value ? '' : 'outline'}
              onClick={() => handleDurationSelect(value)}
              className="me-2 mb-2"
            >
              {label}
            </CButton>
          ))}
        </CButtonGroup>

        <CFormLabel>Tentative Program</CFormLabel>
        {/* datatable-exempt: existing embedded/layout table */}
        <CTable hover responsive className="data-table-compact embedded-data-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell style={{ width: '15%' }}>Start Time</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '15%' }}>End Time</CTableHeaderCell>
              <CTableHeaderCell>Topic</CTableHeaderCell>
              <CTableHeaderCell style={{ width: '10%' }} />
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {sortedDayKeys.map((day) => (
              <React.Fragment key={day}>
                <CTableRow className="bg-light fw-bold">
                  <CTableDataCell colSpan={4}>Day {day}</CTableDataCell>
                </CTableRow>

                {groupedByDay[day].map((row) => {
                  const idx = row._idx
                  return (
                    <CTableRow key={`${day}-${idx}`}>
                      <CTableDataCell>
                        <CFormInput
                          type="time"
                          value={row.start}
                          onChange={(e) => handleAgendaChange(idx, 'start', e.target.value)}
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="time"
                          value={row.end}
                          onChange={(e) => handleAgendaChange(idx, 'end', e.target.value)}
                        />
                      </CTableDataCell>
                      <CTableDataCell>
                        <CFormTextarea
                          placeholder="Enter for a new line. Keep every agenda item short and concise. Keep it to only 1-2 lines if possible."
                          value={(row.topic || '').replace(/<br\s*\/?>/g, '\n')}
                          rows={
                            (row.topic || '').match(/<br\s*\/?>/g)
                              ? row.topic.split(/<br\s*\/?>/).length
                              : 2
                          }
                          onChange={(e) =>
                            handleAgendaChange(idx, 'topic', e.target.value.replace(/\n/g, '<br/>'))
                          }
                        />
                      </CTableDataCell>
                      <CTableDataCell className="text-center">
                        <CButton
                          color="danger"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={agendaRows.length === 1}
                        >
                          Remove
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  )
                })}

                <CTableRow>
                  <CTableDataCell colSpan={4}>
                    <CButton
                      color="primary"
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddRowToDay(day)}
                    >
                      Add Row to Day {day}
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              </React.Fragment>
            ))}
          </CTableBody>
        </CTable>
      </CCol>
    </CRow>
  )
}

export default AgendaTable
