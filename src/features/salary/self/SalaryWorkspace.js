import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CCard, CCardBody } from '@coreui/react'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { salarySelfModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import ApplySalary from '../../../components/salary/ApplySalary'
import OtherClaimApply from '../../../components/salary/OtherClaimApply'
import OtherClaimRecords from '../../../components/salary/OtherClaimRecords'
import OtherClaimRecordDetailPage from '../../../components/salary/OtherClaimRecordDetailPage'
import PaymentQueueRecords from '../../../components/salary/PaymentQueueRecords'
import SalaryRecord from '../../../components/salary/SalaryRecord'
import SalaryRecordDetailPage from '../../../components/salary/SalaryRecordDetailPage'
import SalarySettings from '../../../components/salary/SalarySettings'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'

const sections = [
  {
    key: 'payment-queue',
    title: 'Payment Queue',
    component: PaymentQueueRecords,
  },
  {
    key: 'records',
    title: 'Salary Records',
    component: SalaryRecord,
  },
  {
    key: 'apply',
    title: 'Apply Salary',
    component: ApplySalary,
  },
  {
    key: 'settings',
    title: 'Salary Settings',
    component: SalarySettings,
  },
  {
    key: 'other-claim-apply',
    title: 'Apply Other Claim',
    component: OtherClaimApply,
  },
  {
    key: 'other-claim-records',
    title: 'Other Claim Records',
    component: OtherClaimRecords,
  },
]

const sectionPath = (key) => {
  if (key === 'payment-queue') return '/my/salary/payment-queue'
  if (key === 'records') return '/my/salary/records'
  if (key === 'other-claim-apply') return '/my/salary/other-claims/apply'
  if (key === 'other-claim-records') return '/my/salary/other-claims/records'
  return `/my/salary/${key}`
}
const validSectionKeys = new Set(sections.map((section) => section.key))

const SalaryWorkspace = ({ routeSection }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [salaryAdjustmentsVisible, setSalaryAdjustmentsVisible] = useState(
    Boolean(location.state?.editRecord),
  )
  const [otherClaimAdjustmentsVisible, setOtherClaimAdjustmentsVisible] = useState(
    Boolean(location.state?.editRecord),
  )
  const [salaryRecordsScopeLabel, setSalaryRecordsScopeLabel] = useState('')
  const [otherClaimRecordsScopeLabel, setOtherClaimRecordsScopeLabel] = useState('')
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('my.salary')

  const activeSection =
    routeSection && validSectionKeys.has(routeSection) ? routeSection : 'payment-queue'
  const activeConfig = useMemo(
    () => sections.find((section) => section.key === activeSection) || sections[0],
    [activeSection],
  )
  const ActiveComponent = activeConfig.component

  useEffect(() => {
    if (activeSection === 'apply' && location.state?.editRecord) {
      setSalaryAdjustmentsVisible(true)
    }
    if (activeSection === 'other-claim-apply' && location.state?.editRecord) {
      setOtherClaimAdjustmentsVisible(true)
    }
  }, [activeSection, location.state?.editRecord])

  if (location.pathname.startsWith('/my/salary/records/')) {
    return <SalaryRecordDetailPage />
  }
  if (location.pathname.startsWith('/my/salary/other-claims/records/')) {
    return <OtherClaimRecordDetailPage />
  }

  return (
    <>
      <ModuleNavStrip
        tabs={salarySelfModuleTabs}
        activeTab={activeSection}
        ariaLabel="My salary sections"
      />
      {activeSection === 'settings' ? (
        <ActiveComponent />
      ) : (
        <CCard className="salary-workspace">
          {['payment-queue', 'records', 'other-claim-records'].includes(activeSection) && (
            <DataTableCardHeader
              title={activeConfig.title}
              scopeLabel={
                activeSection === 'payment-queue'
                  ? ''
                  : activeSection === 'records'
                    ? salaryRecordsScopeLabel
                    : activeSection === 'other-claim-records'
                      ? otherClaimRecordsScopeLabel
                      : ''
              }
              className="salary-workspace-header"
            >
              <div className="salary-workspace-action-cluster">
                <DataTableStatsToggle
                  visible={statsVisible}
                  onToggle={toggleStatsVisible}
                  controlsVisible={controlsVisible}
                  onControlsToggle={toggleControlsVisible}
                />
              </div>
            </DataTableCardHeader>
          )}
          {activeSection === 'apply' || activeSection === 'other-claim-apply' ? (
            <ActiveComponent
              onViewRecords={() =>
                navigate(sectionPath(activeSection === 'apply' ? 'records' : 'other-claim-records'))
              }
              onViewRecord={(record) => {
                if (activeSection === 'apply' && record?.salaryMonthValue) {
                  navigate(`/my/salary/records/${record.salaryMonthValue}`)
                }
              }}
              editRecord={
                activeSection === 'apply' || activeSection === 'other-claim-apply'
                  ? location.state?.editRecord
                  : null
              }
              amendmentReason={
                activeSection === 'apply' || activeSection === 'other-claim-apply'
                  ? location.state?.amendmentReason
                  : ''
              }
              showAdjustments={
                activeSection === 'apply'
                  ? salaryAdjustmentsVisible
                  : activeSection === 'other-claim-apply'
                    ? otherClaimAdjustmentsVisible
                    : undefined
              }
              onShowAdjustmentsChange={
                activeSection === 'apply' ? setSalaryAdjustmentsVisible : undefined
              }
              showAddAdjustmentAction={activeSection === 'apply'}
              statsVisible
            />
          ) : (
            <CCardBody>
              <div className="salary-workspace-panel" role="tabpanel">
                <ActiveComponent
                  editRecord={null}
                  onScopeLabelChange={
                    activeSection === 'payment-queue'
                      ? undefined
                      : activeSection === 'records'
                        ? setSalaryRecordsScopeLabel
                        : activeSection === 'other-claim-records'
                          ? setOtherClaimRecordsScopeLabel
                          : undefined
                  }
                  statsVisible={
                    ['payment-queue', 'records', 'other-claim-records'].includes(activeSection)
                      ? statsVisible
                      : true
                  }
                  controlsVisible={
                    ['payment-queue', 'records', 'other-claim-records'].includes(activeSection)
                      ? controlsVisible
                      : true
                  }
                />
              </div>
            </CCardBody>
          )}
        </CCard>
      )}
    </>
  )
}

export default SalaryWorkspace
