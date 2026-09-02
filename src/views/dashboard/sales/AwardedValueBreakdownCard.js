import React from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol, CPopover } from '@coreui/react'
import { DataTableEmbeddedList, DataTableLoadingState } from '../../../components/datatable'
import { formatMoney, formatNumber } from '../../../utils/formatters/numberFormatters'
import { formatDateRangeLabel } from '../shared/dateRangeUtils'

const formatCurrency = (value) => formatMoney(value)
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
        const share = totalAwarded ? Math.round((item.value / totalAwarded) * 100) : 0
        const barWidth = share > 0 ? `${share}%` : '2px'

        return (
          <>
            <div className="fw-semibold">{item.label}</div>
            <div
              className="mt-2 rounded-pill dashboard-breakdown-meter"
              style={{ height: '4px', overflow: 'hidden' }}
            >
              <div
                className="rounded-pill bg-success"
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
        const share = totalAwarded ? Math.round((item.value / totalAwarded) * 100) : 0
        return `${share}%`
      },
    },
    ...(showRoi
      ? [
          {
            key: 'roi',
            label: 'ROI',
            align: 'end',
            render: (item) =>
              item.roi !== undefined && item.roi !== null ? (
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
              ),
          },
        ]
      : []),
    {
      key: 'value',
      label: 'Value (RM)',
      align: 'end',
      render: (item) => formatNumber(item.value, { minimumFractionDigits: 2 }),
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
          colSpan: showRoi ? 4 : 3,
          className: 'text-muted',
        },
        {
          key: 'total-value',
          content: formatNumber(totalAwarded, { minimumFractionDigits: 2 }),
          align: 'end',
          className: 'text-muted',
        },
      ],
    },
  ]

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

            <DataTableEmbeddedList
              rows={sortedRows}
              columns={columns}
              footerRows={footerRows}
              getRowKey={(item) => `${item.label || 'item'}-${item.value || 0}`}
              desktopBreakpoint="md"
              mobileClassName="dashboard-metric-mobile-list"
              renderMobileItem={(item, index) => {
                const share = totalAwarded ? Math.round((item.value / totalAwarded) * 100) : 0
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
                        {formatCurrency(item.value)}
                      </div>
                      <div className="dashboard-metric-mobile-secondary">Share {share}%</div>
                      {showRoi && item.roi !== undefined && item.roi !== null && (
                        <div className="dashboard-metric-mobile-secondary">
                          ROI {formatPercent(item.roi)}
                        </div>
                      )}
                    </div>
                    <div className="dashboard-metric-mobile-bar">
                      <div className="bg-success" style={{ width: barWidth }} />
                    </div>
                  </div>
                )
              }}
            />
          </>
        )}
      </CCardBody>
    </CCard>
  )
}

export default AwardedValueBreakdownCard
