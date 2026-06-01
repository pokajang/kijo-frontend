import React, { useMemo, useState } from 'react'
import { CButton, CCard, CCardBody, CCardHeader } from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
} from '../../../components/datatable'
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
]

const defaultVisibleColumns = {
  staff: true,
  leaveType: true,
  year: true,
  coverage: true,
  totalDays: true,
  usedDays: true,
  remaining: true,
}

const requiredColumns = new Set(['staff', 'leaveType'])
const currentYear = String(new Date().getFullYear())

const formatStaff = (record = {}) => {
  const name = record.full_name || record.name || 'Unknown Staff'
  return record.name_code ? `${name} (${record.name_code})` : name
}

const formatNumber = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return Number.isInteger(number) ? String(number) : number.toFixed(1)
}

const buildAssignedRow = (record, staffById) => {
  const staff = staffById.get(String(record.staff_id)) || {}
  const totalDays = Number(record.total_days || 0)
  const usedDays = Number(record.used_days || 0)
  const remaining = totalDays - usedDays

  return {
    ...record,
    rowKind: 'assigned',
    staff: formatStaff({ ...staff, ...record }),
    leaveType: record.leave_type || '-',
    year: Number(record.year),
    coverage: 'Assigned',
    totalDays,
    usedDays,
    remaining,
    totalDaysDisplay: formatNumber(totalDays),
    usedDaysDisplay: formatNumber(usedDays),
    remainingDisplay: formatNumber(remaining),
  }
}

const buildMissingRow = (staff, year) => ({
  id: `missing-${staff.staff_id}-${year}`,
  rowKind: 'missing',
  staff_id: staff.staff_id,
  full_name: staff.full_name,
  name_code: staff.name_code,
  staff: formatStaff(staff),
  leave_type: 'Not assigned',
  leaveType: 'Not assigned',
  year: Number(year),
  coverage: 'Missing',
  totalDays: null,
  usedDays: null,
  remaining: null,
  totalDaysDisplay: '-',
  usedDaysDisplay: '-',
  remainingDisplay: '-',
})

const SectionViewAssignments = ({
  staffList = [],
  entitlements = [],
  onDelete,
  onEdit,
  onAssign,
  onViewRecords,
}) => {
  const [viewStaff, setViewStaff] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const filterYear = currentYear

  const staffById = useMemo(
    () => new Map(staffList.map((staff) => [String(staff.staff_id), staff])),
    [staffList],
  )

  const staffOptions = useMemo(
    () =>
      staffList.map((s) => ({
        value: s.staff_id,
        label: formatStaff(s),
      })),
    [staffList],
  )

  const tableRows = useMemo(() => {
    const assignedRows = entitlements.map((record) => buildAssignedRow(record, staffById))

    const assignedStaffForYear = new Set(
      assignedRows
        .filter((record) => String(record.year) === String(filterYear))
        .map((record) => String(record.staff_id)),
    )

    const missingRows = staffList
      .filter((staff) => !assignedStaffForYear.has(String(staff.staff_id)))
      .map((staff) => buildMissingRow(staff, filterYear))

    return [...assignedRows, ...missingRows]
  }, [entitlements, filterYear, staffById, staffList])

  const filteredRows = useMemo(
    () =>
      tableRows.filter((record) => {
        if (viewStaff && String(record.staff_id) !== String(viewStaff.value)) return false
        if (filterYear && String(record.year) !== String(filterYear)) return false

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
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
        ) {
          return false
        }

        return true
      }),
    [filterYear, searchTerm, tableRows, viewStaff],
  )

  const getCoverageTone = (coverage) => (coverage === 'Missing' ? 'warning' : 'success')

  const sortComparators = useMemo(
    () => ({
      coverage: (a, b) => {
        const weight = { Missing: 0, Assigned: 1 }
        return (weight[a] ?? 99) - (weight[b] ?? 99)
      },
    }),
    [],
  )

  const handleDeleteEntitlement = async (record) => {
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
    return record[column.key] ?? '-'
  }

  return (
    <CCard className="mb-4">
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

        <DataTableRecordList
          rows={filteredRows}
          dataColumns={dataColumns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey="staff.leaves.entitlements.visible-columns.v4"
          idPrefix="staff-leave-entitlement"
          emptyMessage="No leave entitlement records match these filters."
          exportFilename={`leave-entitlements-${new Date().toISOString().slice(0, 10)}.csv`}
          getRowKey={(record, index) =>
            record.id || `${record.rowKind}-${record.staff_id}-${index}`
          }
          renderCell={renderCell}
          getActions={getActions}
          actionColumnWidth="56px"
          getMobileTitle={(record) => record.staff}
          getMobileSubtitle={(record) => `${record.leaveType} | ${record.coverage}`}
          getMobileMeta={(record) => `Remaining: ${record.remainingDisplay}`}
          getMobileStatus={(record) => record.coverage}
          getMobileStatusTone={(record) => getCoverageTone(record.coverage)}
          mobileFieldKeys={{
            title: 'staff',
            subtitle: ['leaveType', 'coverage'],
            meta: 'remaining',
            status: 'coverage',
          }}
          initialSortField="staff"
          initialSortDir="asc"
          initialSortDirByField={{ year: 'desc', remaining: 'desc' }}
          sortComparators={sortComparators}
          resetDeps={[filteredRows, viewStaff, searchTerm]}
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId="entitlements-table-tools"
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId="entitlements-mobile-table-tools"
          showMobileUtilityRow={false}
        />
      </CCardBody>
    </CCard>
  )
}

export default SectionViewAssignments
