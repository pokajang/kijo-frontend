import React from 'react'
import { CBadge } from '@coreui/react'

import { DataTableTextCell } from '../../components/datatable'
import TaskAiClassificationStatus from './TaskAiClassificationStatus'

const getProjectMention = (projectName) => (projectName ? `@${projectName}` : '')

const splitTitleProjectMention = (title, projectName) => {
  const mention = getProjectMention(projectName)
  if (!mention) return null

  const index = String(title || '')
    .toLowerCase()
    .indexOf(mention.toLowerCase())
  if (index < 0) return null

  return {
    before: String(title || '').slice(0, index),
    after: String(title || '').slice(index + mention.length),
  }
}

const ProjectBadge = ({ projectName }) =>
  projectName ? (
    <CBadge
      color="info"
      className="d-inline-flex align-items-center text-wrap text-start px-2 py-1"
      style={{ maxWidth: '100%', overflowWrap: 'anywhere', whiteSpace: 'normal' }}
    >
      {getProjectMention(projectName)}
    </CBadge>
  ) : null

const TaskTitleProjectCell = ({ task, maxWidth = '300px' }) => {
  const title = task.title || '-'
  const projectName = task.projectName || ''
  const parts = splitTitleProjectMention(title, projectName)

  if (parts) {
    return (
      <div className="d-flex flex-column align-items-start gap-1" style={{ maxWidth, minWidth: 0 }}>
        <div className="d-flex align-items-center flex-wrap gap-1" title={title}>
          {parts.before ? <span className="text-break">{parts.before}</span> : null}
          <ProjectBadge projectName={projectName} />
          {parts.after ? <span className="text-break">{parts.after}</span> : null}
        </div>
        <TaskAiClassificationStatus task={task} />
      </div>
    )
  }

  return (
    <div className="d-flex flex-column align-items-start gap-1" style={{ maxWidth, minWidth: 0 }}>
      <DataTableTextCell
        value={title}
        maxWidth={maxWidth}
        title="Task"
        mode="expandable"
        previewCharThreshold={34}
      />
      <ProjectBadge projectName={projectName} />
      <TaskAiClassificationStatus task={task} />
    </div>
  )
}

export default TaskTitleProjectCell
