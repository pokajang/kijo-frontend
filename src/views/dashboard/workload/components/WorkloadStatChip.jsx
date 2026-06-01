import React from 'react'
import PropTypes from 'prop-types'
import { formatCount, formatCountLabel } from '../formatters'

const getStatChipClass = (tone, value) =>
  `workload-stat-chip workload-stat-chip-${Number(value || 0) > 0 ? tone : 'muted'}`

const WorkloadStatChip = ({ tone, value, singular, plural, compactLabel }) => {
  const label = formatCountLabel(value, singular, plural)

  return (
    <span className={getStatChipClass(tone, value)} title={label}>
      <span className="d-none d-sm-inline">{label}</span>
      <span className="d-sm-none" aria-hidden="true">
        {formatCount(value)} {compactLabel}
      </span>
    </span>
  )
}

WorkloadStatChip.propTypes = {
  tone: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  singular: PropTypes.string.isRequired,
  plural: PropTypes.string,
  compactLabel: PropTypes.string.isRequired,
}

export default WorkloadStatChip
