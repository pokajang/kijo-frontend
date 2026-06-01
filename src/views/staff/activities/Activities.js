import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { CRow, CCol, CCard, CCardBody, CButton, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableStatsToggle,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getActivityPeriodParams,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import ActivityTable from './ActivityTable'
import ExportReportModal from './ExportReportModal'
import { filterActivities } from './utils'

export const loadActivitiesForPeriod = (apiBase, periodRange) =>
  fetchAllPagedRecords({
    url: `${apiBase}staff/activities`,
    params: getActivityPeriodParams(periodRange),
    dataKeys: ['activities', 'items', 'data.items', 'data'],
    perPage: 500,
  })

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
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('staff.activities')

  useEffect(() => {
    let active = true
    setLoading(true)
    loadActivitiesForPeriod(import.meta.env.VITE_API_BASE, periodRange)
      .then((records) => {
        if (active) setActivities(records)
      })
      .catch((err) => {
        if (active) console.error('Failed to load activities:', err)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [periodRange])

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
        onClick:
          topUser.value &&
          userOptions.some((option) => option.value === String(topUser.value).toLowerCase())
            ? () => {
                setUserFilter(String(topUser.value).toLowerCase())
                setShowAdvancedFilters(true)
              }
            : undefined,
      },
      {
        key: 'top-action',
        label: 'Top Action',
        value: topAction.value,
        sublabel: `${formatCount(topAction.count)} logs`,
        tone: 'warning',
      },
    ]
  }, [filteredActivities, userOptions])

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
          <CCard className="mb-4">
            <DataTableCardHeader
              title="User Activity Log"
              scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
            >
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => setExportModalVisible(true)}
              >
                Export Report
              </CButton>
            </DataTableCardHeader>

            <CCardBody>
              {statsVisible && <StatsStrip items={statsItems} loading={loading} />}

              <DataTableRecordControls
                visible={controlsVisible}
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
