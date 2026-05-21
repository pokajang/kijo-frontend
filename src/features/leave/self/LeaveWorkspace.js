import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import ApplyLeave from '../../../components/leave/ApplyLeave'
import LeaveRecord from '../../../components/leave/LeaveRecord'

const sections = [
  {
    key: 'records',
    label: 'Records',
    title: 'Leave Records',
    component: LeaveRecord,
  },
  {
    key: 'apply',
    label: 'Apply Leave',
    title: 'Apply Leave',
    component: ApplyLeave,
  },
]

const sectionPath = (key) => (key === 'records' ? '/my/leaves' : `/my/leaves/${key}`)
const validSectionKeys = new Set(sections.map((section) => section.key))

const LeaveWorkspace = ({ routeSection }) => {
  const navigate = useNavigate()
  const activeSection =
    routeSection && validSectionKeys.has(routeSection) ? routeSection : 'records'
  const activeConfig = useMemo(
    () => sections.find((section) => section.key === activeSection) || sections[0],
    [activeSection],
  )
  const ActiveComponent = activeConfig.component

  return (
    <CCard className="leave-workspace">
      <CCardHeader className="leave-workspace-header">
        <strong>{activeConfig.title}</strong>
        <div className="leave-workspace-action-cluster">
          {activeSection === 'records' ? (
            <CButton color="primary" size="sm" onClick={() => navigate(sectionPath('apply'))}>
              Apply Leave
            </CButton>
          ) : (
            <>
              <CButton
                color="info"
                variant="outline"
                size="sm"
                onClick={() => navigate('/knowledge/how-to-apply-leave')}
              >
                Help
              </CButton>
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => navigate(sectionPath('records'))}
              >
                Back
              </CButton>
            </>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        <div className="leave-workspace-panel" role="tabpanel">
          <ActiveComponent onViewRecords={() => navigate(sectionPath('records'))} />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default LeaveWorkspace
