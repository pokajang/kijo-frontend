import React from 'react'
import PropTypes from 'prop-types'
import { CBadge } from '@coreui/react'
import { stripExactProjectMention } from '../../../../utils/projectMentionText'
import { formatDaysLapsed } from '../formatters'
import { WorkloadCompactListItem } from './WorkloadCompactList'

export const isTaskProgressUpdate = (update) =>
  String(update?.sourceType || '')
    .trim()
    .toLowerCase() === 'task' || update?.sourceTaskId != null

const getProgressDisplayText = (update) => {
  const text = update?.progressText || '-'
  if (!isTaskProgressUpdate(update)) return text
  return stripExactProjectMention(text, update?.projectName) || '-'
}

const ProgressEvidenceRow = ({ update, todayStr }) => (
  <WorkloadCompactListItem>
    <div className="workload-evidence-row d-flex flex-wrap align-items-start justify-content-between gap-2">
      <div className="workload-evidence-main min-w-0">
        <div className="workload-evidence-title text-break">
          {getProgressDisplayText(update)}
          <span className="workload-evidence-inline-meta">
            {formatDaysLapsed(update?.progressDate, todayStr)} lapsed
          </span>
        </div>
      </div>
      {isTaskProgressUpdate(update) ? (
        <CBadge color="success" className="workload-evidence-badge rounded-pill">
          Done 5MM Task
        </CBadge>
      ) : null}
    </div>
  </WorkloadCompactListItem>
)

ProgressEvidenceRow.propTypes = {
  update: PropTypes.shape({
    progressText: PropTypes.string,
    progressDate: PropTypes.string,
    projectName: PropTypes.string,
    sourceType: PropTypes.string,
    sourceTaskId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }).isRequired,
  todayStr: PropTypes.string.isRequired,
}

export default ProgressEvidenceRow
