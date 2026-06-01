import React, { useState, useEffect, useMemo } from 'react'
import { CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react'
import { DataTableRecordList, DataTableStatusBadge } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { formatMoney } from '../../../utils/stats/formatStats'
import { fetchJsonGet, isAbortError } from '../shared/fetchUtils'
import { recordsDesktopBreakpoint } from '../../crm/records/config/recordsTableUiShared'
import { getAgeTone } from '../../commercial/debtors/debtorUtils'
import { getPaymentTermsCompactLabel } from '../../../shared/paymentTerms'
import MonthlyFinancialTrendWidget from './MonthlyFinancialTrendWidget'

// Helper: format date as "01 Jan 2025"
const formatDisplayDate = (date) => {
  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return '-'

  return parsedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const parseLocalDate = (date) => {
  const [year, month, day] = String(date || '')
    .split('-')
    .map(Number)

  if (!year || !month || !day) return null

  const parsedDate = new Date(year, month - 1, day)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

const formatScopeDate = (date) => {
  const parsedDate = parseLocalDate(date) || new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return ''

  return parsedDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatPeriodScope = (startDate, endDate) => {
  const startLabel = formatScopeDate(startDate)
  const endLabel = formatScopeDate(endDate)

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
  if (endLabel) return `Up to ${endLabel}`
  return 'All time'
}

// Helper: compute age in days
const computeAge = (date, asOfDate) => {
  const then = new Date(date)
  const now = asOfDate ? new Date(asOfDate) : new Date()
  if (Number.isNaN(then.getTime()) || Number.isNaN(now.getTime())) return '-'

  const diff = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  return `${diff}d`
}

const formatInvoiceAmount = (value) => Number(value || 0).toLocaleString()
const formatProjectCount = (count) => {
  const normalizedCount = Number(count || 0)
  return `${normalizedCount.toLocaleString()} ${normalizedCount === 1 ? 'project' : 'projects'}`
}
const formatInvoiceRef = (invoice) => String(invoice?.invoice_ref_no || '').trim() || '-'
const getInvoiceDebtor = (invoice) => invoice.client_name || invoice.invoice_client_name || '-'
const getInvoiceProject = (invoice) => invoice.project_name || '-'
const getInvoicePaymentTermsDays = (invoice) =>
  invoice?.paymentTermsDays ?? invoice?.payment_terms_days ?? null
const getInvoicePaymentTermsSource = (invoice) =>
  invoice?.paymentTermsSource || invoice?.payment_terms_source || ''
const getInvoicePaymentTermsDisplay = (invoice) => {
  const days = getInvoicePaymentTermsDays(invoice)
  if (days === null || days === undefined || days === '') return '-'
  return getPaymentTermsCompactLabel(getInvoicePaymentTermsSource(invoice), days)
}
const renderInvoicePaymentTerms = (invoice) => {
  const label = getInvoicePaymentTermsDisplay(invoice)
  if (label === '-') return label
  return <DataTableStatusBadge tone="secondary">{label}</DataTableStatusBadge>
}

const getInvoiceAgeDays = (invoice) => {
  const invoiceDate = new Date(invoice?.invoice_date)
  const asOfDate = invoice?.__debtorsAsOfDate ? new Date(invoice.__debtorsAsOfDate) : new Date()
  if (Number.isNaN(invoiceDate.getTime()) || Number.isNaN(asOfDate.getTime())) return 0

  return Math.floor((asOfDate - invoiceDate) / (1000 * 60 * 60 * 24))
}

const debtorTableColumns = [
  {
    key: 'invoice',
    label: 'Invoice',
    sortable: true,
    width: '8rem',
    cellMaxWidth: '8rem',
    previewCharThreshold: 20,
    truncateCharThreshold: 20,
    textMode: 'tooltip',
    allowWrap: true,
    getExportValue: formatInvoiceRef,
  },
  {
    key: 'debtor',
    label: 'Debtor',
    sortable: true,
    width: '12rem',
    cellMaxWidth: '12rem',
    previewCharThreshold: 28,
    truncateCharThreshold: 28,
    textMode: 'tooltip',
    getExportValue: getInvoiceDebtor,
  },
  {
    key: 'age',
    label: 'Age',
    sortable: true,
    sortType: 'number',
    align: 'center',
    width: '4rem',
    shrinkToFit: true,
    getExportValue: (invoice) => computeAge(invoice.invoice_date, invoice.__debtorsAsOfDate),
  },
  {
    key: 'paymentTerms',
    label: 'Terms',
    sortable: true,
    sortType: 'number',
    align: 'center',
    width: '5.5rem',
    shrinkToFit: true,
    getExportValue: getInvoicePaymentTermsDisplay,
  },
  {
    key: 'invoiceDate',
    label: 'Invoice Date',
    sortable: true,
    sortType: 'date',
    width: '6.5rem',
    shrinkToFit: true,
    getExportValue: (invoice) => formatDisplayDate(invoice.invoice_date),
  },
  {
    key: 'project',
    label: 'Project',
    sortable: true,
    width: '14rem',
    cellMaxWidth: '14rem',
    previewCharThreshold: 32,
    truncateCharThreshold: 32,
    textMode: 'tooltip',
    getExportValue: getInvoiceProject,
  },
  {
    key: 'amount',
    label: 'Amount',
    sortable: true,
    sortType: 'number',
    align: 'end',
    width: '6rem',
    shrinkToFit: true,
    getExportValue: (invoice) => `RM ${formatInvoiceAmount(invoice.grand_total)}`,
  },
]

const debtorDefaultVisibleColumns = debtorTableColumns.reduce((columns, column) => {
  columns[column.key] = true
  return columns
}, {})
const debtorRequiredColumns = new Set(['invoice'])

const MonthlyIncomeStatement = ({ startDate, endDate }) => {
  const desktopBreakpoint = recordsDesktopBreakpoint
  const [totals, setTotals] = useState({
    totalInvoiced: 0,
    totalReceived: 0,
    outstandingAmount: 0,
    outstandingCount: 0,
    uninvoicedAwardedAmount: 0,
    uninvoicedAwardedCount: 0,
    asOfDate: '',
  })
  const [invoices, setInvoices] = useState([])
  const [totalsLoading, setTotalsLoading] = useState(true)
  const [totalsError, setTotalsError] = useState('')
  const [debtorsLoading, setDebtorsLoading] = useState(true)
  const [debtorsError, setDebtorsError] = useState('')
  const [debtorsAsOfDate, setDebtorsAsOfDate] = useState('')
  const debtorRows = useMemo(
    () =>
      invoices.map((invoice) => ({
        ...invoice,
        __debtorsAsOfDate: debtorsAsOfDate,
      })),
    [debtorsAsOfDate, invoices],
  )
  const debtorPageSize = Math.max(debtorRows.length, 1)
  const periodScopeLabel = useMemo(
    () => formatPeriodScope(startDate, endDate),
    [startDate, endDate],
  )
  const receivablesScopeLabel = useMemo(() => {
    const asOfLabel = formatScopeDate(totals.asOfDate || endDate)
    return asOfLabel ? `All years as of ${asOfLabel}` : 'All years'
  }, [endDate, totals.asOfDate])
  const uninvoicedAwardedScopeLabel = useMemo(() => {
    const asOfLabel = formatScopeDate(totals.asOfDate || endDate)
    const countLabel = formatProjectCount(totals.uninvoicedAwardedCount)
    return asOfLabel ? `${countLabel} as of ${asOfLabel}` : countLabel
  }, [endDate, totals.asOfDate, totals.uninvoicedAwardedCount])
  const financialStatsItems = useMemo(
    () => [
      {
        key: 'amount-invoiced',
        label: 'Amount Invoiced',
        value: formatMoney(totals.totalInvoiced),
        sublabel: periodScopeLabel,
        tone: 'primary',
      },
      {
        key: 'amount-received',
        label: 'Amount Received',
        value: formatMoney(totals.totalReceived),
        sublabel: periodScopeLabel,
        tone: 'success',
      },
      {
        key: 'open-receivables',
        label: 'Open Receivables',
        value: formatMoney(totals.outstandingAmount),
        sublabel: receivablesScopeLabel,
        tone: 'warning',
      },
      {
        key: 'awarded-not-invoiced',
        label: 'Awarded Not Invoiced',
        value: formatMoney(totals.uninvoicedAwardedAmount),
        sublabel: uninvoicedAwardedScopeLabel,
        tone: 'info',
      },
    ],
    [
      periodScopeLabel,
      receivablesScopeLabel,
      totals.outstandingAmount,
      totals.totalInvoiced,
      totals.totalReceived,
      totals.uninvoicedAwardedAmount,
      uninvoicedAwardedScopeLabel,
    ],
  )

  // Fetch income totals on date change
  useEffect(() => {
    const controller = new AbortController()

    const loadTotals = async () => {
      setTotalsLoading(true)
      setTotalsError('')

      try {
        const {
          status,
          totalInvoiced = 0,
          totalReceived = 0,
          outstandingAmount = 0,
          outstandingCount = 0,
          uninvoicedAwardedAmount = 0,
          uninvoicedAwardedCount = 0,
          asOfDate = '',
        } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/monthly-income-statement`,
          { start_date: startDate, end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success') {
          setTotals({
            totalInvoiced,
            totalReceived,
            outstandingAmount,
            outstandingCount,
            uninvoicedAwardedAmount,
            uninvoicedAwardedCount,
            asOfDate,
          })
        } else {
          setTotals({
            totalInvoiced: 0,
            totalReceived: 0,
            outstandingAmount: 0,
            outstandingCount: 0,
            uninvoicedAwardedAmount: 0,
            uninvoicedAwardedCount: 0,
            asOfDate: '',
          })
          setTotalsError('Unable to load income totals.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setTotals({
          totalInvoiced: 0,
          totalReceived: 0,
          outstandingAmount: 0,
          outstandingCount: 0,
          uninvoicedAwardedAmount: 0,
          uninvoicedAwardedCount: 0,
          asOfDate: '',
        })
        setTotalsError('Unable to load income totals.')
      } finally {
        if (!controller.signal.aborted) {
          setTotalsLoading(false)
        }
      }
    }

    loadTotals()

    return () => controller.abort()
  }, [startDate, endDate])

  // Fetch debtor list as all open receivables up to the selected end date.
  useEffect(() => {
    const controller = new AbortController()

    const loadDebtors = async () => {
      setDebtorsLoading(true)
      setDebtorsError('')
      setDebtorsAsOfDate('')

      try {
        const {
          status,
          debtors,
          asOfDate = '',
        } = await fetchJsonGet(
          `${import.meta.env.VITE_API_BASE}stats/debtors`,
          { end_date: endDate },
          controller.signal,
        )

        if (controller.signal.aborted) return

        if (status === 'success' && Array.isArray(debtors)) {
          setInvoices(debtors)
          setDebtorsAsOfDate(asOfDate)
        } else {
          setInvoices([])
          setDebtorsError('Unable to load debtor list.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setInvoices([])
        setDebtorsError('Unable to load debtor list.')
      } finally {
        if (!controller.signal.aborted) {
          setDebtorsLoading(false)
        }
      }
    }

    loadDebtors()

    return () => controller.abort()
  }, [endDate])

  return (
    <>
      <MonthlyFinancialTrendWidget startDate={startDate} endDate={endDate} />

      <CCard className="mb-4">
        <CCardHeader>
          <CRow className="align-items-center">
            <CCol className="text-nowrap">
              <strong>Open Receivables</strong>
            </CCol>
          </CRow>
        </CCardHeader>
        <CCardBody>
          {totalsError ? (
            <div className="text-center text-danger py-3">{totalsError}</div>
          ) : (
            <StatsStrip items={financialStatsItems} loading={totalsLoading} className="mb-4" />
          )}

          {debtorsError ? (
            <div className="text-center text-danger py-3">{debtorsError}</div>
          ) : (
            <DataTableRecordList
              rows={debtorRows}
              dataColumns={debtorTableColumns}
              defaultVisibleColumns={debtorDefaultVisibleColumns}
              requiredColumns={debtorRequiredColumns}
              idPrefix="financial-debtors"
              loading={debtorsLoading}
              loadingMessage="Loading debtors..."
              emptyMessage="No debtors"
              getRowKey={(invoice, index) => invoice.id || invoice.invoice_ref_no || index}
              renderCell={(invoice, column) => {
                if (column.key === 'invoice') return formatInvoiceRef(invoice)
                if (column.key === 'debtor') return getInvoiceDebtor(invoice)
                if (column.key === 'invoiceDate') return formatDisplayDate(invoice.invoice_date)
                if (column.key === 'project') return getInvoiceProject(invoice)
                if (column.key === 'age') {
                  const ageDays = getInvoiceAgeDays(invoice)
                  return (
                    <DataTableStatusBadge tone={getAgeTone(ageDays)}>
                      {computeAge(invoice.invoice_date, invoice.__debtorsAsOfDate)}
                    </DataTableStatusBadge>
                  )
                }
                if (column.key === 'paymentTerms') return renderInvoicePaymentTerms(invoice)
                if (column.key === 'amount') {
                  return `RM ${formatInvoiceAmount(invoice.grand_total)}`
                }
                return '-'
              }}
              getSortValue={(invoice, field) => {
                if (field === 'invoice') return formatInvoiceRef(invoice)
                if (field === 'debtor') return getInvoiceDebtor(invoice)
                if (field === 'invoiceDate') return invoice.invoice_date || ''
                if (field === 'project') return getInvoiceProject(invoice)
                if (field === 'age') return getInvoiceAgeDays(invoice)
                if (field === 'paymentTerms')
                  return Number(getInvoicePaymentTermsDays(invoice) ?? -1)
                if (field === 'amount') return Number(invoice.grand_total || 0)
                return invoice?.[field] || ''
              }}
              initialSortField="invoiceDate"
              initialSortDir="asc"
              controlledPageSize={debtorPageSize}
              controlledSetPageSize={() => {}}
              controlledCurrentPage={1}
              controlledSetCurrentPage={() => {}}
              pageSizeOptions={[debtorPageSize]}
              desktopBreakpoint={desktopBreakpoint}
              showDesktopSummary={false}
              desktopUtilityPlacement="hidden"
              mobileUtilityPlacement="hidden"
              showMobileUtilityRow={false}
              showMobileTopFooter={false}
              showFooter={false}
              showExport={false}
              showColumnMenu={false}
              showScrollTip={false}
              recordsLength={debtorRows.length}
              mobileRecord={{
                title: formatInvoiceRef,
                subtitle: getInvoiceDebtor,
                meta: getInvoiceProject,
                kv: (invoice) => [
                  {
                    key: 'invoice-date',
                    label: 'Invoice Date',
                    value: formatDisplayDate(invoice.invoice_date),
                  },
                  {
                    key: 'age',
                    label: 'Age',
                    value: (
                      <DataTableStatusBadge tone={getAgeTone(getInvoiceAgeDays(invoice))}>
                        {computeAge(invoice.invoice_date, invoice.__debtorsAsOfDate)}
                      </DataTableStatusBadge>
                    ),
                  },
                  {
                    key: 'payment-terms',
                    label: 'Terms',
                    value: renderInvoicePaymentTerms(invoice),
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    value: (
                      <span className="fw-semibold text-warning">
                        RM {formatInvoiceAmount(invoice.grand_total)}
                      </span>
                    ),
                  },
                ],
              }}
              tableViewportDeps={[debtorRows.length, debtorsAsOfDate]}
            />
          )}
        </CCardBody>
      </CCard>
    </>
  )
}

export default MonthlyIncomeStatement
