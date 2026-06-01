// src/components/PaymentTable.jsx

import React, { useMemo, useState } from 'react'
import { CButton, CCol, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  getPeriodRangePreset,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../components/filters'
import { StatsStrip } from '../../../components/stats'
import { formatCount, formatMoney, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'

const dataColumns = [
  { key: 'vendor', label: 'Vendor', width: '180px', sortable: true, sortType: 'string' },
  {
    key: 'requested',
    label: 'Date Requested',
    width: '170px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'approved',
    label: 'Date Approved',
    width: '170px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'paymentFor',
    label: 'For',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'paymentType',
    label: 'Payment Type',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'method',
    label: 'Method',
    width: '120px',
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
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'workflow',
    label: 'Workflow',
    width: '260px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '260px',
    previewCharThreshold: 42,
  },
  {
    key: 'amount',
    label: 'Amount (RM)',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
]

const defaultVisibleColumns = {
  vendor: true,
  requested: true,
  approved: false,
  paymentFor: true,
  paymentType: true,
  method: false,
  status: true,
  workflow: true,
  amount: true,
}

const requiredColumns = new Set(['vendor', 'status', 'workflow', 'amount'])

const getStatusTone = (status) => {
  switch (status) {
    case 'Approved':
    case 'Paid':
      return 'success'
    case 'Pending':
      return 'warning'
    case 'Rejected':
      return 'danger'
    default:
      return 'info'
  }
}

const grandTotal = (payments) =>
  payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

const getWorkflowText = (payment = {}) => {
  if (payment.status === 'Pending') return 'Pending review'
  if (payment.status === 'Checked') return 'Pending approval'
  if (payment.status === 'Approved') return 'Ready for payment'
  if (payment.status === 'Paid') return 'Paid'
  if (payment.status === 'Rejected') return 'Rejected'
  return payment.status || '-'
}

const parseWorkflowProgress = (payment = {}) => {
  const raw =
    payment.workflow_progress || payment.workflowProgress || payment.workflow_progress_json
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'string' || raw.trim() === '') return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const getProgressLabel = (entry = {}) => {
  const stageType = entry.stageType || entry.stage_type || ''
  const levelNo = Number(entry.levelNo || entry.level_no || 0)
  if (entry.label) return entry.label
  if (stageType === 'review') return levelNo > 1 ? `Review Level ${levelNo}` : 'Review'
  if (stageType === 'approval') return levelNo > 1 ? `Approval Level ${levelNo}` : 'Approval'
  if (stageType === 'finance') return 'Finance'
  return 'Workflow'
}

const getProgressStatus = (entry = {}) => {
  const stageType = entry.stageType || entry.stage_type || ''
  if (entry.status) return entry.status
  if (stageType === 'review') return 'Reviewed'
  if (stageType === 'approval') return 'Approved'
  if (stageType === 'finance') return 'Paid'
  return 'Completed'
}

const getProgressActor = (entry = {}) => {
  const actorName = entry.actorName || entry.actor_name || ''
  const actorCode = entry.actorCode || entry.actor_code || ''
  const staffId = entry.staffId || entry.staff_id || ''
  if (actorName && actorCode) return `${actorName} (${actorCode})`
  if (actorName) return actorName
  if (actorCode) return actorCode
  return staffId ? `Staff #${staffId}` : ''
}

const buildWorkflowProgressStep = (entry = {}) =>
  [
    `${getProgressLabel(entry)}: ${getProgressStatus(entry)}`,
    getProgressActor(entry) ? `by ${getProgressActor(entry)}` : '',
    entry.completedAt || entry.completed_at ? `at ${entry.completedAt || entry.completed_at}` : '',
    entry.remarks ? `Remarks: ${entry.remarks}` : '',
  ]
    .filter(Boolean)
    .join(' ')

const getWorkflowSteps = (payment = {}) =>
  parseWorkflowProgress(payment).map(buildWorkflowProgressStep).filter(Boolean)

const PaymentTable = ({
  payments = [],
  loading = false,
  periodRange,
  onPeriodRangeChange,
  staffRoles = [],
  onView,
  onCheck,
  onApprove,
  onReject,
  onReturn,
  onMarkPaid,
  onDelete,
  searchPlaceholder = 'Search payments',
  statsVisible = true,
  controlsVisible = true,
}) => {
  const [searchText, setSearchText] = useState('')
  const [localPeriodRange, setLocalPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const selectedPeriodRange = periodRange || localPeriodRange
  const handlePeriodRangeChange = onPeriodRangeChange || setLocalPeriodRange
  const [statusFilter, setStatusFilter] = useState('actionable')
  const [methodFilter, setMethodFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const normalizedRoles = useMemo(
    () => staffRoles.map((role) => String(role || '').toLowerCase()),
    [staffRoles],
  )
  const canCheckApprove = normalizedRoles.some((role) =>
    ['manager', 'system admin'].some((allowedRole) => role.includes(allowedRole)),
  )
  const canMarkPaid = normalizedRoles.some((role) =>
    ['manager', 'system admin', 'finance', 'account', 'bank'].some((allowedRole) =>
      role.includes(allowedRole),
    ),
  )

  const normalizedPayments = useMemo(
    () =>
      payments.map((payment) => {
        const workflowSteps = getWorkflowSteps(payment)
        const pendingWorkflowText = getWorkflowText(payment)
        return {
          ...payment,
          vendor: payment.vendor_name || '-',
          requested: payment.created_at || '',
          requestedDisplay: `${payment.created_at?.split(' ')[0] || '-'} (${payment.created_by_name_code || '-'})`,
          approved: payment.date_approved || '',
          approvedDisplay: `${payment.date_approved?.split(' ')[0] || '-'} (${payment.approved_by_name_code || '-'})`,
          paymentFor: payment.project_name || payment.payment_context || '-',
          remarks: payment.remarks || 'No remarks provided',
          paymentType: payment.payment_type || '-',
          method: payment.method || '-',
          status: payment.status || '-',
          workflowSteps,
          workflow: [...workflowSteps, pendingWorkflowText].filter(Boolean).join('\n'),
          pendingWorkflowText,
          amount: Number(payment.amount || 0),
          amountDisplay: `RM ${Number(payment.amount || 0).toFixed(2)}`,
          paidDate: payment.paid_date || '',
          checkedBy: payment.checked_by || '',
          approvedBy: payment.approved_by || '',
        }
      }),
    [payments],
  )

  const methodOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedPayments.map((payment) => payment.method).filter(Boolean)),
      ).sort(),
    [normalizedPayments],
  )

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedPayments.map((payment) => payment.status).filter(Boolean)),
      ).sort(),
    [normalizedPayments],
  )

  const filteredPayments = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return normalizedPayments.filter((payment) => {
      const matchesSearch =
        !q ||
        [
          payment.vendor,
          payment.paymentFor,
          payment.remarks,
          payment.paymentType,
          payment.method,
          payment.status,
          payment.workflow,
          payment.created_by_name_code,
          payment.approved_by_name_code,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(q),
        )
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'actionable' &&
          ['Pending', 'Checked', 'Approved'].includes(payment.status)) ||
        payment.status === statusFilter
      const matchesPeriod = isDateInPeriodRange(payment.requested, selectedPeriodRange)
      return matchesSearch && matchesPeriod && matchesMethod && matchesStatus
    })
  }, [methodFilter, normalizedPayments, selectedPeriodRange, searchText, statusFilter])

  const statsItems = useMemo(() => {
    const pendingRows = filteredPayments.filter((payment) => payment.status === 'Pending')
    const topRequester = getTopGroupBySum(
      filteredPayments,
      (payment) => payment.created_by_name_code,
      (payment) => payment.amount,
    )

    return [
      {
        key: 'requests',
        label: 'Requests',
        value: formatCount(filteredPayments.length),
        tone: 'primary',
      },
      {
        key: 'total',
        label: 'Total Amount',
        value: formatMoney(sumBy(filteredPayments, (payment) => payment.amount)),
        tone: 'info',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatCount(pendingRows.length),
        sublabel: formatMoney(sumBy(pendingRows, (payment) => payment.amount)),
        tone: 'warning',
        onClick: () => {
          setStatusFilter('Pending')
          setShowAdvancedFilters(true)
        },
      },
      {
        key: 'top-requester',
        label: 'Top Requester',
        value: topRequester.value,
        sublabel: `${formatMoney(topRequester.total)} across ${formatCount(
          topRequester.count,
        )} requests`,
        tone: 'secondary',
      },
    ]
  }, [filteredPayments])

  const resetFilters = () => {
    setSearchText('')
    handlePeriodRangeChange(getPeriodRangePreset('ytd'))
    setStatusFilter('actionable')
    setMethodFilter('all')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'period') handlePeriodRangeChange(getPeriodRangePreset('ytd'))
    if (key === 'status') setStatusFilter('actionable')
    if (key === 'method') setMethodFilter('all')
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    selectedPeriodRange && !isDefaultPeriodRange(selectedPeriodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(selectedPeriodRange)}` }
      : null,
    statusFilter !== 'actionable' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
    methodFilter !== 'all' ? { key: 'method', label: `Method: ${methodFilter}` } : null,
  ].filter(Boolean)

  const getPaymentPermissions = (payment) => {
    const canCheck = typeof payment.can_check === 'boolean' ? payment.can_check : canCheckApprove
    const canApprove =
      typeof payment.can_approve === 'boolean' ? payment.can_approve : canCheckApprove
    const canReturn = typeof payment.can_return === 'boolean' ? payment.can_return : canCheckApprove
    const canReject = typeof payment.can_reject === 'boolean' ? payment.can_reject : canCheckApprove
    const canDelete = typeof payment.can_delete === 'boolean' ? payment.can_delete : canCheckApprove
    const canPay = typeof payment.can_mark_paid === 'boolean' ? payment.can_mark_paid : canMarkPaid

    return { canCheck, canApprove, canReturn, canReject, canDelete, canPay }
  }

  const getWorkflowActions = (payment) => {
    const paymentId = payment.id || payment.payment_id
    const status = payment.status
    const { canCheck, canApprove, canReturn, canReject, canPay } = getPaymentPermissions(payment)

    return [
      status === 'Pending' && canCheck && typeof onCheck === 'function'
        ? {
            key: 'check',
            label: 'Check',
            color: 'info',
            onClick: () => onCheck(paymentId),
          }
        : null,
      ['Pending', 'Checked'].includes(status) && canReturn && typeof onReturn === 'function'
        ? {
            key: 'return',
            label: 'Return',
            color: 'secondary',
            onClick: () => onReturn(paymentId),
          }
        : null,
      ['Pending', 'Checked'].includes(status) && canReject && typeof onReject === 'function'
        ? {
            key: 'reject',
            label: 'Reject',
            color: 'danger',
            onClick: () => onReject(paymentId),
          }
        : null,
      status === 'Checked' && canApprove && typeof onApprove === 'function'
        ? {
            key: 'approve',
            label: 'Approve',
            color: 'success',
            onClick: () => onApprove(paymentId),
          }
        : null,
      status === 'Approved' && canPay && typeof onMarkPaid === 'function'
        ? {
            key: 'mark-paid',
            label: 'Mark Paid',
            color: 'success',
            onClick: () => onMarkPaid(payment),
          }
        : null,
    ].filter(Boolean)
  }

  const getActions = (payment) => {
    const paymentId = payment.id || payment.payment_id
    const status = payment.status
    const { canDelete } = getPaymentPermissions(payment)
    const canRunDelete = canDelete && typeof onDelete === 'function'

    return [
      typeof onView === 'function'
        ? { key: 'view', label: 'View Payment', onClick: () => onView(payment) }
        : null,
      ['Pending', 'Checked'].includes(status)
        ? {
            key: 'delete',
            label: 'Delete Payment',
            danger: canRunDelete,
            disabled: !canRunDelete,
            dividerBefore: true,
            onClick: canRunDelete ? () => onDelete(paymentId) : undefined,
          }
        : null,
    ].filter(Boolean)
  }

  const renderWorkflowCell = (payment) => {
    const actions = getWorkflowActions(payment)

    if (!actions.length) {
      return (
        <DataTableTextCell
          value={payment.workflow || payment.pendingWorkflowText}
          maxWidth="260px"
          title="Workflow"
          mode="expandable"
          previewCharThreshold={62}
          className="small text-muted"
        />
      )
    }

    const handleActionClick = (event, action) => {
      event.stopPropagation()
      action.onClick()
    }

    return (
      <div className="small text-muted" style={{ maxWidth: '260px' }}>
        {payment.workflowSteps?.length > 0 && (
          <div className="mb-1">
            <DataTableTextCell
              value={payment.workflowSteps.join('\n')}
              maxWidth="260px"
              title="Workflow"
              mode="expandable"
              previewCharThreshold={44}
              className="small text-muted"
            />
          </div>
        )}
        <div className="d-flex align-items-center flex-wrap gap-1">
          {actions.map((action) => (
            <CButton
              key={action.key}
              color={action.color}
              size="sm"
              variant="outline"
              className="py-0 px-2"
              data-no-row-open="true"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => handleActionClick(event, action)}
            >
              {action.label}
            </CButton>
          ))}
        </div>
      </div>
    )
  }

  const renderCell = (payment, column) => {
    if (column.key === 'vendor') {
      return <DataTableTextCell value={payment.vendor} maxWidth="180px" title="Vendor" />
    }
    if (column.key === 'requested') return payment.requestedDisplay
    if (column.key === 'approved') return payment.approvedDisplay
    if (column.key === 'paymentFor') {
      return (
        <DataTableTextCell
          value={payment.paymentFor}
          maxWidth="220px"
          title="Payment For"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(payment.status)}>
          {payment.status}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'workflow') return renderWorkflowCell(payment)
    if (column.key === 'amount') return payment.amountDisplay
    return payment[column.key] || '-'
  }

  return (
    <>
      {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
      <DataTableRecordControls
        visible={controlsVisible}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder={searchPlaceholder}
        searchAriaLabel="Search vendor payment records"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={
          (methodFilter !== 'all' ? 1 : 0) + (statusFilter !== 'actionable' ? 1 : 0)
        }
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="vendor-payment-records-table-tools"
        mobileToolsId="vendor-payment-records-mobile-table-tools"
        searchColProps={{ xs: 12, lg: 5 }}
        actionColProps={{ xs: 12, lg: 7 }}
        advancedClassName="mt-2"
        loading={loading}
      >
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="vendorPaymentRecordsMethodFilter">Method</CFormLabel>
          <CFormSelect
            id="vendorPaymentRecordsMethodFilter"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All</option>
            {methodOptions.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </CFormSelect>
        </CCol>
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="vendorPaymentRecordsStatusFilter">Status</CFormLabel>
          <CFormSelect
            id="vendorPaymentRecordsStatusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="actionable">Actionable</option>
            <option value="all">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      <DataTableRecordList
        rows={filteredPayments}
        loading={loading}
        loadingMessage="Loading payment records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="vendor.payment-records.visible-columns.v6"
        idPrefix="vendor-payment-record"
        emptyMessage="No payment records found."
        exportFilename={`payment-records-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId="vendor-payment-records-table-tools"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="vendor-payment-records-mobile-table-tools"
        showMobileUtilityRow={false}
        renderQuickFilters={() => (
          <PeriodRangeSelector
            value={selectedPeriodRange}
            onChange={handlePeriodRangeChange}
            className="d-none d-lg-block"
          />
        )}
        actionColumnWidth="56px"
        getRowKey={(payment, index) => payment.id || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={onView}
        getMobileTitle={(payment) => payment.vendor}
        getMobileSubtitle={(payment) => payment.paymentFor}
        getMobileMeta={(payment) => `${payment.paymentFor} | ${payment.amountDisplay}`}
        getMobileStatus={(payment) => payment.status}
        getMobileStatusTone={(payment) => getStatusTone(payment.status)}
        mobileFieldKeys={{
          title: 'vendor',
          subtitle: 'status',
          meta: ['paymentFor', 'amount'],
          status: 'status',
        }}
        mobileRecord={{
          title: (payment) => payment.vendor,
          subtitle: (payment) => payment.paymentFor,
          meta: (payment) => `${payment.paymentType} | ${payment.amountDisplay}`,
          badges: (payment) => [
            {
              key: 'status',
              label: payment.status,
              tone: getStatusTone(payment.status),
            },
          ],
          kv: (payment) => [
            { key: 'workflow', label: 'Workflow', value: payment.workflow },
            { key: 'requested', label: 'Requested', value: payment.requestedDisplay },
            { key: 'method', label: 'Method', value: payment.method },
          ],
        }}
        initialSortField="requested"
        initialSortDir="desc"
        initialSortDirByField={{ requested: 'desc', approved: 'desc', amount: 'desc' }}
        resetDeps={[payments, searchText, selectedPeriodRange, statusFilter, methodFilter]}
      />
      <div className="text-end fw-bold mt-2">
        Grand Total: RM {grandTotal(filteredPayments).toFixed(2)}
      </div>
    </>
  )
}

export default PaymentTable
