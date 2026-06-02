import React from 'react'
import PropTypes from 'prop-types'
import { formatCount } from '../formatters'

const WorkTypeBreakdownTable = ({ rows = [] }) => {
  if (!rows.length) {
    return (
      <div className="small text-muted fst-italic px-1 py-2">
        No work-type data available for this snapshot.
      </div>
    )
  }

  return (
    <div className="workload-score-table-wrapper workload-work-type-table-wrapper">
      <table className="workload-score-table workload-work-type-table">
        <thead>
          <tr>
            <th scope="col">Work type</th>
            <th className="workload-score-table-points" scope="col">
              Active
            </th>
            <th className="workload-score-table-points" scope="col">
              Effort
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((line) => (
            <tr key={line.workType}>
              <td>
                <div className="workload-score-table-label">{line.workTypeLabel}</div>
              </td>
              <td className="workload-score-table-points">{formatCount(line.activeCount)}</td>
              <td className="workload-score-table-points">{formatCount(line.effortPoints)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

WorkTypeBreakdownTable.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      workType: PropTypes.string,
      workTypeLabel: PropTypes.string,
      activeCount: PropTypes.number,
      effortPoints: PropTypes.number,
    }),
  ),
}

export default WorkTypeBreakdownTable
