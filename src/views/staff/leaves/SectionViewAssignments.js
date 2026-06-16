import React, { useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader, CFormCheck } from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
} from '../../../components/datatable'
import { ASSIGNABLE_LEAVE_TYPES } from '../../../components/leave/leaveTypes'
import {
  formatLeaveBalanceDays,
  normalizeLeaveType,
} from '../../../components/leave/leaveBalanceSummary'
import {
  filterActiveStaffRecords,
  isActiveStaffRecord,
} from '../../../components/leave/staffActivity'
import * as AH from './actionHandlers'
import dialog from '../../../components/dialog/dialogService'

const dataColumns = [
  {
    key: 'staff',
    label: 'Staff',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.staff || '',
  },
  {
    key: 'leaveType',
    label: 'Leave Type',
    width: '160px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (record) => record.leaveType || '',
  },
  {
    key: 'year',
    label: 'Year',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.year || '',
  },
  {
    key: 'coverage',
    label: 'Coverage',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.coverage || '',
  },
  {
    key: 'totalDays',
    label: 'Total Days',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.totalDaysDisplay,
  },
  {
    key: 'usedDays',
    label: 'Used Days',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.usedDaysDisplay,
  },
  {
    key: 'remaining',
    label: 'Remaining',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.remainingDisplay,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    width: '260px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.remarksDisplay,
  },
]

const historyColumns = [
  {
    key: 'createdAt',
    label: 'Timestamp',
    width: '180px',
    sortable: true,
    sortType: 'date',
    shrinkToFit: true,
    getExportValue: (record) => record.createdAt || '',
  },
  {
    key: 'staff',
    label: 'Staff',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.staff || '',
  },
  {
    key: 'eventType',
    label: 'Action',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.eventType || '',
  },
  {
    key: 'leaveType',
    label: 'Leave Type',
    width: '160px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (record) => record.leaveType || '',
  },
  {
    key: 'year',
    label: 'Year',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.year || '',
  },
  {
    key: 'days',
    label: 'Days',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.daysDisplay,
  },
  {
    key: 'assignedBy',
    label: 'Assigned By',
    width: '180px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.assignedBy || '',
  },
  {
    key: 'description',
    label: 'Description',
    width: '360px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.description || '',
  },
]

const defaultVisibleColumns = {
  staff: false,
  leaveType: true,
  year: true,
  coverage: true,
  totalDays: true,
  usedDays: true,
  remaining: true,
  remarks: true,
}

const defaultHistoryVisibleColumns = {
  createdAt: true,
  staff: true,
  eventType: true,
  leaveType: true,
  year: true,
  days: true,
  assignedBy: true,
  description: true,
}

const requiredColumns = new Set(['leaveType'])
const requiredHistoryColumns = new Set(['createdAt', 'staff'])
const currentYear = String(new Date().getFullYear())

const formatStaff = (record = {}) => {
  const name = record.full_name || record.name || 'Unknown Staff'
  return record.name_code ? `${name} (${record.name_code})` : name
}

const hasValue = (value) => value !== null && typeof value !== 'undefined' && value !== ''

const toNumber = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

const getEntitlementTypeKey = (record = {}) => normalizeLeaveType(record.leave_type)

const getStaffTypeYearKey = (staffId, year, leaveType) =>
  [staffId, year, normalizeLeaveType(leaveType)].map((value) => String(value)).join('|')

const buildAssignedRow = (record, staffById) => {
  const staff = staffById.get(String(record.staff_id)) || {}
  const mergedStaff = { ...record, ...staff }
  const totalDays = toNumber(record.total_days)
  const usedDays = toNumber(record.used_days)
  const remaining = hasValue(record.remaining) ? toNumber(record.remaining) : totalDays - usedDays

  return {
    ...record,
    staff_status: record.staff_status ?? staff.status,
    staff_terminated_at: record.staff_terminated_at ?? staff.terminated_at,
    rowKind: 'assigned',
    staff: formatStaff(mergedStaff),
    leaveType: record.leave_type || '-',
    year: Number(record.year),
    coverage: 'Assigned',
    totalDays,
    usedDays,
    remaining,
    deleteLocked: usedDays > 0,
    totalDaysDisplay: formatLeaveBalanceDays(totalDays),
    usedDaysDisplay: formatLeaveBalanceDays(usedDays),
    remainingDisplay: formatLeaveBalanceDays(remaining),
    remarksDisplay: hasValue(record.remarks) ? record.remarks : '-',
  }
}

const buildMissingRow = (staff, year, leaveType) => ({
  id: `missing-${staff.staff_id}-${year}-${normalizeLeaveType(leaveType).replace(/\s+/g, '-')}`,
  rowKind: 'missing',
  staff_id: staff.staff_id,
  full_name: staff.full_name,
  name_code: staff.name_code,
  staff: formatStaff(staff),
  leave_type: leaveType,
  leaveType,
  year: Number(year),
  coverage: 'Missing',
  totalDays: null,
  usedDays: null,
  remaining: null,
  totalDaysDisplay: '-',
  usedDaysDisplay: '-',
  remainingDisplay: '-',
  remarksDisplay: '-',
})

const buildHistoryRow = (record = {}) => ({
  ...record,
  eventType: record.event_type || record.eventType || '-',
  leaveType: record.leave_type || record.leaveType || '-',
  createdAt: record.created_at || record.createdAt || '-',
  assignedBy: record.assigned_by || record.assignedBy || '-',
  daysDisplay: hasValue(record.days) ? formatLeaveBalanceDays(record.days) : '-',
  year: record.year || '-',
  staff: record.staff || '-',
  description: record.description || '-',
})

const compareStaffGroups = (leftKey, rightKey) =>
  String(leftKey).localeCompare(String(rightKey), undefined, {
    numeric: true,
    sensitivity: 'base',
  })

const compareEntitlementRows = (left, right) => {
  const coverageWeight = { Assigned: 0, Missing: 1 }
  const coverageResult =
    (coverageWeight[left.coverage] ?? 99) - (coverageWeight[right.coverage] ?? 99)
  if (coverageResult !== 0) return coverageResult

  const leaveTypeResult = String(left.leaveType || '').localeCompare(
    String(right.leaveType || ''),
    undefined,
    {
      numeric: true,
      sensitivity: 'base',
    },
  )
  if (leaveTypeResult !== 0) return leaveTypeResult

  const yearResult = Number(right.year || 0) - Number(left.year || 0)
  if (yearResult !== 0) return yearResult

  return String(left.id || '').localeCompare(String(right.id || ''), undefined, { numeric: true })
}

const SectionViewAssignments = ({
  staffList = [],
  entitlements = [],
  onDelete,
  onEdit,
  onAssign,
  onViewRecords,
  onViewAssignment,
  entitlementHistory = [],
  loading = false,
  historyLoading = false,
  year = currentYear,
  requiredLeaveTypes = ASSIGNABLE_LEAVE_TYPES,
}) => {
  const [viewStaff, setViewStaff] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [historySearchTerm, setHistorySearchTerm] = useState('')
  const [showUnassignedByStaff, setShowUnassignedByStaff] = useState({})
  const [historyVisible, setHistoryVisible] = useState(false)
  const [includeInactiveStaff, setIncludeInactiveStaff] = useState(false)
  const filterYear = year

  const staffById = useMemo(
    () => new Map(staffList.map((staff) => [String(staff.staff_id), staff])),
    [staffList],
  )

  const activeScopedStaffList = useMemo(
    () => filterActiveStaffRecords(staffList, includeInactiveStaff),
    [includeInactiveStaff, staffList],
  )

  const staffOptions = useMemo(
    () =>
      activeScopedStaffList.map((s) => ({
        value: s.staff_id,
        label: formatStaff(s),
      })),
    [activeScopedStaffList],
  )

  const tableRows = useMemo(() => {
    const assignedRows = entitlements
      .map((record) => buildAssignedRow(record, staffById))
      .filter((record) => includeInactiveStaff || isActiveStaffRecord(record))

    const assignedStaffTypesForYear = new Set(
      assignedRows
        .filter((record) => String(record.year) === String(filterYear))
        .map((record) =>
          getStaffTypeYearKey(record.staff_id, filterYear, getEntitlementTypeKey(record)),
        ),
    )

    const missingRows = activeScopedStaffList.flatMap((staff) =>
      requiredLeaveTypes
        .filter(
          (leaveType) =>
            !assignedStaffTypesForYear.has(
              getStaffTypeYearKey(staff.staff_id, filterYear, leaveType),
            ),
        )
        .map((leaveType) => buildMissingRow(staff, filterYear, leaveType)),
    )

    return [...assignedRows, ...missingRows]
  }, [
    activeScopedStaffList,
    entitlements,
    filterYear,
    includeInactiveStaff,
    requiredLeaveTypes,
    staffById,
  ])

  const staffGroupMeta = useMemo(() => {
    const meta = new Map()
    tableRows.forEach((record) => {
      if (!meta.has(record.staff)) {
        meta.set(record.staff, { assigned: 0, missing: 0 })
      }
      const staffMeta = meta.get(record.staff)
      if (record.rowKind === 'assigned') staffMeta.assigned += 1
      if (record.rowKind === 'missing') staffMeta.missing += 1
    })
    return meta
  }, [tableRows])

  const filteredRows = useMemo(
    () =>
      tableRows.filter((record) => {
        if (viewStaff && String(record.staff_id) !== String(viewStaff.value)) return false

        if (record.rowKind === 'missing') {
          const meta = staffGroupMeta.get(record.staff) || { assigned: 0 }
          const staffHasAssignedRows = meta.assigned > 0
          if (staffHasAssignedRows && !showUnassignedByStaff[record.staff]) return false
        }

        const term = searchTerm.trim().toLowerCase()
        if (
          term &&
          ![
            record.staff,
            record.full_name,
            record.name_code,
            record.leave_type,
            record.leaveType,
            record.coverage,
            record.remarks,
            record.remarksDisplay,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        ) {
          return false
        }

        return true
      }),
    [searchTerm, showUnassignedByStaff, staffGroupMeta, tableRows, viewStaff],
  )

  const historyRows = useMemo(
    () => entitlementHistory.map((record) => buildHistoryRow(record)),
    [entitlementHistory],
  )

  const filteredHistoryRows = useMemo(() => {
    const term = historySearchTerm.trim().toLowerCase()
    if (!term) return historyRows

    return historyRows.filter((record) =>
      [
        record.staff,
        record.leaveType,
        record.eventType,
        record.assignedBy,
        record.description,
        record.year,
        record.daysDisplay,
        record.createdAt,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    )
  }, [historyRows, historySearchTerm])

  const getCoverageTone = (coverage) => (coverage === 'Missing' ? 'warning' : 'success')

  const sortComparators = useMemo(
    () => ({
      coverage: (a, b) => {
        const weight = { Missing: 0, Assigned: 1 }
        return (weight[a] ?? 99) - (weight[b] ?? 99)
      },
      entitlementOrder: (a, b, left, right) => compareEntitlementRows(left, right),
    }),
    [],
  )

  const handleDeleteEntitlement = async (record) => {
    if (record.deleteLocked) {
      dialog.alert('Used leave entitlements cannot be deleted.')
      return
    }

    const confirmed = await dialog.confirm(
      `Are you sure you want to delete the ${record.leave_type} entitlement for ${record.year}?`,
      {
        confirmText: 'Delete',
        confirmColor: 'danger',
      },
    )
    if (!confirmed) return
    try {
      await AH.deleteEntitlement(record.id)
      dialog.alert('Entitlement deleted successfully.')
      onDelete?.()
    } catch (err) {
      console.error(err)
      dialog.alert(`Failed to delete entitlement: ${err.message}`)
    }
  }

  const getActions = (record) => {
    if (record.rowKind === 'missing') {
      return onAssign
        ? [
            {
              key: 'assign',
              label: 'Assign',
              onClick: () => onAssign(record),
            },
          ]
        : []
    }

    return [
      onEdit ? { key: 'edit', label: 'Edit', onClick: () => onEdit(record) } : null,
      onDelete
        ? {
            key: 'delete',
            label: 'Delete',
            danger: true,
            disabled: record.deleteLocked,
            dividerBefore: true,
            onClick: () => handleDeleteEntitlement(record),
          }
        : null,
    ].filter(Boolean)
  }

  const renderCell = (record, column) => {
    if (column.key === 'coverage') {
      return (
        <DataTableStatusBadge tone={getCoverageTone(record.coverage)}>
          {record.coverage}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'totalDays') return record.totalDaysDisplay
    if (column.key === 'usedDays') return record.usedDaysDisplay
    if (column.key === 'remaining') return record.remainingDisplay
    if (column.key === 'remarks') return record.remarksDisplay
    return record[column.key] ?? '-'
  }

  const renderHistoryCell = (record, column) => {
    if (column.key === 'eventType') {
      return (
        <DataTableStatusBadge tone={record.eventType === 'Deleted' ? 'danger' : 'info'}>
          {record.eventType}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'days') return record.daysDisplay
    return record[column.key] ?? '-'
  }

  const getHistoryMobileMeta = (record) =>
    [
      record.daysDisplay && record.daysDisplay !== '-' ? `${record.daysDisplay} days` : '',
      record.createdAt && record.createdAt !== '-' ? record.createdAt : '',
    ]
      .filter(Boolean)
      .join(' | ')

  const renderStaffGroupLabel = (groupKey) => {
    const meta = staffGroupMeta.get(String(groupKey)) || { assigned: 0, missing: 0 }
    const hasAssignedRows = meta.assigned > 0
    const hasMissingRows = meta.missing > 0
    const canToggleUnassigned = hasAssignedRows && hasMissingRows
    const showUnassigned = Boolean(showUnassignedByStaff[groupKey])

    return (
      <div className="leave-entitlement-staff-group">
        <span className="leave-entitlement-staff-group-name">{groupKey}</span>
        {canToggleUnassigned && (
          <CFormCheck
            className="leave-entitlement-unassigned-toggle"
            checked={showUnassigned}
            label="Show unassigned"
            aria-label={`Show unassigned leave for ${groupKey}`}
            onChange={(event) => {
              const checked = event.target.checked
              setShowUnassignedByStaff((prev) => ({
                ...prev,
                [groupKey]: checked,
              }))
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <CCard className="mb-5">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>Leaves Entitlement Records</strong>
          <div className="d-flex align-items-center gap-2">
            {onViewRecords && (
              <CButton color="secondary" variant="outline" size="sm" onClick={onViewRecords}>
                Records
              </CButton>
            )}
            {onAssign && (
              <CButton color="primary" size="sm" onClick={onAssign}>
                Assign Leave
              </CButton>
            )}
          </div>
        </CCardHeader>
        <CCardBody>
          <DataTableRecordControls
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search staff, code, or leave type..."
            searchAriaLabel="Search entitlements"
            desktopToolsId="entitlements-table-tools"
            mobileToolsId="entitlements-mobile-table-tools"
            loading={loading}
            inlineFilter={
              <Select
                options={staffOptions}
                value={viewStaff}
                onChange={setViewStaff}
                placeholder="All staff"
                isClearable
                styles={{
                  container: (b) => ({ ...b, minWidth: '220px' }),
                  option: (b) => ({ ...b, textTransform: 'capitalize' }),
                  singleValue: (b) => ({ ...b, textTransform: 'capitalize' }),
                }}
              />
            }
          />
          {!loading && (
            <div className="d-flex align-items-center mb-3">
              <CFormCheck
                id="leave-entitlements-include-inactive"
                label="Include inactive staff"
                checked={includeInactiveStaff}
                onChange={(event) => {
                  const checked = event.target.checked
                  setIncludeInactiveStaff(checked)
                  if (!checked) setViewStaff(null)
                }}
              />
            </div>
          )}

          <DataTableRecordList
            rows={filteredRows}
            loading={loading}
            loadingMessage="Loading leave entitlements..."
            dataColumns={dataColumns}
            defaultVisibleColumns={defaultVisibleColumns}
            requiredColumns={requiredColumns}
            storageKey="staff.leaves.entitlements.visible-columns.v6"
            scrollStorageKey="staff.leaves.entitlements.scroll"
            idPrefix="staff-leave-entitlement"
            emptyMessage="No leave entitlement records match these filters."
            exportFilename={`leave-entitlements-${new Date().toISOString().slice(0, 10)}.csv`}
            getRowKey={(record, index) =>
              record.id || `${record.rowKind}-${record.staff_id}-${index}`
            }
            renderCell={renderCell}
            getActions={getActions}
            onRowOpen={onViewAssignment}
            actionColumnWidth="56px"
            getMobileTitle={(record) => record.staff}
            getMobileSubtitle={(record) => `${record.leaveType} | ${record.coverage}`}
            getMobileMeta={(record) =>
              record.remarksDisplay && record.remarksDisplay !== '-'
                ? `Remaining: ${record.remainingDisplay} | Remarks: ${record.remarksDisplay}`
                : `Remaining: ${record.remainingDisplay}`
            }
            getMobileStatus={(record) => record.coverage}
            getMobileStatusTone={(record) => getCoverageTone(record.coverage)}
            mobileFieldKeys={{
              title: 'staff',
              subtitle: ['leaveType', 'coverage'],
              meta: ['remaining', 'remarks'],
              status: 'coverage',
            }}
            initialSortField="entitlementOrder"
            initialSortDir="asc"
            initialSortDirByField={{ year: 'desc', remaining: 'desc' }}
            sortComparators={sortComparators}
            getRowGroupKey={(record) => record.staff}
            getRowGroupLabel={renderStaffGroupLabel}
            rowGroupSortComparator={compareStaffGroups}
            resetRowIndexOnGroup
            resetDeps={[viewStaff, searchTerm]}
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId="entitlements-table-tools"
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId="entitlements-mobile-table-tools"
            showMobileUtilityRow={false}
            className="leave-entitlement-records-table"
          />
        </CCardBody>
      </CCard>
      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
          <strong>
            Leave Assignment History{' '}
            <span className="text-muted fw-normal">({historyRows.length})</span>
          </strong>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => setHistoryVisible((visible) => !visible)}
          >
            {historyVisible ? 'Hide history' : 'Show history'}
          </CButton>
        </CCardHeader>
        {historyVisible && (
          <CCardBody>
            <DataTableRecordControls
              searchValue={historySearchTerm}
              onSearchChange={setHistorySearchTerm}
              searchPlaceholder="Search staff, leave type, assigned by, or description..."
              searchAriaLabel="Search assignment history"
              desktopToolsId="entitlement-history-table-tools"
              mobileToolsId="entitlement-history-mobile-table-tools"
              loading={historyLoading}
            />

            <DataTableRecordList
              rows={filteredHistoryRows}
              loading={historyLoading}
              loadingMessage="Loading leave assignment history..."
              dataColumns={historyColumns}
              defaultVisibleColumns={defaultHistoryVisibleColumns}
              requiredColumns={requiredHistoryColumns}
              storageKey="staff.leaves.entitlement-history.visible-columns.v1"
              scrollStorageKey="staff.leaves.entitlement-history.scroll"
              idPrefix="staff-leave-entitlement-history"
              emptyMessage="No leave assignment history found."
              getRowKey={(record, index) => record.id || `history-${index}`}
              renderCell={renderHistoryCell}
              actionColumnWidth="56px"
              getMobileTitle={(record) => record.staff}
              getMobileSubtitle={(record) => `${record.eventType} | ${record.leaveType}`}
              getMobileMeta={getHistoryMobileMeta}
              mobileFieldKeys={{
                title: 'staff',
                subtitle: ['eventType', 'leaveType'],
                meta: ['days', 'createdAt'],
              }}
              initialSortField="createdAt"
              initialSortDir="desc"
              initialSortDirByField={{ createdAt: 'desc', days: 'desc', year: 'desc' }}
              resetDeps={[historySearchTerm]}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="entitlement-history-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="entitlement-history-mobile-table-tools"
              showMobileUtilityRow={false}
              showColumnMenu={false}
              showExport={false}
            />
          </CCardBody>
        )}
      </CCard>
    </>
  )
}

export default SectionViewAssignments
