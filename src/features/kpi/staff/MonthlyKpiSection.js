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
import { DataTableLoadingState } from '../../../components/datatable'
import { getMonthIndex, trackerBelongsToKpi } from '../utils/kpiDate'

/**
 * Displays all KPI parameters as rows with monthly achieved values (year-aware).
 */
const MonthlyKpiSection = ({
  year, // selected year, used for header only
  monthNames,
  kpiOptions,
  allTrackerData,
  loading,
  error,
}) => {
  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Monthly Overview{year ? ` (${year})` : ''}</strong>
      </CCardHeader>
      <CCardBody>
        {error && <p className="text-danger mt-3">{error}</p>}

        {!loading ? (
          kpiOptions.length === 0 ? (
            <p className="text-muted mb-0">No KPI parameters to display.</p>
          ) : (
            /* datatable-exempt: existing embedded/layout table */
            <CTable hover responsive className="mt-3 data-table-compact embedded-data-table">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Parameter</CTableHeaderCell>
                  {monthNames.map((m) => (
                    <CTableHeaderCell key={m}>{m}</CTableHeaderCell>
                  ))}
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {kpiOptions.map((kpi) => {
                  // Build monthly values for this KPI
                  const monthlyValues = Array(12).fill('-')
                  allTrackerData.forEach((row) => {
                    if (trackerBelongsToKpi(row, kpi)) {
                      const monthIdx = getMonthIndex(row.for_month)
                      if (monthIdx >= 0 && monthIdx <= 11) {
                        monthlyValues[monthIdx] = row.actual_value ?? '-'
                      }
                    }
                  })

                  return (
                    <CTableRow key={kpi.value}>
                      <CTableDataCell className="text-primary fw-bold">{kpi.label}</CTableDataCell>
                      {monthlyValues.map((val, i) => (
                        <CTableDataCell key={i}>{val}</CTableDataCell>
                      ))}
                    </CTableRow>
                  )
                })}
              </CTableBody>
            </CTable>
          )
        ) : (
          <DataTableLoadingState message="Loading monthly overview..." />
        )}
      </CCardBody>
    </CCard>
  )
}

export default MonthlyKpiSection
