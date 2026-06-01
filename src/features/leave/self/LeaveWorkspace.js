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
        className="leave-workspace-header"
      >
        <div className="leave-workspace-action-cluster">
          {activeSection === 'records' ? (
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
          ) : null}
          {activeSection === 'records' ? (
            <CButton color="primary" size="sm" onClick={() => navigate(sectionPath('apply'))}>
              Apply Leave
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
