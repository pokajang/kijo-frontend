import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { CAccordion, CAccordionBody, CAccordionHeader, CAccordionItem } from '@coreui/react'
import { DataTableLoadingState } from '../../../../components/datatable'
import StaffWorkloadScoreTrendChart from './StaffWorkloadScoreTrendChart'
import StaffWorkloadEvidence from './StaffWorkloadEvidence'
import WorkloadScoreTrigger from './WorkloadScoreTrigger'
import WorkloadStatChip from './WorkloadStatChip'

const WorkloadRankingCard = ({
  rows,
  loading,
  todayStr,
  selectedScoreStaffKey,
  onOpenScoreDetails,
  graphMode = false,
  historyByStaffKey = {},
  historyLoading = false,
  historyError = '',
  startDate,
  endDate,
}) => {
  const initialActiveStaffKey = rows[0]?.staffKey || ''
  const [activeStaffKey, setActiveStaffKey] = useState(null)
  const effectiveActiveStaffKey = activeStaffKey ?? initialActiveStaffKey

  useEffect(() => {
    if (rows.length === 0) {
      setActiveStaffKey(null)
      return
    }

    setActiveStaffKey((current) =>
      current === null || rows.some((row) => row.staffKey === current) ? current : rows[0].staffKey,
    )
  }, [rows])

  if (loading) {
    return <DataTableLoadingState message="Loading workload snapshot..." />
  }

  if (rows.length === 0) {
    return <div className="text-center text-muted py-4">No workload data found.</div>
  }

  return (
    <CAccordion
      activeItemKey={effectiveActiveStaffKey || undefined}
      className="workload-staff-accordion"
    >
      {rows.map((row) => {
        const staffCodeLabel = row.staffCode || row.staffLabel
        const staffFullName = row.staffName
        const visibleProjectCount =
          row.projectGroupCount ??
          (Array.isArray(row.projectGroups)
            ? row.projectGroups.length
            : row.projectTaggedActiveTasks)

        const isActive = row.staffKey === effectiveActiveStaffKey

        return (
          <CAccordionItem key={row.staffKey} itemKey={row.staffKey}>
            <CAccordionHeader
              onClick={() =>
                setActiveStaffKey((current) =>
                  (current ?? initialActiveStaffKey) === row.staffKey ? '' : row.staffKey,
                )
              }
            >
              <div className="workload-staff-heading-row w-100 pe-3">
                <div className="workload-staff-heading-top d-flex align-items-center justify-content-between gap-3 w-100">
                  <div className="workload-staff-heading-main d-flex flex-wrap align-items-baseline gap-3 min-w-0">
                    <div className="workload-staff-identity d-flex align-items-baseline gap-2 min-w-0">
                      <span className="workload-staff-title text-truncate">{staffCodeLabel}</span>
                      {staffFullName ? (
                        <span className="workload-staff-name text-truncate">- {staffFullName}</span>
                      ) : null}
                    </div>
                    <div className="workload-staff-chips d-flex flex-wrap gap-2 small">
                      <WorkloadStatChip
                        tone="primary"
                        value={visibleProjectCount}
                        singular="Project"
                        compactLabel="P"
                      />
                      <WorkloadStatChip
                        tone="info"
                        value={row.activeTasks}
                        singular="Active Task"
                        compactLabel="A"
                      />
                      <WorkloadStatChip
                        tone="danger"
                        value={row.overdueTasks}
                        singular="Overdue Task"
                        compactLabel="O"
                      />
                    </div>
                  </div>
                  <div className="workload-staff-score text-end ms-auto">
                    <WorkloadScoreTrigger
                      row={row}
                      active={selectedScoreStaffKey === row.staffKey}
                      onOpenDetails={onOpenScoreDetails}
                    />
                  </div>
                </div>
              </div>
            </CAccordionHeader>
            <CAccordionBody className="p-0">
              {graphMode && isActive ? (
                <StaffWorkloadScoreTrendChart
                  history={historyByStaffKey[row.staffKey]}
                  loading={historyLoading}
                  error={historyError}
                  startDate={startDate}
                  endDate={endDate}
                />
              ) : graphMode ? null : (
                <StaffWorkloadEvidence row={row} todayStr={todayStr} />
              )}
            </CAccordionBody>
          </CAccordionItem>
        )
      })}
    </CAccordion>
  )
}

WorkloadRankingCard.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      staffKey: PropTypes.string.isRequired,
      staffCode: PropTypes.string,
      staffLabel: PropTypes.string,
      staffName: PropTypes.string,
      activeTasks: PropTypes.number,
      overdueTasks: PropTypes.number,
      projectTaggedActiveTasks: PropTypes.number,
      projectGroupCount: PropTypes.number,
      projectGroups: PropTypes.array,
      workTypeBreakdown: PropTypes.array,
    }),
  ).isRequired,
  loading: PropTypes.bool.isRequired,
  todayStr: PropTypes.string.isRequired,
  selectedScoreStaffKey: PropTypes.string,
  onOpenScoreDetails: PropTypes.func.isRequired,
  graphMode: PropTypes.bool,
  historyByStaffKey: PropTypes.object,
  historyLoading: PropTypes.bool,
  historyError: PropTypes.string,
  startDate: PropTypes.string,
  endDate: PropTypes.string,
}

export default WorkloadRankingCard
