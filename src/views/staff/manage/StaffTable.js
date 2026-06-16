import React, { useMemo } from 'react'
import { CCardBody } from '@coreui/react'
import { DataTableRecordList, DataTableTextCell } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'

const emptyValue = '-'
const columnStorageKey = 'staff.manage.visible-columns.v3'
const columnPreferenceApiKey = 'staff-manage-visible-columns-v3'

const defaultVisibleColumns = {
  fullName: true,
  ic: true,
  mobile: true,
  email: true,
}

const requiredColumns = new Set(['fullName'])

const dataColumns = [
  {
    key: 'fullName',
    label: 'Full Name',
    width: '220px',
    sortable: true,
    sortType: 'string',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  { key: 'ic', label: 'IC', width: '150px', sortable: true, sortType: 'string', noWrap: true },
  {
    key: 'mobile',
    label: 'Mobile',
    width: '140px',
    sortable: true,
    sortType: 'string',
    noWrap: true,
  },
  {
    key: 'email',
    label: 'Email',
    width: '180px',
    sortable: true,
    sortType: 'string',
    cellMaxWidth: '180px',
  },
]

const StaffTable = ({ staffList = [], onView, onEdit, onTerminate, statsVisible = true }) => {
  const rows = useMemo(
    () =>
      staffList.map((staff) => ({
        ...staff,
        fullName: staff.full_name || emptyValue,
        ic: staff.ic || emptyValue,
        mobile: staff.mobile_number || emptyValue,
        email: staff.email || emptyValue,
      })),
    [staffList],
  )

  const statsItems = useMemo(() => {
    const activeRows = rows.filter(
      (staff) => String(staff.status || '').toLowerCase() !== 'inactive',
    )
    const inactiveRows = rows.filter(
      (staff) => String(staff.status || '').toLowerCase() === 'inactive',
    )
    const topDepartment = getTopGroupByCount(
      activeRows,
      (staff) => staff.department || staff.department_name,
    )

    return [
      {
        key: 'staff',
        label: 'Staff',
        value: formatCount(rows.length),
        tone: 'primary',
      },
      {
        key: 'active',
        label: 'Active',
        value: formatCount(activeRows.length),
        tone: 'success',
      },
      {
        key: 'inactive',
        label: 'Inactive',
        value: formatCount(inactiveRows.length),
        tone: 'secondary',
      },
      {
        key: 'top-department',
        label: 'Top Department',
        value: topDepartment.value,
        sublabel: `${formatCount(topDepartment.count)} active staff`,
        tone: 'info',
      },
    ]
  }, [rows])

  const getActions = (staff) =>
    [
      {
        key: 'edit',
        label: 'Edit',
        onClick: () => onEdit?.(staff.staff_id),
      },
      {
        key: 'view',
        label: 'View More',
        onClick: () => onView?.(staff.staff_id),
      },
      staff.status !== 'Inactive'
        ? {
            key: 'terminate',
            label: 'Terminate',
            danger: true,
            dividerBefore: true,
            onClick: () => onTerminate?.(staff.staff_id),
          }
        : null,
    ].filter(Boolean)

  const renderCell = (staff, column) => {
    if (column.key === 'fullName' || column.key === 'email') {
      return (
        <DataTableTextCell
          value={staff[column.key]}
          maxWidth={column.cellMaxWidth || column.width}
          title={column.label}
        />
      )
    }

    return staff[column.key] || emptyValue
  }

  return (
    <CCardBody>
      {statsVisible && <StatsStrip items={statsItems} />}
      <DataTableRecordList
        rows={rows}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey={columnStorageKey}
        scrollStorageKey="staff.manage.table.scroll"
        apiKey={columnPreferenceApiKey}
        idPrefix="staff-table"
        emptyMessage="No staff records found."
        exportFilename={`staff-records-${new Date().toISOString().slice(0, 10)}.csv`}
        getRowKey={(staff, index) => staff.staff_id || index}
        renderCell={renderCell}
        getActions={getActions}
        getMobileTitle={(staff) => staff.fullName}
        getMobileSubtitle={(staff) => staff.email}
        getMobileMeta={(staff) => `${staff.ic} | ${staff.mobile}`}
        mobileFieldKeys={{
          title: 'fullName',
          subtitle: 'email',
          meta: ['ic', 'mobile'],
        }}
        initialSortField="fullName"
        resetDeps={[staffList]}
      />
    </CCardBody>
  )
}

export default StaffTable
