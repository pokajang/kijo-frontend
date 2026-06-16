import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import {
  DataTableDetailFields,
  DataTableDetailShell,
  DataTableRecordList,
  DataTableStatusBadge,
} from '../../../components/datatable'
import { ASSIGNABLE_LEAVE_TYPES } from '../../../components/leave/leaveTypes'
import {
  formatLeaveBalanceDays,
  normalizeLeaveType,
} from '../../../components/leave/leaveBalanceSummary'
import * as AH from './actionHandlers'

const currentYear = new Date().getFullYear()
const allTimeValue = '__all_time__'

const dataColumns = [
  {
    key: 'leaveType',
    label: 'Leave Type',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.leaveType,
  },
  {
    key: 'coverage',
    label: 'Coverage',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.coverage,
  },
  {
    key: 'assigned',
    label: 'Assigned',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.assignedDisplay,
  },
  {
    key: 'used',
    label: 'Used',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.usedDisplay,
  },
  {
    key: 'balance',
    label: 'Balance',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.balanceDisplay,
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

const defaultVisibleColumns = {
  leaveType: true,
  coverage: true,
  assigned: true,
  used: true,
  balance: true,
  remarks: true,
}

const requiredColumns = new Set(['leaveType'])

const hasValue = (value) => value !== null && typeof value !== 'undefined' && value !== ''

const toNumber = (value) => {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number : 0
}

const getEntitlementBalance = (entitlement = {}) => {
  if (hasValue(entitlement.remaining)) return toNumber(entitlement.remaining)
  return toNumber(entitlement.total_days) - toNumber(entitlement.used_days)
}

const formatStaff = (staff = {}) => {
  const name = staff.full_name || staff.name || staff.applicant_name || 'Unknown Staff'
  const code = staff.name_code || staff.staff_code || staff.applicant_code || ''
  return code ? `${name} (${code})` : name
}

const getStaffId = (record = {}) => record.staff_id ?? record.id

const getStaffFromEntitlement = (entitlement = {}) => ({
  staff_id: entitlement.staff_id,
  full_name: entitlement.full_name,
  name_code: entitlement.name_code,
})

const getCoverageTone = (coverage) => (coverage === 'Assigned' ? 'success' : 'warning')

const buildEntitlementRows = (entitlements = [], periodValue = String(currentYear)) => {
  const scopedEntitlements =
    periodValue === allTimeValue
      ? entitlements
      : entitlements.filter((entitlement) => String(entitlement.year) === String(periodValue))

  return ASSIGNABLE_LEAVE_TYPES.map((leaveType) => {
    const typeEntitlements = scopedEntitlements.filter(
      (entitlement) => normalizeLeaveType(entitlement.leave_type) === normalizeLeaveType(leaveType),
    )
    const assigned = typeEntitlements.reduce(
      (sum, entitlement) => sum + toNumber(entitlement.total_days),
      0,
    )
    const used = typeEntitlements.reduce(
      (sum, entitlement) => sum + toNumber(entitlement.used_days),
      0,
    )
    const balance = typeEntitlements.reduce(
      (sum, entitlement) => sum + getEntitlementBalance(entitlement),
      0,
    )
    const coverage = typeEntitlements.length > 0 ? 'Assigned' : 'Missing'
    const entitlementId =
      periodValue === allTimeValue || typeEntitlements.length !== 1 ? null : typeEntitlements[0].id
    const remarksDisplay =
      periodValue !== allTimeValue &&
      typeEntitlements.length === 1 &&
      hasValue(typeEntitlements[0].remarks)
        ? typeEntitlements[0].remarks
        : '-'

    return {
      id: `${normalizeLeaveType(leaveType).replace(/\s+/g, '-')}-${periodValue}`,
      entitlementId,
      leaveType,
      coverage,
      assigned,
      used,
      balance,
      assignedDisplay: formatLeaveBalanceDays(assigned),
      usedDisplay: formatLeaveBalanceDays(used),
      balanceDisplay: formatLeaveBalanceDays(balance),
      remarksDisplay,
    }
  })
}

const StaffLeaveEntitlementDetailPage = () => {
  const { staffId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = location.state?.returnTo || '/staff/leaves/entitlements'
  const [staffList, setStaffList] = useState(() =>
    location.state?.staff ? [location.state.staff] : [],
  )
  const [entitlements, setEntitlements] = useState(() => location.state?.entitlements || [])
  const [loading, setLoading] = useState(!location.state?.entitlements || !location.state?.staff)
  const [error, setError] = useState('')
  const [periodValue, setPeriodValue] = useState(String(currentYear))

  const loadDetails = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [staff, allocations] = await Promise.all([AH.getStaffList(), AH.getAllEntitlements()])
      setStaffList(staff)
      setEntitlements(
        allocations.filter((entitlement) => String(entitlement.staff_id) === String(staffId)),
      )
    } catch (err) {
      setError(err?.message || 'Unable to load entitlement details.')
    } finally {
      setLoading(false)
    }
  }, [staffId])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const staff = useMemo(() => {
    const fromStaffList = staffList.find((item) => String(getStaffId(item)) === String(staffId))
    if (fromStaffList) return fromStaffList
    const fromEntitlement = entitlements.find(
      (entitlement) => String(entitlement.staff_id) === String(staffId),
    )
    return fromEntitlement ? getStaffFromEntitlement(fromEntitlement) : null
  }, [entitlements, staffId, staffList])

  const yearOptions = useMemo(() => {
    const years = Array.from(
      new Set([
        currentYear,
        ...entitlements
          .map((entitlement) => Number(entitlement.year))
          .filter((year) => Number.isFinite(year)),
      ]),
    ).sort((left, right) => right - left)

    return years
  }, [entitlements])

  const rows = useMemo(
    () => buildEntitlementRows(entitlements, periodValue),
    [entitlements, periodValue],
  )

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          assigned: acc.assigned + row.assigned,
          used: acc.used + row.used,
          balance: acc.balance + row.balance,
        }),
        { assigned: 0, used: 0, balance: 0 },
      ),
    [rows],
  )

  const renderCell = (record, column) => {
    if (column.key === 'coverage') {
      return (
        <DataTableStatusBadge tone={getCoverageTone(record.coverage)}>
          {record.coverage}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'assigned') return record.assignedDisplay
    if (column.key === 'used') return record.usedDisplay
    if (column.key === 'balance') return record.balanceDisplay
    if (column.key === 'remarks') return record.remarksDisplay
    return record[column.key] ?? '-'
  }

  const getActions = (record) => {
    if (!record.entitlementId) return []

    return [
      {
        key: 'edit',
        label: 'Edit',
        onClick: () =>
          navigate(`/staff/leaves/entitlements/${record.entitlementId}/edit`, {
            state: {
              returnTo: `${location.pathname}${location.search}`,
            },
          }),
      },
    ]
  }

  return (
    <DataTableDetailShell
      title="Leave Entitlement Details"
      onBack={() => navigate(returnTo)}
      loading={loading}
      error={error}
      record={staff}
      emptyMessage="Leave entitlement staff not found."
    >
      <DataTableDetailFields
        fields={[
          { key: 'staff', label: 'Staff', value: formatStaff(staff) },
          {
            key: 'scope',
            label: 'Scope',
            value: periodValue === allTimeValue ? 'All Time' : periodValue,
          },
          { key: 'assigned', label: 'Assigned', value: formatLeaveBalanceDays(totals.assigned) },
          { key: 'used', label: 'Used', value: formatLeaveBalanceDays(totals.used) },
          { key: 'balance', label: 'Balance', value: formatLeaveBalanceDays(totals.balance) },
        ]}
        className="mb-3"
      />

      <CRow className="g-3 align-items-end mb-3">
        <CCol xs={12} md={4} lg={3}>
          <CFormLabel htmlFor="leave-entitlement-detail-period">Period</CFormLabel>
          <CFormSelect
            id="leave-entitlement-detail-period"
            aria-label="Entitlement period"
            value={periodValue}
            onChange={(event) => setPeriodValue(event.target.value)}
          >
            <option value={allTimeValue}>All Time</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </CRow>

      <DataTableRecordList
        rows={rows}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="staff.leaves.entitlement-detail.visible-columns.v2"
        scrollStorageKey="staff.leaves.entitlement-detail.scroll"
        idPrefix="staff-leave-entitlement-detail"
        emptyMessage="No entitlement balances found."
        exportFilename={`leave-entitlement-${staffId}-${new Date().toISOString().slice(0, 10)}.csv`}
        getRowKey={(record) => record.id}
        renderCell={renderCell}
        getActions={getActions}
        actionColumnWidth="56px"
        getMobileTitle={(record) => record.leaveType}
        getMobileSubtitle={(record) => record.coverage}
        getMobileMeta={(record) =>
          record.remarksDisplay && record.remarksDisplay !== '-'
            ? `Balance: ${record.balanceDisplay} | Remarks: ${record.remarksDisplay}`
            : `Balance: ${record.balanceDisplay}`
        }
        getMobileStatus={(record) => record.coverage}
        getMobileStatusTone={(record) => getCoverageTone(record.coverage)}
        mobileFieldKeys={{
          title: 'leaveType',
          subtitle: 'coverage',
          meta: ['balance', 'remarks'],
          status: 'coverage',
        }}
        initialSortField="leaveType"
        initialSortDir="asc"
        initialSortDirByField={{ assigned: 'desc', used: 'desc', balance: 'desc' }}
        showDesktopSummary={false}
        showColumnMenu={false}
        showMobileUtilityRow={false}
        className="leave-entitlement-detail-table"
      />
    </DataTableDetailShell>
  )
}

export default StaffLeaveEntitlementDetailPage
