import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus } from '@coreui/icons'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableStatsToggle,
} from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { commercialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { StatsStrip } from '../../../components/stats'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { fetchJson } from '../../../utils/detailPages'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'
import { getPaymentTermsCompactLabel } from '../../../shared/paymentTerms'
import DebtorUpdatePaymentModal from './DebtorUpdatePaymentModal'
import DebtorLifecycleTabs from './DebtorLifecycleTabs'
import { buildDebtorStats } from './debtorStats'
import {
  emptyValue,
  formatMoney,
  getAgeTone,
  getDebtorStatusApiValue,
  getDebtorStatusScope,
  getStatusTone,
  getTodayDate,
  normalizeDebtorStatusScope,
  normalizeDebtorRow,
} from './debtorUtils'

const columnStorageKey = 'commercial.debtors.visible-columns.v4'

const defaultVisibleColumns = {
  invoice: true,
  client: true,
  pic: true,
  serviceType: true,
  purpose: false,
  invoiceDate: true,
  age: true,
  paymentTerms: true,
  dueDate: true,
  overdue: true,
  total: true,
  paid: true,
  lastPayment: true,
  outstanding: true,
  status: true,
  source: true,
}

const requiredColumns = new Set(['invoice', 'client', 'status'])

const dataColumns = [
  {
    key: 'source',
    label: 'Source',
    width: '140px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => getSourceLabel(row),
  },
  { key: 'invoice', label: 'Invoice', width: '160px', sortable: true, sortType: 'string' },
  { key: 'client', label: 'Client', width: '220px', sortable: true, sortType: 'string' },
  {
    key: 'age',
    label: 'Age',
    width: '90px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => `${row.ageDays}d`,
  },
  {
    key: 'paymentTerms',
    label: 'Terms',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => getPaymentTermsDisplay(row),
  },
  {
    key: 'dueDate',
    label: 'Due',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row.dueDate || emptyValue,
  },
  {
    key: 'overdue',
    label: 'Overdue',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => getOverdueLabel(row),
  },
  { key: 'pic', label: 'PIC', width: '160px', sortable: true, sortType: 'string' },
  { key: 'serviceType', label: 'Service', width: '140px', sortable: true, sortType: 'string' },
  {
    key: 'purpose',
    label: 'Remarks',
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'invoiceDate',
    label: 'Invoice Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'total',
    label: 'Total',
    width: '140px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'paid',
    label: 'Paid',
    width: '140px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => formatMoney(row.paidTotal),
  },
  {
    key: 'lastPayment',
    label: 'Last Payment',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row.lastPaymentDate || emptyValue,
  },
  {
    key: 'outstanding',
    label: 'Outstanding',
    width: '150px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => formatMoney(row.outstandingAmount),
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
]

const getSourceLabel = (debtor) =>
  debtor?.sourceType === 'manual' ? 'Manual Entry' : 'System Invoice'

const getSourceTone = (debtor) => (debtor?.sourceType === 'manual' ? 'warning' : 'info')

const isCancelledStatus = (status) =>
  ['cancelled', 'canceled', 'void'].includes(
    String(status || '')
      .trim()
      .toLowerCase(),
  )

const getOverdueTone = (overdueDays) => {
  const days = Number(overdueDays || 0)
  if (days <= 0) return 'success'
  return getAgeTone(days)
}

const getOverdueLabel = (debtor) => {
  if (debtor.overdueDays === null || debtor.overdueDays === undefined) return emptyValue
  const days = Number(debtor.overdueDays || 0)
  if (days < 0) return `${Math.abs(days)}d left`
  if (days === 0) return 'Due'
  return `${days}d`
}

const hasPaymentTerms = (debtor) =>
  debtor.paymentTermsDays !== null &&
  debtor.paymentTermsDays !== undefined &&
  debtor.paymentTermsDays !== ''

const getPaymentTermsDisplay = (debtor) =>
  hasPaymentTerms(debtor)
    ? getPaymentTermsCompactLabel(debtor.paymentTermsSource, debtor.paymentTermsDays)
    : emptyValue

const Debtors = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [urlSearchParams, setUrlSearchParams] = useSearchParams()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const statusFilter = normalizeDebtorStatusScope(urlSearchParams.get('status'))
  const [sourceFilter, setSourceFilter] = useState('all')
  const [asOfDate, setAsOfDate] = useState(getTodayDate)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedDebtor, setSelectedDebtor] = useState(null)
  const [updatePaymentVisible, setUpdatePaymentVisible] = useState(false)
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const fetchRequestIdRef = useRef(0)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('commercial.debtors')

  const setStatusFilter = useCallback(
    (nextStatus) => {
      const normalized = normalizeDebtorStatusScope(nextStatus)
      setUrlSearchParams((current) => {
        const next = new URLSearchParams(current)
        if (normalized === 'open') next.delete('status')
        else next.set('status', normalized)
        return next
      })
    },
    [setUrlSearchParams],
  )

  const fetchDebtors = useCallback(
    async ({ showLoader = true, preserveRows = true } = {}) => {
      const requestId = ++fetchRequestIdRef.current
      if (showLoader) setLoading(true)
      try {
        const params = new URLSearchParams({
          status: getDebtorStatusApiValue(statusFilter),
          source: sourceFilter,
          as_of_date: asOfDate,
        })
        if (searchTerm.trim()) params.set('q', searchTerm.trim())
        const payload = await fetchJson(
          `${import.meta.env.VITE_API_BASE}debtors?${params.toString()}`,
        )
        if (requestId !== fetchRequestIdRef.current) return
        setRows(Array.isArray(payload?.debtors) ? payload.debtors.map(normalizeDebtorRow) : [])
      } catch (error) {
        if (requestId !== fetchRequestIdRef.current) return
        console.error('Debtors fetch error:', error)
        dialog.alert(error?.message || 'Unable to load debtors.')
        if (!preserveRows) setRows([])
      } finally {
        if (requestId === fetchRequestIdRef.current) setLoading(false)
      }
    },
    [asOfDate, searchTerm, sourceFilter, statusFilter],
  )

  useEffect(() => {
    fetchDebtors()
  }, [fetchDebtors])

  const statsItems = useMemo(
    () => buildDebtorStats(rows, statusFilter, asOfDate),
    [asOfDate, rows, statusFilter],
  )

  const activeFilterCount = [statusFilter !== 'open', sourceFilter !== 'all'].filter(Boolean).length
  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    statusFilter !== 'open'
      ? { key: 'status', label: `Status: ${getDebtorStatusScope(statusFilter).label}` }
      : null,
    sourceFilter !== 'all' ? { key: 'source', label: `Source: ${sourceFilter}` } : null,
    asOfDate !== getTodayDate() ? { key: 'asOf', label: `As of: ${asOfDate}` } : null,
  ].filter(Boolean)

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'status') setStatusFilter('open')
    if (key === 'source') setSourceFilter('all')
    if (key === 'asOf') setAsOfDate(getTodayDate())
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('open')
    setSourceFilter('all')
    setAsOfDate(getTodayDate())
    setShowAdvancedFilters(false)
  }

  const openUpdatePayment = (debtor) => {
    setSelectedDebtor(debtor)
    setUpdatePaymentVisible(true)
  }

  const handleConfirmPayment = async (paymentData) => {
    if (!selectedDebtor) return false
    setSubmittingPayment(true)
    try {
      const endpoint = `${import.meta.env.VITE_API_BASE}receivables/${encodeURIComponent(
        selectedDebtor.sourceType,
      )}/${encodeURIComponent(selectedDebtor.sourceId)}/payments`
      const payload = await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      })
      setUpdatePaymentVisible(false)
      setSelectedDebtor(null)
      const outstanding = Number(payload?.summary?.outstandingAmount ?? 0)
      showToast(
        outstanding <= 0
          ? 'Payment completed. This record is now available under Paid.'
          : `Partial payment recorded. ${formatMoney(outstanding)} remains outstanding.`,
      )
      await fetchDebtors({ showLoader: false })
      return true
    } catch (error) {
      dialog.alert(error?.message || 'Unable to update payment.')
      return false
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleReversePayment = async (payment) => {
    const reason = await dialog.prompt('Reason for reversing this payment', {
      title: 'Reverse Payment',
      placeholder: 'Enter the correction reason',
      confirmText: 'Reverse Payment',
      confirmColor: 'danger',
      required: true,
    })
    if (!String(reason || '').trim()) return false

    setSubmittingPayment(true)
    try {
      const payload = await fetchJson(
        `${import.meta.env.VITE_API_BASE}receivable-payments/${encodeURIComponent(payment.id)}/reverse`,
        { method: 'POST', body: JSON.stringify({ reason: String(reason).trim() }) },
      )
      const outstanding = Number(payload?.summary?.outstandingAmount ?? 0)
      showToast(
        outstanding > 0
          ? 'Payment reversed. This record is now available under Outstanding.'
          : 'Payment reversed.',
      )
      await fetchDebtors({ showLoader: false })
      return true
    } catch (error) {
      dialog.alert(error?.message || 'Unable to reverse payment.')
      return false
    } finally {
      setSubmittingPayment(false)
    }
  }

  const handleDeleteManual = async (debtor) => {
    if (
      !(await dialog.confirm(`Delete manual debtor ${debtor.invoiceRef}?`, {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    const reason = await dialog.prompt('Reason for deleting this manual debtor', {
      title: 'Deletion Reason',
      placeholder: 'For example: duplicate or incorrect entry',
      confirmText: 'Continue',
      required: true,
    })
    if (!String(reason || '').trim()) return
    try {
      await fetchJson(
        `${import.meta.env.VITE_API_BASE}debtors/manual/${encodeURIComponent(debtor.sourceId)}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ reason: String(reason).trim() }),
        },
      )
      showToast('Manual debtor deleted.')
      await fetchDebtors({ showLoader: false })
    } catch (error) {
      dialog.alert(error?.message || 'Unable to delete manual debtor.')
    }
  }

  const getActions = (debtor) => {
    const paymentAction = isCancelledStatus(debtor.status)
      ? debtor.hasPaymentHistory
        ? {
            key: 'payment-history',
            label: 'Payment History',
            onClick: openUpdatePayment,
          }
        : null
      : {
          key: 'update-payment',
          label: Number(debtor.outstandingAmount || 0) > 0 ? 'Update Payment' : 'Payment History',
          onClick: openUpdatePayment,
        }

    const actions = [
      debtor.sourceType === 'invoice'
        ? {
            key: 'open-invoice',
            label: 'Open Invoice',
            onClick: (record) =>
              navigate(`/commercial/invoice/${record.sourceId}`, {
                state: { record, returnTo: getCurrentReturnTo(location) },
              }),
          }
        : {
            key: 'edit',
            label: 'Edit',
            onClick: (record) =>
              navigate(`/commercial/debtors/manual/${record.sourceId}/edit`, {
                state: { record, returnTo: getCurrentReturnTo(location) },
              }),
          },
      debtor.sourceType === 'invoice'
        ? {
            key: 'pdf',
            label: 'PDF Invoice',
            onClick: (record) =>
              window.open(
                `${import.meta.env.VITE_API_BASE}invoices/${encodeURIComponent(record.sourceId)}/pdf`,
                '_blank',
              ),
          }
        : null,
      debtor.sourceType === 'manual' && debtor.attachmentUrl
        ? {
            key: 'attachment',
            label: 'Attachment',
            onClick: (record) => window.open(record.attachmentUrl, '_blank'),
          }
        : null,
      paymentAction,
      debtor.sourceType === 'manual'
        ? {
            key: 'delete',
            label: 'Delete',
            danger: true,
            dividerBefore: true,
            onClick: handleDeleteManual,
          }
        : null,
    ]

    return actions.filter(Boolean)
  }

  const renderCell = (debtor, column) => {
    if (column.key === 'invoice') return debtor.invoiceRef
    if (column.key === 'client') return debtor.client
    if (column.key === 'age') {
      return (
        <DataTableStatusBadge tone={getAgeTone(debtor.ageDays)}>
          {debtor.ageDays}d
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'paymentTerms') {
      return getPaymentTermsDisplay(debtor)
    }
    if (column.key === 'dueDate') return debtor.dueDate || emptyValue
    if (column.key === 'overdue') {
      if (debtor.overdueDays === null || debtor.overdueDays === undefined) return emptyValue
      return (
        <DataTableStatusBadge tone={getOverdueTone(debtor.overdueDays)}>
          {getOverdueLabel(debtor)}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'total') return formatMoney(debtor.grandTotal)
    if (column.key === 'paid') return formatMoney(debtor.paidTotal)
    if (column.key === 'lastPayment') return debtor.lastPaymentDate || emptyValue
    if (column.key === 'outstanding') return formatMoney(debtor.outstandingAmount)
    if (column.key === 'source') {
      return (
        <DataTableStatusBadge tone={getSourceTone(debtor)}>
          {getSourceLabel(debtor)}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(debtor.status)}>
          {debtor.status}
        </DataTableStatusBadge>
      )
    }
    return debtor[column.key] || emptyValue
  }

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <ModuleNavStrip tabs={commercialModuleTabs} ariaLabel="Commercial sections" />
        </CCol>
        <CCol xs={12}>
          <CCard className="mb-4">
            <DataTableCardHeader title="Debtors" scopeLabel={`As of ${asOfDate}`}>
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
              <CButton
                color="primary"
                size="sm"
                onClick={() =>
                  navigate('/commercial/debtors/create', {
                    state: { returnTo: getCurrentReturnTo(location) },
                  })
                }
              >
                <CIcon icon={cilPlus} className="me-1" />
                Add Debtor
              </CButton>
            </DataTableCardHeader>
            <CCardBody>
              {statsVisible && (
                <StatsStrip items={statsItems} loading={loading} layout="balanced" />
              )}
              <DebtorLifecycleTabs
                value={statusFilter}
                onChange={setStatusFilter}
                disabled={loading}
              />
              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Type to search..."
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="debtors-table-tools"
                mobileToolsId="debtors-mobile-table-tools"
                loading={loading}
              >
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel>Source</CFormLabel>
                  <CFormSelect
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="invoice">System Invoices</option>
                    <option value="manual">Manual Debtors</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4} lg={3}>
                  <CFormLabel>As Of</CFormLabel>
                  <CFormInput
                    type="date"
                    value={asOfDate}
                    onChange={(event) => setAsOfDate(event.target.value)}
                  />
                </CCol>
              </DataTableRecordControls>

              <DataTableRecordList
                rows={rows}
                loading={loading}
                loadingMessage="Loading debtors..."
                dataColumns={dataColumns}
                defaultVisibleColumns={defaultVisibleColumns}
                requiredColumns={requiredColumns}
                storageKey={columnStorageKey}
                scrollStorageKey="commercial.debtors.records.scroll"
                idPrefix="debtor-record"
                emptyMessage="No debtor records found."
                exportFilename={`debtors-${new Date().toISOString().slice(0, 10)}.csv`}
                showDesktopSummary={false}
                desktopUtilityPlacement="portal"
                desktopUtilityPortalId="debtors-table-tools"
                mobileUtilityPlacement="portal"
                mobileUtilityPortalId="debtors-mobile-table-tools"
                showMobileUtilityRow={false}
                getRowKey={(debtor) => `${debtor.sourceType}-${debtor.sourceId}`}
                rowProps={(debtor) => ({
                  className: debtor.sourceType === 'manual' ? 'commercial-debtors-row--manual' : '',
                })}
                renderCell={renderCell}
                getActions={getActions}
                onRowOpen={(debtor) =>
                  debtor.sourceType === 'invoice'
                    ? navigate(`/commercial/invoice/${debtor.sourceId}`, {
                        state: { record: debtor, returnTo: getCurrentReturnTo(location) },
                      })
                    : navigate(`/commercial/debtors/manual/${debtor.sourceId}/edit`, {
                        state: { record: debtor, returnTo: getCurrentReturnTo(location) },
                      })
                }
                getMobileTitle={(debtor) => debtor.invoiceRef}
                getMobileSubtitle={(debtor) => debtor.client}
                getMobileMeta={(debtor) =>
                  `${debtor.invoiceDate || '-'} | Last payment ${
                    debtor.lastPaymentDate || '-'
                  } | ${formatMoney(debtor.outstandingAmount)} outstanding`
                }
                mobileRecord={{
                  title: (debtor) => debtor.invoiceRef,
                  subtitle: (debtor) => debtor.client,
                  meta: (debtor) =>
                    `${debtor.invoiceDate || '-'} | Last payment ${
                      debtor.lastPaymentDate || '-'
                    } | ${formatMoney(debtor.outstandingAmount)} outstanding`,
                  badges: (debtor) => [
                    {
                      key: 'status',
                      label: debtor.status,
                      tone: getStatusTone(debtor.status),
                    },
                    {
                      key: 'source',
                      label: getSourceLabel(debtor),
                      tone: getSourceTone(debtor),
                    },
                  ],
                }}
                mobileFieldKeys={{
                  title: 'invoice',
                  subtitle: 'client',
                  meta: ['invoiceDate', 'total'],
                  status: 'status',
                }}
                initialSortField="invoiceDate"
                initialSortDir="asc"
                initialSortDirByField={{ invoiceDate: 'asc', total: 'desc', age: 'desc' }}
                getSortValue={(debtor, field) => {
                  if (field === 'invoice') return debtor.invoiceRef
                  if (field === 'age') return debtor.ageDays
                  if (field === 'paymentTerms') return Number(debtor.paymentTermsDays || -1)
                  if (field === 'overdue') return Number(debtor.overdueDays ?? -999999)
                  if (field === 'total') return debtor.grandTotal
                  if (field === 'paid') return debtor.paidTotal
                  if (field === 'lastPayment') return debtor.lastPaymentDate
                  if (field === 'outstanding') return debtor.outstandingAmount
                  if (field === 'source') return debtor.sourceType
                  return debtor[field] || ''
                }}
                resetDeps={[statusFilter]}
                actionColumnWidth="56px"
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <DebtorUpdatePaymentModal
        visible={updatePaymentVisible}
        debtor={selectedDebtor}
        historyOnly={isCancelledStatus(selectedDebtor?.status)}
        submitting={submittingPayment}
        onClose={() => setUpdatePaymentVisible(false)}
        onConfirm={handleConfirmPayment}
        onReverse={handleReversePayment}
      />
    </>
  )
}

export default Debtors
