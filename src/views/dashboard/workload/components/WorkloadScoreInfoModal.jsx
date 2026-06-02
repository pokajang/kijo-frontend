import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react'
import {
  projectRoleWeights,
  projectValueBands,
  taskEffortMarks,
  workloadScoreMatrixBands,
} from './workloadScoreRules'
import { workloadWorkTypes } from './workTypes'

const WorkloadScoreInfoModal = ({ visible, onClose }) => (
  <CModal visible={visible} onClose={onClose} alignment="center" size="lg" scrollable>
    <CModalHeader>
      <CModalTitle>Workload score rules</CModalTitle>
    </CModalHeader>
    <CModalBody>
      <div className="workload-score-info">
        <section>
          <h6>Workload matrix</h6>
          <p>
            The score range gives the first read on workload pressure. Task chips and evidence rows
            still show active, overdue, and due-soon pressure separately.
          </p>
          <div className="workload-score-info-table-wrap">
            <table className="workload-score-info-table">
              <thead>
                <tr>
                  <th>Level</th>
                  <th>Score range</th>
                  <th>Interpretation</th>
                </tr>
              </thead>
              <tbody>
                {workloadScoreMatrixBands.map((band) => (
                  <tr key={band.level}>
                    <td className="fw-semibold">
                      <span className="workload-score-matrix-level">
                        <span
                          aria-hidden="true"
                          className={`workload-score-matrix-swatch workload-score-matrix-swatch-${band.key}`}
                        />
                        {band.level}
                      </span>
                    </td>
                    <td
                      className={`text-end fw-semibold workload-score-matrix-range workload-score-matrix-range-${band.key}`}
                    >
                      {band.range}
                    </td>
                    <td>{band.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h6>Task mark / effort score</h6>
          <p>
            Each task is classified when it is created. The backend stores the task category, effort
            score, confidence, source, and matched pattern. The workload dashboard uses the stored
            effort score. Missing effort scores are treated as 1 point, while explicit zero-point
            non-rated or unclear tasks remain 0.
          </p>
          <div className="workload-score-info-table-wrap">
            <table className="workload-score-info-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Task mark</th>
                  <th>Typical work</th>
                </tr>
              </thead>
              <tbody>
                {taskEffortMarks.map((mark) => (
                  <tr key={mark.category}>
                    <td>{mark.category}</td>
                    <td className="text-end fw-semibold">{mark.points}</td>
                    <td>{mark.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h6>Work type</h6>
          <p>
            Workload score measures effort and pressure. Work type describes the nature of the task
            so managers can see whether workload is clerical, coordination, commercial, technical,
            software, finance/HR, management, training, creative, operations, non-work, or unclear.
            Work type is read-only and does not change the score.
          </p>
          <div className="workload-score-info-table-wrap">
            <table className="workload-score-info-table">
              <thead>
                <tr>
                  <th>Work type</th>
                  <th>Typical work</th>
                </tr>
              </thead>
              <tbody>
                {workloadWorkTypes.map((type) => (
                  <tr key={type.key}>
                    <td>{type.label}</td>
                    <td>{type.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h6>Non Project Tasks Score</h6>
          <p>
            Active tasks that are not tagged to a project contribute their full effort score. A
            completed task is not counted here. Example: an active Real Effort task gives 3 points;
            an active Coordination / Follow-up task gives 2 points.
          </p>
        </section>

        <section>
          <h6>Project Task / Responsibility Score</h6>
          <p>
            A project task is removed from the non-project task score and counted under its tagged
            project instead. Project score is split into full assigned task effort plus capped
            project responsibility overhead:
          </p>
          <p className="workload-score-info-formula">
            active project task effort + ((base + capped manual progress + capped value band) x role
            weight)
          </p>
          <ul>
            <li>
              Base is 1 point only when the project has active tasks or scoreable manual progress.
            </li>
            <li>
              Active project task effort is counted at the full stored effort score for the assigned
              staff member. It is not reduced by role weight.
            </li>
            <li>Manual/non-task project progress contributes up to 2 points per project.</li>
            <li>Project value band contributes up to 2 points per project.</li>
            <li>Task-linked completed progress does not add project responsibility points.</li>
            <li>Completed-only project groups are not shown in the workload snapshot.</li>
            <li>The result is rounded to 2 decimal places.</li>
          </ul>
          <div className="workload-score-info-grid">
            <div>
              <div className="fw-semibold mb-2">Project value band (scoring cap: 2)</div>
              <table className="workload-score-info-table">
                <tbody>
                  {projectValueBands.map(([range, points]) => (
                    <tr key={range}>
                      <td>{range}</td>
                      <td className="text-end fw-semibold">{points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="fw-semibold mb-2">Role weight</div>
              <table className="workload-score-info-table">
                <tbody>
                  {projectRoleWeights.map(([role, weight]) => (
                    <tr key={role}>
                      <td>{role}</td>
                      <td className="text-end fw-semibold">{weight}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <h6>Deadline Pressure Score</h6>
          <p>
            Only active tasks are counted. Overdue tasks add effort score x 0.5. Due-soon tasks add
            effort score x 0.25. A task is due soon when it is not overdue and its due date is
            within 7 days of the dashboard snapshot date. Deadline pressure is capped at the lower
            of 4 points or 35% of active workload base, so overdue work raises risk visibility
            without becoming the best way to increase score.
          </p>
        </section>

        <section>
          <h6>Total Score</h6>
          <p>
            Total workload score is the sum of Non Project Tasks Score, Project Task /
            Responsibility Score, and Deadline Pressure Score. Completed tasks are not included in
            the workload score. Section totals and line allocations are rounded to 2 decimal places.
          </p>
        </section>
      </div>
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
        Close
      </CButton>
    </CModalFooter>
  </CModal>
)

WorkloadScoreInfoModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
}

export default WorkloadScoreInfoModal
