import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import { CAlert, CButton, CCard, CCardBody, CCol, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableStatsToggle,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../../components/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { pipelineCrmModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import {
  PeriodRangeSelector,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { fetchJson, fetchJsonGet, isAbortError } from '../../dashboard/shared/fetchUtils'
import PipelineEntryProofModal from './components/PipelineEntryProofModal'
import PipelineEntryEditModal from './PipelineEntryEditModal'
import PipelineEntriesShell from './PipelineEntriesShell'
import {
  API_BASE,
  classificationTypes,
  entrySources,
  entryTypes,
  serviceCategories,
  todayISO,
} from './pipelineEntryUtils'
import {
  buildPipelineRecordActiveChips,
  buildPipelineRecordStats,
  defaultPipelineRecordVisibleColumns,
  formatPipelineCurrency,
  getDefaultPipelineRecordFilters,
  getPipelineEntryTypeTone,
  getPipelineRecordMobileMeta,
  getPipelineRecordSortValue,
  normalizePipelineRecord,
  pipelineRecordColumns,
  requiredPipelineRecordColumns,
} from './utils/pipelineRecordsUtils'

const PipelineEntriesRecords = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const desktopToolsId = 'pipeline-entries-table-tools'
  const mobileToolsId = 'pipeline-entries-mobile-table-tools'
  const [entries, setEntries] = useState([])
  const [staffOptions, setStaffOptions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState(location.state?.pipelineMessage || '')
  const [reloadKey, setReloadKey] = useState(0)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [proofPreviewEntry, setProofPreviewEntry] = useState(null)
  const [editEntry, setEditEntry] = useState(null)
  const baselineFilters = useMemo(() => getDefaultPipelineRecordFilters(), [])
  const [filters, setFilters] = useState(() => baselineFilters)
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('marketing.pipeline-entries')

  useEffect(() => {
    if (location.state?.pipelineMessage) {
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, q: searchInput.trim() }))
    }, 250)

    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()

    const loadEntries = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await fetchJsonGet(
          `${API_BASE}stats/monitoring-manual-pipeline-entries`,
          {
            ...filters,
            start_date: periodRange?.startDate || '',
            end_date: periodRange?.endDate || '',
          },
          { silentError: true },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (response?.status === 'success') {
          setEntries(Array.isArray(response.entries) ? response.entries : [])
          setStaffOptions(Array.isArray(response.staffOptions) ? response.staffOptions : [])
        } else {
          setEntries([])
          setError(response?.message || 'Unable to load pipeline entries.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setEntries([])
        setError(err?.message || 'Unable to load pipeline entries.')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadEntries()

    return () => controller.abort()
  }, [filters, periodRange, reloadKey])

  const normalizedEntries = useMemo(() => entries.map(normalizePipelineRecord), [entries])

  const applyStatFilter = useCallback((key, value) => {
    setFilters((current) => {
      if (key === 'total-leads') return { ...current, entry_type: 'lead' }
      if (key === 'total-qualified') return { ...current, entry_type: 'qualified' }
      if (key === 'total-meetings') return { ...current, entry_type: 'meeting_pitching' }
      if (key === 'top-leads') return { ...current, entry_type: 'lead', staff_code: value }
      return current
    })
    setShowAdvancedFilters(true)
  }, [])

  const statsItems = useMemo(
    () =>
      buildPipelineRecordStats(normalizedEntries).map((item) => {
        if (['total-leads', 'total-qualified', 'total-meetings'].includes(item.key)) {
          return { ...item, onClick: () => applyStatFilter(item.key) }
        }
        if (
          item.key === 'top-leads' &&
          item.value &&
          item.value !== '-' &&
          staffOptions.some((staff) => staff.value === item.value)
        ) {
          return { ...item, onClick: () => applyStatFilter(item.key, item.value) }
        }
        return item
      }),
    [applyStatFilter, normalizedEntries, staffOptions],
  )

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const resetFilters = () => {
    setFilters(baselineFilters)
    setPeriodRange(getPeriodRangePreset('ytd'))
    setSearchInput('')
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      updateFilter('q', '')
      return
    }
    if (key === 'entry_type') updateFilter('entry_type', baselineFilters.entry_type)
    if (key === 'staff_code') updateFilter('staff_code', baselineFilters.staff_code)
    if (key === 'source') updateFilter('source', baselineFilters.source)
    if (key === 'segment_type') updateFilter('segment_type', baselineFilters.segment_type)
    if (key === 'service_category')
      updateFilter('service_category', baselineFilters.service_category)
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const deleteEntry = async (entry) => {
    if (!entry?.id) return
    if (!window.confirm(`Delete ${entry.prospectName}?`)) return

    setError('')
    setInfo('')

    try {
      const response = await fetchJson(
        `${API_BASE}stats/monitoring-manual-pipeline-entry/${entry.id}`,
        {
          method: 'DELETE',
        },
      )

      if (response?.status === 'success') {
        setInfo('Pipeline entry deleted.')
        setReloadKey((key) => key + 1)
      } else {
        setError(response?.message || 'Unable to delete pipeline entry.')
      }
    } catch (err) {
      setError(err?.message || 'Unable to delete pipeline entry.')
    }
  }

  const handleEditSaved = () => {
    setEditEntry(null)
    setInfo('Pipeline entry updated.')
    setError('')
    setReloadKey((key) => key + 1)
  }

  const getActions = (entry) =>
    entry.recordSource === 'legal_compliance'
      ? [
          {
            key: 'view-assessment',
            label: 'View Assessment',
            onClick: () =>
              navigate(
                `/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(
                  entry.legalAssessmentId,
                )}&mode=review`,
              ),
          },
        ]
      : [
          entry.canUpdate || entry.canDelete
            ? {
                key: 'edit',
                label: 'Edit',
                onClick: () => setEditEntry(entry),
              }
            : null,
          entry.photoUrl
            ? {
                key: 'screenshot',
                label: 'View Screenshot',
                onClick: () => setProofPreviewEntry(entry),
              }
            : null,
          entry.canDelete
            ? {
                key: 'delete',
                label: 'Delete',
                danger: true,
                dividerBefore: Boolean(entry.photoUrl || entry.canUpdate),
                onClick: () => deleteEntry(entry),
              }
            : null,
        ].filter(Boolean)

  const renderCell = (entry, column) => {
    if (column.key === 'entryDate') return entry.entryDateDisplay
    if (column.key === 'entryType') {
      return (
        <DataTableStatusBadge tone={getPipelineEntryTypeTone(entry.entryType)}>
          {entry.entryTypeLabel}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'prospectName') {
      return (
        <DataTableTextCell
          value={entry.prospectName}
          maxWidth="220px"
          title="Prospect"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'source') {
      return (
        <DataTableTextCell
          value={entry.source}
          maxWidth="160px"
          title="Source"
          mode="expandable"
          previewCharThreshold={30}
        />
      )
    }
    if (column.key === 'segmentType') {
      return <DataTableTextCell value={entry.segmentType} maxWidth="140px" title="Classification" />
    }
    if (column.key === 'serviceCategory') {
      return (
        <DataTableTextCell
          value={entry.serviceCategory}
          maxWidth="160px"
          title="Service"
          mode="expandable"
          previewCharThreshold={30}
        />
      )
    }
    if (column.key === 'photoUrl') {
      return entry.photoUrl ? (
        <CButton
          type="button"
          color="link"
          size="sm"
          className="p-0 align-baseline"
          data-no-row-open="true"
          onClick={(event) => {
            event.stopPropagation()
            setProofPreviewEntry(entry)
          }}
        >
          View
        </CButton>
      ) : (
        '-'
      )
    }
    if (column.key === 'estimatedRm') {
      return formatPipelineCurrency(entry.estimatedRm)
    }
    if (column.key === 'notes') {
      return (
        <DataTableTextCell
          value={entry.notes}
          maxWidth="220px"
          title="Notes"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    return entry[column.key] || '-'
  }

  const activeChips = useMemo(
    () => buildPipelineRecordActiveChips({ filters, periodRange, searchInput, staffOptions }),
    [filters, periodRange, searchInput, staffOptions],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  return (
    <PipelineEntriesShell>
      <ModuleNavStrip tabs={pipelineCrmModuleTabs} ariaLabel="Pipeline CRM sections" />
      {error && (
        <CAlert color="danger" className="mb-3">
          {error}
        </CAlert>
      )}
      {info && (
        <CAlert color="success" className="mb-3">
          {info}
        </CAlert>
      )}

      <CCard>
        <DataTableCardHeader
          title="Pipeline Records"
          scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
        >
          <DataTableStatsToggle
            visible={statsVisible}
            onToggle={toggleStatsVisible}
            controlsVisible={controlsVisible}
            onControlsToggle={toggleControlsVisible}
          />
          <CButton size="sm" color="primary" onClick={() => navigate('/pipeline/entries/bulk-add')}>
            <CIcon icon={cilPlus} className="me-1" />
            Add Entries
          </CButton>
        </DataTableCardHeader>
        <CCardBody>
          {statsVisible && <StatsStrip loading={loading} items={statsItems} />}
          <DataTableRecordControls
            visible={controlsVisible}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
            searchPlaceholder="Search prospect, notes, or owner"
            searchAriaLabel="Search pipeline entries"
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            activeFilterCount={activeFilterCount}
            activeChips={activeChips}
            clearChip={clearChip}
            resetFilters={resetFilters}
            loading={loading}
            desktopToolsId={desktopToolsId}
            mobileToolsId={mobileToolsId}
          >
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="pipeline-entry-type">Type</CFormLabel>
              <CFormSelect
                id="pipeline-entry-type"
                value={filters.entry_type}
                onChange={(event) => updateFilter('entry_type', event.target.value)}
              >
                <option value="">All types</option>
                {entryTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="pipeline-owner">Owner</CFormLabel>
              <CFormSelect
                id="pipeline-owner"
                value={filters.staff_code}
                onChange={(event) => updateFilter('staff_code', event.target.value)}
              >
                <option value="">All staff</option>
                {staffOptions.map((staff) => (
                  <option key={staff.value} value={staff.value}>
                    {staff.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={4} lg={2}>
              <CFormLabel htmlFor="pipeline-source">Source</CFormLabel>
              <CFormSelect
                id="pipeline-source"
                value={filters.source}
                onChange={(event) => updateFilter('source', event.target.value)}
              >
                <option value="">All sources</option>
                {entrySources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="pipeline-classification">Classification</CFormLabel>
              <CFormSelect
                id="pipeline-classification"
                value={filters.segment_type}
                onChange={(event) => updateFilter('segment_type', event.target.value)}
              >
                <option value="">All classifications</option>
                {classificationTypes
                  .filter((classification) => classification.value !== '')
                  .map((classification) => (
                    <option key={classification.value} value={classification.value}>
                      {classification.label}
                    </option>
                  ))}
              </CFormSelect>
            </CCol>
            <CCol xs={6} md={3} lg={2}>
              <CFormLabel htmlFor="pipeline-service">Service</CFormLabel>
              <CFormSelect
                id="pipeline-service"
                value={filters.service_category}
                onChange={(event) => updateFilter('service_category', event.target.value)}
              >
                <option value="">All services</option>
                {serviceCategories
                  .filter((service) => service.value !== '')
                  .map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
              </CFormSelect>
            </CCol>
          </DataTableRecordControls>

          <DataTableRecordList
            rows={normalizedEntries}
            dataColumns={pipelineRecordColumns}
            defaultVisibleColumns={defaultPipelineRecordVisibleColumns}
            requiredColumns={requiredPipelineRecordColumns}
            loading={loading}
            loadingMessage="Loading pipeline records..."
            storageKey="marketing.pipeline-entries.visible-columns.v3"
            apiKey="marketing-pipeline-entries-visible-columns-v3"
            idPrefix="marketing-pipeline-entry"
            emptyMessage="No pipeline entries found for this scope."
            exportFilename={`pipeline-entries-${todayISO()}.csv`}
            showDesktopSummary={false}
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId={desktopToolsId}
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId={mobileToolsId}
            showMobileUtilityRow={false}
            renderQuickFilters={() => (
              <PeriodRangeSelector
                value={periodRange}
                onChange={setPeriodRange}
                className="d-none d-lg-block"
              />
            )}
            getRowKey={(entry, index) => entry.id || index}
            renderCell={renderCell}
            getActions={getActions}
            onRowOpen={(entry) => navigate(`/pipeline/entries/${encodeURIComponent(entry.id)}`)}
            getRowOpenDisabled={(entry) => !entry?.id}
            getMobileTitle={(entry) => entry.prospectName}
            getMobileSubtitle={(entry) => entry.source}
            getMobileMeta={getPipelineRecordMobileMeta}
            getMobileStatus={(entry) => entry.entryTypeLabel}
            getMobileStatusTone={(entry) => getPipelineEntryTypeTone(entry.entryType)}
            mobileRecord={{
              title: (entry) => entry.prospectName,
              subtitle: (entry) => entry.source,
              meta: getPipelineRecordMobileMeta,
              badges: (entry) => [
                {
                  key: 'type',
                  label: entry.entryTypeLabel,
                  tone: getPipelineEntryTypeTone(entry.entryType),
                },
              ],
            }}
            mobileFieldKeys={{
              title: 'prospectName',
              subtitle: 'source',
              meta: ['entryDate', 'ownerStaffCode', 'notes'],
              status: 'entryType',
            }}
            initialSortField="entryDate"
            initialSortDir="desc"
            initialSortDirByField={{ entryDate: 'desc' }}
            getSortValue={getPipelineRecordSortValue}
            resetDeps={[entries, filters, periodRange]}
            actionColumnWidth="56px"
            className="pipeline-entries-table"
          />
        </CCardBody>
      </CCard>
      <PipelineEntryProofModal
        entry={proofPreviewEntry}
        onClose={() => setProofPreviewEntry(null)}
      />
      <PipelineEntryEditModal
        visible={Boolean(editEntry)}
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={handleEditSaved}
      />
    </PipelineEntriesShell>
  )
}

export default PipelineEntriesRecords
