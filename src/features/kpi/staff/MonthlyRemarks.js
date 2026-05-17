import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { getMonthIndex } from '../utils/kpiDate'

/**
 * Shows each month's remarks for all KPI parameters (year-aware).
 */
const MonthlyRemarks = ({ year, monthNames, allTrackerData }) => {
  // build an array of 12 lists of { label, remarks }
  const monthlyParamRemarks = Array.from({ length: 12 }, () => [])
  allTrackerData.forEach(({ for_month, label, remarks }) => {
    const m = getMonthIndex(for_month)
    if (m >= 0 && m <= 11) {
      monthlyParamRemarks[m].push({ label, remarks })
    }
  })

  const now = new Date()
  const isCurrentYear = Number(year) === now.getFullYear()
  const lastMonthIndexToShow = isCurrentYear ? now.getMonth() : 11

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Monthly Remarks{year ? ` (${year})` : ''}</strong>
      </CCardHeader>
      <CCardBody>
        {/* datatable-exempt: existing embedded/layout table */}
        <CTable hover responsive className="mt-3 data-table-compact embedded-data-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Month</CTableHeaderCell>
              <CTableHeaderCell>Tracker Remarks</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {monthNames.map((m, i) => {
              if (i > lastMonthIndexToShow) return null
              const items = monthlyParamRemarks[i]
              return (
                <CTableRow key={i}>
                  <CTableDataCell>{m}</CTableDataCell>
                  <CTableDataCell>
                    {items.length > 0
                      ? items.map((it, idx) => (
                          <div key={idx}>
                            <small className="text-muted">{it.label}:</small> {it.remarks || '-'}
                          </div>
                        ))
                      : '-'}
                  </CTableDataCell>
                </CTableRow>
              )
            })}
          </CTableBody>
        </CTable>
      </CCardBody>
    </CCard>
  )
}

export default MonthlyRemarks
