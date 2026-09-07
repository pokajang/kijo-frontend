import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody } from '@coreui/react'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import ApplyLeave from '../../../components/leave/ApplyLeave'
import LeaveRecord from '../../../components/leave/LeaveRecord'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'

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
  const [headerScopeLabel, setHeaderScopeLabel] = useState('')
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('my.leaves')
  const activeSection =
    routeSection && validSectionKeys.has(routeSection) ? routeSection : 'records'
  const activeConfig = useMemo(
    () => sections.find((section) => section.key === activeSection) || sections[0],
    [activeSection],
  )
  const ActiveComponent = activeConfig.component

  return (
    <CCard className="leave-workspace">
      <DataTableCardHeader
        title={activeConfig.title}
        scopeLabel={activeSection === 'records' ? headerScopeLabel : ''}
        mobilePresentation={activeSection === 'records' ? 'actions-only' : 'default'}
        className={`leave-workspace-header${
          activeSection === 'records' ? '' : ' leave-workspace-header--apply'
        }`}
      >
        <div className="mobile-workspace-action-row leave-workspace-action-cluster">
          {activeSection === 'records' ? (
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              className="mobile-workspace-primary-action rounded-pill"
              aria-label="Apply Leave"
              onClick={() => navigate(sectionPath('apply'))}
            >
              <span className="d-sm-none">Apply</span>
              <span className="d-none d-sm-inline">Apply Leave</span>
            </CButton>
          ) : (
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate(sectionPath('records'))}
            >
              Back
            </CButton>
          )}
          {activeSection === 'records' ? (
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
          ) : null}
        </div>
      </DataTableCardHeader>
      <CCardBody>
        <div className="leave-workspace-panel" role="tabpanel">
          <ActiveComponent
            onViewRecords={() => navigate(sectionPath('records'))}
            onScopeLabelChange={setHeaderScopeLabel}
            statsVisible={activeSection === 'records' ? statsVisible : true}
            controlsVisible={activeSection === 'records' ? controlsVisible : true}
          />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default LeaveWorkspace
