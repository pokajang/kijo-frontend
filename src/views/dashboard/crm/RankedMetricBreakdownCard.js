import React from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { formatCount } from '../../../utils/formatters/numberFormatters'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'

const defaultFormatValue = (value) => formatCount(value)

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
  const columns = [
    {
      key: 'index',
      label: '#',
      width: '3.25rem',
      shrinkToFit: true,
      render: (_item, index) => index + 1,
      cellClassName: 'text-muted',
    },
    {
      key: 'label',
      label: labelHeader,
      render: (item) => {
        const share = totalValue ? Math.round((item.value / totalValue) * 100) : 0
        const barWidth = share > 0 ? `${share}%` : '2px'

        return (
          <>
            <div className="fw-semibold">{item.label}</div>
            <div
              className="mt-2 rounded-pill dashboard-breakdown-meter"
              style={{ height: '4px', overflow: 'hidden' }}
            >
              <div
                className={`rounded-pill ${barColorClass}`}
                style={{ width: barWidth, height: '100%' }}
              />
            </div>
          </>
        )
      },
    },
    {
      key: 'share',
      label: 'Share',
      align: 'end',
      render: (item) => {
        const share = totalValue ? Math.round((item.value / totalValue) * 100) : 0
        return `${share}%`
      },
    },
    {
      key: 'value',
      label: valueColumnLabel,
      align: 'end',
      render: (item) => formatValue(item.value),
    },
  ]
  const footerRows = [
    {
      key: 'total',
      className: 'fw-semibold text-muted',
      cells: [
        {
          key: 'total-label',
          content: 'Total',
          colSpan: 3,
          className: 'text-muted',
        },
        {
          key: 'total-value',
          content: formatValue(totalValue),
          align: 'end',
          className: 'text-muted',
        },
      ],
    },
  ]

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

            <DataTableEmbeddedList
              rows={sortedRows}
              columns={columns}
              footerRows={footerRows}
              getRowKey={(item) => `${item.label || 'item'}-${item.value || 0}`}
              desktopBreakpoint="md"
              mobileClassName="dashboard-metric-mobile-list"
              renderMobileItem={(item, index) => {
                const share = totalValue ? Math.round((item.value / totalValue) * 100) : 0
                const barWidth = share > 0 ? `${share}%` : '2px'

                return (
                  <div className="data-table-mobile-item dashboard-metric-mobile-row dashboard-metric-mobile-row--with-bar">
                    <div className="dashboard-metric-mobile-main">
                      <div className="dashboard-metric-mobile-kicker">#{index + 1}</div>
                      <div className="dashboard-metric-mobile-title">{item.label}</div>
                      <div className="dashboard-metric-mobile-subtitle">{labelHeader}</div>
                    </div>
                    <div className="dashboard-metric-mobile-values">
                      <div className="dashboard-metric-mobile-primary">
                        {formatValue(item.value)}
                      </div>
                      <div className="dashboard-metric-mobile-secondary">Share {share}%</div>
                    </div>
                    <div className="dashboard-metric-mobile-bar">
                      <div className={barColorClass} style={{ width: barWidth }} />
                    </div>
                  </div>
                )
              }}
              renderMobileFooterItem={() => (
                <div className="data-table-mobile-item data-table-mobile-footer-item dashboard-metric-mobile-row dashboard-metric-mobile-total-row">
                  <div className="dashboard-metric-mobile-main">
                    <div className="dashboard-metric-mobile-title">Total</div>
                    <div className="dashboard-metric-mobile-subtitle">{totalLabel}</div>
                  </div>
                  <div className="dashboard-metric-mobile-values">
                    <div className="dashboard-metric-mobile-primary">{formatValue(totalValue)}</div>
                  </div>
                </div>
              )}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default RankedMetricBreakdownCard
