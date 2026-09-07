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
  isDefaultPeriodRange,
} from '../filters'
import {
  compareLeaveRecordYearGroupsDesc,
  filterLeaveRecords,
  getLeaveRecordScopeDate,
  getLeaveRecordStatusOptions,
  getLeaveRecordTypeOptions,
  getLeaveRecordYearGroupKey,
  getLeaveStatusSortPriority,
  shouldGroupLeaveRecordsByYear,
} from './leaveRecordFilters'

const dataColumns = [
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'workflow',
    label: 'Workflow',
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '240px',
    previewCharThreshold: 34,
  },
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
]

const defaultVisibleColumns = {
  status: true,
  workflow: true,
  leaveType: true,
  appliedAt: true,
  duration: true,
  reason: true,
}

const requiredColumns = new Set(['leaveType', 'status'])
const shortMonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const formatTime = (value) => {
  if (!value) return '-'
  const text = String(value)
  return text.length >= 5 ? text.slice(0, 5) : text
}

const formatLeaveDate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value || '-'

  const [, year, month, day] = match
  return `${Number(day)} ${shortMonthNames[Number(month) - 1] || month} ${year}`
}

const formatLeavePeriod = (record) => {
  const startDate = formatLeaveDate(record.startDate)
  const endDate = formatLeaveDate(record.endDate)
  const startTime = formatTime(record.startTime)
  const endTime = formatTime(record.endTime)

  if (record.startDate && record.startDate === record.endDate) {
    return `${startDate} · ${startTime}–${endTime}`
  }

  return `${startDate}, ${startTime} – ${endDate}, ${endTime}`
}

const formatLeaveDateRange = (record) => {
  const startDate = formatLeaveDate(record.startDate)
  const endDate = formatLeaveDate(record.endDate)

  return record.startDate && record.startDate === record.endDate
    ? startDate
    : `${startDate} \u2013 ${endDate}`
}

const formatLeaveTimeRange = (record) =>
  `${formatTime(record.startTime)}\u2013${formatTime(record.endTime)}`

const formatLeaveCompactPeriod = (record) => (
  <>
    {formatLeaveDateRange(record)}
    <span className="leave-record-compact-time">{` \u00b7 ${formatLeaveTimeRange(record)}`}</span>
  </>
)

const formatDurationLabel = (value) => {
  const duration = Number(value || 0)
  return `${value ?? 0} day${duration === 1 ? '' : 's'}`
}

const getStatusTone = (status, getStatusBadge) => {
  const tone = getStatusBadge(status)
  if (['success', 'warning', 'danger', 'dark', 'info', 'secondary'].includes(tone)) return tone
  return 'info'
}

const buildWorkflowStep = ({ label, at, actor, status, remarks }) =>
  [
    `${label}: ${status || '-'}`,
    at ? `at ${at}` : '',
    actor ? `by ${actor}` : '',
    remarks ? `Remarks: ${remarks}` : '',
  ]
    .filter(Boolean)
    .join(' ')

export { getLeaveRecordScopeDate }
export const getPersonalLeaveStatusSortPriority = getLeaveStatusSortPriority

export const getPersonalLeaveWorkflowSteps = (record = {}) => {
  const steps = [
    record.reviewedStatus
      ? buildWorkflowStep({
          label: 'Review',
          at: record.reviewedAt,
          status: record.reviewedStatus,
          remarks: record.reviewedRemarks,
        })
      : '',
    record.approvedStatus
      ? buildWorkflowStep({
          label: 'Approval',
          at: record.approvedAt,
          status: record.approvedStatus,
          remarks: record.approvedRemarks,
        })
      : '',
    record.cancelledAt || record.status === 'Cancelled'
      ? buildWorkflowStep({
          label: 'Cancellation',
          at: record.cancelledAt,
          actor: record.cancelledBy,
          status: 'Cancelled',
        })
      : '',
  ].filter(Boolean)

  if (record.status === 'Pending' && !steps.length) {
    return ['Pending review']
  }

  return steps
}

const LeaveRecordTable = ({
  leaveRecords = [],
  loading = false,
  handleCancel,
  getStatusBadge,
  onView,
  controlsVisible = true,
  periodRange,
  onPeriodRangeChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [localPeriodRange, setLocalPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const selectedPeriodRange = periodRange || localPeriodRange
  const handlePeriodRangeChange = onPeriodRangeChange || setLocalPeriodRange

  const leaveTypeOptions = useMemo(() => getLeaveRecordTypeOptions(leaveRecords), [leaveRecords])
  const statusOptions = useMemo(() => getLeaveRecordStatusOptions(leaveRecords), [leaveRecords])

  const activeChips = useMemo(
    () =>
      [
        leaveTypeFilter ? { key: 'leaveType', label: `Type: ${leaveTypeFilter}` } : null,
        statusFilter ? { key: 'status', label: `Status: ${statusFilter}` } : null,
      ].filter(Boolean),
    [leaveTypeFilter, statusFilter],
  )

  const periodChip =
    selectedPeriodRange && !isDefaultPeriodRange(selectedPeriodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(selectedPeriodRange)}` }
      : null

  const allActiveChips = periodChip ? [...activeChips, periodChip] : activeChips

  const activeFilterCount = getAdvancedFilterCount(allActiveChips)

  const clearChip = (key) => {
    if (key === 'leaveType') setLeaveTypeFilter('')
    if (key === 'status') setStatusFilter('')
    if (key === 'period') handlePeriodRangeChange(getPeriodRangePreset('ytd'))
  }

  const resetFilters = () => {
    setSearchTerm('')
    setLeaveTypeFilter('')
    setStatusFilter('')
    handlePeriodRangeChange(getPeriodRangePreset('ytd'))
  }

  const filteredRecords = useMemo(
    () =>
      filterLeaveRecords(leaveRecords, {
        searchTerm,
        leaveType: leaveTypeFilter,
        status: statusFilter,
        periodRange: selectedPeriodRange,
      }),
    [leaveRecords, searchTerm, leaveTypeFilter, statusFilter, selectedPeriodRange],
  )

  const normalizedRecords = useMemo(
    () =>
      filteredRecords.map((record) => ({
        ...record,
        durationValue: Number(record.duration || 0),
        durationMeta: formatLeavePeriod(record),
        workflowSteps: getPersonalLeaveWorkflowSteps(record),
        workflow: getPersonalLeaveWorkflowSteps(record).join('\n'),
      })),
    [filteredRecords],
  )

  const sortComparators = useMemo(
    () => ({
      status: (_leftValue, _rightValue, leftRecord, rightRecord) => {
        const priorityCompare =
          getPersonalLeaveStatusSortPriority(leftRecord.status) -
          getPersonalLeaveStatusSortPriority(rightRecord.status)

        if (priorityCompare !== 0) return priorityCompare

        const rightDate = Date.parse(getLeaveRecordScopeDate(rightRecord) || '') || 0
        const leftDate = Date.parse(getLeaveRecordScopeDate(leftRecord) || '') || 0
        return rightDate - leftDate
      },
    }),
    [],
  )

  const getActions = (record) => {
    if (!['Pending', 'Approved'].includes(record.status)) return []

    return [
      {
        key: 'cancel',
        label: record.status === 'Approved' ? 'Revoke Leave' : 'Cancel',
        danger: record.status === 'Approved',
        onClick: () => handleCancel(record.id, record.status),
      },
    ]
  }

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
    if (column.key === 'workflow') {
      const steps = record.workflowSteps?.length ? record.workflowSteps : [record.workflow]
      return (
        <div className="d-flex flex-column gap-1" style={{ maxWidth: '240px' }}>
          {steps.map((step, index) => (
            <DataTableTextCell
              key={`${record.id || 'workflow'}-${index}`}
              value={step}
              maxWidth="240px"
              title="Workflow"
              mode="expandable"
              previewCharThreshold={52}
              className="small text-muted"
            />
          ))}
        </div>
      )
    }
    return record[column.key] || '-'
  }

  return (
    <>
      <DataTableRecordControls
        visible={controlsVisible}
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
        <CCol xs={6} md={3} lg={2}>
          <CFormLabel htmlFor="leave-filter-status">Status</CFormLabel>
          <CFormSelect
            id="leave-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      <DataTableRecordList
        className="leave-records-table"
        rows={normalizedRecords}
        loading={loading}
        loadingMessage="Loading leave records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="leave.personal-records.visible-columns.v4"
        scrollStorageKey="leave.personal-records.scroll"
        idPrefix="leave-record"
        emptyMessage="No leave records found."
        exportFilename={`leave-records-${new Date().toISOString().slice(0, 10)}.csv`}
        getRowKey={(record, index) => record.id || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={onView}
        actionColumnWidth="56px"
        mobileRecord={{
          title: (record) => record.leaveType,
          subtitle: formatLeaveCompactPeriod,
          summary: (record) => formatDurationLabel(record.duration),
          layout: 'compact',
          badges: (record) => [
            {
              key: 'status',
              label: record.status,
              tone: getStatusTone(record.status, getStatusBadge),
            },
          ],
        }}
        showMobileRowIndex={false}
        mobileFieldKeys={{
          title: 'leaveType',
          subtitle: 'duration',
          meta: 'duration',
          status: 'status',
        }}
        initialSortField="status"
        initialSortDir="asc"
        initialSortDirByField={{ appliedAt: 'desc', duration: 'desc', status: 'asc' }}
        sortComparators={sortComparators}
        getRowGroupKey={
          shouldGroupLeaveRecordsByYear(selectedPeriodRange)
            ? getLeaveRecordYearGroupKey
            : undefined
        }
        getRowGroupLabel={(year) => year}
        rowGroupSortComparator={compareLeaveRecordYearGroupsDesc}
        renderQuickFilters={() => (
          <PeriodRangeSelector value={selectedPeriodRange} onChange={handlePeriodRangeChange} />
        )}
        getSortValue={(record, field) => {
          if (field === 'duration') return record.durationValue
          return record[field]
        }}
        resetDeps={[selectedPeriodRange, statusFilter]}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId="leave-record-table-tools"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="leave-record-mobile-table-tools"
        showMobileUtilityRow={false}
        mobilePaginationMode="load-more"
        mobileLoadMorePageSize={10}
        mobileLoadMoreLabel="Load more leave records"
        mobileLoadMoreSummaryLabel="leave records"
      />
    </>
  )
}

export default LeaveRecordTable
