import React, { useState, useMemo } from 'react'
import {
  CCard,
  CCardBody,
  CCol,
  CFormLabel,
  CFormSelect,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormTextarea,
} from '@coreui/react'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatsToggle,
  DataTableTextCell,
  RemarksCell,
  getAdvancedFilterCount,
} from '../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  getPeriodRangeScopeLabel,
  isDefaultPeriodRange,
} from '../../components/filters'
import { StatsStrip } from '../../components/stats'
import { useDataTableStatsVisibility } from '../../hooks/datatable'
import { formatCount } from '../../utils/stats/formatStats'

const emptyValue = '-'

const isMultiLineText = (value) => String(value || '').includes('\n')

const dataColumns = [
  {
    key: 'staff',
    label: 'Staff',
    width: '84px',
    shrinkToFit: true,
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.staff || emptyValue,
    textMode: 'plain',
    cellMaxWidth: '84px',
  },
  {
    key: 'equipment',
    label: 'Equipment Detail',
    width: '180px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.equipment || emptyValue,
    textMode: 'expandable',
    cellMaxWidth: '180px',
    previewCharThreshold: 30,
  },
  {
    key: 'startDate',
    label: 'Start Date',
    width: '104px',
    shrinkToFit: true,
    sortable: true,
    sortType: 'date',
    align: 'center',
    getExportValue: (record) => record.startDate || emptyValue,
  },
  {
    key: 'endDate',
    label: 'End Date',
    width: '104px',
    shrinkToFit: true,
    sortable: true,
    sortType: 'date',
    align: 'center',
    getExportValue: (record) => record.endDate || emptyValue,
  },
  {
    key: 'duration',
    label: 'Duration (days)',
    width: '112px',
    shrinkToFit: true,
    sortable: true,
    sortType: 'number',
    align: 'center',
    getExportValue: (record) => record.duration ?? emptyValue,
  },
  {
    key: 'purpose',
    label: 'Purpose',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.purpose || emptyValue,
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.remarks || emptyValue,
    textMode: 'plain',
    cellMaxWidth: '180px',
  },
  {
    key: 'achievement',
    label: 'Achievement',
    width: '170px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.achievement || emptyValue,
    textMode: 'expandable',
    cellMaxWidth: '170px',
    previewCharThreshold: 16,
  },
]

const defaultVisibleColumns = {
  staff: true,
  equipment: true,
  startDate: true,
  endDate: true,
  duration: true,
  purpose: false,
  remarks: false,
  achievement: true,
}

const requiredColumns = new Set(['staff', 'equipment'])

const toDateOnly = (value) => String(value || '').split(/[T ]/)[0]

const isDateSpanInPeriodRange = (startValue, endValue, periodRange) => {
  if (!periodRange || periodRange.preset === 'all') return true

  const startDate = toDateOnly(startValue)
  const endDate = toDateOnly(endValue) || startDate
  if (!startDate && !endDate) return false

  const spanStart = startDate || endDate
  const spanEnd = endDate || startDate

  if (periodRange.startDate && spanEnd < periodRange.startDate) return false
  if (periodRange.endDate && spanStart > periodRange.endDate) return false

  return true
}

/**
 * RequestTable
 *
 * Renders past tool request records in a scrollable container,
 * provides duration calculation, filtering controls, and an update modal
 * for editing achievement.
 */
export default function RequestTable({
  records,
  loading = false,
  showRequestForm,
  requestToolDisabled = false,
  onRequestToolClick,
  openModal,
  showModal,
  setShowModal,
  modalRecord,
  newAchievement,
  setNewAchievement,
  handleSaveAchievement,
  onViewRecord,
}) {
  const desktopToolsId = 'request-tool-table-tools'
  const mobileToolsId = 'request-tool-mobile-table-tools'

  // Filter state
  const [searchKeyword, setSearchKeyword] = useState('')
  const [staffFilter, setStaffFilter] = useState('All')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('support.requests')

  // Extract unique staff names for filter dropdown
  const staffOptions = useMemo(() => {
    const names = records.map((r) => r.staff_name).filter(Boolean)
    return ['All', ...Array.from(new Set(names))]
  }, [records])

  const activeChips = useMemo(
    () =>
      [
        searchKeyword.trim() ? { key: 'search', label: `Search: ${searchKeyword.trim()}` } : null,
        staffFilter !== 'All' ? { key: 'staff', label: `Staff: ${staffFilter}` } : null,
        periodRange && !isDefaultPeriodRange(periodRange)
          ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
          : null,
      ].filter(Boolean),
    [periodRange, searchKeyword, staffFilter],
  )

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const clearChip = (key) => {
    if (key === 'search') setSearchKeyword('')
    if (key === 'staff') setStaffFilter('All')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  // Filtered records based on keyword and staff
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Staff filter
      if (staffFilter !== 'All' && r.staff_name !== staffFilter) return false
      if (!isDateSpanInPeriodRange(r.use_start_date, r.use_end_date, periodRange)) return false
      // Keyword filter across specified fields
      const keyword = searchKeyword.toLowerCase()
      return (
        String(r.staff_name || '')
          .toLowerCase()
          .includes(keyword) ||
        String(r.equipment_detail || '')
          .toLowerCase()
          .includes(keyword) ||
        String(r.purpose || '')
          .toLowerCase()
          .includes(keyword) ||
        (r.remarks || '').toLowerCase().includes(keyword) ||
        (r.achievement || '').toLowerCase().includes(keyword)
      )
    })
  }, [records, searchKeyword, staffFilter, periodRange])

  const normalizedRecords = useMemo(
    () =>
      filteredRecords.map((record) => {
        const startDate = new Date(record.use_start_date)
        const endDate = new Date(record.use_end_date)
        const diffTime = endDate - startDate
        const duration = Number.isFinite(diffTime)
          ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
          : 0

        return {
          ...record,
          staff: record.staff_name || emptyValue,
          equipment: record.equipment_detail || emptyValue,
          startDate: record.use_start_date || '',
          endDate: record.use_end_date || '',
          duration,
          purpose: record.purpose || emptyValue,
          remarks: record.remarks || '',
          achievement: record.achievement || '',
        }
      }),
    [filteredRecords],
  )

  const statsItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isActiveLoan = (record) => {
      const endDate = new Date(record.endDate)
      if (Number.isNaN(endDate.getTime())) return true
      endDate.setHours(0, 0, 0, 0)
      return endDate >= today && !record.achievement
    }
    const activeRows = normalizedRecords.filter(isActiveLoan)
    const completedRows = normalizedRecords.filter((record) => Boolean(record.achievement))
    const loanDaysByStaff = normalizedRecords.reduce((totals, record) => {
      const staff = record.staff || emptyValue
      const duration = Math.max(0, Number(record.duration) || 0)
      totals.set(staff, (totals.get(staff) || 0) + duration)
      return totals
    }, new Map())
    const topLoanDaysStaff = Array.from(loanDaysByStaff.entries()).sort(
      ([, leftDays], [, rightDays]) => rightDays - leftDays,
    )[0]

    return [
      {
        key: 'requests',
        label: 'Requests',
        value: formatCount(normalizedRecords.length),
        tone: 'primary',
      },
      {
        key: 'active',
        label: 'Active Loans',
        value: formatCount(activeRows.length),
        sublabel: 'Current or pending return',
        tone: activeRows.length ? 'warning' : 'secondary',
      },
      {
        key: 'completed',
        label: 'Completed',
        value: formatCount(completedRows.length),
        tone: 'success',
      },
      {
        key: 'loan-days',
        label: 'Top Loan Days',
        value: topLoanDaysStaff?.[0] || emptyValue,
        sublabel: `${formatCount(topLoanDaysStaff?.[1] || 0)} days loaned`,
        tone: 'secondary',
        onClick:
          topLoanDaysStaff?.[0] && topLoanDaysStaff[0] !== emptyValue
            ? () => {
                setStaffFilter(topLoanDaysStaff[0])
                setShowAdvancedFilters(true)
              }
            : undefined,
      },
    ]
  }, [normalizedRecords])

  const resetFilters = () => {
    setSearchKeyword('')
    setStaffFilter('All')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const getActions = (record) => [
    {
      key: 'update',
      label: 'Update Achievement',
      disabled: Boolean(record.achievement),
      tooltip: record.achievement ? 'Achievement has already been recorded.' : undefined,
      onClick: () => openModal(record),
    },
  ]

  const renderCell = (record, column) => {
    if (column.key === 'staff') {
      return (
        <DataTableTextCell
          value={record[column.key]}
          emptyText={emptyValue}
          maxWidth="84px"
          mode="plain"
        />
      )
    }
    if (['equipment', 'purpose'].includes(column.key)) {
      return (
        <DataTableTextCell
          value={record[column.key]}
          emptyText={emptyValue}
          maxWidth={column.cellMaxWidth || column.width}
          title={column.label}
          mode="expandable"
          previewCharThreshold={column.previewCharThreshold}
        />
      )
    }
    if (column.key === 'remarks') {
      if (!isMultiLineText(record.remarks)) {
        return <DataTableTextCell value={record.remarks} maxWidth="180px" mode="plain" />
      }
      return <RemarksCell value={record.remarks || ''} compact title="Remarks" />
    }
    if (column.key === 'achievement') {
      return (
        <DataTableTextCell
          value={record.achievement}
          maxWidth="170px"
          title="Achievement"
          mode="expandable"
          previewCharThreshold={16}
        />
      )
    }
    return record[column.key] || emptyValue
  }

  return (
    <CCard>
      <DataTableCardHeader
        title="Usage Records"
        scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
      >
        <DataTableStatsToggle
          visible={statsVisible}
          onToggle={toggleStatsVisible}
          controlsVisible={controlsVisible}
          onControlsToggle={toggleControlsVisible}
        />
        <span
          role={requestToolDisabled ? 'button' : undefined}
          aria-disabled={requestToolDisabled}
          title={
            requestToolDisabled
              ? 'Update achievement for your previous request before making a new request.'
              : undefined
          }
          tabIndex={requestToolDisabled ? 0 : undefined}
          onClick={requestToolDisabled ? onRequestToolClick : undefined}
          onKeyDown={(event) => {
            if (!requestToolDisabled) return
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault()
            onRequestToolClick?.(event)
          }}
        >
          <CButton
            color={requestToolDisabled || showRequestForm ? 'secondary' : 'primary'}
            variant={requestToolDisabled ? 'outline' : undefined}
            size="sm"
            disabled={requestToolDisabled}
            onClick={requestToolDisabled ? undefined : onRequestToolClick}
          >
            Request Tool
          </CButton>
        </span>
      </DataTableCardHeader>
      <CCardBody>
        {statsVisible && <StatsStrip loading={loading} items={statsItems} />}
        <DataTableRecordControls
          visible={controlsVisible}
          searchValue={searchKeyword}
          onSearchChange={setSearchKeyword}
          searchPlaceholder="Search staff, details, purpose, remarks, achievement..."
          searchAriaLabel="Search usage records"
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
          <CCol xs={12} md={3} lg={2}>
            <CFormLabel htmlFor="request-tool-filter-staff">Staff</CFormLabel>
            <CFormSelect
              id="request-tool-filter-staff"
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
            >
              {staffOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </DataTableRecordControls>

        <DataTableRecordList
          rows={normalizedRecords}
          dataColumns={dataColumns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey="request-tool.usage-records.visible-columns.v3"
          idPrefix="request-tool-record"
          emptyMessage="No usage records found."
          exportFilename={`usage-records-${new Date().toISOString().slice(0, 10)}.csv`}
          loading={loading}
          loadingMessage="Loading usage records..."
          getRowKey={(record, index) => record.id || index}
          renderCell={renderCell}
          getActions={getActions}
          onRowOpen={onViewRecord}
          getMobileTitle={(record) => record.equipment}
          getMobileSubtitle={(record) => record.staff}
          getMobileMeta={(record) =>
            `${record.startDate || emptyValue} to ${record.endDate || emptyValue}`
          }
          mobileFieldKeys={{
            title: 'equipment',
            subtitle: 'staff',
            meta: ['startDate', 'endDate'],
          }}
          initialSortField="startDate"
          initialSortDir="desc"
          initialSortDirByField={{ startDate: 'desc', endDate: 'desc', duration: 'desc' }}
          renderQuickFilters={() => (
            <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
          )}
          resetDeps={[filteredRecords, searchKeyword, staffFilter, periodRange]}
          actionColumnWidth="56px"
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId={desktopToolsId}
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId={mobileToolsId}
          showMobileUtilityRow={false}
        />

        {/* Update Achievement Modal */}
        <CModal visible={showModal} onClose={() => setShowModal(false)} alignment="center">
          <CModalHeader>
            <CModalTitle>Update Achievement</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CFormLabel htmlFor="achievement">Achievement</CFormLabel>
            <CFormTextarea
              id="achievement"
              rows={2}
              placeholder="e.g., Managed to complete the task as per due date..."
              value={newAchievement}
              onChange={(e) => setNewAchievement(e.target.value)}
            />
          </CModalBody>
          <CModalFooter>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" onClick={handleSaveAchievement}>
              Save
            </CButton>
          </CModalFooter>
        </CModal>
      </CCardBody>
    </CCard>
  )
}
