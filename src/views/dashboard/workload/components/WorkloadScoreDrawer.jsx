import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilInfo } from '@coreui/icons'
import RightSideDrawer from '../../../../components/right-drawer/RightSideDrawer'
import WorkloadScoreCalculationTable from './WorkloadScoreCalculationTable'
import WorkloadScoreInfoModal from './WorkloadScoreInfoModal'
import WorkTypeBreakdownTable from './WorkTypeBreakdownTable'
import { buildWorkloadScoreTableRows } from './workloadScoreRows'

const WorkloadScoreDrawer = ({ row, onClose }) => {
  const [showInfo, setShowInfo] = useState(false)
  const tableRows = useMemo(() => buildWorkloadScoreTableRows(row || {}), [row])

  useEffect(() => {
    if (!row) {
      setShowInfo(false)
    }
  }, [row])

  const title = (
    <div className="workload-score-drawer-title-row">
      <span>Workload score calculation</span>
      <CButton
        type="button"
        color="primary"
        variant="ghost"
        size="sm"
        className="workload-score-info-button"
        aria-label="Show workload score rules"
        onClick={() => setShowInfo(true)}
      >
        <CIcon icon={cilInfo} size="lg" />
      </CButton>
    </div>
  )

  return (
    <>
      <RightSideDrawer
        open={Boolean(row)}
        title={title}
        onClose={onClose}
        width={380}
        className="workload-score-drawer"
        bodyClassName="workload-score-drawer-body"
        closeLabel="Close workload score calculation"
      >
        <WorkloadScoreCalculationTable rows={tableRows} />
        <div className="workload-work-type-drawer-section">
          <div className="fw-semibold mb-2">Work type breakdown</div>
          <WorkTypeBreakdownTable rows={row?.workTypeBreakdown || []} />
        </div>
      </RightSideDrawer>
      <WorkloadScoreInfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </>
  )
}

WorkloadScoreDrawer.propTypes = {
  row: PropTypes.shape({
    score: PropTypes.number,
    staffCode: PropTypes.string,
    staffLabel: PropTypes.string,
    overdueTasks: PropTypes.number,
    dueSoonTasks: PropTypes.number,
    otherTasks: PropTypes.array,
    completedTasks: PropTypes.array,
    projectGroups: PropTypes.array,
    workTypeBreakdown: PropTypes.array,
  }),
  onClose: PropTypes.func.isRequired,
}

export { buildWorkloadScoreTableRows } from './workloadScoreRows'
export { WorkloadScoreCalculationTable } from './WorkloadScoreCalculationTable'
export default WorkloadScoreDrawer
