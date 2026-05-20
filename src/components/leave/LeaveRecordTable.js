import React, { useMemo, useState } from 'react'
import { CCol, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../filters'

const dataColumns = [
  {
    key: 'leaveType',
    label: 'Leave Type',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'appliedAt',
    label: 'Applied At',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'duration',
    label: 'Duration (days)',
    width: '112px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'reason',
    label: 'Reason',
    width: '190px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '190px',
    previewCharThreshold: 34,
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'statusDetails',
    label: 'Status Details',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
]

const defaultVisibleColumns = {
  leaveType: true,
  appliedAt: true,
  duration: true,
  reason: true,
  status: true,
  statusDetails: false,
}

const requiredColumns = new Set(['leaveType', 'status'])

const formatTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

const getStatusTone = (status, getStatusBadge) => {
  const tone = getStatusBadge(status)
  if (['success', 'warning', 'danger', 'dark', 'info'].includes(tone)) return tone
  return 'info'
}

export const getLeaveRecordScopeDate = (record = {}) => record.appliedAt || record.startDate || null

const LeaveRecordTable = ({
  leaveRecords = [],
  loading = false,
  handleCancel,
  getStatusBadge,
  onView,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const leaveTypeOptions = useMemo(
    () => [...new Set(leaveRecords.map((r) => r.leaveType).filter(Boolean))].sort(),
    [leaveRecords],
  )

  const activeChips = useMemo(
    () =>
      [leaveTypeFilter ? { key: 'leaveType', label: `Type: ${leaveTypeFilter}` } : null].filter(
        Boolean,
      ),
    [leaveTypeFilter],
  )

  const periodChip =
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null

  const allActiveChips = periodChip ? [...activeChips, periodChip] : activeChips

  const activeFilterCount = getAdvancedFilterCount(allActiveChips)

  const clearChip = (key) => {
    if (key === 'leaveType') setLeaveTypeFilter('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const resetFilters = () => {
    setSearchTerm('')
    setLeaveTypeFilter('')
    setPeriodRange(getPeriodRangePreset('ytd'))
  }

  const filteredRecords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return leaveRecords.filter((record) => {
      const matchesSearch =
        !term ||
        record.leaveType?.toLowerCase().includes(term) ||
        record.reason?.toLowerCase().includes(term) ||
        record.status?.toLowerCase().includes(term)
      const matchesType = !leaveTypeFilter || record.leaveType === leaveTypeFilter
      const matchesPeriod = isDateInPeriodRange(getLeaveRecordScopeDate(record), periodRange)
      return matchesSearch && matchesType && matchesPeriod
    })
  }, [leaveRecords, searchTerm, leaveTypeFilter, periodRange])

  const normalizedRecords = useMemo(
    () =>
      filteredRecords.map((record) => ({
        ...record,
        durationValue: Number(record.duration || 0),
        durationMeta: `${record.startDate} ${formatTime(record.startTime)} to ${record.endDate} ${formatTime(
          record.endTime,
        )}`,
        statusDetails: [
          record.reviewedStatus
            ? `Reviewed: ${record.reviewedStatus}${record.reviewedAt ? ` at ${record.reviewedAt}` : ''}${
                record.reviewedRemarks ? ` - ${record.reviewedRemarks}` : ''
              }`
            : '',
          record.approvedStatus
            ? `Approved: ${record.approvedStatus}${record.approvedAt ? ` at ${record.approvedAt}` : ''}${
                record.approvedRemarks ? ` - ${record.approvedRemarks}` : ''
              }`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
      })),
    [filteredRecords],
  )

  const getActions = (record) => [
    {
      key: 'cancel',
      label: 'Cancel',
      disabled: ['Cancelled', 'Rejected'].includes(record.status),
      onClick: () => handleCancel(record.id),
    },
  ]

  const renderCell = (record, column) => {
    if (column.key === 'duration') {
      return record.duration
    }
    if (column.key === 'reason') {
      return (
        <DataTableTextCell
          value={record.reason}
          maxWidth="190px"
          title="Reason"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(record.status, getStatusBadge)}>
          {record.status}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'statusDetails') {
      return (
        <DataTableTextCell
          value={record.statusDetails}
          maxWidth="220px"
          title="Status Details"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    return record[column.key] || '-'
  }

  return (
    <>
      <DataTableRecordControls
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search leave type, reason, or status..."
        searchAriaLabel="Search leave records"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={activeFilterCount}
        activeChips={allActiveChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="leave-record-table-tools"
        mobileToolsId="leave-record-mobile-table-tools"
        loading={loading}
      >
        <CCol xs={6} md={3} lg={2}>
          <CFormLabel htmlFor="leave-filter-type">Leave Type</CFormLabel>
          <CFormSelect
            id="leave-filter-type"
            value={leaveTypeFilter}
            onChange={(e) => setLeaveTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {leaveTypeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      <DataTableRecordList
        rows={normalizedRecords}
        loading={loading}
        loadingMessage="Loading leave records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="leave.personal-records.visible-columns.v3"
        idPrefix="leave-record"
        emptyMessage="No leave records found."
        exportFilename={`leave-records-${new Date().toISOString().slice(0, 10)}.csv`}
        getRowKey={(record, index) => record.id || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={onView}
        actionColumnWidth="56px"
        getMobileTitle={(record) => record.leaveType}
        getMobileSubtitle={(record) => record.status}
        getMobileMeta={(record) => record.durationMeta}
        getMobileStatus={(record) => record.status}
        getMobileStatusTone={(record) => getStatusTone(record.status, getStatusBadge)}
        mobileFieldKeys={{
          title: 'leaveType',
          subtitle: 'status',
          meta: 'duration',
          status: 'status',
        }}
        initialSortField="appliedAt"
        initialSortDir="desc"
        initialSortDirByField={{ appliedAt: 'desc', duration: 'desc' }}
        renderQuickFilters={() => (
          <PeriodRangeSelector value={periodRange} onChange={setPeriodRange} />
        )}
        getSortValue={(record, field) => {
          if (field === 'duration') return record.durationValue
          return record[field]
        }}
        resetDeps={[filteredRecords, periodRange]}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId="leave-record-table-tools"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="leave-record-mobile-table-tools"
        showMobileUtilityRow={false}
      />
    </>
  )
}

export default LeaveRecordTable
