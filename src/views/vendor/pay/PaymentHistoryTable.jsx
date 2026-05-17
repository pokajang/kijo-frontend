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
import { resolveAssetUrl } from '../../../utils/assetUrls'

const dataColumns = [
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
    width: '150px',
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
    key: 'type',
    label: 'Type',
    width: '120px',
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
    key: 'invoice',
    label: 'Vendor Invoice',
    width: '150px',
    sortable: false,
    align: 'center',
    shrinkToFit: true,
    getExportValue: (payment) => payment.receipt_url || payment.receipt_path || 'N/A',
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
  requested: true,
  approved: false,
  paymentFor: true,
  type: true,
  method: false,
  status: true,
  invoice: false,
  amount: true,
}

const requiredColumns = new Set(['paymentFor', 'status', 'amount'])

const getStatusTone = (status) => {
  switch (status) {
    case 'Approved':
      return 'success'
    case 'Pending':
      return 'warning'
    default:
      return 'info'
  }
}

const PaymentHistoryTable = ({
  payments = [],
  setSelectedInvoiceUrl,
  setShowInvoiceModal,
  onViewPayment,
}) => {
  const [searchText, setSearchText] = useState('')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const grandTotal = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const totalPaid = payments
    .filter((payment) => payment.status === 'Approved')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const totalDue = payments
    .filter((payment) => payment.status === 'Pending')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const normalizedPayments = useMemo(
    () =>
      [...payments]
        .sort((left, right) => {
          if (left.status === 'Pending' && right.status !== 'Pending') return -1
          if (left.status !== 'Pending' && right.status === 'Pending') return 1
          return new Date(left.created_at) - new Date(right.created_at)
        })
        .map((payment) => ({
          ...payment,
          requested: payment.created_at || '',
          requestedDisplay: payment.created_at ? payment.created_at.split(' ')[0] : '-',
          requestedBy: payment.created_by_name_code || '-',
          approved: payment.date_approved || '',
          approvedDisplay: payment.date_approved
            ? payment.date_approved.split(' ')[0]
            : 'In progress',
          paymentFor: payment.project_id
            ? payment.project_name || 'Unnamed Project'
            : payment.payment_context || '-',
          remarks: payment.remarks || (payment.project_id ? 'No description' : 'Not provided'),
          type: payment.payment_type || 'Not specified',
          method: payment.method || '-',
          status: payment.status || '-',
          invoice: payment.receipt_url || payment.receipt_path || '',
          amount: Number(payment.amount || 0),
          amountDisplay: `RM ${Number(payment.amount || 0).toFixed(2)}`,
        })),
    [payments],
  )

  const filteredPayments = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return normalizedPayments.filter((payment) => {
      const matchesSearch =
        !q ||
        [
          payment.paymentFor,
          payment.remarks,
          payment.type,
          payment.method,
          payment.status,
          payment.amountDisplay,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(q),
        )
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter
      const matchesPeriod = isDateInPeriodRange(payment.requested, periodRange)
      return matchesSearch && matchesPeriod && matchesStatus
    })
  }, [normalizedPayments, periodRange, searchText, statusFilter])

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(normalizedPayments.map((payment) => payment.status).filter(Boolean)),
      ).sort(),
    [normalizedPayments],
  )

  const statsItems = useMemo(() => {
    const paidRows = filteredPayments.filter(
      (payment) => payment.status === 'Approved' || payment.status === 'Paid',
    )
    const pendingRows = filteredPayments.filter((payment) => payment.status === 'Pending')
    const topRequester = getTopGroupBySum(
      filteredPayments,
      (payment) => payment.requestedBy,
      (payment) => payment.amount,
    )

    return [
      {
        key: 'payments',
        label: 'Payments',
        value: formatCount(filteredPayments.length),
        tone: 'primary',
      },
      {
        key: 'total-paid',
        label: 'Total Paid',
        value: formatMoney(sumBy(paidRows, (payment) => payment.amount)),
        sublabel: `${formatCount(paidRows.length)} approved`,
        tone: 'success',
      },
      {
        key: 'pending',
        label: 'Pending',
        value: formatCount(pendingRows.length),
        sublabel: formatMoney(sumBy(pendingRows, (payment) => payment.amount)),
        tone: 'warning',
      },
      {
        key: 'top-requester',
        label: 'Top Requester',
        value: topRequester.value,
        sublabel: `${formatMoney(topRequester.total)} across ${formatCount(topRequester.count)} payments`,
        tone: 'info',
      },
    ]
  }, [filteredPayments])

  const resetFilters = () => {
    setSearchText('')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setStatusFilter('all')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'status') setStatusFilter('all')
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)

  const handleViewInvoice = (payment) => {
    const receiptUrl = resolveAssetUrl(payment.receipt_url || payment.receipt_path)
    if (!receiptUrl) return
    setSelectedInvoiceUrl(receiptUrl)
    setShowInvoiceModal(true)
  }

  const renderCell = (payment, column) => {
    if (column.key === 'requested') {
      return (
        <>
          {payment.requestedDisplay}
          <br />
          <small className="text-muted">By {payment.requestedBy}</small>
        </>
      )
    }
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
    if (column.key === 'invoice') {
      return payment.invoice ? (
        <button
          type="button"
          className="btn btn-link p-0 text-primary text-decoration-underline"
          data-no-row-open="true"
          onClick={(event) => {
            event.stopPropagation()
            handleViewInvoice(payment)
          }}
        >
          View Invoice
        </button>
      ) : (
        <span className="text-muted">N/A</span>
      )
    }
    if (column.key === 'amount') return payment.amountDisplay
    return payment[column.key] || '-'
  }

  const getActions = (payment) =>
    payment.invoice
      ? [
          {
            key: 'invoice',
            label: 'View Invoice',
            onClick: () => handleViewInvoice(payment),
          },
        ]
      : []

  return (
    <>
      <StatsStrip
        items={statsItems}
        scopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
      />
      <DataTableRecordControls
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search payment, project, remarks"
        searchAriaLabel="Search payment history"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={statusFilter !== 'all' ? 1 : 0}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="vendor-payment-history-table-tools"
        mobileToolsId="vendor-payment-history-mobile-table-tools"
      >
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="vendorPaymentHistoryStatusFilter">Status</CFormLabel>
          <CFormSelect
            id="vendorPaymentHistoryStatusFilter"
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
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="vendor.payment-history.visible-columns.v4"
        idPrefix="vendor-payment-history"
        emptyMessage="No payment records found."
        exportFilename={`payment-history-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId="vendor-payment-history-table-tools"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="vendor-payment-history-mobile-table-tools"
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
        onRowOpen={onViewPayment}
        getMobileTitle={(payment) => payment.paymentFor}
        getMobileSubtitle={(payment) => payment.remarks}
        getMobileMeta={(payment) => `${payment.requestedDisplay} | ${payment.amountDisplay}`}
        getMobileStatus={(payment) => payment.status}
        getMobileStatusTone={(payment) => getStatusTone(payment.status)}
        mobileFieldKeys={{
          title: 'paymentFor',
          subtitle: 'paymentFor',
          meta: ['requested', 'amount'],
          status: 'status',
        }}
        mobileRecord={{
          title: (payment) => payment.paymentFor,
          subtitle: (payment) => payment.remarks,
          meta: (payment) => `${payment.requestedDisplay} | ${payment.amountDisplay}`,
          badges: (payment) => [
            {
              key: 'status',
              label: payment.status,
              tone: getStatusTone(payment.status),
            },
          ],
          kv: (payment) => [
            { key: 'type', label: 'Type', value: payment.type },
            { key: 'method', label: 'Method', value: payment.method },
          ],
        }}
        initialSortField="requested"
        initialSortDir="asc"
        initialSortDirByField={{ amount: 'desc' }}
        resetDeps={[payments, searchText, periodRange, statusFilter]}
      />
      <div className="text-end fw-bold mt-2">
        <div>Total Paid: RM {totalPaid.toFixed(2)}</div>
        <div>Total Due: RM {totalDue.toFixed(2)}</div>
        <div>Grand Total: RM {grandTotal.toFixed(2)}</div>
      </div>
    </>
  )
}

export default PaymentHistoryTable
