import React from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableBody,
  CTableFoot,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'

const defaultFormatValue = (value) => Number(value || 0).toLocaleString()

const RankedMetricBreakdownCard = ({
  metricTitle,
  dimensionLabel,
  labelHeader,
  totalLabel,
  valueColumnLabel,
  rows,
  loading,
  error,
  startDate,
  endDate,
  formatValue = defaultFormatValue,
  barColorClass = 'bg-primary',
  headerActions = null,
}) => {
  const sortedRows = [...rows].sort((a, b) => (b.value || 0) - (a.value || 0))
  const totalValue = sortedRows.reduce((sum, item) => sum + Number(item.value || 0), 0)
  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)

  return (
    <CCard className="mb-4">
      <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div className="min-w-0">
          <strong>{metricTitle}</strong> <small className="text-muted">By {dimensionLabel}</small>
        </div>
        {headerActions && <div className="d-flex align-items-center ms-auto">{headerActions}</div>}
      </CCardHeader>

      <CCardBody>
        {loading ? (
          <DataTableLoadingState message="Loading data..." />
        ) : error ? (
          <div className="text-center text-danger py-4">{error}</div>
        ) : sortedRows.length === 0 ? (
          <div className="text-center text-muted py-4">
            No data available for the selected period.
          </div>
        ) : (
          <>
            <div className="mb-3">
              <CRow>
                <CCol xs={12}>
                  <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2">
                    <div className="text-muted text-start">
                      {totalLabel} for period ({periodRangeLabel})
                    </div>
                    <div className="h2 mb-0 text-primary text-end ms-auto">
                      {formatValue(totalValue)}
                    </div>
                  </div>
                </CCol>
              </CRow>
            </div>

            <div className="rounded-4 overflow-hidden bg-light">
              {/* datatable-exempt: existing embedded/layout table */}
              <CTable
                responsive
                align="middle"
                className="mb-0 table-borderless border-0 data-table-compact embedded-data-table"
              >
                <CTableHead>
                  <CTableRow className="table-light">
                    <CTableHeaderCell style={{ borderBottom: '1px solid var(--app-surface-page)' }}>
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ borderBottom: '1px solid var(--app-surface-page)' }}>
                      {labelHeader}
                    </CTableHeaderCell>
                    <CTableHeaderCell
                      className="text-end"
                      style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                    >
                      Share
                    </CTableHeaderCell>
                    <CTableHeaderCell
                      className="text-end"
                      style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                    >
                      {valueColumnLabel}
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {sortedRows.map((item, index) => {
                    const share = totalValue ? Math.round((item.value / totalValue) * 100) : 0
                    const barWidth = share > 0 ? `${share}%` : '2px'

                    return (
                      <CTableRow
                        key={`${item.label || 'item'}-${item.value || 0}`}
                        className="table-light"
                      >
                        <CTableDataCell className="border-0 text-muted">{index + 1}</CTableDataCell>
                        <CTableDataCell className="border-0">
                          <div className="fw-semibold">{item.label}</div>
                          <div
                            className="mt-2 rounded-pill bg-white"
                            style={{ height: '4px', overflow: 'hidden' }}
                          >
                            <div
                              className={`rounded-pill ${barColorClass}`}
                              style={{ width: barWidth, height: '100%' }}
                            />
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-end border-0">{share}%</CTableDataCell>
                        <CTableDataCell className="text-end border-0">
                          {formatValue(item.value)}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>

                <CTableFoot>
                  <CTableRow className="table-light fw-semibold text-muted">
                    <CTableDataCell
                      colSpan={3}
                      className="text-muted"
                      style={{ borderTop: '1px solid var(--app-surface-page)' }}
                    >
                      Total
                    </CTableDataCell>
                    <CTableDataCell
                      className="text-end text-muted"
                      style={{ borderTop: '1px solid var(--app-surface-page)' }}
                    >
                      {formatValue(totalValue)}
                    </CTableDataCell>
                  </CTableRow>
                </CTableFoot>
              </CTable>
            </div>
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RankedMetricBreakdownCard
