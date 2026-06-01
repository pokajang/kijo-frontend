import React from 'react'
import PropTypes from 'prop-types'
import { CBadge } from '@coreui/react'
import { stripExactProjectMention } from '../../../../utils/projectMentionText'
import TaskAiClassificationStatus from '../../../task-manager/TaskAiClassificationStatus'
import { formatDaysLapsed } from '../formatters'
import { WorkloadCompactListItem } from './WorkloadCompactList'

const getTaskActivityDate = (task) => task?.createdAt || task?.dueDate || '-'

const ActiveTaskActivityRow = ({ task, todayStr }) => (
  <WorkloadCompactListItem>
    <div className="workload-evidence-row d-flex flex-wrap align-items-start justify-content-between gap-2">
      <div className="workload-evidence-main min-w-0">
        <div className="workload-evidence-title text-break">
          {stripExactProjectMention(task.title || '-', task.projectName) || '-'}
          <span className="workload-evidence-inline-meta">
            {formatDaysLapsed(getTaskActivityDate(task), todayStr)} lapsed
          </span>
        </div>
        {task.workTypeLabel ? (
          <div className="workload-evidence-work-type small text-muted">{task.workTypeLabel}</div>
        ) : null}
        <TaskAiClassificationStatus task={task} className="mt-1" />
      </div>
      <CBadge color="info" className="workload-evidence-badge rounded-pill">
        Active 5MM Task
      </CBadge>
    </div>
  </WorkloadCompactListItem>
)

ActiveTaskActivityRow.propTypes = {
  task: PropTypes.shape({
    title: PropTypes.string,
    projectName: PropTypes.string,
    createdAt: PropTypes.string,
    dueDate: PropTypes.string,
    workTypeLabel: PropTypes.string,
    aiClassificationStatus: PropTypes.string,
    classificationSource: PropTypes.string,
  }).isRequired,
  todayStr: PropTypes.string.isRequired,
}

export default ActiveTaskActivityRow
export { getTaskActivityDate }
