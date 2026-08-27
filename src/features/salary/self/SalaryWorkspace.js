import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { CButton, CCard, CCardBody, CTooltip } from '@coreui/react'
import { cilSettings } from '@coreui/icons'
import CIcon from '@coreui/icons-react'
import { DataTableCardHeader, DataTableStatsToggle } from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { formatStatsScopeLabel } from '../../../components/stats/formatStatsScopeLabel'
import { salarySelfModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import ApplySalary from '../../../components/salary/ApplySalary'
import OtherClaimApply from '../../../components/salary/OtherClaimApply'
import OtherClaimRecords from '../../../components/salary/OtherClaimRecords'
import OtherClaimRecordDetailPage from '../../../components/salary/OtherClaimRecordDetailPage'
import SalaryRecord from '../../../components/salary/SalaryRecord'
import SalaryRecordDetailPage from '../../../components/salary/SalaryRecordDetailPage'
import SalarySettings from '../../../components/salary/SalarySettings'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'

const sections = [
  {
    key: 'records',
    title: 'Salary',
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
    title: 'Other Claims',
    component: OtherClaimRecords,
  },
]

const sectionPath = (key) => {
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
  const [isMobileViewport, setIsMobileViewport] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 767.98px)').matches,
  )
  const [pageNavigationTarget, setPageNavigationTarget] = useState(null)

  const activeSection =
    routeSection && validSectionKeys.has(routeSection) ? routeSection : 'records'
  const activeConfig = useMemo(
    () => sections.find((section) => section.key === activeSection) || sections[0],
    [activeSection],
  )
  const ActiveComponent = activeConfig.component
  const isRecordList = ['records', 'other-claim-records'].includes(activeSection)
  const recordScopeLabel = formatStatsScopeLabel(
    activeSection === 'records'
      ? salaryRecordsScopeLabel
      : activeSection === 'other-claim-records'
        ? otherClaimRecordsScopeLabel
        : '',
  )
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(max-width: 767.98px)')
    const updatePageNavigationTarget = () => {
      setIsMobileViewport(mediaQuery.matches)
      setPageNavigationTarget(
        mediaQuery.matches ? document.getElementById('app-page-navigation-slot') : null,
      )
    }

    updatePageNavigationTarget()
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePageNavigationTarget)
      return () => mediaQuery.removeEventListener('change', updatePageNavigationTarget)
    }

    mediaQuery.addListener(updatePageNavigationTarget)
    return () => mediaQuery.removeListener(updatePageNavigationTarget)
  }, [])

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

  const workspaceNavigation = (
    <ModuleNavStrip
      tabs={salarySelfModuleTabs}
      activeTab={activeSection}
      ariaLabel="Salary workspace"
      asNavigation
      flat={isMobileViewport}
      className="salary-workspace-nav"
      rightControls={
        <CTooltip content="Salary settings">
          <CButton
            type="button"
            color="light"
            variant="ghost"
            size="sm"
            className={`border-0 ${activeSection === 'settings' ? 'text-primary' : 'text-muted'}`}
            aria-label="Salary settings"
            aria-current={activeSection === 'settings' ? 'page' : undefined}
            onClick={() => navigate('/my/salary/settings')}
          >
            <CIcon icon={cilSettings} />
          </CButton>
        </CTooltip>
      }
    />
  )

  const renderedWorkspaceNavigation = pageNavigationTarget
    ? createPortal(workspaceNavigation, pageNavigationTarget)
    : workspaceNavigation
  const applyAction = (
    <CButton
      color="primary"
      variant="outline"
      size="sm"
      className="salary-workspace-apply-button rounded-pill"
      aria-label={activeSection === 'records' ? 'Apply Salary' : 'Apply Other Claim'}
      onClick={() =>
        navigate(activeSection === 'records' ? '/my/salary/apply' : '/my/salary/other-claims/apply')
      }
    >
      <span className="d-sm-none">Apply</span>
      <span className="d-none d-sm-inline">
        {activeSection === 'records' ? 'Apply Salary' : 'New Claim'}
      </span>
    </CButton>
  )
  const tableDisplayAction = (
    <DataTableStatsToggle
      visible={statsVisible}
      onToggle={toggleStatsVisible}
      controlsVisible={controlsVisible}
      onControlsToggle={toggleControlsVisible}
    />
  )
  const recordActions = (
    <div className="salary-workspace-action-cluster">
      {isMobileViewport ? applyAction : tableDisplayAction}
      {isMobileViewport ? tableDisplayAction : applyAction}
    </div>
  )

  return (
    <>
      {renderedWorkspaceNavigation}
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
        <CCard
          className={`mb-4 records-page-card salary-workspace-card salary-workspace-card--${activeSection}`}
        >
          {isRecordList && !isMobileViewport && (
            <DataTableCardHeader
              title={activeConfig.title}
              scopeLabel={recordScopeLabel}
              className="salary-workspace-header"
            >
              {recordActions}
            </DataTableCardHeader>
          )}
          <CCardBody className="records-page-card-body">
            <main className="salary-workspace">
              {isRecordList && isMobileViewport && (
                <header className="salary-workspace-header">{recordActions}</header>
              )}
              {activeSection === 'apply' || activeSection === 'other-claim-apply' ? (
                <ActiveComponent
                  onViewRecords={() =>
                    navigate(
                      sectionPath(activeSection === 'apply' ? 'records' : 'other-claim-records'),
                    )
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
                    activeSection === 'other-claim-apply'
                      ? location.state?.resumeClaimType
                      : undefined
                  }
                  resumeNotice={
                    activeSection === 'other-claim-apply' ? location.state?.resumeNotice : undefined
                  }
                  resumeClaimMonth={
                    activeSection === 'other-claim-apply'
                      ? location.state?.resumeClaimMonth
                      : undefined
                  }
                  onConfigureMedicalEntitlement={
                    activeSection === 'other-claim-apply'
                      ? handleConfigureMedicalEntitlement
                      : undefined
                  }
                  statsVisible
                />
              ) : (
                <div className="salary-workspace-panel" role="tabpanel">
                  <ActiveComponent
                    editRecord={null}
                    onScopeLabelChange={
                      activeSection === 'records'
                        ? setSalaryRecordsScopeLabel
                        : activeSection === 'other-claim-records'
                          ? setOtherClaimRecordsScopeLabel
                          : undefined
                    }
                    statsVisible={
                      ['records', 'other-claim-records'].includes(activeSection)
                        ? statsVisible
                        : true
                    }
                    controlsVisible={
                      ['records', 'other-claim-records'].includes(activeSection)
                        ? controlsVisible
                        : true
                    }
                  />
                </div>
              )}
            </main>
          </CCardBody>
        </CCard>
      )}
    </>
  )
}

export default SalaryWorkspace
