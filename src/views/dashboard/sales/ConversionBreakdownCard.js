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
  CPopover,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`

const AverageConversionPopoverContent = ({ rows, averageRate, denominator, denominatorLabel }) => {
  const rates = rows.map((item) => ({
    label: item.label,
    rate: Number(item.conversionRate || 0),
  }))
  const formula = rates.map((item) => formatPercent(item.rate)).join(' + ')
  const inactiveCount = Math.max(denominator - rates.length, 0)
  const denominatorText = denominatorLabel || 'rows'

  return (
    <div className="small" style={{ maxWidth: '320px', overflowWrap: 'break-word' }}>
      <div className="mb-2 text-muted">
        Average of displayed row rates divided by {denominatorText}. Staff with no activity count as
        0%.
      </div>
      <div className="d-flex flex-column gap-1">
        {rates.map((item) => (
          <div key={`${item.label}-${item.rate}`} className="d-flex justify-content-between gap-3">
            <span className="text-muted">{item.label}</span>
            <span className="fw-semibold">{formatPercent(item.rate)}</span>
          </div>
        ))}
        {inactiveCount > 0 && (
          <div className="d-flex justify-content-between gap-3">
            <span className="text-muted">No activity staff x {inactiveCount}</span>
            <span className="fw-semibold">0.0%</span>
          </div>
        )}
      </div>
      <div className="mt-2 pt-2 border-top text-muted">
        ({formula || '0.0%'}
        {inactiveCount > 0 ? ` + ${inactiveCount} x 0.0%` : ''}) / {denominator} ={' '}
        <span className="fw-semibold text-body">{formatPercent(averageRate)}</span>
      </div>
    </div>
  )
}

const ConversionBreakdownCard = ({
  dimensionLabel,
  labelHeader,
  rows,
  loading,
  error,
  startDate,
  endDate,
  averageDenominator,
  averageDenominatorLabel,
}) => {
  const sortedRows = [...rows].sort((a, b) => {
    const rateDelta = Number(b.conversionRate || 0) - Number(a.conversionRate || 0)
    if (rateDelta !== 0) return rateDelta

    const volumeDelta = Number(b.totalQuotes || 0) - Number(a.totalQuotes || 0)
    if (volumeDelta !== 0) return volumeDelta

    return Number(b.convertedCount || 0) - Number(a.convertedCount || 0)
  })

  const totalConverted = sortedRows.reduce((sum, item) => sum + Number(item.convertedCount || 0), 0)
  const totalQuotes = sortedRows.reduce((sum, item) => sum + Number(item.totalQuotes || 0), 0)
  const overallConversionRate = totalQuotes > 0 ? (totalConverted / totalQuotes) * 100 : 0
  const effectiveAverageDenominator =
    Number(averageDenominator) > 0 ? Number(averageDenominator) : sortedRows.length
  const averageConversionRate =
    effectiveAverageDenominator > 0
      ? sortedRows.reduce((sum, item) => sum + Number(item.conversionRate || 0), 0) /
        effectiveAverageDenominator
      : 0
  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CRow className="align-items-center">
          <CCol className="text-nowrap">
            <strong>Conversion Rate</strong>{' '}
            <small className="text-muted">By {dimensionLabel}</small>
          </CCol>
        </CRow>
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
                  <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-3">
                    <div className="text-muted text-start">
                      Overall conversion for period ({periodRangeLabel})
                    </div>
                    <div className="d-flex flex-wrap align-items-baseline justify-content-end gap-3 ms-auto">
                      <div className="text-end">
                        <div className="small text-muted">Overall</div>
                        <div className="h2 mb-0 text-success">
                          {formatPercent(overallConversionRate)}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="small text-muted">Average</div>
                        <div className="h2 mb-0 text-primary">
                          <CPopover
                            trigger={['hover', 'focus']}
                            placement="top"
                            title="Average conversion calculation"
                            content={
                              <AverageConversionPopoverContent
                                rows={sortedRows}
                                averageRate={averageConversionRate}
                                denominator={effectiveAverageDenominator}
                                denominatorLabel={averageDenominatorLabel}
                              />
                            }
                          >
                            <span
                              className="d-inline-block text-decoration-underline"
                              role="button"
                              tabIndex={0}
                              style={{
                                cursor: 'help',
                                textUnderlineOffset: '0.18em',
                                textDecorationStyle: 'dotted',
                              }}
                            >
                              {formatPercent(averageConversionRate)}
                            </span>
                          </CPopover>
                        </div>
                      </div>
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
                      Rate
                    </CTableHeaderCell>
                    <CTableHeaderCell
                      className="text-end"
                      style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                    >
                      Realized / Total
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {sortedRows.map((item, index) => {
                    const rate = Number(item.conversionRate || 0)
                    const barWidth = rate > 0 ? `${Math.min(rate, 100)}%` : '2px'

                    return (
                      <CTableRow
                        key={`${item.label || 'item'}-${item.totalQuotes || 0}-${item.convertedCount || 0}`}
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
                              className="rounded-pill bg-success"
                              style={{ width: barWidth, height: '100%' }}
                            />
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-end border-0">
                          {formatPercent(rate)}
                        </CTableDataCell>
                        <CTableDataCell className="text-end border-0">
                          {Number(item.convertedCount || 0)}/{Number(item.totalQuotes || 0)}
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
                      {totalConverted}/{totalQuotes}
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

export default ConversionBreakdownCard
