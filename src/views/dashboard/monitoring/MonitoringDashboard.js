import React, { useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilInfo, cilX } from '@coreui/icons'
import { CButton } from '@coreui/react'
import { Joyride, STATUS } from 'react-joyride'
import MonitoringPipelineTools from './MonitoringPipelineTools'
import MonitoringPipelineStatus from './MonitoringPipelineStatus'
import MonitoringStaffPipelineMatrix from './MonitoringStaffPipelineMatrix'
import MonitoringTrends from './MonitoringTrends'

const monitoringTourSteps = [
  {
    target: '[data-tour="monitoring-guide-button"]',
    title: 'Follow the Monitoring guide?',
    content:
      'This will walk through each Monitoring section in order. Choose Start guide to continue, or skip it for now.',
    placement: 'bottom',
    skipBeacon: true,
    locale: {
      next: 'Start guide',
      nextWithProgress: 'Start guide',
      skip: 'No',
    },
  },
  {
    target: '[data-tour="monitoring-performance-summary"]',
    title: 'Awarded Revenue Performance',
    content:
      'This KPI strip tracks awarded or won quotation value against target, plus proposal value and win rate for the selected trend window.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-add-manual-entry"]',
    title: 'Add Manual Entry',
    content:
      'Use this when activity happened outside KIJO, such as WhatsApp follow-ups, referrals, offline pitching, informal negotiations, or missing prospect activity. Do not duplicate proposals or closed deals already captured by quotation records.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-pipeline-tools"]',
    title: 'Pipeline Tools',
    content:
      'This card reads funnel movement by pipeline stage: Leads, Qualified, Meeting / Pitching, Proposal, Negotiation, and Closed.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-weekly-pipeline-quantity"]',
    title: 'Weekly Pipeline Quantity',
    content:
      'This table shows how many pipeline activities happened in each week of the selected month. Totals are scoped by All staff or the selected staff member.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-pipeline-segment-data"]',
    title: 'Pipeline Segment Data',
    content:
      'This table splits the same pipeline stages into Individual, Special Project, and Tender. A zero means tracked with no activity; Not tracked means the system has no reliable source for that cell.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-pipeline-status"]',
    title: 'Revenue Status',
    content:
      'This card groups awarded or won revenue by service category, such as Training, Consultancy, Man Power, Equipment Supply, Engineering, and Infrastructure.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-weekly-status-value"]',
    title: 'Weekly Quantity and Revenue',
    content:
      'This table shows awarded or won QTY and RM by service for each week. RM comes from awarded quotation value or manual closed estimated RM where available.',
    skipBeacon: true,
  },
  {
    target: '[data-tour="monitoring-service-segment-data"]',
    title: 'Service Segment Data',
    content:
      'This final table splits awarded service totals into Individual, Special Project, and Tender so management can see where revenue is coming from.',
    skipBeacon: true,
  },
]

const monitoringTourStyles = {
  options: {
    zIndex: 2200,
    primaryColor: 'var(--cui-primary)',
    textColor: 'var(--app-text-strong)',
    overlayColor: 'rgba(17, 24, 39, 0.52)',
  },
  tooltip: {
    backgroundColor: 'var(--app-surface-page)',
    borderRadius: 8,
    border: '1px solid var(--app-border-card)',
    boxShadow: 'var(--app-shadow-lg)',
    padding: 0,
    width: 390,
  },
  tooltipContainer: {
    padding: '18px 18px 8px',
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 8,
    color: 'var(--app-text-strong)',
  },
  tooltipContent: {
    fontSize: 14,
    lineHeight: 1.45,
    padding: '2px 0 6px',
    color: 'var(--app-text-secondary)',
  },
  tooltipFooter: {
    alignItems: 'center',
    borderTop: '1px solid var(--app-border-subtle)',
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 8,
    padding: '10px 14px 14px',
  },
  tooltipFooterSpacer: {
    flex: 1,
  },
  buttonNext: {
    backgroundColor: 'var(--cui-primary)',
    border: '1px solid var(--cui-primary)',
    borderRadius: 999,
    color: '#fff',
    fontSize: 13,
    fontWeight: 500,
    lineHeight: 1.2,
    padding: '6px 12px',
  },
  buttonBack: {
    color: 'var(--cui-primary)',
    fontSize: 13,
    fontWeight: 500,
    marginRight: 8,
    padding: '6px 8px',
  },
  buttonSkip: {
    color: 'var(--app-text-muted)',
    fontSize: 13,
    fontWeight: 500,
    padding: '6px 8px',
  },
  buttonClose: {
    color: 'var(--app-text-muted)',
    height: 30,
    padding: 8,
    right: 8,
    top: 8,
    width: 30,
  },
}

const MonitoringTourTooltip = ({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}) => {
  const closeButtonProps = { ...closeProps }
  delete closeButtonProps.children

  return (
    <div className="monitoring-tour-tooltip" {...tooltipProps}>
      <CButton
        type="button"
        color="secondary"
        variant="ghost"
        size="sm"
        className="monitoring-tour-close d-inline-flex align-items-center justify-content-center p-0"
        {...closeButtonProps}
      >
        <CIcon icon={cilX} size="sm" />
      </CButton>

      <div className="monitoring-tour-body">
        {step.title && <div className="monitoring-tour-title">{step.title}</div>}
        <div className="monitoring-tour-content">{step.content}</div>
      </div>

      <div className="monitoring-tour-footer">
        {!isLastStep && step.buttons.includes('skip') && (
          <CButton
            type="button"
            color="secondary"
            variant="ghost"
            size="sm"
            className="me-auto px-2"
            {...skipProps}
          />
        )}
        {index > 0 && step.buttons.includes('back') && (
          <CButton
            type="button"
            color="primary"
            variant="ghost"
            size="sm"
            className="px-2"
            {...backProps}
          />
        )}
        {step.buttons.includes('primary') && (
          <CButton type="button" color="primary" size="sm" className="px-3" {...primaryProps} />
        )}
      </div>
    </div>
  )
}

const MonitoringDashboard = ({
  startDate,
  endDate,
  selectedStaffCode,
  selectedStaffLabel,
  statusData,
  statusLoading,
  statusError,
  onManualEntrySaved,
}) => {
  const [tourRunning, setTourRunning] = useState(false)
  const [tourKey, setTourKey] = useState(0)
  const [staffMatrixReloadKey, setStaffMatrixReloadKey] = useState(0)
  const [manualEntryOpenRequestKey, setManualEntryOpenRequestKey] = useState(0)

  const handleTourCallback = ({ status }) => {
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setTourRunning(false)
    }
  }

  const handleManualEntrySaved = () => {
    setStaffMatrixReloadKey((key) => key + 1)
    onManualEntrySaved?.()
  }

  return (
    <section className="mb-5">
      <style>{`
        .monitoring-tour-tooltip {
          border: 1px solid #d8dbe0;
          border-radius: 8px;
          box-shadow: 0 10px 28px rgba(8, 15, 40, 0.16);
          color: #334155;
          max-width: min(390px, calc(100vw - 32px));
          position: relative;
          width: min(390px, calc(100vw - 32px));
        }

        .monitoring-tour-close {
          color: #6b7280;
          height: 26px;
          line-height: 1;
          position: absolute;
          right: 8px;
          top: 8px;
          width: 26px;
          z-index: 1;
        }

        .monitoring-tour-body {
          padding: 18px 18px 8px;
        }

        .monitoring-tour-title {
          color: #1f2937;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          padding-right: 28px;
          text-align: center;
        }

        .monitoring-tour-content {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.45;
          text-align: center;
        }

        .monitoring-tour-footer {
          align-items: center;
          border-top: 1px solid #eef0f4;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 8px;
          padding: 10px 14px 14px;
        }
      `}</style>
      <Joyride
        key={tourKey}
        steps={monitoringTourSteps}
        run={tourRunning}
        callback={handleTourCallback}
        continuous
        showProgress
        scrollToFirstStep={false}
        disableOverlayClose
        tooltipComponent={MonitoringTourTooltip}
        options={{
          buttons: ['skip', 'back', 'close', 'primary'],
          closeButtonAction: 'skip',
        }}
        styles={monitoringTourStyles}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Done',
          next: 'Next',
          skip: 'Exit tour',
        }}
      />
      <div className="d-flex align-items-center justify-content-end gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <CButton
            type="button"
            size="sm"
            color="primary"
            variant="outline"
            className="rounded-2 d-inline-flex align-items-center gap-1 px-2 py-1"
            style={{ lineHeight: 1.1 }}
            data-tour="monitoring-add-manual-entry"
            onClick={() => setManualEntryOpenRequestKey((key) => key + 1)}
          >
            Add Manual Entry
          </CButton>
          <CButton
            type="button"
            size="sm"
            color="primary"
            variant="outline"
            className="rounded-2 d-inline-flex align-items-center gap-1 px-2 py-1"
            style={{ lineHeight: 1.1 }}
            data-tour="monitoring-guide-button"
            onClick={() => {
              setTourKey((key) => key + 1)
              setTourRunning(true)
            }}
          >
            <CIcon icon={cilInfo} size="sm" />
            Guide
          </CButton>
        </div>
      </div>
      <MonitoringTrends
        endDate={endDate}
        selectedStaffCode={selectedStaffCode}
        selectedStaffLabel={selectedStaffLabel}
        statusData={statusData}
        statusLoading={statusLoading}
        statusError={statusError}
        reloadKey={staffMatrixReloadKey}
      />
      <MonitoringStaffPipelineMatrix
        startDate={startDate}
        endDate={endDate}
        enabled={!selectedStaffCode}
        reloadKey={staffMatrixReloadKey}
      />
      <MonitoringPipelineTools
        startDate={startDate}
        endDate={endDate}
        selectedStaffCode={selectedStaffCode}
        selectedStaffLabel={selectedStaffLabel}
        manualEntryOpenRequestKey={manualEntryOpenRequestKey}
        onManualEntrySaved={handleManualEntrySaved}
      />
      <MonitoringPipelineStatus
        startDate={startDate}
        endDate={endDate}
        selectedStaffCode={selectedStaffCode}
        selectedStaffLabel={selectedStaffLabel}
        statusData={statusData}
        statusLoading={statusLoading}
        statusError={statusError}
      />
    </section>
  )
}

export default MonitoringDashboard
