import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilCheckCircle, cilReload } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
  CTooltip,
} from '@coreui/react'
import { DataTableRecordControls, DataTableStatusBadge } from '../datatable'
import StatsStrip from '../stats/StatsStrip'
import { formatMoney, roundMoney } from './salaryCalculations'
import { SalaryRecordTable } from './SalaryTables'
import {
  bulkMarkPaymentQueuePaid,
  bulkUndoPaymentQueuePaid,
  fetchPaymentQueue,
  markPaymentQueuePaid,
  undoPaymentQueuePaid,
} from './paymentQueueStorage'
import { getCurrentReturnTo } from '../../utils/navigation/returnTo'

const todayValue = () => new Date().toLocaleDateString('en-CA')

const statusTone = {
  'Pending Payment': 'info',
  Paid: 'success',
  Blocked: 'warning',
}

const statusFilterOptions = ['Pending Payment', 'Paid', 'Blocked']

const statusSortPriority = {
  'Pending Payment': 0,
  Blocked: 1,
  Paid: 2,
}

const dataColumns = [
  {
    key: 'employee',
    label: 'Employee',
    width: '220px',
    sortable: true,
    getExportValue: (record) => record.staffName || 'Restricted',
  },
  {
    key: 'period',
    label: 'Period',
    width: '130px',
    sortable: true,
    getExportValue: (record) => record.periodLabel || record.period,
  },
  {
    key: 'salaryDue',
    label: 'Salary Due',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatQueueMoney(record.salaryDue, record.restricted),
  },
  {
    key: 'otherClaimDue',
    label: 'Other Claims',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatQueueMoney(record.otherClaimDue, record.restricted),
  },
  {
    key: 'totalDue',
    label: 'Total Due',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatQueueMoney(record.totalDue, record.restricted),
  },
  {
    key: 'itemCount',
    label: 'Items',
    width: '90px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => (record.restricted ? 'Restricted' : record.itemCount),
  },
  {
    key: 'status',
    label: 'Status',
    width: '145px',
    sortable: true,
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.status || 'Pending Payment',
  },
]

const defaultVisibleColumns = {
  employee: true,
  period: true,
  salaryDue: true,
  otherClaimDue: true,
  totalDue: true,
  itemCount: true,
  status: true,
}

const requiredColumns = new Set(['employee', 'period', 'totalDue', 'status'])

const formatQueueMoney = (value, restricted) => {
  if (restricted || value === null || value === undefined) return 'Restricted'
  return formatMoney(value)
}

const getQueueAction = (record) => {
  if (record.status === 'Paid') {
    return {
      key: 'undo-paid',
      label: 'Undo Paid',
      color: 'warning',
      icon: cilReload,
      disabled: !record.canUndoPaid,
      tooltip: record.restricted
        ? 'Payment values are restricted.'
        : !record.canUndoPaid
          ? 'You cannot undo this payment.'
          : '',
    }
  }

  return {
    key: 'mark-paid',
    label: 'Mark Paid',
    color: 'success',
    icon: cilCheckCircle,
    disabled: !record.canMarkPaid,
    tooltip: record.blockReason || (record.restricted ? 'Payment values are restricted.' : ''),
  }
}

const isBulkEligible = (record) => Boolean(record.canMarkPaid || record.canUndoPaid)

const PaymentQueueRecords = ({
  statsVisible = true,
  controlsVisible = true,
  onScopeLabelChange,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [records, setRecords] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [actionContext, setActionContext] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: todayValue(),
    paymentReference: '',
    paymentMethod: '',
    remarks: '',
  })
  const [undoReason, setUndoReason] = useState('')

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const rows = await fetchPaymentQueue()
      setRecords(rows)
    } catch (err) {
      setError(err?.message || 'Could not load payment queue.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.staffName,
          record.staffCode,
          record.period,
          record.periodLabel,
          record.status,
          record.blockReason,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query),
        )
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [records, searchText, statusFilter])

  const scopeLabel = `${filteredRecords.length} due`

  useEffect(() => {
    onScopeLabelChange?.(scopeLabel)
    return () => onScopeLabelChange?.('')
  }, [onScopeLabelChange, scopeLabel])

  useEffect(() => {
    setSelectedIds((current) => {
      const allowed = new Set(filteredRecords.map((record) => record.id))
      const next = new Set(Array.from(current).filter((id) => allowed.has(id)))
      return next.size === current.size ? current : next
    })
  }, [filteredRecords])

  const selectedRecords = useMemo(
    () => filteredRecords.filter((record) => selectedIds.has(record.id)),
    [filteredRecords, selectedIds],
  )
  const bulkMarkRecords = selectedRecords.filter((record) => record.canMarkPaid)
  const bulkUndoRecords = selectedRecords.filter((record) => record.canUndoPaid)
  const eligibleFilteredRecords = filteredRecords.filter(isBulkEligible)
  const allEligibleSelected =
    eligibleFilteredRecords.length > 0 &&
    eligibleFilteredRecords.every((record) => selectedIds.has(record.id))

  const stats = useMemo(() => {
    const dueRows = filteredRecords.filter((record) => record.status === 'Pending Payment')
    const paidRows = filteredRecords.filter((record) => record.status === 'Paid')
    const blockedRows = filteredRecords.filter((record) => record.status === 'Blocked')
    const visibleTotal = filteredRecords.reduce(
      (total, record) => total + (record.restricted ? 0 : Number(record.totalDue || 0)),
      0,
    )

    return [
      { key: 'due', label: 'Due', value: dueRows.length, sublabel: 'pending rows', tone: 'info' },
      {
        key: 'paid',
        label: 'Paid',
        value: paidRows.length,
        sublabel: 'paid rows',
        tone: 'success',
      },
      {
        key: 'blocked',
        label: 'Blocked',
        value: blockedRows.length,
        sublabel: 'needs review',
        tone: 'warning',
      },
      {
        key: 'visible-total',
        label: 'Visible Total',
        value: formatMoney(roundMoney(visibleTotal)),
        sublabel: 'current filter',
        tone: 'primary',
      },
    ]
  }, [filteredRecords])

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
  ].filter(Boolean)

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'status') setStatusFilter('all')
  }

  const resetFilters = () => {
    setSearchText('')
    setStatusFilter('all')
  }

  const toggleSelected = (record) => {
    if (!isBulkEligible(record)) return
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(record.id)) next.delete(record.id)
      else next.add(record.id)
      return next
    })
  }

  const toggleAllEligible = () => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allEligibleSelected) {
        eligibleFilteredRecords.forEach((record) => next.delete(record.id))
      } else {
        eligibleFilteredRecords.forEach((record) => next.add(record.id))
      }
      return next
    })
  }

  const openDetailPage = (record) => {
    if (!record?.staffId || !record?.period || record.restricted) return
    const basePath = location.pathname.startsWith('/financial')
      ? '/financial/payment-queue'
      : '/my/salary/payment-queue'
    navigate(
      `${basePath}/${encodeURIComponent(record.staffId)}/${encodeURIComponent(record.period)}`,
      {
        state: { record, returnTo: getCurrentReturnTo(location) },
      },
    )
  }

  const openActionModal = (type, rows) => {
    setNotice('')
    setError('')
    setActionContext({ type, rows: Array.isArray(rows) ? rows : [rows] })
    setUndoReason('')
    if (type === 'mark-paid' || type === 'bulk-mark-paid') {
      setPaymentForm({
        paymentDate: todayValue(),
        paymentReference: '',
        paymentMethod: '',
        remarks: '',
      })
    }
  }

  const closeActionModal = () => {
    if (isSubmitting) return
    setActionContext(null)
  }

  const handleSubmitAction = async () => {
    if (!actionContext || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    setNotice('')

    try {
      const rows = actionContext.rows || []
      let payload = null
      if (actionContext.type === 'mark-paid') {
        const row = rows[0]
        payload = await markPaymentQueuePaid({
          staffId: row.staffId,
          period: row.period,
          ...paymentForm,
        })
      } else if (actionContext.type === 'undo-paid') {
        const row = rows[0]
        payload = await undoPaymentQueuePaid({
          staffId: row.staffId,
          period: row.period,
          reason: undoReason.trim(),
        })
      } else if (actionContext.type === 'bulk-mark-paid') {
        payload = await bulkMarkPaymentQueuePaid(rows, paymentForm)
      } else if (actionContext.type === 'bulk-undo-paid') {
        payload = await bulkUndoPaymentQueuePaid(rows, undoReason.trim())
      }

      setNotice(buildActionNotice(payload, rows.length))
      setSelectedIds(new Set())
      setActionContext(null)
      await loadRecords()
    } catch (err) {
      setError(err?.message || 'Could not update payment queue.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStatus = (record) => (
    <div className="d-inline-flex flex-column align-items-center gap-1">
      <DataTableStatusBadge tone={statusTone[record.status] || 'secondary'}>
        {record.status || 'Pending Payment'}
      </DataTableStatusBadge>
      {record.blockReason && (
        <span className="small text-body-secondary">{record.blockReason}</span>
      )}
    </div>
  )

  const renderEmployee = (record) => {
    const checkbox = (
      <CFormCheck
        checked={selectedIds.has(record.id)}
        disabled={!isBulkEligible(record)}
        aria-label={`Select ${record.staffName || 'payment queue row'}`}
        onChange={() => toggleSelected(record)}
        onClick={(event) => event.stopPropagation()}
      />
    )

    return (
      <div className="d-flex align-items-center gap-2">
        {isBulkEligible(record) ? (
          checkbox
        ) : (
          <CTooltip content="This row is not eligible for bulk action.">
            <span>{checkbox}</span>
          </CTooltip>
        )}
        <div className="min-w-0">
          <strong>{record.staffName || 'Restricted'}</strong>
          {record.staffCode && <div className="text-body-secondary">{record.staffCode}</div>}
        </div>
      </div>
    )
  }

  const renderCell = (record, column) => {
    if (column.key === 'employee') return renderEmployee(record)
    if (column.key === 'period') return record.periodLabel || record.period
    if (column.key === 'salaryDue') return formatQueueMoney(record.salaryDue, record.restricted)
    if (column.key === 'otherClaimDue')
      return formatQueueMoney(record.otherClaimDue, record.restricted)
    if (column.key === 'totalDue') {
      return <strong>{formatQueueMoney(record.totalDue, record.restricted)}</strong>
    }
    if (column.key === 'itemCount') return record.restricted ? 'Restricted' : record.itemCount
    if (column.key === 'status') return renderStatus(record)
    return record[column.key] || '-'
  }

  const renderActions = (record) => {
    const action = getQueueAction(record)
    const button = (
      <CButton
        color={action.color}
        variant="outline"
        size="sm"
        disabled={action.disabled || isSubmitting}
        className="text-nowrap"
        onClick={(event) => {
          event.stopPropagation()
          if (!action.disabled) openActionModal(action.key, record)
        }}
      >
        <CIcon icon={action.icon} size="sm" className="me-1" />
        {action.label}
      </CButton>
    )

    return action.tooltip ? (
      <CTooltip content={action.tooltip} placement="left">
        <span>{button}</span>
      </CTooltip>
    ) : (
      button
    )
  }

  const mobileRecord = {
    title: (record) => record.staffName || 'Restricted',
    meta: (record) => record.periodLabel || record.period,
    badges: (record) => [
      {
        key: 'status',
        label: record.status || 'Pending Payment',
        tone: statusTone[record.status] || 'secondary',
      },
    ],
    kv: (record) => [
      {
        key: 'totalDue',
        label: 'Total Due',
        value: formatQueueMoney(record.totalDue, record.restricted),
      },
      {
        key: 'salaryDue',
        label: 'Salary Due',
        value: formatQueueMoney(record.salaryDue, record.restricted),
      },
      {
        key: 'otherClaimDue',
        label: 'Other Claims',
        value: formatQueueMoney(record.otherClaimDue, record.restricted),
      },
      {
        key: 'itemCount',
        label: 'Items',
        value: record.restricted ? 'Restricted' : record.itemCount,
      },
    ],
  }

  const isUndoAction =
    actionContext?.type === 'undo-paid' || actionContext?.type === 'bulk-undo-paid'
  const isBulkAction =
    actionContext?.type === 'bulk-mark-paid' || actionContext?.type === 'bulk-undo-paid'
  const canSubmitAction = !isUndoAction || undoReason.trim().length > 0

  return (
    <>
      {error && (
        <CAlert color="danger" className="py-2">
          {error}
        </CAlert>
      )}
      {notice && (
        <CAlert color="success" className="py-2">
          {notice}
        </CAlert>
      )}
      {statsVisible && (
        <StatsStrip items={stats} loading={isLoading} className="mb-3" layout="auto" />
      )}
      <DataTableRecordControls
        visible={controlsVisible}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search staff, month, or status"
        searchAriaLabel="Search payment queue"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={statusFilter !== 'all' ? 1 : 0}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="payment-queue-table-tools"
        mobileToolsId="payment-queue-mobile-table-tools"
        searchColProps={{ xs: 12, lg: 5 }}
        actionColProps={{ xs: 12, lg: 7 }}
        advancedClassName="mt-2"
        loading={isLoading}
      >
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="paymentQueueStatusFilter">Status</CFormLabel>
          <CFormSelect
            id="paymentQueueStatusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            {statusFilterOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      {controlsVisible && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div className="small text-body-secondary">
            {selectedRecords.length} selected
            {selectedRecords.length > 0
              ? ` - ${bulkMarkRecords.length} can mark paid - ${bulkUndoRecords.length} can undo paid`
              : ''}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              disabled={eligibleFilteredRecords.length === 0}
              onClick={toggleAllEligible}
            >
              {allEligibleSelected ? 'Clear Eligible' : 'Select Eligible'}
            </CButton>
            <CButton
              color="success"
              variant="outline"
              size="sm"
              disabled={bulkMarkRecords.length === 0}
              onClick={() => openActionModal('bulk-mark-paid', selectedRecords)}
            >
              Mark Paid Selected
            </CButton>
            <CButton
              color="warning"
              variant="outline"
              size="sm"
              disabled={bulkUndoRecords.length === 0}
              onClick={() => openActionModal('bulk-undo-paid', selectedRecords)}
            >
              Undo Paid Selected
            </CButton>
          </div>
        </div>
      )}

      <SalaryRecordTable
        rows={filteredRecords}
        loading={isLoading}
        loadingMessage="Loading payment queue..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="salary.payment-queue.visible-columns.v1"
        scrollStorageKey="salary.payment-queue.scroll"
        idPrefix="payment-queue"
        emptyMessage="No payment due. Approved unpaid records will appear here."
        exportFilename={`payment-queue-${new Date().toISOString().slice(0, 10)}.csv`}
        desktopUtilityPortalId="payment-queue-table-tools"
        mobileUtilityPortalId="payment-queue-mobile-table-tools"
        getRowKey={(record, index) => record.id || index}
        renderCell={renderCell}
        renderActions={renderActions}
        onRowOpen={openDetailPage}
        getRowOpenDisabled={(record) => record.restricted || !record.staffId}
        mobileRecord={mobileRecord}
        actionColumnWidth="132px"
        initialSortField="period"
        initialSortDir="desc"
        initialSortDirByField={{ period: 'desc', totalDue: 'desc', status: 'asc' }}
        getSortValue={(record, field) => {
          if (field === 'employee') return record.staffName || ''
          if (field === 'status') return statusSortPriority[record.status] ?? 10
          return record[field]
        }}
        resetDeps={[searchText, statusFilter]}
      />

      <PaymentQueueActionModal
        visible={Boolean(actionContext)}
        isUndoAction={isUndoAction}
        isBulkAction={isBulkAction}
        rowCount={actionContext?.rows?.length || 0}
        paymentForm={paymentForm}
        setPaymentForm={setPaymentForm}
        undoReason={undoReason}
        setUndoReason={setUndoReason}
        isSubmitting={isSubmitting}
        canSubmit={canSubmitAction}
        onClose={closeActionModal}
        onSubmit={handleSubmitAction}
      />
    </>
  )
}

export const PaymentQueueActionModal = ({
  visible,
  isUndoAction,
  isBulkAction,
  rowCount,
  paymentForm,
  setPaymentForm,
  undoReason,
  setUndoReason,
  isSubmitting,
  canSubmit,
  onClose,
  onSubmit,
}) => (
  <CModal visible={visible} onClose={onClose} size="lg">
    <CModalHeader closeButton={!isSubmitting}>
      <CModalTitle>
        {isUndoAction ? 'Undo Paid' : 'Mark Paid'}
        {isBulkAction ? ` (${rowCount} rows)` : ''}
      </CModalTitle>
    </CModalHeader>
    <CModalBody>
      {isUndoAction ? (
        <div>
          <CFormLabel htmlFor="paymentQueueUndoReason">Reason</CFormLabel>
          <CFormInput
            id="paymentQueueUndoReason"
            value={undoReason}
            onChange={(event) => setUndoReason(event.target.value)}
            placeholder="Reason for undoing this payment"
            disabled={isSubmitting}
          />
        </div>
      ) : (
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <CFormLabel htmlFor="paymentQueueDate">Payment Date</CFormLabel>
            <CFormInput
              id="paymentQueueDate"
              type="date"
              value={paymentForm.paymentDate}
              disabled={isSubmitting}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, paymentDate: event.target.value }))
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <CFormLabel htmlFor="paymentQueueReference">Reference</CFormLabel>
            <CFormInput
              id="paymentQueueReference"
              value={paymentForm.paymentReference}
              disabled={isSubmitting}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, paymentReference: event.target.value }))
              }
            />
          </div>
          <div className="col-12 col-md-4">
            <CFormLabel htmlFor="paymentQueueMethod">Method</CFormLabel>
            <CFormInput
              id="paymentQueueMethod"
              value={paymentForm.paymentMethod}
              disabled={isSubmitting}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, paymentMethod: event.target.value }))
              }
            />
          </div>
          <div className="col-12">
            <CFormLabel htmlFor="paymentQueueRemarks">Remarks</CFormLabel>
            <CFormInput
              id="paymentQueueRemarks"
              value={paymentForm.remarks}
              disabled={isSubmitting}
              onChange={(event) =>
                setPaymentForm((prev) => ({ ...prev, remarks: event.target.value }))
              }
            />
          </div>
        </div>
      )}
    </CModalBody>
    <CModalFooter>
      <CButton color="secondary" variant="outline" onClick={onClose} disabled={isSubmitting}>
        Close
      </CButton>
      <CButton
        color={isUndoAction ? 'warning' : 'success'}
        onClick={onSubmit}
        disabled={isSubmitting || !canSubmit}
      >
        {isSubmitting && <CSpinner size="sm" className="me-2" />}
        {isUndoAction ? 'Undo Paid' : 'Mark Paid'}
      </CButton>
    </CModalFooter>
  </CModal>
)

const buildActionNotice = (payload, rowCount) => {
  if (payload?.summary) {
    const { success = 0, skipped = 0, failed = 0 } = payload.summary
    return `${payload.message || 'Bulk action completed.'} ${success} succeeded, ${skipped} skipped, ${failed} failed.`
  }
  return payload?.message || `${rowCount} row(s) updated.`
}

export default PaymentQueueRecords
