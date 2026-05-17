import React, { useEffect, useState } from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
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
      <div key={`${row.label}-mobile`} className="rounded-4 bg-light p-3">
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
    <div className="rounded-4 bg-light p-3 fw-semibold">
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
      <div key={`${row.label}-segment-mobile`} className="rounded-4 bg-light p-3">
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
            <div className="monitoring-table-frame d-none d-md-block">
              {/* datatable-exempt: existing embedded/layout table */}
              <CTable
                responsive
                align="middle"
                className="mb-0 border-0 monitoring-sheet-table data-table-compact embedded-data-table"
              >
                <CTableHead>
                  <CTableRow className="table-light">
                    <CTableHeaderCell
                      rowSpan={2}
                      className="border-0 text-center"
                      style={{ width: '56px' }}
                    >
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell rowSpan={2} className="border-0">
                      Service
                    </CTableHeaderCell>
                    {displayData.weeks.map((week) => (
                      <CTableHeaderCell
                        key={week.key}
                        colSpan={2}
                        className={`border-0 text-center text-nowrap monitoring-data-band monitoring-week-heading ${week === displayData.weeks[0] ? 'monitoring-data-start-col' : ''}`}
                      >
                        <div>{week.label}</div>
                        <div className="small text-muted fw-normal">{week.rangeLabel}</div>
                      </CTableHeaderCell>
                    ))}
                    <CTableHeaderCell
                      colSpan={2}
                      className="border-0 text-center monitoring-total-col monitoring-week-heading"
                    >
                      Total
                    </CTableHeaderCell>
                  </CTableRow>
                  <CTableRow className="table-light">
                    {displayData.weeks.map((week) => (
                      <React.Fragment key={`${week.key}-sub`}>
                        <CTableHeaderCell
                          className={`border-0 text-center text-nowrap ${week === displayData.weeks[0] ? 'monitoring-data-start-col' : ''}`}
                        >
                          QTY
                        </CTableHeaderCell>
                        <CTableHeaderCell className="border-0 text-center text-nowrap">
                          RM
                        </CTableHeaderCell>
                      </React.Fragment>
                    ))}
                    <CTableHeaderCell className="border-0 text-center text-nowrap monitoring-total-col">
                      QTY
                    </CTableHeaderCell>
                    <CTableHeaderCell className="border-0 text-center text-nowrap">
                      RM
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {displayData.rows.map((row, index) => (
                    <CTableRow key={row.label} className="table-light">
                      <CTableDataCell className="border-0 text-center fw-semibold">
                        {index + 1}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 fw-semibold">
                        {formatPipelineStatusLabel(row.label)}
                      </CTableDataCell>
                      {displayData.weeks.map((week) => (
                        <React.Fragment key={`${row.label}-${week.key}`}>
                          <CTableDataCell
                            className={`border-0 text-center ${week === displayData.weeks[0] ? 'monitoring-data-start-col' : ''}`}
                          >
                            {renderDetailMetric(
                              row.weekly?.[week.key]?.qty,
                              row.details?.weekly?.[week.key]?.qty,
                              `${formatPipelineStatusLabel(row.label)} - ${week.label} QTY`,
                              'quantity',
                            )}
                          </CTableDataCell>
                          <CTableDataCell className="border-0 text-center">
                            {renderMetric(row.weekly?.[week.key]?.rm)}
                          </CTableDataCell>
                        </React.Fragment>
                      ))}
                      <CTableDataCell className="border-0 text-center fw-semibold monitoring-total-col">
                        {renderMetric(row.totalQty)}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center fw-semibold">
                        {renderMetric(row.totalRm)}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
                <CTableFoot>
                  <CTableRow className="table-light fw-semibold text-muted">
                    <CTableDataCell className="border-0 text-center"> </CTableDataCell>
                    <CTableDataCell className="border-0">Total</CTableDataCell>
                    {displayData.weeks.map((week) => (
                      <React.Fragment key={`totals-${week.key}`}>
                        <CTableDataCell
                          className={`border-0 text-center ${week === displayData.weeks[0] ? 'monitoring-data-start-col' : ''}`}
                        >
                          {renderDetailMetric(
                            displayData.totals?.weekly?.[week.key]?.qty,
                            displayData.totals?.details?.weekly?.[week.key]?.qty,
                            `Total - ${week.label} QTY`,
                            'quantity',
                          )}
                        </CTableDataCell>
                        <CTableDataCell className="border-0 text-center">
                          {renderMetric(displayData.totals?.weekly?.[week.key]?.rm)}
                        </CTableDataCell>
                      </React.Fragment>
                    ))}
                    <CTableDataCell className="border-0 text-center monitoring-total-col">
                      {renderMetric(displayData.totals?.totalQty)}
                    </CTableDataCell>
                    <CTableDataCell className="border-0 text-center">
                      {renderMetric(displayData.totals?.totalRm)}
                    </CTableDataCell>
                  </CTableRow>
                </CTableFoot>
              </CTable>
            </div>
          </div>

          <div>
            <div className="mb-2" data-tour="monitoring-service-segment-data">
              <div className="fw-semibold text-capitalize">{segmentDataTitle}</div>
            </div>
            <StatusSegmentMobileList rows={displayData.rows} />
            <div className="monitoring-table-frame d-none d-md-block">
              {/* datatable-exempt: existing embedded/layout table */}
              <CTable
                responsive
                align="middle"
                className="mb-0 border-0 monitoring-sheet-table data-table-compact embedded-data-table"
              >
                <CTableHead>
                  <CTableRow className="table-light">
                    <CTableHeaderCell
                      rowSpan={2}
                      className="border-0 text-center"
                      style={{ width: '56px' }}
                    >
                      #
                    </CTableHeaderCell>
                    <CTableHeaderCell rowSpan={2} className="border-0">
                      Service
                    </CTableHeaderCell>
                    {segmentColumns.map((segment) => (
                      <CTableHeaderCell
                        key={segment.key}
                        colSpan={2}
                        className={`border-0 text-center text-nowrap monitoring-data-band ${segment === segmentColumns[0] ? 'monitoring-data-start-col' : ''}`}
                      >
                        {segment.label}
                      </CTableHeaderCell>
                    ))}
                  </CTableRow>
                  <CTableRow className="table-light">
                    {segmentColumns.map((segment) => (
                      <React.Fragment key={`${segment.key}-sub`}>
                        <CTableHeaderCell
                          className={`border-0 text-center text-nowrap monitoring-week-heading ${segment === segmentColumns[0] ? 'monitoring-data-start-col' : ''}`}
                        >
                          QTY
                        </CTableHeaderCell>
                        <CTableHeaderCell className="border-0 text-center text-nowrap">
                          RM
                        </CTableHeaderCell>
                      </React.Fragment>
                    ))}
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {displayData.rows.map((row, index) => (
                    <CTableRow key={`${row.label}-segment`} className="table-light">
                      <CTableDataCell className="border-0 text-center fw-semibold">
                        {index + 1}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 fw-semibold">
                        {formatPipelineStatusLabel(row.label)}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center text-muted">
                        {renderSegmentMetric(
                          row,
                          'individualQty',
                          row.details?.segments?.individual?.qty,
                          `${formatPipelineStatusLabel(row.label)} - Individual QTY`,
                          'individual quantity',
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center text-muted">
                        {renderSegmentPlainMetric(row, 'individualRm')}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center text-muted">
                        {renderSegmentMetric(
                          row,
                          'specialProjectQty',
                          row.details?.segments?.specialProject?.qty,
                          `${formatPipelineStatusLabel(row.label)} - Special Project QTY`,
                          'special project quantity',
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center text-muted">
                        {renderSegmentPlainMetric(row, 'specialProjectRm')}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center text-muted">
                        {renderSegmentMetric(
                          row,
                          'tenderQty',
                          row.details?.segments?.tender?.qty,
                          `${formatPipelineStatusLabel(row.label)} - Tender QTY`,
                          'tender quantity',
                        )}
                      </CTableDataCell>
                      <CTableDataCell className="border-0 text-center text-muted">
                        {renderSegmentPlainMetric(row, 'tenderRm')}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </div>
          </div>
        </div>
      )}
    </MonitoringSheetCard>
  )
}

export default MonitoringPipelineStatus
