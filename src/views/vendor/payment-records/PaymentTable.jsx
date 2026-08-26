// src/components/PaymentTable.jsx

import React, { useMemo, useState } from 'react'
import { CCol, CFormLabel, CFormSelect } from '@coreui/react'
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
import VendorPaymentWorkflowCell from './VendorPaymentWorkflowCell'
import {
  getVendorPaymentWorkflowSteps,
  getVendorPaymentWorkflowSummary,
} from './vendorPaymentWorkflow'

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
    case 'Partially Paid':
      return 'info'
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

const PaymentTable = ({
  payments = [],
  loading = false,
  periodRange,
  onPeriodRangeChange,
  onView,
  onCheck,
  onApprove,
  onReject,
  onReturn,
  onMarkPaid,
  onEdit,
  onCancel,
  onResubmit,
  searchPlaceholder = 'Search payments',
  statsVisible = true,
  controlsVisible = true,
}) => {
  const [searchText, setSearchText] = useState('')
  const [localPeriodRange, setLocalPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const selectedPeriodRange = periodRange || localPeriodRange
  const handlePeriodRangeChange = onPeriodRangeChange || setLocalPeriodRange
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const normalizedPayments = useMemo(
    () =>
      payments.map((payment) => {
        const workflowSteps = getVendorPaymentWorkflowSteps(payment)
        const workflowSummary = getVendorPaymentWorkflowSummary(payment)
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
          workflow: workflowSteps.join('\n') || payment.status || '-',
          workflowCurrent: workflowSummary.primary,
          workflowProgress: workflowSummary.progress,
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
          ['Pending', 'Checked', 'Approved', 'Partially Paid', 'Returned'].includes(
            payment.status,
          )) ||
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
    setStatusFilter('all')
    setMethodFilter('all')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'period') handlePeriodRangeChange(getPeriodRangePreset('ytd'))
    if (key === 'status') setStatusFilter('all')
    if (key === 'method') setMethodFilter('all')
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    selectedPeriodRange && !isDefaultPeriodRange(selectedPeriodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(selectedPeriodRange)}` }
      : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
    methodFilter !== 'all' ? { key: 'method', label: `Method: ${methodFilter}` } : null,
  ].filter(Boolean)

  const getPaymentPermissions = (payment) => {
    const permissions = payment.permissions || {}
    const getCapability = (key, legacyKey) =>
      typeof permissions[key] === 'boolean'
        ? permissions[key]
        : typeof payment[legacyKey] === 'boolean'
          ? payment[legacyKey]
          : false
    const canCheck = getCapability('can_check', 'can_check')
    const canApprove = getCapability('can_approve', 'can_approve')
    const canReturn = getCapability('can_return', 'can_return')
    const canReject = getCapability('can_reject', 'can_reject')
    const canPay = getCapability('can_record_payment', 'can_mark_paid')
    const canEdit = getCapability('can_edit', 'can_edit')
    const canCancel = getCapability('can_cancel', 'can_cancel')
    const canResubmit = getCapability('can_resubmit', 'can_resubmit')

    return { canCheck, canApprove, canReturn, canReject, canPay, canEdit, canCancel, canResubmit }
  }

  const getWorkflowActions = (payment) => {
    const paymentId = payment.id || payment.payment_id
    const status = payment.status
    const { canCheck, canApprove, canReturn, canReject, canPay } = getPaymentPermissions(payment)

    return [
      status === 'Pending' && canCheck && typeof onCheck === 'function'
        ? {
            key: 'check',
            label: 'Review',
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
      ['Approved', 'Partially Paid'].includes(status) && canPay && typeof onMarkPaid === 'function'
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
    const { canEdit, canCancel, canResubmit } = getPaymentPermissions(payment)

    return [
      typeof onView === 'function'
        ? { key: 'view', label: 'View Payment', onClick: () => onView(payment) }
        : null,
      canEdit && typeof onEdit === 'function'
        ? {
            key: 'edit',
            label: 'Edit Payment',
            onClick: () => onEdit(payment),
          }
        : null,
      canResubmit && typeof onResubmit === 'function'
        ? {
            key: 'resubmit',
            label: 'Amend & Resubmit',
            onClick: () => onResubmit(payment),
          }
        : null,
      canCancel && typeof onCancel === 'function'
        ? {
            key: 'cancel',
            label: 'Cancel Request',
            danger: true,
            dividerBefore: true,
            onClick: () => onCancel(payment),
          }
        : null,
    ].filter(Boolean)
  }

  const renderWorkflowCell = (payment) => {
    const actions = getWorkflowActions(payment)

    return <VendorPaymentWorkflowCell payment={payment} actions={actions} />
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
            <option value="all">All</option>
            <option value="actionable">Actionable</option>
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
        scrollStorageKey="vendor.payment-records.scroll"
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
            {
              key: 'workflow',
              label: 'Workflow',
              value: `${payment.workflowCurrent} · ${payment.workflowProgress}`,
            },
            { key: 'requested', label: 'Requested', value: payment.requestedDisplay },
            { key: 'method', label: 'Method', value: payment.method },
          ],
        }}
        initialSortField="requested"
        initialSortDir="desc"
        initialSortDirByField={{ requested: 'desc', approved: 'desc', amount: 'desc' }}
        resetDeps={[searchText, selectedPeriodRange, statusFilter, methodFilter]}
      />
      <div className="text-end fw-bold mt-2">
        Grand Total: RM {grandTotal(filteredPayments).toFixed(2)}
      </div>
    </>
  )
}

export default PaymentTable
