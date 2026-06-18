import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CContainer,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import ModuleNavStrip from '../../components/navigation/ModuleNavStrip'
import { dashboardModuleTabs } from '../../components/navigation/moduleNavConfigs'
import PeriodSelector from './shared/PeriodSelector'
import { buildQueryUrl, fetchJsonGet, isAbortError } from './shared/fetchUtils'
import { formatLocalISODate } from '../marketing/pipeline/pipelineEntryUtils'
import { useAuth } from '../../auth/AuthProvider'
import { extractRolesFromSession } from '../../utils/roles'
import SalesDashboard from './sales/SalesDashboard'
import CrmDashboard from './crm/CrmDashboard'
import FinancialDashboard from './financial/FinancialDashboard'
import MonitoringDashboard from './monitoring/MonitoringDashboard'
import WorkloadDashboard from './workload/WorkloadDashboard'

const formatISO = formatLocalISODate

const getPeriodRange = (period) => {
  const now = new Date()

  switch (period) {
    case 'previousMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { startDate: formatISO(start), endDate: formatISO(end) }
    }
    case 'currentMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: formatISO(start), endDate: formatISO(now) }
    }
    case 'currentYear':
      return { startDate: `${now.getFullYear()}-01-01`, endDate: formatISO(now) }
    case '3months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { startDate: formatISO(start), endDate: formatISO(now) }
    }
    case '6months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      return { startDate: formatISO(start), endDate: formatISO(now) }
    }
    case 'allTime':
      return { startDate: '', endDate: '' }
    default:
      return null
  }
}

const normalizeMonitoringStaffCode = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()

const canViewOtherMonitoringStaff = (roles) =>
  (Array.isArray(roles) ? roles : []).some((role) => {
    const roleText = String(role || '').toLowerCase()
    return (
      roleText.includes('manager') ||
      roleText.includes('hr') ||
      roleText.includes('admin') ||
      roleText.includes('super')
    )
  })

const canViewMonthlyDashboardReport = (roles) =>
  (Array.isArray(roles) ? roles : []).some((role) => {
    const roleText = String(role || '').toLowerCase()
    return roleText === 'manager' || roleText === 'system admin'
  })

const getPreviousReportMonth = () => {
  const now = new Date()
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`
}

const getCurrentMonitoringStaffOption = (user) => {
  const value = normalizeMonitoringStaffCode(user?.name_code)
  if (!value) return null

  const labelName = String(user?.full_name || '').trim()
  return {
    value,
    label: labelName ? `${value} - ${labelName}` : value,
  }
}

const getAllowedMonitoringStaffOptions = (staffOptions, user, canViewOthers) => {
  if (canViewOthers) return staffOptions

  const currentOption = getCurrentMonitoringStaffOption(user)
  if (!currentOption) return []

  const ownOptions = staffOptions.filter(
    (option) => normalizeMonitoringStaffCode(option.value) === currentOption.value,
  )

  return ownOptions.length > 0 ? ownOptions : [currentOption]
}

const getSelectedMonitoringStaffLabel = (staffOptions, selectedStaffCode, user) => {
  if (!selectedStaffCode) return 'All staff'
  const normalizedCode = normalizeMonitoringStaffCode(selectedStaffCode)
  const currentOption = getCurrentMonitoringStaffOption(user)

  return (
    staffOptions.find((option) => normalizeMonitoringStaffCode(option.value) === normalizedCode)
      ?.label ||
    (currentOption?.value === normalizedCode ? currentOption.label : null) ||
    'All staff'
  )
}

const dashboardTabs = dashboardModuleTabs

const getTabFromPath = (dashboardTab) => {
  if (!dashboardTab) return 'sales'
  return dashboardTabs.some((tab) => tab.key === dashboardTab) ? dashboardTab : 'sales'
}

const DashboardContentLoader = () => (
  <div
    className="position-absolute top-0 start-0 end-0 bottom-0 bg-body d-flex flex-column"
    style={{ zIndex: 4 }}
    aria-live="polite"
    aria-busy="true"
  >
    <div className="progress rounded-0" style={{ height: '3px' }}>
      <div
        className="progress-bar progress-bar-striped progress-bar-animated"
        style={{ width: '100%' }}
      />
    </div>
    <div className="flex-grow-1 d-flex align-items-start justify-content-center pt-5">
      <div className="text-muted">Loading dashboard...</div>
    </div>
  </div>
)

const Dashboard = () => {
  const navigate = useNavigate()
  const { dashboardTab } = useParams()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('sales')
  const [period, setPeriod] = useState('currentYear')
  const [startDate, setStartDate] = useState(() => getPeriodRange('currentYear').startDate)
  const [endDate, setEndDate] = useState(() => getPeriodRange('currentYear').endDate)
  const [monitoringStaffOptions, setMonitoringStaffOptions] = useState([])
  const [selectedMonitoringStaffCode, setSelectedMonitoringStaffCode] = useState(() => {
    const initialRoles = extractRolesFromSession({ user })
    if (canViewOtherMonitoringStaff(initialRoles)) return ''
    return getCurrentMonitoringStaffOption(user)?.value || ''
  })
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [monitoringStatusData, setMonitoringStatusData] = useState(null)
  const [monitoringStatusLoading, setMonitoringStatusLoading] = useState(false)
  const [monitoringStatusError, setMonitoringStatusError] = useState('')
  const [monitoringStatusReloadKey, setMonitoringStatusReloadKey] = useState(0)
  const pendingDashboardRequestsRef = useRef(new Set())
  const dashboardLoadTimerRef = useRef(null)
  const dashboardLoadStartedAtRef = useRef(Date.now())

  const dashboardLoadKey = useMemo(
    () => [activeTab, period, startDate, endDate, selectedMonitoringStaffCode].join('|'),
    [activeTab, period, startDate, endDate, selectedMonitoringStaffCode],
  )
  const monitoringUserRoles = useMemo(() => extractRolesFromSession({ user }), [user])
  const canViewOtherMonitoringStaffData = useMemo(
    () => canViewOtherMonitoringStaff(monitoringUserRoles),
    [monitoringUserRoles],
  )
  const canViewMonthlyReport = useMemo(
    () => canViewMonthlyDashboardReport(monitoringUserRoles),
    [monitoringUserRoles],
  )
  const allowedMonitoringStaffOptions = useMemo(
    () =>
      getAllowedMonitoringStaffOptions(
        monitoringStaffOptions,
        user,
        canViewOtherMonitoringStaffData,
      ),
    [canViewOtherMonitoringStaffData, monitoringStaffOptions, user],
  )
  const showAllMonitoringStaffOption = canViewOtherMonitoringStaffData

  useEffect(() => {
    const nextTab = getTabFromPath(dashboardTab)
    setActiveTab(nextTab)

    if (!dashboardTab || (dashboardTab && nextTab === 'sales' && dashboardTab !== 'sales')) {
      navigate('/dashboard/sales', { replace: true })
    }
  }, [dashboardTab, navigate])

  const handleDashboardTabChange = (tabKey) => {
    const tab = dashboardTabs.find((item) => item.key === tabKey)
    if (!tab) return
    if (tab.key === activeTab) return

    pendingDashboardRequestsRef.current.clear()
    dashboardLoadStartedAtRef.current = Date.now()

    if (dashboardLoadTimerRef.current) {
      window.clearTimeout(dashboardLoadTimerRef.current)
    }

    setDashboardLoading(true)
    setActiveTab(tab.key)
    navigate(tab.to)
  }

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)
    const range = getPeriodRange(nextPeriod)
    if (range) {
      setStartDate(range.startDate)
      setEndDate(range.endDate)
    }
  }

  const handleStartDateChange = (nextStartDate) => {
    setStartDate(nextStartDate)
    if (nextStartDate && endDate && nextStartDate > endDate) {
      setEndDate(nextStartDate)
    }
  }

  const handleEndDateChange = (nextEndDate) => {
    setEndDate(nextEndDate)
    if (startDate && nextEndDate && nextEndDate < startDate) {
      setStartDate(nextEndDate)
    }
  }

  useEffect(() => {
    pendingDashboardRequestsRef.current.clear()
    dashboardLoadStartedAtRef.current = Date.now()
    setDashboardLoading(true)

    if (dashboardLoadTimerRef.current) {
      window.clearTimeout(dashboardLoadTimerRef.current)
    }

    dashboardLoadTimerRef.current = window.setTimeout(() => {
      if (pendingDashboardRequestsRef.current.size === 0) {
        setDashboardLoading(false)
      }
    }, 700)

    return () => {
      if (dashboardLoadTimerRef.current) {
        window.clearTimeout(dashboardLoadTimerRef.current)
      }
    }
  }, [dashboardLoadKey])

  useEffect(() => {
    const scheduleSettledState = () => {
      if (dashboardLoadTimerRef.current) {
        window.clearTimeout(dashboardLoadTimerRef.current)
      }

      const elapsedMs = Date.now() - dashboardLoadStartedAtRef.current
      const delayMs = Math.max(180, 650 - elapsedMs)

      dashboardLoadTimerRef.current = window.setTimeout(() => {
        if (pendingDashboardRequestsRef.current.size === 0) {
          setDashboardLoading(false)
        }
      }, delayMs)
    }

    const handleDashboardFetch = (event) => {
      const { phase, requestId } = event.detail || {}
      if (!requestId) return

      if (phase === 'start') {
        pendingDashboardRequestsRef.current.add(requestId)
        if (dashboardLoadTimerRef.current) {
          window.clearTimeout(dashboardLoadTimerRef.current)
        }
        setDashboardLoading(true)
        return
      }

      if (phase === 'end') {
        if (!pendingDashboardRequestsRef.current.has(requestId)) {
          return
        }

        pendingDashboardRequestsRef.current.delete(requestId)
        if (pendingDashboardRequestsRef.current.size === 0) {
          scheduleSettledState()
        }
      }
    }

    window.addEventListener('kijo:dashboard-fetch', handleDashboardFetch)

    return () => {
      window.removeEventListener('kijo:dashboard-fetch', handleDashboardFetch)
      if (dashboardLoadTimerRef.current) {
        window.clearTimeout(dashboardLoadTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'monitoring') {
      setMonitoringStatusLoading(false)
      return undefined
    }

    const controller = new AbortController()

    const loadMonitoringStatus = async () => {
      setMonitoringStatusLoading(true)
      setMonitoringStatusError('')

      try {
        const response = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monitoring-pipeline-status`,
          {
            start_date: startDate,
            end_date: endDate,
            period,
            staff_code: selectedMonitoringStaffCode,
          },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setMonitoringStatusData(response)
        } else {
          setMonitoringStatusData(null)
          setMonitoringStatusError('Unable to load monitoring status data.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setMonitoringStatusData(null)
        setMonitoringStatusError('Unable to load monitoring status data.')
      } finally {
        if (!controller.signal.aborted) {
          setMonitoringStatusLoading(false)
        }
      }
    }

    loadMonitoringStatus()

    return () => controller.abort()
  }, [
    activeTab,
    monitoringStatusReloadKey,
    endDate,
    period,
    selectedMonitoringStaffCode,
    startDate,
  ])

  useEffect(() => {
    if (activeTab !== 'monitoring') return

    const controller = new AbortController()

    const loadMonitoringStaffOptions = async () => {
      try {
        const response = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monitoring-staff-options`,
          {},
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success' && Array.isArray(response.staffOptions)) {
          setMonitoringStaffOptions(response.staffOptions)
        } else {
          setMonitoringStaffOptions([])
        }
      } catch (err) {
        if (isAbortError(err)) return
        setMonitoringStaffOptions([])
      }
    }

    loadMonitoringStaffOptions()

    return () => controller.abort()
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== 'monitoring' || !selectedMonitoringStaffCode) return

    const normalizedSelectedCode = normalizeMonitoringStaffCode(selectedMonitoringStaffCode)
    const selectedCodeAllowed = allowedMonitoringStaffOptions.some(
      (option) => normalizeMonitoringStaffCode(option.value) === normalizedSelectedCode,
    )

    if (!selectedCodeAllowed) {
      setSelectedMonitoringStaffCode('')
    }
  }, [activeTab, allowedMonitoringStaffOptions, selectedMonitoringStaffCode])

  useEffect(() => {
    if (activeTab !== 'monitoring' || canViewOtherMonitoringStaffData) return

    const currentOption = getCurrentMonitoringStaffOption(user)
    if (currentOption?.value && selectedMonitoringStaffCode !== currentOption.value) {
      setSelectedMonitoringStaffCode(currentOption.value)
    }
  }, [activeTab, canViewOtherMonitoringStaffData, selectedMonitoringStaffCode, user])

  const selectedMonitoringStaffLabel = getSelectedMonitoringStaffLabel(
    allowedMonitoringStaffOptions,
    selectedMonitoringStaffCode,
    user,
  )

  const monitoringStaffSelector = (
    <CDropdown alignment="start">
      <CDropdownToggle
        size="sm"
        color="primary"
        variant="outline"
        data-api-busy-allow="true"
        className="px-3 d-inline-flex align-items-center justify-content-between"
        style={{ width: '148px' }}
        aria-label="Monitoring staff"
      >
        <span className="text-truncate d-inline-block" style={{ maxWidth: '100px' }}>
          {selectedMonitoringStaffLabel}
        </span>
      </CDropdownToggle>
      <CDropdownMenu>
        {showAllMonitoringStaffOption && (
          <CDropdownItem
            active={!selectedMonitoringStaffCode}
            onClick={() => setSelectedMonitoringStaffCode('')}
          >
            All staff
          </CDropdownItem>
        )}
        {allowedMonitoringStaffOptions.map((option) => (
          <CDropdownItem
            key={option.value}
            active={
              normalizeMonitoringStaffCode(selectedMonitoringStaffCode) ===
              normalizeMonitoringStaffCode(option.value)
            }
            onClick={() => setSelectedMonitoringStaffCode(option.value)}
          >
            {option.label}
          </CDropdownItem>
        ))}
      </CDropdownMenu>
    </CDropdown>
  )

  const dashboardStripControls = (
    <div className="d-flex flex-wrap align-items-center justify-content-end gap-2">
      <PeriodSelector
        period={period}
        startDate={startDate}
        endDate={endDate}
        onPeriodChange={handlePeriodChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        compact
        buttonColor="primary"
        buttonVariant="outline"
        buttonClassName="px-3"
        ariaLabel={activeTab === 'monitoring' ? 'Monitoring reporting period' : 'Reporting period'}
      />
      {canViewMonthlyReport && (
        <CButton
          type="button"
          size="sm"
          color="primary"
          variant="outline"
          className="px-3"
          data-api-busy-allow="true"
          onClick={() => {
            window.open(
              buildQueryUrl(`${import.meta.env.VITE_API_BASE}stats/monthly-dashboard-report/pdf`, {
                month: getPreviousReportMonth(),
              }),
              '_blank',
            )
          }}
        >
          Monthly Report
        </CButton>
      )}
    </div>
  )

  return (
    <CContainer fluid className="px-0">
      <ModuleNavStrip
        tabs={dashboardTabs}
        activeTab={activeTab}
        onTabChange={handleDashboardTabChange}
        ariaLabel="Dashboard sections"
        rightControls={dashboardStripControls}
      />

      <div className="position-relative" style={{ minHeight: '360px' }}>
        {dashboardLoading && <DashboardContentLoader />}
        <div
          style={{
            opacity: dashboardLoading ? 0 : 1,
            pointerEvents: dashboardLoading ? 'none' : 'auto',
            transition: 'opacity 160ms ease',
          }}
        >
          {activeTab === 'sales' && (
            <SalesDashboard period={period} startDate={startDate} endDate={endDate} />
          )}

          {activeTab === 'crm' && (
            <CrmDashboard period={period} startDate={startDate} endDate={endDate} />
          )}

          {activeTab === 'financial' && (
            <FinancialDashboard startDate={startDate} endDate={endDate} />
          )}

          {activeTab === 'monitoring' && (
            <MonitoringDashboard
              period={period}
              startDate={startDate}
              endDate={endDate}
              selectedStaffCode={selectedMonitoringStaffCode}
              selectedStaffLabel={selectedMonitoringStaffLabel}
              staffSelector={monitoringStaffSelector}
              statusData={monitoringStatusData}
              statusLoading={monitoringStatusLoading}
              statusError={monitoringStatusError}
              onManualEntrySaved={() => setMonitoringStatusReloadKey((key) => key + 1)}
            />
          )}

          {activeTab === 'workload' && (
            <WorkloadDashboard startDate={startDate} endDate={endDate} />
          )}
        </div>
      </div>
    </CContainer>
  )
}

export default Dashboard
