import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
  CCard,
  CCardBody,
  CCardHeader,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import DataTableRecordControls from '../../../components/datatable/DataTableRecordControls'
import DataTableRecordList from '../../../components/datatable/DataTableRecordList'
import DataTableTextCell from '../../../components/datatable/DataTableTextCell'
import dialog from '../../../components/dialog/dialogService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { staffModuleTabs } from '../../../components/navigation/moduleNavConfigs'

const dataColumns = [
  { key: 'fullName', label: 'Full Name', width: '220px', sortable: true, sortType: 'string' },
  { key: 'ic', label: 'IC', width: '150px', sortable: true, sortType: 'string', shrinkToFit: true },
  {
    key: 'mobile',
    label: 'Mobile',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  { key: 'email', label: 'Email', width: '180px', sortable: true, sortType: 'string' },
  { key: 'position', label: 'Position', width: '180px', sortable: true, sortType: 'string' },
  { key: 'department', label: 'Department', width: '160px', sortable: true, sortType: 'string' },
  {
    key: 'staffType',
    label: 'Type',
    width: '130px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
]

const defaultVisibleColumns = {
  fullName: true,
  ic: true,
  mobile: true,
  email: true,
  position: false,
  department: false,
  staffType: false,
  status: false,
}

const requiredColumns = new Set(['fullName'])

export default function ManageStaff() {
  const [staffList, setStaffList] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [staffTypeFilter, setStaffTypeFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}staff/manage`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') setStaffList(data.staff)
        else console.error('Error fetching staff:', data.message)
      })
      .catch((err) => console.error('Fetch error:', err))
  }, [])

  const refreshStaff = useCallback(async () => {
    const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/manage`, {
      credentials: 'include',
    })
    const data = await res.json()
    if (data.status === 'success') setStaffList(data.staff)
  }, [])

  const handleOpenDetail = useCallback(
    (staffId) => navigate(`/staff/manage/${staffId}`),
    [navigate],
  )

  const handleCreateStaff = useCallback(() => navigate('/staff/create'), [navigate])

  const handleEditStaff = useCallback(
    (staffId) => navigate(`/staff/create?edit_id=${staffId}`),
    [navigate],
  )

  const handleTerminateStaff = useCallback(
    async (staffId) => {
      if (
        !(await dialog.confirm('Are you sure? This cannot be undone.', {
          confirmText: 'Terminate',
          confirmColor: 'danger',
        }))
      )
        return
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}hr/staff/${encodeURIComponent(staffId)}/terminate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ staff_id: staffId }),
          },
        )
        const result = await res.json()
        if (result.status === 'success') {
          dialog.alert('Staff terminated successfully.')
          await refreshStaff()
        } else {
          dialog.alert(`Failed: ${result.message}`)
        }
      } catch {
        dialog.alert('Server error during termination.')
      }
    },
    [refreshStaff],
  )

  const statusOptions = useMemo(
    () => [...new Set(staffList.map((s) => s.status).filter(Boolean))].sort(),
    [staffList],
  )

  const departmentOptions = useMemo(
    () => [...new Set(staffList.map((s) => s.department).filter(Boolean))].sort(),
    [staffList],
  )

  const staffTypeOptions = useMemo(
    () => [...new Set(staffList.map((s) => s.staff_type).filter(Boolean))].sort(),
    [staffList],
  )

  const activeChips = useMemo(
    () =>
      [
        statusFilter ? { key: 'status', label: `Status: ${statusFilter}` } : null,
        departmentFilter ? { key: 'department', label: `Dept: ${departmentFilter}` } : null,
        staffTypeFilter ? { key: 'staffType', label: `Type: ${staffTypeFilter}` } : null,
      ].filter(Boolean),
    [statusFilter, departmentFilter, staffTypeFilter],
  )

  const activeFilterCount = activeChips.length

  const clearChip = useCallback((key) => {
    if (key === 'status') setStatusFilter('')
    if (key === 'department') setDepartmentFilter('')
    if (key === 'staffType') setStaffTypeFilter('')
  }, [])

  const resetFilters = useCallback(() => {
    setSearchTerm('')
    setStatusFilter('')
    setDepartmentFilter('')
    setStaffTypeFilter('')
  }, [])

  const filteredRows = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return staffList
      .filter((staff) => {
        const matchesSearch =
          !term ||
          staff.full_name?.toLowerCase().includes(term) ||
          staff.name_code?.toLowerCase().includes(term) ||
          staff.email?.toLowerCase().includes(term) ||
          staff.mobile_number?.toLowerCase().includes(term) ||
          staff.position?.toLowerCase().includes(term) ||
          staff.department?.toLowerCase().includes(term) ||
          staff.staff_type?.toLowerCase().includes(term) ||
          staff.status?.toLowerCase().includes(term)

        const matchesStatus = !statusFilter || staff.status === statusFilter
        const matchesDepartment = !departmentFilter || staff.department === departmentFilter
        const matchesStaffType = !staffTypeFilter || staff.staff_type === staffTypeFilter

        return matchesSearch && matchesStatus && matchesDepartment && matchesStaffType
      })
      .map((staff) => ({
        ...staff,
        fullName: staff.full_name || '-',
        ic: staff.ic || '-',
        mobile: staff.mobile_number || '-',
        email: staff.email || '-',
        position: staff.position || '-',
        department: staff.department || '-',
        staffType: staff.staff_type || '-',
        status: staff.status || '-',
      }))
  }, [staffList, searchTerm, statusFilter, departmentFilter, staffTypeFilter])

  const getActions = useCallback(
    (staff) =>
      [
        { key: 'view', label: 'View Details', onClick: () => handleOpenDetail(staff.staff_id) },
        { key: 'edit', label: 'Edit', onClick: () => handleEditStaff(staff.staff_id) },
        staff.status !== 'Inactive'
          ? {
              key: 'terminate',
              label: 'Terminate',
              danger: true,
              dividerBefore: true,
              onClick: () => handleTerminateStaff(staff.staff_id),
            }
          : null,
      ].filter(Boolean),
    [handleOpenDetail, handleEditStaff, handleTerminateStaff],
  )

  const renderCell = useCallback((staff, column) => {
    if (column.key === 'fullName' || column.key === 'email') {
      return (
        <DataTableTextCell value={staff[column.key]} maxWidth={column.width} title={column.label} />
      )
    }
    return staff[column.key] ?? '-'
  }, [])

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={staffModuleTabs} ariaLabel="Staff sections" />
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <strong>Manage Staff</strong>
                <CButton size="sm" color="primary" onClick={handleCreateStaff}>
                  <CIcon icon={cilPlus} className="me-1" />
                  Create Staff
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              <DataTableRecordControls
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search by name, code, email, mobile, position, or department…"
                searchAriaLabel="Search staff"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="staff-manage-table-tools"
                mobileToolsId="staff-manage-mobile-table-tools"
              >
                <CCol xs={6} md={3} lg={2}>
                  <CFormLabel htmlFor="staff-filter-status">Status</CFormLabel>
                  <CFormSelect
                    id="staff-filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={6} md={3} lg={3}>
                  <CFormLabel htmlFor="staff-filter-department">Department</CFormLabel>
                  <CFormSelect
                    id="staff-filter-department"
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                  >
                    <option value="">All departments</option>
                    {departmentOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={6} md={3} lg={2}>
                  <CFormLabel htmlFor="staff-filter-type">Type</CFormLabel>
                  <CFormSelect
                    id="staff-filter-type"
                    value={staffTypeFilter}
                    onChange={(e) => setStaffTypeFilter(e.target.value)}
                  >
                    <option value="">All types</option>
                    {staffTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>

              <DataTableRecordList
                rows={filteredRows}
                dataColumns={dataColumns}
                defaultVisibleColumns={defaultVisibleColumns}
                requiredColumns={requiredColumns}
                storageKey="staff.manage.visible-columns.v3"
                idPrefix="staff-manage"
                emptyMessage="No staff records found."
                exportFilename="staff-records.csv"
                getRowKey={(staff, index) => staff.staff_id || index}
                actionColumnWidth="56px"
                getActions={getActions}
                renderCell={renderCell}
                onRowOpen={(staff) => handleOpenDetail(staff.staff_id)}
                desktopUtilityPlacement="portal"
                desktopUtilityPortalId="staff-manage-table-tools"
                mobileUtilityPlacement="portal"
                mobileUtilityPortalId="staff-manage-mobile-table-tools"
                showMobileUtilityRow={false}
                getMobileTitle={(staff) => staff.fullName}
                getMobileSubtitle={(staff) => staff.email}
                getMobileMeta={(staff) => `${staff.ic} | ${staff.mobile}`}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}
