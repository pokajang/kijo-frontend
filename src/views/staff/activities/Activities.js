import React, { useEffect, useState, useMemo, useCallback } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CButton,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import { DataTableRecordControls, getAdvancedFilterCount } from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'
import ActivityTable from './ActivityTable'
import ExportReportModal from './ExportReportModal'
import { filterActivities } from './utils'

const getActivityVerb = (activity) => {
  const details = String(activity?.details || '').trim()
  if (!details || details === '-') return ''

  const normalized = details
    .replace(/^soft deleted/i, 'Deleted')
    .replace(/^permanently deleted/i, 'Deleted')
  const verb = normalized.match(/^[A-Za-z-]+/)?.[0] || ''

  return verb ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : ''
}

const Activities = () => {
  const desktopToolsId = 'activity-log-table-tools'
  const mobileToolsId = 'activity-log-mobile-table-tools'

  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)

  const [q, setQ] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [exportModalVisible, setExportModalVisible] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${import.meta.env.VITE_API_BASE}staff/activities?per_page=500`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) =>
        setActivities(
          Array.isArray(data)
            ? data
            : Array.isArray(data?.activities)
              ? data.activities
              : Array.isArray(data?.items)
                ? data.items
                : [],
        ),
      )
      .catch((err) => console.error('Failed to load activities:', err))
      .finally(() => setLoading(false))
  }, [])

  const userOptions = useMemo(() => {
    const userCodes = [...new Set(activities.map((a) => a.user_code))].filter(Boolean)
    return [
      { label: 'All Users', value: 'all' },
      ...userCodes.map((code) => ({ label: code, value: code.toLowerCase() })),
    ]
  }, [activities])

  const activeChips = useMemo(
    () =>
      [
        q.trim() ? { key: 'search', label: `Search: ${q.trim()}` } : null,
        userFilter !== 'all' ? { key: 'user', label: `User: ${userFilter}` } : null,
        periodRange && !isDefaultPeriodRange(periodRange)
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
      ].filter(Boolean),
    [q, userFilter, periodRange],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const clearChip = useCallback((key) => {
    if (key === 'search') setQ('')
    if (key === 'user') setUserFilter('all')
    if (key === 'period') {
      setPeriodRange(getPeriodRangePreset('ytd'))
    }
  }, [])

  const resetFilters = useCallback(() => {
    setQ('')
    setUserFilter('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }, [])

  const filteredActivities = useMemo(
    () =>
      filterActivities(
        activities,
        q,
        userFilter,
        'custom',
        periodRange?.startDate || '',
        periodRange?.endDate || '',
        '',
      ),
    [activities, q, userFilter, periodRange],
  )

  const statsItems = useMemo(() => {
    const activeUsers = new Set(
      filteredActivities
        .map((activity) => String(activity?.user_code || '').trim())
        .filter(Boolean),
    )
    const topUser = getTopGroupByCount(filteredActivities, (activity) => activity.user_code)
    const topAction = getTopGroupByCount(filteredActivities, getActivityVerb)

    return [
      {
        key: 'activities',
        label: 'Activities',
        value: formatCount(filteredActivities.length),
        tone: 'primary',
      },
      {
        key: 'active-users',
        label: 'Active Users',
        value: formatCount(activeUsers.size),
        tone: 'info',
      },
      {
        key: 'top-user',
        label: 'Top User',
        value: topUser.value,
        sublabel: `${formatCount(topUser.count)} logs`,
        tone: 'success',
      },
      {
        key: 'top-action',
        label: 'Top Action',
        value: topAction.value,
        sublabel: `${formatCount(topAction.count)} logs`,
        tone: 'warning',
      },
    ]
  }, [filteredActivities])

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
          <CCard className="mb-4">
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <strong>User Activity Log</strong>
              <CButton
                size="sm"
                color="primary"
                variant="outline"
                onClick={() => setExportModalVisible(true)}
              >
                Export Report
              </CButton>
            </CCardHeader>

            <CCardBody>
              <StatsStrip
                items={statsItems}
                loading={loading}
                scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
              />

              <DataTableRecordControls
                searchValue={q}
                onSearchChange={setQ}
                searchPlaceholder="Search by user code or activity details..."
                searchAriaLabel="Search activity log"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId={desktopToolsId}
                mobileToolsId={mobileToolsId}
              >
                <CCol xs={6} md={3} lg={2}>
                  <CFormLabel htmlFor="activity-filter-user">User Code</CFormLabel>
                  <CFormSelect
                    id="activity-filter-user"
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                  >
                    {userOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>

              <ActivityTable
                data={filteredActivities}
                loading={loading}
                renderQuickFilters={() => (
                  <PeriodRangeSelector
                    value={periodRange}
                    onChange={setPeriodRange}
                    className="d-none d-lg-block"
                  />
                )}
                desktopUtilityPortalId={desktopToolsId}
                mobileUtilityPortalId={mobileToolsId}
              />

              <ExportReportModal
                visible={exportModalVisible}
                onClose={() => setExportModalVisible(false)}
                activityList={activities}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Activities
