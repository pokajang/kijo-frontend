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
    title: 'My Payments',
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
  const [paymentQueueScopeLabel, setPaymentQueueScopeLabel] = useState('')
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('my.salary')

  const activeSection =
    routeSection && validSectionKeys.has(routeSection) ? routeSection : 'payment-queue'
  const activeConfig = useMemo(
    () => sections.find((section) => section.key === activeSection) || sections[0],
    [activeSection],
  )
  const ActiveComponent = activeConfig.component
  const medicalEntitlementSetup =
    activeSection === 'settings' && location.state?.salarySettingsIntent === 'medical-entitlement'

  useEffect(() => {
    if (activeSection === 'apply' && location.state?.editRecord) {
      setSalaryAdjustmentsVisible(true)
    }
    if (activeSection === 'other-claim-apply' && location.state?.editRecord) {
      setOtherClaimAdjustmentsVisible(true)
    }
  }, [activeSection, location.state?.editRecord])

  const handleConfigureMedicalEntitlement = ({ claimMonth } = {}) => {
    const returnState = {
      ...location.state,
      resumeClaimType: 'medical',
      resumeClaimMonth: claimMonth,
      resumeNotice: 'Medical claim draft restored. Review it before submitting.',
    }

    navigate('/my/salary/other-claims/apply', {
      replace: true,
      state: returnState,
    })
    navigate('/my/salary/settings', {
      state: {
        salarySettingsIntent: 'medical-entitlement',
        returnClaimMonth: claimMonth,
        returnClaimState: returnState,
      },
    })
  }

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
        <ActiveComponent
          medicalEntitlementSetup={medicalEntitlementSetup}
          onMedicalEntitlementSaved={
            medicalEntitlementSetup
              ? () =>
                  navigate('/my/salary/other-claims/apply', {
                    replace: true,
                    state: {
                      ...(location.state?.returnClaimState || {}),
                      resumeClaimType: 'medical',
                      resumeClaimMonth: location.state?.returnClaimMonth,
                      resumeNotice:
                        'Medical entitlement updated. Review your medical claim before submitting.',
                    },
                  })
              : undefined
          }
        />
      ) : (
        <CCard className="salary-workspace">
          {['payment-queue', 'records', 'other-claim-records'].includes(activeSection) && (
            <DataTableCardHeader
              title={activeConfig.title}
              scopeLabel={
                activeSection === 'payment-queue'
                  ? paymentQueueScopeLabel
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
              resumeClaimType={
                activeSection === 'other-claim-apply' ? location.state?.resumeClaimType : undefined
              }
              resumeNotice={
                activeSection === 'other-claim-apply' ? location.state?.resumeNotice : undefined
              }
              resumeClaimMonth={
                activeSection === 'other-claim-apply' ? location.state?.resumeClaimMonth : undefined
              }
              onConfigureMedicalEntitlement={
                activeSection === 'other-claim-apply'
                  ? handleConfigureMedicalEntitlement
                  : undefined
              }
              statsVisible
            />
          ) : (
            <CCardBody>
              <div className="salary-workspace-panel" role="tabpanel">
                <ActiveComponent
                  editRecord={null}
                  onScopeLabelChange={
                    activeSection === 'payment-queue'
                      ? setPaymentQueueScopeLabel
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
