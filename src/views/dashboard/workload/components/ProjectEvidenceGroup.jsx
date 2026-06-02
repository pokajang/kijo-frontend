import React, { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { cilMoney } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { CButton } from '@coreui/react'
import { formatCount, formatCurrency } from '../formatters'
import { WORKLOAD_PROJECT_ACTIVITY_PREVIEW } from '../constants'
import ActiveTaskActivityRow, { getTaskActivityDate } from './ActiveTaskActivityRow'
import ProgressEvidenceRow from './ProgressEvidenceRow'
import { WorkloadCompactListGroup } from './WorkloadCompactList'

// Date sort relies on YYYY-MM-DD lexicographic ordering. Any change to date
// formatting upstream needs to revisit this comparator.
const activityDate = (item) =>
  item.type === 'activeTask' ? getTaskActivityDate(item.task) : item.update?.progressDate || '-'

const activityKey = (item, fallbackIndex) => {
  if (item.type === 'activeTask') {
    const task = item.task
    return `task-${task.id ?? `${task.title || ''}-${activityDate(item)}-${fallbackIndex}`}`
  }
  const update = item.update
  return `progress-${update.id ?? `${activityDate(item)}-${update.progressText || ''}-${fallbackIndex}`}`
}

const isTaskLinkedProgress = (update = {}) =>
  String(update.sourceType || '')
    .trim()
    .toLowerCase() === 'task' || update.sourceTaskId != null

const buildActivityItems = (group) => {
  const progressItems = (group.progressUpdates || [])
    .filter((update) => !isTaskLinkedProgress(update))
    .map((update) => ({
      type: 'progress',
      update,
    }))
  const activeTaskItems = (group.activeTasks || []).map((task) => ({ type: 'activeTask', task }))
  return [...progressItems, ...activeTaskItems].sort((a, b) =>
    String(activityDate(b)).localeCompare(String(activityDate(a))),
  )
}

const getGroupTitleParts = (group, index) => {
  const projectName = group.projectName || 'Tagged Project'
  const clientName = group.clientName
  return {
    prefix: `Project ${index + 1} - `,
    projectName,
    clientName,
    fullTitle: `Project ${index + 1} - ${projectName}${clientName ? ` for ${clientName}` : ''}`,
  }
}

const ActivityRow = ({ item, todayStr }) =>
  item.type === 'activeTask' ? (
    <ActiveTaskActivityRow task={item.task} todayStr={todayStr} />
  ) : (
    <ProgressEvidenceRow update={item.update} todayStr={todayStr} />
  )

ActivityRow.propTypes = {
  item: PropTypes.shape({
    type: PropTypes.oneOf(['activeTask', 'progress']).isRequired,
    task: PropTypes.object,
    update: PropTypes.object,
  }).isRequired,
  todayStr: PropTypes.string.isRequired,
}

const ProjectEvidenceGroup = ({ group, groupIndex, todayStr, printMode = false }) => {
  const activityItems = useMemo(() => buildActivityItems(group), [group])
  const [showAllActivity, setShowAllActivity] = useState(false)
  const titleParts = getGroupTitleParts(group, groupIndex)

  const visibleItems =
    printMode || showAllActivity
      ? activityItems
      : activityItems.slice(0, WORKLOAD_PROJECT_ACTIVITY_PREVIEW)
  const hiddenCount = Math.max(0, activityItems.length - WORKLOAD_PROJECT_ACTIVITY_PREVIEW)

  return (
    <div className="py-1">
      <div className="workload-project-heading d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div className="workload-project-title text-break">
          <span className="workload-project-title-full">{titleParts.fullTitle}</span>
          <span className="workload-project-title-mobile">
            <span>{titleParts.projectName}</span>
            {titleParts.clientName ? (
              <span className="workload-project-client-mobile">{titleParts.clientName}</span>
            ) : null}
          </span>
        </div>
        <div className="workload-project-meta d-flex flex-wrap align-items-center gap-2">
          <span className="workload-project-value text-success">
            <CIcon icon={cilMoney} className="me-1" />
            {formatCurrency(group.projectValue)}
          </span>
        </div>
      </div>

      <div className="mt-3">
        {activityItems.length ? (
          <WorkloadCompactListGroup>
            {visibleItems.map((item, index) => (
              <ActivityRow key={activityKey(item, index)} item={item} todayStr={todayStr} />
            ))}
          </WorkloadCompactListGroup>
        ) : (
          <div className="small text-muted fst-italic">No project activity to show.</div>
        )}
        {!printMode && hiddenCount > 0 ? (
          <CButton
            color="link"
            size="sm"
            className="px-0 mt-2 text-decoration-none"
            onClick={() => setShowAllActivity((current) => !current)}
          >
            {showAllActivity ? 'Show less' : `+${formatCount(hiddenCount)} more`}
          </CButton>
        ) : null}
      </div>
    </div>
  )
}

ProjectEvidenceGroup.propTypes = {
  group: PropTypes.shape({
    projectId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    projectName: PropTypes.string,
    clientName: PropTypes.string,
    projectValue: PropTypes.number,
    activeTasks: PropTypes.array,
    progressUpdates: PropTypes.array,
  }).isRequired,
  groupIndex: PropTypes.number.isRequired,
  todayStr: PropTypes.string.isRequired,
  printMode: PropTypes.bool,
}

export default ProjectEvidenceGroup
