import React from 'react'
import PropTypes from 'prop-types'
import { CBadge } from '@coreui/react'

const statusConfig = {
  pending: {
    label: 'AI pending',
    color: 'warning',
  },
  applied: {
    label: 'AI classified',
    color: 'info',
  },
  cached: {
    label: 'Learned classification',
    color: 'secondary',
  },
}

export const getTaskAiClassificationStatus = (task = {}) => {
  const status = String(task.aiClassificationStatus || task.ai_classification_status || '').trim()
  if (statusConfig[status]) return status

  const source = String(task.classificationSource || task.classification_source || '').trim()
  if (source === 'ai') return 'applied'
  if (source === 'ai_cache') return 'cached'

  return 'not_applicable'
}

const TaskAiClassificationStatus = ({ task, className = '' }) => {
  const status = getTaskAiClassificationStatus(task)
  const config = statusConfig[status]

  if (!config) return null

  return (
    <CBadge color={config.color} className={`task-ai-classification-status ${className}`.trim()}>
      {config.label}
    </CBadge>
  )
}

TaskAiClassificationStatus.propTypes = {
  task: PropTypes.shape({
    aiClassificationStatus: PropTypes.string,
    ai_classification_status: PropTypes.string,
    classificationSource: PropTypes.string,
    classification_source: PropTypes.string,
  }),
  className: PropTypes.string,
}

export default TaskAiClassificationStatus
