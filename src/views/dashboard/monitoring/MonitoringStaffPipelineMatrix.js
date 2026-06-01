import React, { useEffect, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilChevronBottom, cilChevronTop } from '@coreui/icons'
import { CButton } from '@coreui/react'
import { DataTableLoadingState, DataTableSheet } from '../../../components/datatable'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { API_BASE } from '../../marketing/pipeline/pipelineEntryUtils'
import MonitoringCellDetailsPopover from './MonitoringCellDetailsPopover'
import MonitoringSheetCard from './MonitoringSheetCard'

const stageColumns = [
  { key: 'LEADS', label: 'Leads' },
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'MEETING/ PITCHING', label: 'Meeting / Pitching' },
  { key: 'PROPOSAL', label: 'Proposal' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
  { key: 'CLOSED', label: 'Closed' },
]

const segmentColumns = [
  { key: 'individual', label: 'Individual' },
  { key: 'specialProject', label: 'Special Project' },
  { key: 'tender', label: 'Tender' },
]

const primaryMobileMetrics = [
  { key: 'LEADS', label: 'Leads' },
  { key: 'PROPOSAL', label: 'Proposal' },
  { key: 'CLOSED', label: 'Closed' },
]

const secondaryMobileStages = [
  { key: 'QUALIFIED', label: 'Qualified' },
  { key: 'MEETING/ PITCHING', label: 'Meeting / Pitching' },
  { key: 'NEGOTIATION', label: 'Negotiation' },
]

const formatNumber = (value) => Number(value || 0).toLocaleString()
const formatRm = (value) => Number(value || 0).toLocaleString()
const formatPeriodScope = (rangeLabel) =>
  rangeLabel ? `Reporting period: ${rangeLabel}` : 'Reporting period: selected period'

const renderDetailMetric = (value, details, title, metricLabel, formatter = formatNumber) => (
  <MonitoringCellDetailsPopover
    value={value}
    details={details}
    title={title}
    metricLabel={metricLabel}
    formatter={formatter}
  />
)

const StaffNameCell = ({ row }) => (
  <div className="min-w-0">
    <div className="fw-semibold text-truncate">{row.staffName || row.staffLabel}</div>
    {row.staffCode && row.staffCode !== 'TOTAL' && (
      <div className="small text-muted text-truncate">{row.staffCode}</div>
    )}
  </div>
)

const StaffMatrixMobileCard = ({ row, index }) => {
  const [expanded, setExpanded] = useState(false)
  const revenue = row.segments?.individual?.rm
  const staffName = row.staffName || row.staffLabel

  return (
    <div className="dashboard-table-mobile-card">
      <div className="d-flex justify-content-between gap-2 mb-3">
        <div className="fw-semibold text-truncate">
          {index + 1}. {staffName}
        </div>
        {row.staffCode && <div className="small text-muted text-nowrap">{row.staffCode}</div>}
      </div>

      <div className="monitoring-staff-mobile-kpis">
        {primaryMobileMetrics.map((metric) => (
          <div key={`${row.staffCode}-${metric.key}`} className="monitoring-staff-mobile-kpi">
            <div className="small text-muted">{metric.label}</div>
            <div className="fw-semibold">
              {renderDetailMetric(
                row.stages?.[metric.key],
                row.details?.stages?.[metric.key],
                `${row.staffLabel} - ${metric.label}`,
                'quantity',
              )}
            </div>
          </div>
        ))}
        <div className="monitoring-staff-mobile-kpi">
          <div className="small text-muted">Revenue</div>
          <div className="fw-semibold text-success">RM {formatRm(revenue)}</div>
        </div>
      </div>

      {expanded && (
        <div className="border-top mt-3 pt-2">
          <div className="d-grid gap-1 mb-3">
            {secondaryMobileStages.map((stage) => (
              <div
                key={`${row.staffCode}-${stage.key}-detail`}
                className="d-flex justify-content-between gap-3 small"
              >
                <span className="text-muted">{stage.label}</span>
                <span className="fw-semibold">
                  {renderDetailMetric(
                    row.stages?.[stage.key],
                    row.details?.stages?.[stage.key],
                    `${row.staffLabel} - ${stage.label}`,
                    'quantity',
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="small fw-semibold mb-1">Segments</div>
          <div className="d-grid gap-1">
            {segmentColumns.map((segment) => (
              <div
                key={`${row.staffCode}-${segment.key}-segment`}
                className="d-flex justify-content-between gap-3 small"
              >
                <span className="text-muted">{segment.label}</span>
                <span className="text-end">
                  QTY{' '}
                  {renderDetailMetric(
                    row.segments?.[segment.key]?.qty,
                    row.details?.segments?.[segment.key]?.qty,
                    `${row.staffLabel} - ${segment.label} QTY`,
                    `${segment.label} quantity`,
                  )}{' '}
                  | RM {formatRm(row.segments?.[segment.key]?.rm)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-top mt-3 pt-2">
        <CButton
          type="button"
          color="link"
          size="sm"
          className="d-inline-flex align-items-center gap-1 p-0 text-decoration-none"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? 'Hide details' : 'View details'}
          <CIcon icon={expanded ? cilChevronTop : cilChevronBottom} size="sm" />
        </CButton>
      </div>
    </div>
  )
}

const StaffMatrixMobileList = ({ rows }) => (
  <div className="d-md-none d-grid gap-2">
    {rows.map((row, index) => (
      <StaffMatrixMobileCard key={row.staffCode || row.staffLabel} row={row} index={index} />
    ))}
  </div>
)

const StaffPipelineMatrixTable = ({ rows, totals }) => (
  <DataTableSheet
    desktopBreakpoint="md"
    shellClassName="monitoring-table-frame"
    tableClassName="monitoring-sheet-table monitoring-staff-matrix-table"
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
          {
            key: 'staff',
            content: 'Staff',
            rowSpan: 2,
            className: 'border-0 monitoring-staff-matrix-staff-col',
          },
          {
            key: 'pipeline-tools',
            content: 'Pipeline Tools',
            colSpan: stageColumns.length,
            className: 'border-0 text-center monitoring-data-band monitoring-data-start-col',
          },
          {
            key: 'proposal-segment',
            content: 'Proposal Segment',
            colSpan: segmentColumns.length * 2,
            className: 'border-0 text-center monitoring-data-band monitoring-data-start-col',
          },
        ],
      },
      {
        key: 'metrics',
        cells: [
          ...stageColumns.map((stage, index) => ({
            key: stage.key,
            content: stage.label,
            className: `border-0 text-center ${index === 0 ? 'monitoring-data-start-col' : ''}`,
          })),
          ...segmentColumns.flatMap((segment, index) => [
            {
              key: `${segment.key}-qty`,
              content: `${segment.label} QTY`,
              className: `border-0 text-center ${index === 0 ? 'monitoring-data-start-col' : ''}`,
            },
            {
              key: `${segment.key}-rm`,
              content: `${segment.label} RM`,
              className: 'border-0 text-center',
            },
          ]),
        ],
      },
    ]}
    rows={rows.map((row, index) => ({
      key: row.staffCode || row.staffLabel,
      cells: [
        { key: 'index', content: index + 1, className: 'border-0 text-center fw-semibold' },
        {
          key: 'staff',
          content: <StaffNameCell row={row} />,
          className: 'border-0 monitoring-staff-matrix-staff-col',
        },
        ...stageColumns.map((stage, stageIndex) => ({
          key: stage.key,
          content: renderDetailMetric(
            row.stages?.[stage.key],
            row.details?.stages?.[stage.key],
            `${row.staffLabel} - ${stage.label}`,
            'quantity',
          ),
          className: `border-0 text-center ${stageIndex === 0 ? 'monitoring-data-start-col' : ''}`,
        })),
        ...segmentColumns.flatMap((segment, segmentIndex) => [
          {
            key: `${segment.key}-qty`,
            content: renderDetailMetric(
              row.segments?.[segment.key]?.qty,
              row.details?.segments?.[segment.key]?.qty,
              `${row.staffLabel} - ${segment.label} QTY`,
              `${segment.label} quantity`,
            ),
            className: `border-0 text-center ${segmentIndex === 0 ? 'monitoring-data-start-col' : ''}`,
          },
          {
            key: `${segment.key}-rm`,
            content: formatRm(row.segments?.[segment.key]?.rm),
            className: 'border-0 text-center',
          },
        ]),
      ],
    }))}
    footerRows={
      totals
        ? [
            {
              key: 'total',
              className: 'fw-semibold',
              cells: [
                { key: 'index', content: ' ', className: 'border-0 text-center' },
                { key: 'staff', content: 'Total', className: 'border-0' },
                ...stageColumns.map((stage, stageIndex) => ({
                  key: stage.key,
                  content: renderDetailMetric(
                    totals.stages?.[stage.key],
                    totals.details?.stages?.[stage.key],
                    `Total - ${stage.label}`,
                    'quantity',
                  ),
                  className: `border-0 text-center ${stageIndex === 0 ? 'monitoring-data-start-col' : ''}`,
                })),
                ...segmentColumns.flatMap((segment, segmentIndex) => [
                  {
                    key: `${segment.key}-qty`,
                    content: renderDetailMetric(
                      totals.segments?.[segment.key]?.qty,
                      totals.details?.segments?.[segment.key]?.qty,
                      `Total - ${segment.label} QTY`,
                      `${segment.label} quantity`,
                    ),
                    className: `border-0 text-center ${segmentIndex === 0 ? 'monitoring-data-start-col' : ''}`,
                  },
                  {
                    key: `${segment.key}-rm`,
                    content: formatRm(totals.segments?.[segment.key]?.rm),
                    className: 'border-0 text-center',
                  },
                ]),
              ],
            },
          ]
        : []
    }
  />
)

const MonitoringStaffPipelineMatrix = ({ period, startDate, endDate, enabled, reloadKey = 0 }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return undefined

    const controller = new AbortController()

    const loadStaffMatrix = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchJsonGet(
          `${API_BASE}stats/monitoring-staff-pipeline-matrix`,
          {
            start_date: startDate,
            end_date: endDate,
            period,
          },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setData(response)
        } else {
          setData(null)
          setError(response?.message || 'Unable to load staff pipeline matrix.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setData(null)
        setError(err?.message || 'Unable to load staff pipeline matrix.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadStaffMatrix()

    return () => controller.abort()
  }, [enabled, endDate, period, reloadKey, startDate])

  if (!enabled) return null

  const rows = Array.isArray(data?.rows) ? data.rows : []
  const totals = data?.totals
  const periodScopeLabel = formatPeriodScope(data?.rangeLabel)

  return (
    <MonitoringSheetCard title="All Staff Pipeline Snapshot" scopeLabel="All staff">
      <style>{`
        .monitoring-staff-matrix-table th,
        .monitoring-staff-matrix-table td {
          white-space: nowrap;
        }

        .monitoring-staff-matrix-staff-col {
          min-width: 180px;
        }

        .monitoring-staff-mobile-kpis {
          display: grid;
          gap: 0.5rem;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .monitoring-staff-mobile-kpi {
          min-width: 0;
        }

        .monitoring-staff-mobile-kpi .monitoring-cell-details-trigger {
          font-weight: 600;
        }
      `}</style>
      {loading ? (
        <DataTableLoadingState message="Loading staff snapshot..." />
      ) : error ? (
        <div className="text-center text-danger py-4">{error}</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted py-4">No staff activity found for this period.</div>
      ) : (
        <>
          <div className="d-flex justify-content-end mb-2">
            <div className="small text-muted text-nowrap">{periodScopeLabel}</div>
          </div>
          <StaffMatrixMobileList rows={rows} />
          <StaffPipelineMatrixTable rows={rows} totals={totals} />
        </>
      )}
    </MonitoringSheetCard>
  )
}

export default MonitoringStaffPipelineMatrix
