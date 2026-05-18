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

const formatCurrency = (value) => `RM ${Number(value || 0).toLocaleString()}`
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`

const RoiCalculationPopoverContent = ({ awardedValue, targetValue, roi }) => (
  <div className="small">
    <div className="d-flex justify-content-between gap-3">
      <span className="text-muted">Realized</span>
      <span className="fw-semibold">{formatCurrency(awardedValue)}</span>
    </div>
    <div className="d-flex justify-content-between gap-3">
      <span className="text-muted">Target</span>
      <span className="fw-semibold">{formatCurrency(targetValue)}</span>
    </div>
    <div className="mt-2 pt-2 border-top text-muted">
      {formatCurrency(awardedValue)} / {formatCurrency(targetValue)} x 100 ={' '}
      <span className="fw-semibold text-body">{formatPercent(roi)}</span>
    </div>
  </div>
)

const AwardedValueBreakdownCard = ({
  dimensionLabel,
  labelHeader,
  rows,
  loading,
  error,
  startDate,
  endDate,
}) => {
  const sortedRows = [...rows].sort((a, b) => (b.value || 0) - (a.value || 0))
  const totalAwarded = sortedRows.reduce((sum, item) => sum + (item.value || 0), 0)
  const showRoi = sortedRows.some((item) => item.roi !== undefined && item.roi !== null)
  const periodRangeLabel = formatDateRangeLabel(startDate, endDate)

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <CRow className="align-items-center">
          <CCol className="text-nowrap">
            <strong>Realized Value</strong>{' '}
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
                  <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-2">
                    <div className="text-muted text-start">
                      Total realized for period ({periodRangeLabel})
                    </div>
                    <div className="h2 mb-0 text-success text-end ms-auto">
                      {formatCurrency(totalAwarded)}
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
                    {showRoi && (
                      <CTableHeaderCell
                        className="text-end"
                        style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                      >
                        ROI
                      </CTableHeaderCell>
                    )}
                    <CTableHeaderCell
                      className="text-end"
                      style={{ borderBottom: '1px solid var(--app-surface-page)' }}
                    >
                      Value (RM)
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>

                <CTableBody>
                  {sortedRows.map((item, index) => {
                    const share = totalAwarded ? Math.round((item.value / totalAwarded) * 100) : 0
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
                              className="rounded-pill bg-success"
                              style={{ width: barWidth, height: '100%' }}
                            />
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="text-end border-0">{share}%</CTableDataCell>
                        {showRoi && (
                          <CTableDataCell className="text-end border-0">
                            {item.roi !== undefined && item.roi !== null ? (
                              <CPopover
                                trigger={['hover', 'focus']}
                                placement="top"
                                title="ROI calculation"
                                content={
                                  <RoiCalculationPopoverContent
                                    awardedValue={item.value}
                                    targetValue={item.roiTarget}
                                    roi={item.roi}
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
                                  {formatPercent(item.roi)}
                                </span>
                              </CPopover>
                            ) : (
                              '-'
                            )}
                          </CTableDataCell>
                        )}
                        <CTableDataCell className="text-end border-0">
                          {Number(item.value || 0).toLocaleString()}
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>

                <CTableFoot>
                  <CTableRow className="table-light fw-semibold text-muted">
                    <CTableDataCell
                      colSpan={showRoi ? 4 : 3}
                      className="text-muted"
                      style={{ borderTop: '1px solid var(--app-surface-page)' }}
                    >
                      Total
                    </CTableDataCell>
                    <CTableDataCell
                      className="text-end text-muted"
                      style={{ borderTop: '1px solid var(--app-surface-page)' }}
                    >
                      {Number(totalAwarded).toLocaleString()}
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

export default AwardedValueBreakdownCard
