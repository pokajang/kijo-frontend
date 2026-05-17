import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import KpiTracker from './KpiTracker'
import KpiOverview from './KpiOverview'
import KpiParametersManager from './KpiParametersManager'

const tabs = [
  {
    key: 'overview',
    label: 'Overview',
    title: 'KPI Overview',
    component: KpiOverview,
  },
  {
    key: 'update',
    label: 'Update',
    title: 'Update KPI Achievements',
    component: KpiTracker,
  },
  {
    key: 'parameters',
    label: 'Parameters',
    title: 'KPI Parameters',
    component: KpiParametersManager,
  },
]

const sectionPath = (key) => (key === 'overview' ? '/my/kpi' : `/my/kpi/${key}`)
const validTabKeys = new Set(tabs.map((tab) => tab.key))

const KpiWorkspace = ({ closeModal, routeSection }) => {
  const navigate = useNavigate()
  const activeTab = routeSection && validTabKeys.has(routeSection) ? routeSection : 'overview'

  const actionTabs = useMemo(() => tabs.filter((tab) => tab.key !== 'overview'), [])
  const activeConfig = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) || tabs[0],
    [activeTab],
  )
  const ActiveComponent = activeConfig.component

  return (
    <CCard className="kpi-workspace">
      <CCardHeader className="kpi-workspace-header">
        <strong>{activeConfig.title}</strong>
        <div className="kpi-workspace-action-cluster">
          {activeTab === 'overview' ? (
            <CDropdown alignment="end" className="kpi-workspace-action-dropdown">
              <CDropdownToggle color="primary" size="sm" className="kpi-workspace-action-toggle">
                Actions
              </CDropdownToggle>
              <CDropdownMenu>
                {actionTabs.map((tab) => (
                  <CDropdownItem key={tab.key} onClick={() => navigate(sectionPath(tab.key))}>
                    {tab.label}
                  </CDropdownItem>
                ))}
              </CDropdownMenu>
            </CDropdown>
          ) : (
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => navigate(sectionPath('overview'))}
            >
              Back
            </CButton>
          )}
        </div>
      </CCardHeader>
      <CCardBody>
        <div className="kpi-workspace-panel" role="tabpanel">
          <ActiveComponent
            closeModal={closeModal}
            onCreateKpi={() => navigate(sectionPath('parameters'))}
          />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default KpiWorkspace
