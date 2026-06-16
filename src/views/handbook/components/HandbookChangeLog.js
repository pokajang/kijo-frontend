import React, { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CCol, CFormLabel, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'
import { useNavigate } from 'react-router-dom'
import {
  DataTableFilterPanel,
  DataTableRecordList,
  DataTableToolbar,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { useDebouncedSearch } from '../../../hooks/datatable'
import { recordsTruncateStyle } from '../../../utils/datatable/tableFormatters'
import { getHandbookChangeLogs } from '../api/handbookApi'

const emptyValue = 'N/A'
const desktopUtilityPortalId = 'handbook-change-log-utilities'
const mobileUtilityPortalId = 'handbook-change-log-mobile-utilities'
const changeLogColumnStorageKey = 'handbook-change-log-visible-columns'
const changeLogColumnPreferenceApiKey = 'handbook-change-log-visible-columns'

const changeLogDataColumns = [
  { key: 'version', label: 'Version', sortable: true, width: '9rem', shrinkToFit: true },
  { key: 'action', label: 'Action', sortable: true, width: '8rem', shrinkToFit: true },
  { key: 'section', label: 'Section', sortable: true, width: '13rem' },
  {
    key: 'summary',
    label: 'Summary',
    sortable: true,
    width: '18rem',
    previewCharThreshold: 80,
    truncateCharThreshold: 120,
  },
  { key: 'changedBy', label: 'Changed By', sortable: true, width: '12rem' },
  { key: 'changedAt', label: 'Changed At', sortable: true, width: '12rem', sortType: 'date' },
]

const defaultChangeLogVisibleColumns = {
  version: true,
  action: true,
  section: true,
  summary: true,
  changedBy: true,
  changedAt: true,
}

const requiredChangeLogColumns = new Set(['version', 'summary', 'changedAt'])

const formatDateTime = (value) => {
  if (!value) {
    return emptyValue
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? emptyValue : date.toLocaleString()
}

const HandbookChangeLog = ({ refreshKey = 0 }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const { searchInput, setSearchInput, searchTerm, setSearchTerm } = useDebouncedSearch()

  useEffect(() => {
    const controller = new AbortController()

    const loadLogs = async () => {
      setLoading(true)
      setError(null)

      try {
        const json = await getHandbookChangeLogs({ signal: controller.signal })

        if (json.success) {
          setLogs(Array.isArray(json.data) ? json.data : [])
        } else {
          setLogs([])
          setError(json.message)
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }

        setLogs([])
        setError('Network error')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadLogs()

    return () => controller.abort()
  }, [refreshKey])

  const normalizedLogs = useMemo(
    () =>
      logs.map((log) => ({
        ...log,
        version: log.version_label || emptyValue,
        action: log.action || emptyValue,
        section: log.section_title || emptyValue,
        summary: log.summary || emptyValue,
        changedBy: log.changed_by_name_code || emptyValue,
        changedAt: log.changed_at || '',
        changedAtDisplay: formatDateTime(log.changed_at),
      })),
    [logs],
  )

  const filteredLogs = useMemo(() => {
    const needle = searchTerm.toLowerCase()
    const periodRows = normalizedLogs.filter((log) =>
      isDateInPeriodRange(log.changedAt, periodRange),
    )
    if (!needle) return periodRows

    return periodRows.filter((log) =>
      [log.version, log.action, log.section, log.summary, log.changedBy, log.changedAtDisplay]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [normalizedLogs, periodRange, searchTerm])

  const activeChips = [
    searchTerm ? { key: 'search', label: `Search: ${searchTerm}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      setSearchTerm('')
    }
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const renderCell = (log, column) => {
    if (column.key === 'changedAt') return log.changedAtDisplay

    return (
      <span title={log[column.key]} style={recordsTruncateStyle}>
        {log[column.key]}
      </span>
    )
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <strong>Handbook Change Log</strong>
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => navigate('/handbook')}
        >
          Back to Handbook
        </CButton>
      </div>

      {error && <p className="text-danger">{error}</p>}
      {!error && (
        <>
          <DataTableToolbar
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            activeFilterCount={getAdvancedFilterCount(activeChips)}
            onResetFilters={resetFilters}
            renderQuickFilters={() => (
              <>
                <PeriodRangeSelector
                  value={periodRange}
                  onChange={setPeriodRange}
                  className="d-none d-lg-block"
                />
                <div
                  id={desktopUtilityPortalId}
                  className="handbook-change-log-utilities d-none d-lg-flex gap-2"
                />
              </>
            )}
          />

          <DataTableFilterPanel
            visible={showAdvancedFilters}
            activeChips={activeChips}
            clearChip={clearChip}
            resetFilters={resetFilters}
            renderMobileActions={() => (
              <CCol xs={12} className="d-flex d-lg-none justify-content-end gap-2">
                <CTooltip content="Reset filters" placement="top">
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    aria-label="Reset filters"
                    onClick={resetFilters}
                    className="records-filter-icon-btn"
                  >
                    <CIcon icon={cilReload} />
                  </CButton>
                </CTooltip>
                <div id={mobileUtilityPortalId} className="d-flex gap-2" />
              </CCol>
            )}
          >
            <CCol xs={12} md={4} lg={3} className="d-lg-none">
              <CFormLabel>Period</CFormLabel>
              <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
            </CCol>
          </DataTableFilterPanel>

          <DataTableRecordList
            rows={filteredLogs}
            loading={loading}
            loadingMessage="Loading handbook change log..."
            dataColumns={changeLogDataColumns}
            defaultVisibleColumns={defaultChangeLogVisibleColumns}
            requiredColumns={requiredChangeLogColumns}
            storageKey={changeLogColumnStorageKey}
            apiKey={changeLogColumnPreferenceApiKey}
            scrollStorageKey="handbook.change-log.scroll"
            idPrefix="handbook-change-log"
            exportFilename={`handbook-change-log-${new Date().toISOString().slice(0, 10)}.csv`}
            getRowKey={(log, index) => log.id || `${log.version}-${log.changedAt}-${index}`}
            renderCell={renderCell}
            emptyMessage={logs.length === 0 ? 'No changes found.' : 'No matching changes.'}
            initialSortField="changedAt"
            initialSortDir="desc"
            initialSortDirByField={{ changedAt: 'desc' }}
            getSortValue={(log, field) => (field === 'changedAt' ? log.changedAt : log[field])}
            className="handbook-change-log-table"
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId={desktopUtilityPortalId}
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId={mobileUtilityPortalId}
            showMobileUtilityRow={false}
            showDesktopSummary={false}
            resetDeps={[searchTerm, periodRange, logs.length]}
            getMobileTitle={(log) => log.summary}
            getMobileSubtitle={(log) => log.version}
            mobileRecord={{
              title: (log) => log.summary,
              subtitle: (log) => `${log.version} - ${log.action}`,
              meta: (log) => log.changedAtDisplay,
              kv: (log) => [
                { key: 'section', label: 'Section', value: log.section },
                { key: 'changedBy', label: 'Changed By', value: log.changedBy },
              ],
            }}
          />
        </>
      )}
    </>
  )
}

HandbookChangeLog.propTypes = {
  refreshKey: PropTypes.number,
}

export default HandbookChangeLog
