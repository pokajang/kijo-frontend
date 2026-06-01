import React from 'react'
import PropTypes from 'prop-types'
import { CBadge } from '@coreui/react'
import { formatCount } from '../formatters'
import { topWorkTypes } from './workTypes'

const WorkTypeSummary = ({ breakdown = [], limit = 2, className = '' }) => {
  const rows = topWorkTypes(breakdown, limit)
  if (!rows.length) return null

  return (
    <div className={`workload-work-type-summary ${className}`.trim()}>
      {rows.map((line) => (
        <CBadge
          key={line.workType}
          color="secondary"
          className="workload-work-type-chip rounded-pill fw-normal"
        >
          {line.workTypeLabel}: {formatCount(line.taskCount)}
        </CBadge>
      ))}
    </div>
  )
}

WorkTypeSummary.propTypes = {
  breakdown: PropTypes.arrayOf(
    PropTypes.shape({
      workType: PropTypes.string,
      workTypeLabel: PropTypes.string,
      taskCount: PropTypes.number,
      effortPoints: PropTypes.number,
    }),
  ),
  limit: PropTypes.number,
  className: PropTypes.string,
}

export default WorkTypeSummary
