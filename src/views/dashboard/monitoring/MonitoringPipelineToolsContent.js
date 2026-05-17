import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'
import {
  CButton,
  CPopover,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import MonitoringCellDetailsPopover from './MonitoringCellDetailsPopover'

const notTrackedLabel = <span className="small text-muted">Not tracked</span>

const formatPipelineToolLabel = (label) => {
  const mappedLabels = {
    LEADS: 'Leads',
    QUALIFIED: 'Qualified',
    'MEETING/ PITCHING': 'Meeting/ Pitching',
    PROPOSAL: 'Proposal',
    NEGOTIATION: 'Negotiation',
    CLOSED: 'Closed',
    TOTAL: 'Total',
  }

  return mappedLabels[label] || label
}

const segmentColumns = [
  { key: 'individual', label: 'Individual' },
  { key: 'specialProject', label: 'Special Project' },
  { key: 'tender', label: 'Tender' },
]

const PipelineQuantityInfo = () => (
  <div>
    <div className="fw-semibold mb-1">KPI definitions</div>
    <ul className="mb-2 ps-3">
      <li>Leads = recorded phone call activity + manual lead entries.</li>
      <li>Qualified = issued quotation/proposal count + manual qualified entries.</li>
      <li>Meeting / Pitching = manual meeting or pitching entries.</li>
      <li>Proposal = issued quotation/proposal count + manual proposal entries.</li>
      <li>Negotiation = manual negotiation entries.</li>
      <li>Closed = awarded or won quotation data + manual closed entries.</li>
    </ul>
    <div className="fw-semibold mb-1">System limitations</div>
    <ul className="mb-2 ps-3">
      <li>
        KIJO cannot infer offline leads, WhatsApp discussions, referrals, or meetings not recorded.
      </li>
      <li>Calls are not always true leads, so lead quality still needs user judgement.</li>
      <li>
        Qualified status is inferred from quotation/proposal activity unless recorded manually.
      </li>
    </ul>
    <div className="fw-semibold mb-1">Aggregation assumptions</div>
    <ul className="mb-2 ps-3">
      <li>Manual entries are treated as the source of truth for activity outside KIJO.</li>
      <li>Quotation/proposal issue is treated as qualified and proposal activity.</li>
      <li>Staff filtering depends on the owner or PIC available in each source record.</li>
      <li>Counts are grouped by the available activity date and selected period.</li>
    </ul>
    <div className="fw-semibold mb-1">Manual entry caution</div>
    <ul className="mb-0 ps-3">
      <li>Use manual entries only for activity not already captured by KIJO.</li>
      <li>Do not manually add a proposal if the quotation already exists.</li>
      <li>Do not manually add closed activity if the quotation is already awarded.</li>
    </ul>
  </div>
)

const formatNumber = (value) => Number(value || 0).toLocaleString()

const renderDetailMetric = (value, details, title, metricLabel) => (
  <MonitoringCellDetailsPopover
    value={value}
    details={details}
    title={title}
    metricLabel={metricLabel}
    formatter={formatNumber}
  />
)

const renderSegmentCell = (value, details, title, metricLabel) =>
  value === null || value === undefined
    ? notTrackedLabel
    : renderDetailMetric(value, details, title, metricLabel)
const renderSegmentPlainCell = (value) =>
  value === null || value === undefined ? notTrackedLabel : formatNumber(value)

const WeeklyQuantityMobileList = ({ rows, weeks, totals }) => (
  <div className="d-md-none d-grid gap-2">
    {rows.map((row, index) => (
      <div key={`${row.label}-mobile`} className="rounded-4 bg-light p-3">
        <div className="d-flex justify-content-between gap-2 mb-2">
          <div className="fw-semibold">
            {index + 1}. {formatPipelineToolLabel(row.label)}
          </div>
          <div className="fw-semibold">Total: {formatNumber(row.total)}</div>
        </div>
        <div className="row g-2">
          {weeks.map((week) => (
            <div
              className="col-6 d-flex align-items-center justify-content-between gap-2"
              key={`${row.label}-${week.key}-mobile`}
            >
              <span className="small text-muted">{week.label}</span>
              <span className="text-end">
                {renderDetailMetric(
                  row.weekly?.[week.key],
                  row.details?.weekly?.[week.key],
                  `${formatPipelineToolLabel(row.label)} - ${week.label}`,
                  'quantity',
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
    <div className="rounded-4 bg-light p-3 fw-semibold">
      <div className="d-flex justify-content-between gap-2 mb-2">
        <div>Total</div>
        <div>{formatNumber(totals?.total)}</div>
      </div>
      <div className="row g-2">
        {weeks.map((week) => (
          <div
            className="col-6 d-flex align-items-center justify-content-between gap-2"
            key={`mobile-total-${week.key}`}
          >
            <span className="small text-muted">{week.label}</span>
            <span className="text-end">
              {renderDetailMetric(
                totals?.weekly?.[week.key],
                totals?.details?.weekly?.[week.key],
                `Total - ${week.label}`,
                'quantity',
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const SegmentBreakdownMobileList = ({ rows }) => (
  <div className="d-md-none d-grid gap-2">
    {rows.map((row, index) => (
      <div key={`${row.label}-segment-mobile`} className="rounded-4 bg-light p-3">
        <div className="fw-semibold mb-2">
          {index + 1}. {formatPipelineToolLabel(row.label)}
        </div>
        <div className="d-grid gap-2">
          <div className="d-flex align-items-center justify-content-between gap-3 small">
            <span className="text-muted">Individual</span>
            <span className="text-end">
              QTY{' '}
              {renderSegmentCell(
                row.individualQty,
                row.details?.segments?.individual?.qty,
                `${formatPipelineToolLabel(row.label)} - Individual QTY`,
                'individual quantity',
              )}{' '}
              | RM {renderSegmentPlainCell(row.individualRm)}
            </span>
          </div>
          <div className="d-flex align-items-center justify-content-between gap-3 small">
            <span className="text-muted">Special Project</span>
            <span className="text-end">
              QTY{' '}
              {renderSegmentCell(
                row.specialProjectQty,
                row.details?.segments?.specialProject?.qty,
                `${formatPipelineToolLabel(row.label)} - Special Project QTY`,
                'special project quantity',
              )}{' '}
              | RM {renderSegmentPlainCell(row.specialProjectRm)}
            </span>
          </div>
          <div className="d-flex align-items-center justify-content-between gap-3 small">
            <span className="text-muted">Tender</span>
            <span className="text-end">
              QTY{' '}
              {renderSegmentCell(
                row.tenderQty,
                row.details?.segments?.tender?.qty,
                `${formatPipelineToolLabel(row.label)} - Tender QTY`,
                'tender quantity',
              )}{' '}
              | RM {renderSegmentPlainCell(row.tenderRm)}
            </span>
          </div>
        </div>
      </div>
    ))}
  </div>
)

const WeeklyQuantityTable = ({ rows, weeks, totals }) => (
  <div className="monitoring-table-frame d-none d-md-block">
    {/* datatable-exempt: existing embedded/layout table */}
    <CTable
      responsive
      align="middle"
      className="mb-0 border-0 monitoring-sheet-table data-table-compact embedded-data-table"
    >
      <CTableHead>
        <CTableRow className="table-light">
          <CTableHeaderCell rowSpan={2} className="border-0 text-center" style={{ width: '56px' }}>
            #
          </CTableHeaderCell>
          <CTableHeaderCell rowSpan={2} className="border-0">
            Pipeline Tools
          </CTableHeaderCell>
          <CTableHeaderCell
            colSpan={weeks.length + 1}
            className="border-0 text-center monitoring-data-band monitoring-data-start-col"
          >
            Quantity
          </CTableHeaderCell>
        </CTableRow>
        <CTableRow className="table-light">
          {weeks.map((week) => (
            <CTableHeaderCell
              key={week.key}
              className={`border-0 text-center text-nowrap monitoring-week-heading ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`}
            >
              <div>{week.label}</div>
              <div className="small text-muted fw-normal">{week.rangeLabel}</div>
            </CTableHeaderCell>
          ))}
          <CTableHeaderCell className="border-0 text-center text-nowrap monitoring-total-col monitoring-week-heading">
            Total
          </CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {rows.map((row, index) => (
          <CTableRow key={row.label} className="table-light">
            <CTableDataCell className="border-0 text-center fw-semibold">
              {index + 1}
            </CTableDataCell>
            <CTableDataCell className="border-0 fw-semibold">
              {formatPipelineToolLabel(row.label)}
            </CTableDataCell>
            {weeks.map((week) => (
              <CTableDataCell
                key={`${row.label}-${week.key}`}
                className={`border-0 text-center ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`}
              >
                {renderDetailMetric(
                  row.weekly?.[week.key],
                  row.details?.weekly?.[week.key],
                  `${formatPipelineToolLabel(row.label)} - ${week.label}`,
                  'quantity',
                )}
              </CTableDataCell>
            ))}
            <CTableDataCell className="border-0 text-center fw-semibold monitoring-total-col">
              {formatNumber(row.total)}
            </CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
      <CTableFoot>
        <CTableRow className="table-light fw-semibold text-muted">
          <CTableDataCell className="border-0 text-center"> </CTableDataCell>
          <CTableDataCell className="border-0">Total</CTableDataCell>
          {weeks.map((week) => (
            <CTableDataCell
              key={`total-${week.key}`}
              className={`border-0 text-center ${week === weeks[0] ? 'monitoring-data-start-col' : ''}`}
            >
              {renderDetailMetric(
                totals?.weekly?.[week.key],
                totals?.details?.weekly?.[week.key],
                `Total - ${week.label}`,
                'quantity',
              )}
            </CTableDataCell>
          ))}
          <CTableDataCell className="border-0 text-center monitoring-total-col">
            {formatNumber(totals?.total)}
          </CTableDataCell>
        </CTableRow>
      </CTableFoot>
    </CTable>
  </div>
)

const SegmentBreakdownTable = ({ rows }) => (
  <div className="monitoring-table-frame d-none d-md-block">
    {/* datatable-exempt: existing embedded/layout table */}
    <CTable
      responsive
      align="middle"
      className="mb-0 border-0 monitoring-sheet-table data-table-compact embedded-data-table"
    >
      <CTableHead>
        <CTableRow className="table-light">
          <CTableHeaderCell rowSpan={2} className="border-0 text-center" style={{ width: '56px' }}>
            #
          </CTableHeaderCell>
          <CTableHeaderCell rowSpan={2} className="border-0">
            Pipeline Tools
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
              <CTableHeaderCell className="border-0 text-center text-nowrap">RM</CTableHeaderCell>
            </React.Fragment>
          ))}
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {rows.map((row, index) => (
          <CTableRow key={`${row.label}-segment`} className="table-light">
            <CTableDataCell className="border-0 text-center fw-semibold">
              {index + 1}
            </CTableDataCell>
            <CTableDataCell className="border-0 fw-semibold">
              {formatPipelineToolLabel(row.label)}
            </CTableDataCell>
            <CTableDataCell className="border-0 text-center text-muted">
              {renderSegmentCell(
                row.individualQty,
                row.details?.segments?.individual?.qty,
                `${formatPipelineToolLabel(row.label)} - Individual QTY`,
                'individual quantity',
              )}
            </CTableDataCell>
            <CTableDataCell className="border-0 text-center text-muted">
              {renderSegmentPlainCell(row.individualRm)}
            </CTableDataCell>
            <CTableDataCell className="border-0 text-center text-muted">
              {renderSegmentCell(
                row.specialProjectQty,
                row.details?.segments?.specialProject?.qty,
                `${formatPipelineToolLabel(row.label)} - Special Project QTY`,
                'special project quantity',
              )}
            </CTableDataCell>
            <CTableDataCell className="border-0 text-center text-muted">
              {renderSegmentPlainCell(row.specialProjectRm)}
            </CTableDataCell>
            <CTableDataCell className="border-0 text-center text-muted">
              {renderSegmentCell(
                row.tenderQty,
                row.details?.segments?.tender?.qty,
                `${formatPipelineToolLabel(row.label)} - Tender QTY`,
                'tender quantity',
              )}
            </CTableDataCell>
            <CTableDataCell className="border-0 text-center text-muted">
              {renderSegmentPlainCell(row.tenderRm)}
            </CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  </div>
)

const MonitoringPipelineToolsContent = ({ data, segmentDataTitle }) => (
  <>
    <style>{`
      .monitoring-pipeline-info-popover {
        --cui-popover-max-width: min(640px, calc(100vw - 48px));
        width: min(640px, calc(100vw - 48px));
        max-width: min(640px, calc(100vw - 48px)) !important;
      }

      .monitoring-pipeline-info-popover .popover-body {
        overflow-wrap: break-word;
      }
    `}</style>
    <div className="d-flex flex-column gap-3">
      <div>
        <div
          className="d-flex align-items-center gap-2 mb-2"
          data-tour="monitoring-weekly-pipeline-quantity"
        >
          <div className="d-flex align-items-center gap-2">
            <div className="fw-semibold">Weekly Pipeline Quantity</div>
            <CPopover
              className="monitoring-pipeline-info-popover"
              trigger="focus"
              placement="right"
              title="Pipeline quantity logic"
              content={<PipelineQuantityInfo />}
            >
              <CButton
                type="button"
                size="sm"
                color="secondary"
                variant="ghost"
                className="p-0 text-muted"
                aria-label="Pipeline quantity calculation information"
              >
                <CIcon icon={cilInfo} size="sm" />
              </CButton>
            </CPopover>
          </div>
        </div>
        <WeeklyQuantityMobileList rows={data.rows} weeks={data.weeks} totals={data.totals} />
        <WeeklyQuantityTable rows={data.rows} weeks={data.weeks} totals={data.totals} />
      </div>

      <div>
        <div className="mb-2" data-tour="monitoring-pipeline-segment-data">
          <div className="fw-semibold text-capitalize">{segmentDataTitle}</div>
        </div>
        <SegmentBreakdownMobileList rows={data.rows} />
        <SegmentBreakdownTable rows={data.rows} />
      </div>
    </div>
  </>
)

export default MonitoringPipelineToolsContent
