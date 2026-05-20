import React, { useMemo, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import Select from '../../../components/forms/ThemedSelect'
import { DataTableRecordControls, DataTableRecordList } from '../../../components/datatable'
import * as AH from './actionHandlers'
import dialog from '../../../components/dialog/dialogService'

const dataColumns = [
  {
    key: 'leaveType',
    label: 'Leave Type',
    width: '160px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'year',
    label: 'Year',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'totalDays',
    label: 'Total Days',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'usedDays',
    label: 'Used Days',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'remaining',
    label: 'Remaining',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
]

const defaultVisibleColumns = {
  leaveType: true,
  year: true,
  totalDays: true,
  usedDays: true,
  remaining: true,
}

const requiredColumns = new Set(['leaveType', 'year'])

const SectionViewAssignments = ({
  staffList = [],
  entitlements = [],
  onDelete,
  onEdit,
  onAssign,
  onViewRecords,
}) => {
  const [viewStaff, setViewStaff] = useState(null)
  const [filterYear, setFilterYear] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const staffOptions = useMemo(
    () =>
      staffList.map((s) => ({
        value: s.staff_id,
        label: `${s.full_name} (${s.name_code})`,
      })),
    [staffList],
  )

  const years = useMemo(
    () => [...new Set(entitlements.map((e) => e.year))].sort((a, b) => b - a),
    [entitlements],
  )

  const types = useMemo(
    () => [...new Set(entitlements.map((e) => e.leave_type))].sort(),
    [entitlements],
  )

  const activeChips = useMemo(
    () =>
      [
        viewStaff ? { key: 'staff', label: `Staff: ${viewStaff.label.split(' (')[0]}` } : null,
        filterYear ? { key: 'year', label: `Year: ${filterYear}` } : null,
        filterType ? { key: 'type', label: `Type: ${filterType}` } : null,
      ].filter(Boolean),
    [viewStaff, filterYear, filterType],
  )

  const activeFilterCount = useMemo(
    () => [!!viewStaff, !!filterYear, !!filterType].filter(Boolean).length,
    [viewStaff, filterYear, filterType],
  )

  const clearChip = (key) => {
    if (key === 'staff') setViewStaff(null)
    if (key === 'year') setFilterYear('')
    if (key === 'type') setFilterType('')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setViewStaff(null)
    setFilterYear('')
    setFilterType('')
  }

  const filtered = useMemo(
    () =>
      entitlements.filter((e) => {
        if (!viewStaff || e.staff_id !== viewStaff.value) return false
        if (filterYear && e.year.toString() !== filterYear) return false
        if (filterType && e.leave_type !== filterType) return false
        const term = searchTerm.trim().toLowerCase()
        if (term && !e.leave_type?.toLowerCase().includes(term)) return false
        return true
      }),
    [entitlements, viewStaff, filterYear, filterType, searchTerm],
  )

  const normalizedRows = useMemo(
    () =>
      filtered.map((record) => ({
        ...record,
        leaveType: record.leave_type || '-',
        totalDays: Number(record.total_days || 0),
        usedDays: Number(record.used_days || 0),
        remaining: Number(record.total_days || 0) - Number(record.used_days || 0),
        remainingDisplay: (Number(record.total_days || 0) - Number(record.used_days || 0)).toFixed(
          1,
        ),
      })),
    [filtered],
  )

  const handleDeleteEntitlement = async (record) => {
    const confirmed = await dialog.confirm(
      `Are you sure you want to delete the ${record.leave_type} entitlement for ${record.year}?`,
    )
    if (!confirmed) return
    try {
      await AH.deleteEntitlement(record.id)
      dialog.alert('Entitlement deleted successfully.')
      onDelete()
    } catch (err) {
      console.error(err)
      dialog.alert(`Failed to delete entitlement: ${err.message}`)
    }
  }

  const getActions = (record) => [
    { key: 'edit', label: 'Edit', onClick: () => onEdit(record) },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => handleDeleteEntitlement(record),
    },
  ]

  const renderCell = (record, column) => {
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
          searchPlaceholder="Search leave type..."
          searchAriaLabel="Search entitlements"
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          activeFilterCount={activeFilterCount}
          activeChips={activeChips}
          clearChip={clearChip}
          resetFilters={resetFilters}
          desktopToolsId="entitlements-table-tools"
          mobileToolsId="entitlements-mobile-table-tools"
          inlineFilter={
            <Select
              options={staffOptions}
              value={viewStaff}
              onChange={setViewStaff}
              placeholder="Select staff..."
              isClearable
              styles={{
                container: (b) => ({ ...b, minWidth: '220px' }),
                option: (b) => ({ ...b, textTransform: 'capitalize' }),
                singleValue: (b) => ({ ...b, textTransform: 'capitalize' }),
              }}
            />
          }
        >
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel htmlFor="entitlement-filter-year">Year</CFormLabel>
            <CFormSelect
              id="entitlement-filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel htmlFor="entitlement-filter-type">Leave Type</CFormLabel>
            <CFormSelect
              id="entitlement-filter-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </CFormSelect>
          </CCol>
        </DataTableRecordControls>

        <DataTableRecordList
          rows={normalizedRows}
          dataColumns={dataColumns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey="staff.leaves.entitlements.visible-columns.v3"
          idPrefix="staff-leave-entitlement"
          emptyMessage={
            viewStaff ? 'No entitlements found.' : 'Select a staff member to view entitlements.'
          }
          exportFilename={`leave-entitlements-${new Date().toISOString().slice(0, 10)}.csv`}
          getRowKey={(record, index) => record.id || index}
          renderCell={renderCell}
          getActions={getActions}
          actionColumnWidth="56px"
          getMobileTitle={(record) => record.leaveType}
          getMobileSubtitle={(record) => String(record.year)}
          getMobileMeta={(record) => `Remaining: ${record.remainingDisplay}`}
          mobileFieldKeys={{
            title: 'leaveType',
            subtitle: 'year',
            meta: 'remaining',
          }}
          initialSortField="year"
          initialSortDir="desc"
          initialSortDirByField={{ year: 'desc', remaining: 'desc' }}
          resetDeps={[filtered, viewStaff, filterYear, filterType, searchTerm]}
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
