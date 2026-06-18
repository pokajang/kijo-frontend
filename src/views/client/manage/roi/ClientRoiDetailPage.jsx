import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'

import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableStatsToggle,
  DataTableTextCell,
  getAdvancedFilterCount,
} from '../../../../components/datatable'
import {
  PeriodRangeSelector,
  getPeriodRangeLabel,
  isDefaultPeriodRange,
} from '../../../../components/filters'
import { StatsStrip } from '../../../../components/stats'
import { useDataTableStatsVisibility } from '../../../../hooks/datatable'
import { fetchDetailJson } from '../../../../utils/detailPages'
import { getCurrentReturnTo, getDetailReturnTo } from '../../../../utils/navigation/returnTo'
import { formatCount, formatMoney } from '../../../../utils/stats/formatStats'
import { getRecordDetailPath } from '../../../crm/records/config/recordTabs'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import { formatRoiPercent } from './ClientRoiTableCard'
import {
  buildClientRoiDetailSearch,
  buildClientRoiListPath,
  getPeriodRangeFromSearchParams,
} from './clientRoiRouteUtils'

const emptyValue = '-'
const actionColumnWidth = '56px'

const quoteRecordTabBySource = {
  training: 'training-tab',
  equipment: 'equipment-tab',
  manpower: 'manpower-tab',
  ih: 'ih-tab',
  special: 'special-tab',
}

const sourceLabels = {
  system_invoice: 'System Invoice',
  manual_debtor: 'Manual Debtor',
}

const paymentColumns = [
  textColumn('ref', 'Invoice Ref', '150px'),
  textColumn('source', 'Source', '135px'),
  textColumn('project', 'Project', '220px'),
  dateColumn('invoiceDate', 'Invoice Date'),
  dateColumn('paidDate', 'Paid Date'),
  moneyColumn('paidAmount', 'Paid Amount'),
  moneyColumn('grandTotal', 'Invoice Total'),
  numberColumn('paymentDays', 'Days to Pay', '110px'),
  textColumn('method', 'Method', '140px'),
]

const invoiceColumns = [
  textColumn('ref', 'Invoice Ref', '150px'),
  textColumn('source', 'Source', '135px'),
  textColumn('project', 'Project', '220px'),
  dateColumn('invoiceDate', 'Invoice Date'),
  moneyColumn('grandTotal', 'Grand Total'),
  statusColumn('status', 'Status'),
  moneyColumn('paidAmount', 'Paid Amount'),
  dateColumn('paidDate', 'Paid Date'),
  numberColumn('paymentDays', 'Days to Pay', '110px'),
]

const quoteColumns = [
  textColumn('quoteRef', 'Quote Ref', '150px'),
  textColumn('service', 'Service', '170px'),
  textColumn('project', 'Project', '240px'),
  moneyColumn('grandTotal', 'Quote Value'),
  statusColumn('status', 'Status'),
  dateColumn('quoteDate', 'Quote Date'),
  dateColumn('awardDate', 'Award Date'),
]

const paymentRequiredColumns = new Set(['ref', 'paidDate', 'paidAmount'])
const invoiceRequiredColumns = new Set(['ref', 'invoiceDate', 'grandTotal', 'status'])
const quoteRequiredColumns = new Set(['quoteRef', 'service', 'grandTotal', 'status'])

function textColumn(key, label, width = '180px') {
  return {
    key,
    label,
    width,
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: width,
    previewCharThreshold: 34,
  }
}

function dateColumn(key, label, width = '120px') {
  return {
    key,
    label,
    width,
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  }
}

function moneyColumn(key, label, width = '140px') {
  return {
    key,
    label,
    width,
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row[key],
  }
}

function numberColumn(key, label, width = '120px') {
  return {
    key,
    label,
    width,
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row[key] ?? '',
  }
}

function statusColumn(key, label, width = '120px') {
  return {
    key,
    label,
    width,
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  }
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const compactDate = (value) => String(value || '').slice(0, 10) || ''

const buildHistoryUrl = (companyId, periodRange) => {
  const params = new URLSearchParams()
  if (periodRange?.startDate) params.set('start', periodRange.startDate)
  if (periodRange?.endDate) params.set('end', periodRange.endDate)
  const query = params.toString()
  return `${import.meta.env.VITE_API_BASE}client-companies/${encodeURIComponent(companyId)}/commercial-history${query ? `?${query}` : ''}`
}

export const normalizePaymentRows = (rows = []) =>
  rows.map((row) => ({
    ...row,
    ref: row.invoice_ref_no || emptyValue,
    source: sourceLabels[row.source_type] || row.source_type || emptyValue,
    project: row.project_name || emptyValue,
    invoiceDate: compactDate(row.invoice_date),
    paidDate: compactDate(row.paid_date),
    paidAmount: toNumber(row.paid_amount),
    grandTotal: toNumber(row.grand_total),
    paymentDays:
      row.payment_days === null || typeof row.payment_days === 'undefined'
        ? null
        : Number(row.payment_days),
    method: row.payment_method || emptyValue,
  }))

export const normalizeInvoiceRows = (rows = []) =>
  rows.map((row) => ({
    ...row,
    ref: row.invoice_ref_no || emptyValue,
    source: sourceLabels[row.source_type] || row.source_type || emptyValue,
    project: row.project_name || emptyValue,
    invoiceDate: compactDate(row.invoice_date),
    grandTotal: toNumber(row.grand_total),
    status: row.status || emptyValue,
    paidAmount: toNumber(row.paid_amount),
    paidDate: compactDate(row.paid_date),
    paymentDays:
      row.payment_days === null || typeof row.payment_days === 'undefined'
        ? null
        : Number(row.payment_days),
  }))

export const normalizeQuoteRows = (rows = []) =>
  rows.map((row) => ({
    ...row,
    quoteRef: row.quote_ref_no || emptyValue,
    service: row.service_type || emptyValue,
    project: row.project_name || emptyValue,
    grandTotal: toNumber(row.grand_total),
    status: row.status || emptyValue,
    quoteDate: compactDate(row.quote_date || row.created_at),
    awardDate: compactDate(row.award_date),
  }))

const getStatusTone = (status) => {
  const normalized = String(status || '')
    .trim()
    .toLowerCase()
  if (normalized === 'paid' || normalized === 'awarded' || normalized === 'active') return 'success'
  if (normalized === 'pending' || normalized === 'open') return 'warning'
  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'void')
    return 'danger'
  return 'info'
}

const filterRows = (rows, { searchTerm, statusFilter, typeFilter }) => {
  const term = searchTerm.trim().toLowerCase()

  return rows.filter((row) => {
    if (statusFilter !== 'all' && String(row.status || '') !== statusFilter) return false
    if (
      typeFilter !== 'all' &&
      ![row.source_type, row.source, row.service].some(
        (value) => String(value || '') === typeFilter,
      )
    )
      return false
    if (!term) return true

    return [row.ref, row.quoteRef, row.source, row.service, row.project, row.status, row.method]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term))
  })
}

const getOptions = (rows, getter) =>
  Array.from(new Set(rows.map(getter).filter(Boolean))).sort((a, b) =>
    String(a).localeCompare(String(b)),
  )

const renderText = (value, column) => (
  <DataTableTextCell
    value={value || emptyValue}
    maxWidth={column?.cellMaxWidth || column?.width || '180px'}
    title={column?.label || 'Details'}
    mode={column?.textMode || 'expandable'}
    previewCharThreshold={column?.previewCharThreshold}
  />
)

const renderMoney = (value) => formatMoney(value)
const renderNumber = (value) =>
  value === null || typeof value === 'undefined' ? emptyValue : formatCount(value)

const HistoryTableCard = ({
  title,
  rows,
  columns,
  defaultVisibleColumns,
  requiredColumns,
  storageKey,
  idPrefix,
  emptyMessage,
  exportFilename,
  loading,
  initialSortField,
  searchPlaceholder,
  getActions,
  onRowOpen,
  getMobileTitle,
  getMobileSubtitle,
  getMobileMeta,
  getMobileStatus,
  getMobileStatusTone,
  typeFilterLabel,
  typeOptions = [],
  typeFilter,
  onTypeFilterChange,
  controlsVisible,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const filteredRows = useMemo(
    () => filterRows(rows, { searchTerm, statusFilter, typeFilter }),
    [rows, searchTerm, statusFilter, typeFilter],
  )

  const statusOptions = useMemo(() => getOptions(rows, (row) => row.status), [rows])
  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}` } : null,
    typeFilter && typeFilter !== 'all'
      ? { key: 'type', label: `${typeFilterLabel}: ${typeFilter}` }
      : null,
  ].filter(Boolean)

  const clearChip = (key) => {
    if (key === 'search') setSearchTerm('')
    if (key === 'status') setStatusFilter('all')
    if (key === 'type') onTypeFilterChange?.('all')
  }

  const resetFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    onTypeFilterChange?.('all')
  }

  const renderCell = (row, column) => {
    if (column.key === 'grandTotal' || column.key === 'paidAmount')
      return renderMoney(row[column.key])
    if (column.key === 'paymentDays') return renderNumber(row[column.key])
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(row.status)}>{row.status}</DataTableStatusBadge>
      )
    }
    if (['ref', 'source', 'project', 'method', 'quoteRef', 'service'].includes(column.key)) {
      return renderText(row[column.key], column)
    }
    return row[column.key] || emptyValue
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>{title}</strong>
      </CCardHeader>
      <CCardBody>
        <DataTableRecordControls
          visible={controlsVisible}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={searchPlaceholder}
          searchAriaLabel={searchPlaceholder}
          showAdvancedFilters={showAdvancedFilters}
          setShowAdvancedFilters={setShowAdvancedFilters}
          activeFilterCount={getAdvancedFilterCount(activeChips)}
          activeChips={activeChips}
          clearChip={clearChip}
          resetFilters={resetFilters}
          loading={loading}
          desktopToolsId={`${idPrefix}-table-tools`}
          mobileToolsId={`${idPrefix}-mobile-table-tools`}
        >
          <CCol xs={12} md={4} lg={2}>
            <CFormLabel htmlFor={`${idPrefix}StatusFilter`}>Status</CFormLabel>
            <CFormSelect
              id={`${idPrefix}StatusFilter`}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          {typeOptions.length ? (
            <CCol xs={12} md={4} lg={2}>
              <CFormLabel htmlFor={`${idPrefix}TypeFilter`}>{typeFilterLabel}</CFormLabel>
              <CFormSelect
                id={`${idPrefix}TypeFilter`}
                value={typeFilter}
                onChange={(event) => onTypeFilterChange?.(event.target.value)}
              >
                <option value="all">All</option>
                {typeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          ) : null}
        </DataTableRecordControls>

        <DataTableRecordList
          rows={filteredRows}
          dataColumns={columns}
          defaultVisibleColumns={defaultVisibleColumns}
          requiredColumns={requiredColumns}
          storageKey={storageKey}
          scrollStorageKey={`${storageKey}.scroll`}
          idPrefix={idPrefix}
          emptyMessage={emptyMessage}
          exportFilename={exportFilename}
          loading={loading}
          loadingMessage={`Loading ${title.toLowerCase()}...`}
          showDesktopSummary={false}
          desktopUtilityPlacement="portal"
          desktopUtilityPortalId={`${idPrefix}-table-tools`}
          mobileUtilityPlacement="portal"
          mobileUtilityPortalId={`${idPrefix}-mobile-table-tools`}
          showMobileUtilityRow={false}
          actionColumnWidth={actionColumnWidth}
          getRowKey={(row, index) => `${row.source_type || 'row'}-${row.id || index}`}
          renderCell={renderCell}
          getActions={getActions}
          onRowOpen={onRowOpen}
          getMobileTitle={getMobileTitle}
          getMobileSubtitle={getMobileSubtitle}
          getMobileMeta={getMobileMeta}
          getMobileStatus={getMobileStatus}
          getMobileStatusTone={getMobileStatusTone}
          initialSortField={initialSortField}
          initialSortDir="desc"
          initialSortDirByField={{
            invoiceDate: 'desc',
            paidDate: 'desc',
            quoteDate: 'desc',
            awardDate: 'desc',
            grandTotal: 'desc',
            paidAmount: 'desc',
          }}
          getSortValue={(row, field) => row[field]}
          resetDeps={[searchTerm, statusFilter, typeFilter]}
        />
      </CCardBody>
    </CCard>
  )
}

const ClientRoiDetailPage = () => {
  const { companyId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const periodRange = useMemo(
    () => getPeriodRangeFromSearchParams(searchParams, 'all'),
    [searchParams],
  )
  const returnTo = getDetailReturnTo(location, buildClientRoiListPath(periodRange))
  const [payload, setPayload] = useState({
    client: null,
    summary: null,
    payments: [],
    invoices: [],
    quotes: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all')
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState('all')
  const [quoteTypeFilter, setQuoteTypeFilter] = useState('all')

  useEffect(() => {
    const controller = new AbortController()

    const fetchHistory = async () => {
      setLoading(true)
      setError('')
      try {
        const detail = await fetchDetailJson(buildHistoryUrl(companyId, periodRange), {
          signal: controller.signal,
          notFoundMessage: 'Client commercial history not found.',
        })
        if (detail.notFound) {
          setPayload({ client: null, summary: null, payments: [], invoices: [], quotes: [] })
          return
        }
        const result = detail.data
        if (result.status !== 'success') {
          throw new Error(result.message || 'Failed to fetch client commercial history.')
        }
        setPayload({
          client: result.data?.client || null,
          summary: result.data?.summary || null,
          payments: Array.isArray(result.data?.payments) ? result.data.payments : [],
          invoices: Array.isArray(result.data?.invoices) ? result.data.invoices : [],
          quotes: Array.isArray(result.data?.quotes) ? result.data.quotes : [],
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch client commercial history.')
          setPayload({ client: null, summary: null, payments: [], invoices: [], quotes: [] })
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchHistory()

    return () => controller.abort()
  }, [companyId, periodRange])

  const clientName = payload.client?.company_name || `Client #${companyId}`
  const normalizedPayments = useMemo(
    () => normalizePaymentRows(payload.payments),
    [payload.payments],
  )
  const normalizedInvoices = useMemo(
    () => normalizeInvoiceRows(payload.invoices),
    [payload.invoices],
  )
  const normalizedQuotes = useMemo(() => normalizeQuoteRows(payload.quotes), [payload.quotes])

  const paymentTypeOptions = useMemo(
    () => getOptions(normalizedPayments, (row) => row.source),
    [normalizedPayments],
  )
  const invoiceTypeOptions = useMemo(
    () => getOptions(normalizedInvoices, (row) => row.source),
    [normalizedInvoices],
  )
  const quoteTypeOptions = useMemo(
    () => getOptions(normalizedQuotes, (row) => row.service),
    [normalizedQuotes],
  )

  const summaryStats = useMemo(() => {
    const summary = payload.summary || {}
    return [
      {
        key: 'awarded',
        label: 'Awarded Value',
        value: formatMoney(summary.awarded_value),
        sublabel: `${formatCount(summary.awarded_project_count)} awarded jobs`,
        tone: 'info',
      },
      {
        key: 'invoiced',
        label: 'Invoiced Total',
        value: formatMoney(summary.invoiced_total),
        sublabel: `${formatCount(summary.invoice_count)} invoices`,
        tone: 'secondary',
      },
      {
        key: 'received',
        label: 'Received Total',
        value: formatMoney(summary.received_total),
        sublabel: `${formatCount(summary.received_count)} paid records`,
        tone: 'success',
      },
      {
        key: 'actual-profit',
        label: 'Actual Profit',
        value: formatMoney(summary.actual_profit),
        sublabel: `ROI ${formatRoiPercent(summary.actual_roi_percent)}`,
        tone: Number(summary.actual_profit || 0) >= 0 ? 'primary' : 'danger',
      },
    ]
  }, [payload.summary])

  const updatePeriodRange = (nextRange) => {
    setSearchParams(buildClientRoiDetailSearch(nextRange).replace(/^\?/, ''), { replace: true })
  }

  const periodChip =
    periodRange && !isDefaultPeriodRange(periodRange)
      ? `Period: ${getPeriodRangeLabel(periodRange)}`
      : ''

  const openInvoiceRow = (row) => {
    const currentReturnTo = getCurrentReturnTo(location)
    if (row.source_type === 'manual_debtor') {
      navigate(`/commercial/debtors/manual/${row.id}/edit`, {
        state: { record: row, returnTo: currentReturnTo },
      })
      return
    }
    navigate(`/commercial/invoice/${row.id}`, {
      state: { record: row, returnTo: currentReturnTo },
    })
  }
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('client.roi.detail')

  const openQuoteRow = (row) => {
    const tab = quoteRecordTabBySource[row.source_type]
    if (!tab) return
    navigate(getRecordDetailPath(tab, row.id), {
      state: { record: row, returnTo: getCurrentReturnTo(location) },
    })
  }

  return (
    <>
      <ClientModuleNavStrip />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <DataTableCardHeader
              title={
                <span>
                  Client Commercial History <span className="text-muted ms-2">{clientName}</span>
                </span>
              }
              scopeLabel={periodChip ? getPeriodRangeLabel(periodRange) : ''}
            >
              <div className="d-flex gap-2 align-items-center">
                <DataTableStatsToggle
                  visible={statsVisible}
                  onToggle={toggleStatsVisible}
                  controlsVisible={controlsVisible}
                  onControlsToggle={toggleControlsVisible}
                />
                <PeriodRangeSelector value={periodRange} onChange={updatePeriodRange} />
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() =>
                    navigate(`/client/manage/${companyId}`, {
                      state: { company: payload.client, returnTo: getCurrentReturnTo(location) },
                    })
                  }
                >
                  View Client Details
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  onClick={() => navigate(returnTo)}
                >
                  Back
                </CButton>
              </div>
            </DataTableCardHeader>
            <CCardBody>
              {error ? <CAlert color="danger">{error}</CAlert> : null}
              {statsVisible && <StatsStrip items={summaryStats} loading={loading} />}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <HistoryTableCard
        title="Payment History"
        rows={normalizedPayments}
        columns={paymentColumns}
        defaultVisibleColumns={{
          ref: true,
          source: true,
          project: true,
          invoiceDate: true,
          paidDate: true,
          paidAmount: true,
          grandTotal: true,
          paymentDays: true,
          method: true,
        }}
        requiredColumns={paymentRequiredColumns}
        storageKey="client.roi.detail.payments.visible-columns.v1"
        scrollStorageKey="client.roi.detail.payments.scroll"
        idPrefix="client-roi-payments"
        emptyMessage="No payment history found for this client."
        exportFilename={`client-${companyId}-payments-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        initialSortField="paidDate"
        searchPlaceholder="Search payments"
        typeFilterLabel="Source"
        typeOptions={paymentTypeOptions}
        typeFilter={paymentTypeFilter}
        onTypeFilterChange={setPaymentTypeFilter}
        onRowOpen={openInvoiceRow}
        getActions={(row) => [
          {
            key: 'open',
            label: row.source_type === 'manual_debtor' ? 'Open Manual Debtor' : 'Open Invoice',
            onClick: () => openInvoiceRow(row),
          },
        ]}
        getMobileTitle={(row) => row.ref}
        getMobileSubtitle={(row) => row.source}
        getMobileMeta={(row) => `${row.paidDate || emptyValue} | ${formatMoney(row.paidAmount)}`}
        getMobileStatus={(row) => row.status}
        getMobileStatusTone={(row) => getStatusTone(row.status)}
        controlsVisible={controlsVisible}
      />

      <HistoryTableCard
        title="Invoice History"
        rows={normalizedInvoices}
        columns={invoiceColumns}
        defaultVisibleColumns={{
          ref: true,
          source: true,
          project: true,
          invoiceDate: true,
          grandTotal: true,
          status: true,
          paidAmount: true,
          paidDate: true,
          paymentDays: true,
        }}
        requiredColumns={invoiceRequiredColumns}
        storageKey="client.roi.detail.invoices.visible-columns.v1"
        scrollStorageKey="client.roi.detail.invoices.scroll"
        idPrefix="client-roi-invoices"
        emptyMessage="No invoice history found for this client."
        exportFilename={`client-${companyId}-invoices-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        initialSortField="invoiceDate"
        searchPlaceholder="Search invoices"
        typeFilterLabel="Source"
        typeOptions={invoiceTypeOptions}
        typeFilter={invoiceTypeFilter}
        onTypeFilterChange={setInvoiceTypeFilter}
        onRowOpen={openInvoiceRow}
        getActions={(row) => [
          {
            key: 'open',
            label: row.source_type === 'manual_debtor' ? 'Open Manual Debtor' : 'Open Invoice',
            onClick: () => openInvoiceRow(row),
          },
        ]}
        getMobileTitle={(row) => row.ref}
        getMobileSubtitle={(row) => row.source}
        getMobileMeta={(row) => `${row.invoiceDate || emptyValue} | ${formatMoney(row.grandTotal)}`}
        getMobileStatus={(row) => row.status}
        getMobileStatusTone={(row) => getStatusTone(row.status)}
        controlsVisible={controlsVisible}
      />

      <HistoryTableCard
        title="Quotation / Award History"
        rows={normalizedQuotes}
        columns={quoteColumns}
        defaultVisibleColumns={{
          quoteRef: true,
          service: true,
          project: true,
          grandTotal: true,
          status: true,
          quoteDate: true,
          awardDate: true,
        }}
        requiredColumns={quoteRequiredColumns}
        storageKey="client.roi.detail.quotes.visible-columns.v1"
        scrollStorageKey="client.roi.detail.quotes.scroll"
        idPrefix="client-roi-quotes"
        emptyMessage="No quotation history found for this client."
        exportFilename={`client-${companyId}-quotes-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        initialSortField="quoteDate"
        searchPlaceholder="Search quotations"
        typeFilterLabel="Service"
        typeOptions={quoteTypeOptions}
        typeFilter={quoteTypeFilter}
        onTypeFilterChange={setQuoteTypeFilter}
        onRowOpen={openQuoteRow}
        getActions={(row) => {
          const canOpen = Boolean(quoteRecordTabBySource[row.source_type])
          return [
            {
              key: 'open',
              label: 'Open Quote',
              disabled: !canOpen,
              tooltip: canOpen ? undefined : 'No quote detail route is available for this source.',
              onClick: () => openQuoteRow(row),
            },
            row.project_id
              ? {
                  key: 'project',
                  label: 'Open Project',
                  onClick: () =>
                    navigate(`/project/manage/${row.project_id}`, {
                      state: { returnTo: getCurrentReturnTo(location) },
                    }),
                }
              : null,
          ].filter(Boolean)
        }}
        getMobileTitle={(row) => row.quoteRef}
        getMobileSubtitle={(row) => row.service}
        getMobileMeta={(row) => `${row.quoteDate || emptyValue} | ${formatMoney(row.grandTotal)}`}
        getMobileStatus={(row) => row.status}
        getMobileStatusTone={(row) => getStatusTone(row.status)}
        controlsVisible={controlsVisible}
      />
    </>
  )
}

export default ClientRoiDetailPage
