import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CContainer, CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import ModuleNavStrip from '../../components/navigation/ModuleNavStrip'
import PeriodSelector from './shared/PeriodSelector'
import { fetchJsonGet, isAbortError } from './shared/fetchUtils'
import { formatLocalISODate } from '../marketing/pipeline/pipelineEntryUtils'
import { useAuth } from '../../auth/AuthProvider'
import { extractRolesFromSession } from '../../utils/roles'
import SalesDashboard from './sales/SalesDashboard'
import CrmDashboard from './crm/CrmDashboard'
import FinancialDashboard from './financial/FinancialDashboard'
import MonitoringDashboard from './monitoring/MonitoringDashboard'

const formatISO = formatLocalISODate
const formatMonthValue = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthLabelFormatter = new Intl.DateTimeFormat('en-MY', {
  month: 'short',
  year: 'numeric',
})

const formatMonthLabel = (monthValue) => {
  const [yearValue, monthNumberValue] = String(monthValue || '').split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthNumberValue) - 1

  if (!year || monthIndex < 0 || monthIndex > 11) {
    return monthLabelFormatter.format(new Date())
  }

  return monthLabelFormatter.format(new Date(year, monthIndex, 1))
}

const getMonitoringMonthOptions = () => {
  const now = new Date()
  const options = []

  for (let offset = 0; offset < 18; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const value = formatMonthValue(date)
    options.push({
      value,
      label: formatMonthLabel(value),
    })
  }

  return options
}

const getMonthRange = (monthValue) => {
  const [yearValue, monthNumberValue] = String(monthValue || '').split('-')
  const year = Number(yearValue)
  const monthIndex = Number(monthNumberValue) - 1

  if (!year || monthIndex < 0 || monthIndex > 11) {
    return getMonthRange(formatMonthValue(new Date()))
  }

  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 0)
  return { startDate: formatISO(start), endDate: formatISO(end) }
}

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

const MonitoringMonthSelector = ({
  month,
  onMonthChange,
  compact = false,
  dropdownClassName = '',
  toggleClassName = '',
  toggleStyle,
}) => {
  const monthOptions = getMonitoringMonthOptions()
  const widthStyle = toggleStyle || { width: compact ? '138px' : '154px' }

  return (
    <CDropdown alignment="end" className={dropdownClassName}>
      <CDropdownToggle
        size="sm"
        color="primary"
        variant="outline"
        data-api-busy-allow="true"
        className={`d-inline-flex align-items-center justify-content-between ${compact ? 'px-2' : 'px-3'} ${toggleClassName}`}
        style={widthStyle}
        aria-label="Monitoring month"
      >
        <span className="text-truncate">{formatMonthLabel(month)}</span>
      </CDropdownToggle>
      <CDropdownMenu style={{ maxHeight: '320px', overflowY: 'auto' }}>
        {monthOptions.map((option) => (
          <CDropdownItem
            key={option.value}
            active={month === option.value}
            onClick={() => onMonthChange(option.value)}
          >
            {option.label}
          </CDropdownItem>
        ))}
      </CDropdownMenu>
    </CDropdown>
  )
}

const dashboardTabs = [
  { key: 'sales', label: 'Sales', to: '/dashboard/sales' },
  { key: 'crm', label: 'CRM', to: '/dashboard/crm' },
  { key: 'financial', label: 'Financial', to: '/dashboard/financial' },
  { key: 'monitoring', label: 'Monitoring', to: '/dashboard/monitoring' },
]

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
  const [monitoringMonth, setMonitoringMonth] = useState(() => formatMonthValue(new Date()))
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [monitoringStatusData, setMonitoringStatusData] = useState(null)
  const [monitoringStatusLoading, setMonitoringStatusLoading] = useState(false)
  const [monitoringStatusError, setMonitoringStatusError] = useState('')
  const [monitoringStatusReloadKey, setMonitoringStatusReloadKey] = useState(0)
  const pendingDashboardRequestsRef = useRef(new Set())
  const dashboardLoadTimerRef = useRef(null)
  const dashboardLoadStartedAtRef = useRef(Date.now())

  const dashboardLoadKey = useMemo(
    () =>
      [activeTab, period, startDate, endDate, monitoringMonth, selectedMonitoringStaffCode].join(
        '|',
      ),
    [activeTab, period, startDate, endDate, monitoringMonth, selectedMonitoringStaffCode],
  )
  const monitoringUserRoles = useMemo(() => extractRolesFromSession({ user }), [user])
  const canViewOtherMonitoringStaffData = useMemo(
    () => canViewOtherMonitoringStaff(monitoringUserRoles),
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

  const monitoringRange = getMonthRange(monitoringMonth)

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
            start_date: monitoringRange.startDate,
            end_date: monitoringRange.endDate,
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
    monitoringRange.startDate,
    monitoringRange.endDate,
    monitoringStatusReloadKey,
    selectedMonitoringStaffCode,
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

  const dashboardStripControls = (
    <>
      {activeTab === 'monitoring' && (
        <CDropdown alignment="end">
          <CDropdownToggle
            size="sm"
            color="primary"
            variant="outline"
            data-api-busy-allow="true"
            className="px-3 d-inline-flex align-items-center justify-content-between"
            style={{ width: '112px' }}
          >
            <span className="text-truncate d-inline-block" style={{ maxWidth: '64px' }}>
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
      )}
      {activeTab === 'monitoring' ? (
        <MonitoringMonthSelector
          month={monitoringMonth}
          onMonthChange={setMonitoringMonth}
          toggleClassName="px-3"
        />
      ) : (
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
        />
      )}
    </>
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
              startDate={monitoringRange.startDate}
              endDate={monitoringRange.endDate}
              selectedStaffCode={selectedMonitoringStaffCode}
              selectedStaffLabel={selectedMonitoringStaffLabel}
              statusData={monitoringStatusData}
              statusLoading={monitoringStatusLoading}
              statusError={monitoringStatusError}
              onManualEntrySaved={() => setMonitoringStatusReloadKey((key) => key + 1)}
            />
          )}
        </div>
      </div>
    </CContainer>
  )
}

export default Dashboard
