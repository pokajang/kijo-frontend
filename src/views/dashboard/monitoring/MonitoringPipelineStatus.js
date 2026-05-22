import React, { useEffect, useState } from 'react'
import { DataTableLoadingState, DataTableSheet } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import MonitoringSheetCard from './MonitoringSheetCard'
import MonitoringCellDetailsPopover from './MonitoringCellDetailsPopover'

const renderMetric = (value) => Number(value || 0).toLocaleString()
const manualOnlyLabel = (
  <span
    className="small text-muted"
    title="System revenue is not auto-classified here. Closed manual entries with service category and classification will appear."
  >
    Manual only
  </span>
)
const renderDetailMetric = (value, details, title, metricLabel) => (
  <MonitoringCellDetailsPopover
    value={value}
    details={details}
    title={title}
    metricLabel={metricLabel}
    formatter={renderMetric}
  />
)
const renderSegmentMetric = (row, key, details, title, metricLabel) => {
  const value = row?.[key]
  return value === null || value === undefined
    ? manualOnlyLabel
    : renderDetailMetric(value, details, title, metricLabel)
}
const renderSegmentPlainMetric = (row, key) => {
  const value = row?.[key]
  return value === null || value === undefined ? manualOnlyLabel : renderMetric(value)
}

const segmentColumns = [
  { key: 'individual', label: 'Individual' },
  { key: 'specialProject', label: 'Special Project' },
  { key: 'tender', label: 'Tender' },
]

const formatPipelineStatusLabel = (label) => {
  const mappedLabels = {
    TRAINING: 'Training',
    'CONSULTANCY -ISO': 'Consultancy - ISO',
    'CONSULTANCY - IHOH': 'Consultancy - IHOH',
    'MAN POWER': 'Man Power',
    'EQUIPMENT SUPPLY': 'Equipment Supply',
    ENGINEERING: 'Engineering',
    INFRASTRUCTURE: 'Infrastructure',
    TOTAL: 'Total',
  }

  return mappedLabels[label] || label
}

const WeeklyStatusMobileList = ({ rows, weeks, totals }) => (
  <div className="d-md-none d-grid gap-2">
    {rows.map((row, index) => (
      <div key={`${row.label}-mobile`} className="dashboard-table-mobile-card">
        <div className="d-flex justify-content-between gap-2 mb-2">
          <div className="fw-semibold">
            {index + 1}. {formatPipelineStatusLabel(row.label)}
          </div>
          <div className="text-end">
            <div className="fw-semibold">QTY {renderMetric(row.totalQty)}</div>
            <div className="text-muted">RM {renderMetric(row.totalRm)}</div>
          </div>
        </div>
        <div className="row g-2">
          {weeks.map((week) => (
            <div
              className="col-12 d-flex align-items-center justify-content-between gap-2 small"
              key={`${row.label}-${week.key}-mobile`}
            >
              <span className="text-muted">{week.label}</span>
              <span className="text-end">
                QTY{' '}
                {renderDetailMetric(
                  row.weekly?.[week.key]?.qty,
                  row.details?.weekly?.[week.key]?.qty,
                  `${formatPipelineStatusLabel(row.label)} - ${week.label} QTY`,
                  'quantity',
                )}{' '}
                | RM {renderMetric(row.weekly?.[week.key]?.rm)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
    <div className="dashboard-table-mobile-card dashboard-metric-mobile-total-row fw-semibold">
      <div className="d-flex justify-content-between gap-2 mb-2">
        <div>Total</div>
        <div className="text-end">
          <div>QTY {renderMetric(totals?.totalQty)}</div>
          <div>RM {renderMetric(totals?.totalRm)}</div>
        </div>
      </div>
      <div className="row g-2">
        {weeks.map((week) => (
          <div
            className="col-12 d-flex align-items-center justify-content-between gap-2 small"
            key={`status-total-${week.key}`}
          >
            <span className="text-muted">{week.label}</span>
            <span className="text-end">
              QTY{' '}
              {renderDetailMetric(
                totals?.weekly?.[week.key]?.qty,
                totals?.details?.weekly?.[week.key]?.qty,
                `Total - ${week.label} QTY`,
                'quantity',
              )}{' '}
              | RM {renderMetric(totals?.weekly?.[week.key]?.rm)}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const StatusSegmentMobileList = ({ rows }) => (
  <div className="d-md-none d-grid gap-2">
    {rows.map((row, index) => (
      <div key={`${row.label}-segment-mobile`} className="dashboard-table-mobile-card">
        <div className="fw-semibold mb-2">
          {index + 1}. {formatPipelineStatusLabel(row.label)}
        </div>
        <div className="d-grid gap-2">
          {segmentColumns.map((segment) => (
            <div
              className="d-flex align-items-center justify-content-between gap-3 small"
              key={`${row.label}-${segment.key}-mobile`}
            >
              <span className="text-muted">{segment.label}</span>
              <span className="text-end">
                QTY{' '}
                {renderSegmentMetric(
                  row,
                  `${segment.key}Qty`,
                  row.details?.segments?.[segment.key]?.qty,
                  `${formatPipelineStatusLabel(row.label)} - ${segment.label} QTY`,
                  `${segment.label} quantity`,
                )}{' '}
                | RM {renderSegmentPlainMetric(row, `${segment.key}Rm`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

const WeeklyStatusTable = ({ rows, weeks, totals }) => (
  <DataTableSheet
    desktopBreakpoint="md"
    shellClassName="monitoring-table-frame"
    tableClassName="monitoring-sheet-table"
    headerRows={[
      {
        key: 'group',
        cells: [
          {
            key: 'index',
            content: '#',
            rowSpan: 2,
            className: 'border-0 text-center',
            style: { width: '56px' },
          },
          { key: 'service', content: 'Service', rowSpan: 2, className: 'border-0' },
          ...weeks.map((week) => ({
            key: week.key,
            content: (
              <>
                <div>{week.label}</div>
                <div className="small text-muted fw-normal">{week.rangeLabel}</div>
              </>
            ),
            colSpan: 2,
            className: `border-0 text-center text-nowrap monitoring-data-band monitoring-week-heading ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`,
          })),
          {
            key: 'total',
            content: 'Total',
            colSpan: 2,
            className: 'border-0 text-center monitoring-total-col monitoring-week-heading',
          },
        ],
      },
      {
        key: 'metrics',
        cells: [
          ...weeks.flatMap((week) => [
            {
              key: `${week.key}-qty`,
              content: 'QTY',
              className: `border-0 text-center text-nowrap ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`,
            },
            { key: `${week.key}-rm`, content: 'RM', className: 'border-0 text-center text-nowrap' },
          ]),
          {
            key: 'total-qty',
            content: 'QTY',
            className: 'border-0 text-center text-nowrap monitoring-total-col',
          },
          { key: 'total-rm', content: 'RM', className: 'border-0 text-center text-nowrap' },
        ],
      },
    ]}
    rows={rows.map((row, index) => ({
      key: row.label,
      cells: [
        { key: 'index', content: index + 1, className: 'border-0 text-center fw-semibold' },
        {
          key: 'service',
          content: formatPipelineStatusLabel(row.label),
          className: 'border-0 fw-semibold',
        },
        ...weeks.flatMap((week) => [
          {
            key: `${week.key}-qty`,
            content: renderDetailMetric(
              row.weekly?.[week.key]?.qty,
              row.details?.weekly?.[week.key]?.qty,
              `${formatPipelineStatusLabel(row.label)} - ${week.label} QTY`,
              'quantity',
            ),
            className: `border-0 text-center ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`,
          },
          {
            key: `${week.key}-rm`,
            content: renderMetric(row.weekly?.[week.key]?.rm),
            className: 'border-0 text-center',
          },
        ]),
        {
          key: 'total-qty',
          content: renderMetric(row.totalQty),
          className: 'border-0 text-center fw-semibold monitoring-total-col',
        },
        {
          key: 'total-rm',
          content: renderMetric(row.totalRm),
          className: 'border-0 text-center fw-semibold',
        },
      ],
    }))}
    footerRows={[
      {
        key: 'total',
        className: 'fw-semibold text-muted',
        cells: [
          { key: 'index', content: ' ', className: 'border-0 text-center' },
          { key: 'service', content: 'Total', className: 'border-0' },
          ...weeks.flatMap((week) => [
            {
              key: `${week.key}-qty`,
              content: renderDetailMetric(
                totals?.weekly?.[week.key]?.qty,
                totals?.details?.weekly?.[week.key]?.qty,
                `Total - ${week.label} QTY`,
                'quantity',
              ),
              className: `border-0 text-center ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`,
            },
            {
              key: `${week.key}-rm`,
              content: renderMetric(totals?.weekly?.[week.key]?.rm),
              className: 'border-0 text-center',
            },
          ]),
          {
            key: 'total-qty',
            content: renderMetric(totals?.totalQty),
            className: 'border-0 text-center monitoring-total-col',
          },
          {
            key: 'total-rm',
            content: renderMetric(totals?.totalRm),
            className: 'border-0 text-center',
          },
        ],
      },
    ]}
  />
)

const StatusSegmentTable = ({ rows }) => (
  <DataTableSheet
    desktopBreakpoint="md"
    shellClassName="monitoring-table-frame"
    tableClassName="monitoring-sheet-table"
    headerRows={[
      {
        key: 'group',
        cells: [
          {
            key: 'index',
            content: '#',
            rowSpan: 2,
            className: 'border-0 text-center',
            style: { width: '56px' },
          },
          { key: 'service', content: 'Service', rowSpan: 2, className: 'border-0' },
          ...segmentColumns.map((segment) => ({
            key: segment.key,
            content: segment.label,
            colSpan: 2,
            className: `border-0 text-center text-nowrap monitoring-data-band ${segment === segmentColumns[0] ? 'monitoring-data-start-col' : ''}`,
          })),
        ],
      },
      {
        key: 'metrics',
        cells: segmentColumns.flatMap((segment) => [
          {
            key: `${segment.key}-qty`,
            content: 'QTY',
            className: `border-0 text-center text-nowrap monitoring-week-heading ${segment === segmentColumns[0] ? 'monitoring-data-start-col' : ''}`,
          },
          {
            key: `${segment.key}-rm`,
            content: 'RM',
            className: 'border-0 text-center text-nowrap',
          },
        ]),
      },
    ]}
    rows={rows.map((row, index) => ({
      key: `${row.label}-segment`,
      cells: [
        { key: 'index', content: index + 1, className: 'border-0 text-center fw-semibold' },
        {
          key: 'service',
          content: formatPipelineStatusLabel(row.label),
          className: 'border-0 fw-semibold',
        },
        ...segmentColumns.flatMap((segment) => [
          {
            key: `${segment.key}-qty`,
            content: renderSegmentMetric(
              row,
              `${segment.key}Qty`,
              row.details?.segments?.[segment.key]?.qty,
              `${formatPipelineStatusLabel(row.label)} - ${segment.label} QTY`,
              `${segment.label} quantity`,
            ),
            className: 'border-0 text-center text-muted',
          },
          {
            key: `${segment.key}-rm`,
            content: renderSegmentPlainMetric(row, `${segment.key}Rm`),
            className: 'border-0 text-center text-muted',
          },
        ]),
      ],
    }))}
  />
)

const MonitoringPipelineStatus = ({
  startDate,
  endDate,
  selectedStaffCode,
  selectedStaffLabel,
  statusData,
  statusLoading,
  statusError,
}) => {
  const hasExternalStatusData =
    statusData !== undefined || statusLoading !== undefined || statusError !== undefined
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const displayData = hasExternalStatusData ? statusData : data
  const displayLoading = hasExternalStatusData ? Boolean(statusLoading) : loading
  const displayError = hasExternalStatusData ? statusError || '' : error
  const segmentDataTitle = displayData?.monthLabel
    ? `${String(displayData.monthLabel).toLowerCase()} Aggregated Segment Data`
    : 'Selected Month Aggregated Segment Data'

  useEffect(() => {
    if (hasExternalStatusData) return undefined

    const controller = new AbortController()

    const loadMonitoringPipelineStatus = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monitoring-pipeline-status`,
          {
            start_date: startDate,
            end_date: endDate,
            staff_code: selectedStaffCode,
          },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setData(response)
        } else {
          setData(null)
          setError('Unable to load revenue status monitoring data.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData(null)
        setError('Unable to load revenue status monitoring data.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadMonitoringPipelineStatus()

    return () => controller.abort()
  }, [startDate, endDate, selectedStaffCode, hasExternalStatusData])

  return (
    <MonitoringSheetCard
      title="Revenue Status"
      scopeLabel={selectedStaffCode ? `Staff: ${selectedStaffLabel}` : 'All staff'}
      tourTarget="monitoring-pipeline-status"
    >
      {displayLoading ? (
        <DataTableLoadingState message="Loading data..." />
      ) : displayError ? (
        <div className="text-center text-danger py-4">{displayError}</div>
      ) : !Array.isArray(displayData?.rows) || !Array.isArray(displayData?.weeks) ? (
        <div className="text-center text-muted py-4">No monitoring data available.</div>
      ) : (
        <div className="d-flex flex-column gap-3">
          <div>
            <div className="fw-semibold mb-1" data-tour="monitoring-weekly-status-value">
              Weekly Quantity and Revenue
            </div>
            <WeeklyStatusMobileList
              rows={displayData.rows}
              weeks={displayData.weeks}
              totals={displayData.totals}
            />
            <WeeklyStatusTable
              rows={displayData.rows}
              weeks={displayData.weeks}
              totals={displayData.totals}
            />
          </div>

          <div>
            <div className="mb-2" data-tour="monitoring-service-segment-data">
              <div className="fw-semibold text-capitalize">{segmentDataTitle}</div>
            </div>
            <StatusSegmentMobileList rows={displayData.rows} />
            <StatusSegmentTable rows={displayData.rows} />
          </div>
        </div>
      )}
    </MonitoringSheetCard>
  )
}

export default MonitoringPipelineStatus
