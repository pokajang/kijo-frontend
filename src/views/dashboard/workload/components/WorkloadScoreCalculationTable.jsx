import React from 'react'
import PropTypes from 'prop-types'
import { formatCount } from '../formatters'
import { getWorkloadScoreLevelBand } from './workloadScoreRules'

export const WorkloadScoreCalculationTable = ({ rows }) => (
  <div className="workload-score-table-wrapper">
    <table className="workload-score-table">
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col">Calculation</th>
          <th className="workload-score-table-points" scope="col">
            Points
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((line) => {
          if (line.type === 'section') {
            return (
              <tr key={line.key} className="workload-score-section-row">
                <th colSpan={2} scope="rowgroup">
                  {line.item}
                </th>
                <td className="workload-score-table-points">
                  <strong>{formatCount(line.points)}</strong>
                </td>
              </tr>
            )
          }

          if (line.type === 'empty') {
            return (
              <tr key={line.key}>
                <td className="workload-score-empty" colSpan={3}>
                  {line.item}
                </td>
              </tr>
            )
          }

          if (line.type === 'total') {
            const scoreLevel = getWorkloadScoreLevelBand(line.points)

            return (
              <tr key={line.key} className="workload-score-total-row">
                <th colSpan={2} scope="row">
                  {line.item}
                </th>
                <td className="workload-score-table-points">
                  <strong
                    className={`workload-score-final-value workload-score-final-value-${scoreLevel.key}`}
                  >
                    {formatCount(line.points)}
                  </strong>
                </td>
              </tr>
            )
          }

          return (
            <tr key={line.key}>
              <td>
                <div className="workload-score-table-label">{line.item}</div>
                {line.detail ? (
                  <div className="workload-score-drawer-detail">{line.detail}</div>
                ) : null}
              </td>
              <td>
                <div className="workload-score-drawer-detail">{line.calculation}</div>
              </td>
              <td className="workload-score-table-points">
                <strong>{formatCount(line.points)}</strong>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)

WorkloadScoreCalculationTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
}

export default WorkloadScoreCalculationTable
