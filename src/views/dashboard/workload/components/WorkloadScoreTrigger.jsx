import React from 'react'
import PropTypes from 'prop-types'
import { formatCount } from '../formatters'
import { getWorkloadScoreLevelBand } from './workloadScoreRules'

const ACTIVATE_KEYS = new Set(['Enter', ' '])

const WorkloadScoreTrigger = ({ row, active = false, onOpenDetails }) => {
  const scoreLevel = getWorkloadScoreLevelBand(row.score)

  const handleToggle = (event) => {
    event.stopPropagation()
    onOpenDetails(row)
  }

  const handleKeyDown = (event) => {
    if (!ACTIVATE_KEYS.has(event.key)) return
    event.preventDefault()
    handleToggle(event)
  }

  return (
    <span className="workload-score-stack">
      <span
        aria-expanded={active}
        aria-haspopup="dialog"
        aria-label={`Show workload score calculation for ${row.staffLabel || 'staff'}`}
        className={`workload-score-trigger workload-score-trigger-${scoreLevel.key}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <span className="h2 mb-0 workload-score-value">{formatCount(row.score)}</span>
      </span>
      <span className="workload-score-text-stack">
        <span className={`workload-score-level workload-score-level-${scoreLevel.key}`}>
          {scoreLevel.level}
        </span>
        <span className="workload-score-label fs-6 fw-normal text-muted">
          <span className="d-none d-sm-inline">workload </span>score
        </span>
      </span>
    </span>
  )
}

WorkloadScoreTrigger.propTypes = {
  row: PropTypes.shape({
    score: PropTypes.number,
    staffLabel: PropTypes.string,
  }).isRequired,
  active: PropTypes.bool,
  onOpenDetails: PropTypes.func.isRequired,
}

export default WorkloadScoreTrigger
