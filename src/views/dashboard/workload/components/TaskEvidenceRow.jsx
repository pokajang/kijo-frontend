import React from 'react'
import PropTypes from 'prop-types'
// getStatusBadge is the de-facto shared task status renderer (also used by
// task-manager, staff/tasks, and leave). If it ever moves out of task-manager,
// update this import — no copy here.
import { getStatusBadge } from '../../../task-manager/actionHandlers'
import TaskAiClassificationStatus, {
  getTaskAiClassificationStatus,
} from '../../../task-manager/TaskAiClassificationStatus'
import { WorkloadCompactListItem } from './WorkloadCompactList'

const getTaskDisplayDate = (task) => task?.completedAt || task?.createdAt || task?.dueDate || '-'

const TaskEvidenceRow = ({
  task,
  todayStr,
  showProject = false,
  showDateMeta = true,
  className = '',
}) => {
  const hasAiClassificationStatus = getTaskAiClassificationStatus(task) !== 'not_applicable'
  const hasClassificationLine = task.workTypeLabel || hasAiClassificationStatus

  return (
    <WorkloadCompactListItem className={className}>
      <div className="workload-evidence-row d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div className="workload-evidence-main min-w-0">
          <div className="workload-evidence-title text-break">{task.title || '-'}</div>
          {hasClassificationLine ? (
            <div className="workload-evidence-classification-line">
              {task.workTypeLabel ? (
                <span className="workload-evidence-work-type small text-muted">
                  {task.workTypeLabel}
                </span>
              ) : null}
              <TaskAiClassificationStatus task={task} />
            </div>
          ) : null}
          {showDateMeta ? (
            <div className="workload-evidence-meta small text-muted">
              {showProject && task.projectName ? `${task.projectName} | ` : ''}
              Due {task.dueDate || '-'} | Latest {getTaskDisplayDate(task)}
            </div>
          ) : null}
        </div>
        <div className="workload-evidence-badge">{getStatusBadge(task, todayStr)}</div>
      </div>
    </WorkloadCompactListItem>
  )
}

TaskEvidenceRow.propTypes = {
  task: PropTypes.shape({
    title: PropTypes.string,
    dueDate: PropTypes.string,
    completedAt: PropTypes.string,
    createdAt: PropTypes.string,
    projectName: PropTypes.string,
    workTypeLabel: PropTypes.string,
    aiClassificationStatus: PropTypes.string,
    ai_classification_status: PropTypes.string,
    classificationSource: PropTypes.string,
    classification_source: PropTypes.string,
  }).isRequired,
  todayStr: PropTypes.string.isRequired,
  showProject: PropTypes.bool,
  showDateMeta: PropTypes.bool,
  className: PropTypes.string,
}

export default TaskEvidenceRow
export { getTaskDisplayDate }
