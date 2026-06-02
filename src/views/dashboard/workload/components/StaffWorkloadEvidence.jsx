import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'
import { WORKLOAD_OTHER_TASK_PREVIEW } from '../constants'
import { formatCount } from '../formatters'
import ProjectEvidenceGroup from './ProjectEvidenceGroup'
import TaskEvidenceRow from './TaskEvidenceRow'
import { WorkloadCompactListGroup } from './WorkloadCompactList'
import WorkTypeSummary from './WorkTypeSummary'

const StaffWorkloadEvidence = ({ row, todayStr, printMode = false }) => {
  const projectGroups = row.projectGroups || []
  const otherTasks = row.otherTasks || []
  const evidenceDate = row.asOfDate || todayStr
  const [showAllOtherTasks, setShowAllOtherTasks] = useState(false)
  const hasProjectWorkload = projectGroups.length > 0
  const hasOtherTasks = otherTasks.length > 0
  const visibleOtherTasks =
    printMode || showAllOtherTasks ? otherTasks : otherTasks.slice(0, WORKLOAD_OTHER_TASK_PREVIEW)
  const hiddenOtherTaskCount = Math.max(0, otherTasks.length - WORKLOAD_OTHER_TASK_PREVIEW)

  return (
    <div className="px-3 pb-3 pt-2">
      <WorkTypeSummary breakdown={row.workTypeBreakdown} className="small mb-3" />

      <div className="mb-3">
        {projectGroups.length ? (
          <div className="d-flex flex-column gap-2">
            {projectGroups.map((group, index) => (
              <ProjectEvidenceGroup
                key={group.projectId ?? `project-${index}`}
                group={group}
                groupIndex={index}
                todayStr={evidenceDate}
                printMode={printMode}
              />
            ))}
          </div>
        ) : (
          <div className="small text-muted fst-italic">No project workload in this snapshot.</div>
        )}
      </div>

      {hasOtherTasks || !hasProjectWorkload ? (
        <div>
          {hasOtherTasks ? (
            <div className="small text-muted text-uppercase mb-2">Other 5MM Tasks</div>
          ) : null}
          {hasOtherTasks ? (
            <>
              <WorkloadCompactListGroup>
                {visibleOtherTasks.map((task, index) => (
                  <TaskEvidenceRow
                    key={task.id ?? `task-${index}-${task.title || ''}-${task.dueDate || ''}`}
                    task={task}
                    todayStr={evidenceDate}
                    showProject={false}
                    showDateMeta={false}
                    className="bg-light"
                  />
                ))}
              </WorkloadCompactListGroup>
              {!printMode && hiddenOtherTaskCount > 0 ? (
                <CButton
                  color="link"
                  size="sm"
                  className="px-0 mt-2 text-decoration-none"
                  onClick={() => setShowAllOtherTasks((current) => !current)}
                >
                  {showAllOtherTasks ? 'Show less' : `+${formatCount(hiddenOtherTaskCount)} more`}
                </CButton>
              ) : null}
            </>
          ) : (
            <div className="small text-muted fst-italic">
              No non-project workload in this snapshot.
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

StaffWorkloadEvidence.propTypes = {
  row: PropTypes.shape({
    asOfDate: PropTypes.string,
    projectGroups: PropTypes.array,
    otherTasks: PropTypes.array,
    workTypeBreakdown: PropTypes.array,
  }).isRequired,
  todayStr: PropTypes.string.isRequired,
  printMode: PropTypes.bool,
}

export default StaffWorkloadEvidence
