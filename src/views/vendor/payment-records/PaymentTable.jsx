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
  getPeriodRangeScopeLabel,
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
  amount: true,
}

const requiredColumns = new Set(['vendor', 'status', 'amount'])

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

const PaymentTable = ({
  payments = [],
  loading = false,
  staffRoles = [],
  onView,
  onApprove,
  onDelete,
  searchPlaceholder = 'Search payments',
}) => {
  const [searchText, setSearchText] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const normalizedPayments = useMemo(
    () =>
      payments.map((payment) => ({
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
        amount: Number(payment.amount || 0),
        amountDisplay: `RM ${Number(payment.amount || 0).toFixed(2)}`,
      })),
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
          payment.created_by_name_code,
          payment.approved_by_name_code,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(q),
        )
      const matchesMethod = methodFilter === 'all' || payment.method === methodFilter
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
      const matchesPeriod = isDateInPeriodRange(payment.requested, periodRange)
      return matchesSearch && matchesPeriod && matchesMethod && matchesStatus
    })
  }, [methodFilter, normalizedPayments, periodRange, searchText, statusFilter])

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
    setPeriodRange(getPeriodRangePreset('ytd'))
    setStatusFilter('all')
    setMethodFilter('all')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'status') setStatusFilter('all')
    if (key === 'method') setMethodFilter('all')
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
    methodFilter !== 'all' ? { key: 'method', label: `Method: ${methodFilter}` } : null,
  ].filter(Boolean)

  const getActions = (payment) => {
    const canManage = staffRoles.includes('Manager')
    return [
      { key: 'view', label: 'View Payment', onClick: () => onView(payment) },
      payment.status === 'Pending'
        ? {
            key: 'approve',
            label: 'Approve Payment',
            disabled: !canManage,
            onClick: canManage ? () => onApprove(payment.id) : undefined,
          }
        : null,
      {
        key: 'delete',
        label: 'Delete Payment',
        danger: canManage,
        disabled: !canManage,
        dividerBefore: true,
        onClick: canManage ? () => onDelete(payment.id) : undefined,
      },
    ].filter(Boolean)
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
    if (column.key === 'amount') return payment.amountDisplay
    return payment[column.key] || '-'
  }

  return (
    <>
      <StatsStrip
        items={statsItems}
        scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
        loading={loading}
      />
      <DataTableRecordControls
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder={searchPlaceholder}
        searchAriaLabel="Search vendor payment records"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={(methodFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0)}
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
        storageKey="vendor.payment-records.visible-columns.v5"
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
            value={periodRange}
            onChange={setPeriodRange}
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
            { key: 'requested', label: 'Requested', value: payment.requestedDisplay },
            { key: 'method', label: 'Method', value: payment.method },
          ],
        }}
        initialSortField="requested"
        initialSortDir="desc"
        initialSortDirByField={{ requested: 'desc', approved: 'desc', amount: 'desc' }}
        resetDeps={[payments, searchText, periodRange, statusFilter, methodFilter]}
      />
      <div className="text-end fw-bold mt-2">
        Grand Total: RM {grandTotal(filteredPayments).toFixed(2)}
      </div>
    </>
  )
}

export default PaymentTable
