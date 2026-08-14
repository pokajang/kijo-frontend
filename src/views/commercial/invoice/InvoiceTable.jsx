import React, { useMemo, useState } from 'react'
import { DataTableRecordList, DataTableStatusBadge } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { formatCount, formatMoney, getTopGroupBySum, sumBy } from '../../../utils/stats/formatStats'
import { getAgeTone } from '../debtors/debtorUtils'
import { getInvoicePaymentTermsSourceLabel } from '../../../shared/paymentTerms'

const emptyValue = '-'
const columnStorageKey = 'commercial.invoices.visible-columns.v4'
const isCancelledInvoice = (status) =>
  ['cancelled', 'canceled', 'void'].includes(
    String(status || '')
      .trim()
      .toLowerCase(),
  )
const isPaidInvoice = (status) =>
  String(status || '')
    .trim()
    .toLowerCase() === 'paid'
const isEquipmentService = (serviceType) =>
  ['equipment', 'equipment supply'].includes(
    String(serviceType || '')
      .trim()
      .toLowerCase(),
  )

const defaultVisibleColumns = {
  invoice: true,
  hrdClaimRef: false,
  client: true,
  pic: true,
  picPhone: false,
  picEmail: false,
  serviceType: true,
  servicePeriod: false,
  purpose: false,
  issued: true,
  terms: true,
  dueDate: false,
  age: true,
  total: true,
  status: true,
}

const requiredColumns = new Set(['invoice', 'client', 'status'])

const getInvoiceExportValue = (inv) => {
  return inv.invoice || emptyValue
}

const dataColumns = [
  {
    key: 'invoice',
    label: 'Invoice',
    width: '170px',
    sortable: true,
    sortType: 'string',
    getExportValue: getInvoiceExportValue,
  },
  {
    key: 'hrdClaimRef',
    label: 'HRD Ref',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.hrdClaimRefDisplay,
  },
  { key: 'client', label: 'Client', width: '210px', sortable: true, sortType: 'string' },
  {
    key: 'age',
    label: 'Age',
    width: '90px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.ageDisplay,
  },
  {
    key: 'pic',
    label: 'PIC',
    width: '160px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'picPhone',
    label: 'Phone',
    width: '140px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'picEmail',
    label: 'Email',
    width: '190px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'serviceType',
    label: 'Service',
    width: '130px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'servicePeriod',
    label: 'Service Period',
    width: '210px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'purpose',
    label: 'Purpose',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (inv) => inv.purpose,
  },
  {
    key: 'issued',
    label: 'Issued',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.issuedDisplay,
  },
  {
    key: 'terms',
    label: 'Terms',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.termsDisplay,
  },
  {
    key: 'dueDate',
    label: 'Due',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.dueDateDisplay,
  },
  {
    key: 'total',
    label: 'Total',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.totalDisplay,
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inv) => inv.status,
  },
]

const getStatusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'paid') return 'success'
  if (normalized === 'unpaid' || normalized === 'pending') return 'warning'
  if (normalized === 'overdue') return 'danger'
  if (normalized.includes('cancel') || normalized.includes('void')) return 'danger'
  return 'warning'
}

const parseMoney = (value) => {
  const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const InvoiceTable = ({
  invoices = [],
  loading = false,
  beforeList,
  onAction,
  onDelete,
  onOpen,
  renderQuickFilters,
  desktopUtilityPortalId,
  mobileUtilityPortalId,
  onStatFilter,
  statsVisible = true,
}) => {
  const normalizedInvoices = useMemo(
    () =>
      invoices.map((inv) => {
        const reqCompany = inv.requestor?.company || {}
        const reqPic = inv.requestor?.pic || {}
        const serviceType = inv.serviceType || emptyValue
        const isHrdTraining =
          String(serviceType).toLowerCase() === 'training' &&
          String(inv?.paymentMethod || '')
            .toLowerCase()
            .includes('hrd')
        const isEquipment = inv.isEquipment ?? isEquipmentService(serviceType)

        return {
          ...inv,
          invoice: inv.id || emptyValue,
          client: reqCompany.name || emptyValue,
          pic: reqPic.name || emptyValue,
          picPhone: reqPic.phone || emptyValue,
          picEmail: reqPic.email || emptyValue,
          purpose: inv.purpose || emptyValue,
          serviceType,
          servicePeriod: inv.servicePeriod || emptyValue,
          hrdClaimRefDisplay: isHrdTraining ? inv.hrdClaimRef || '??' : emptyValue,
          issued: inv.dateIssued || '',
          issuedDisplay: inv.dateIssued || emptyValue,
          terms: Number(inv.paymentTermsDays ?? 30),
          termsDisplay: getInvoicePaymentTermsSourceLabel(
            inv.paymentTermsSource,
            inv.paymentTermsDays,
          ),
          dueDate: inv.dueDate || '',
          dueDateDisplay: inv.dueDate || emptyValue,
          age: Number.parseInt(inv.dueInDays, 10) || 0,
          ageDisplay: inv.dueInDays ?? emptyValue,
          total: parseMoney(inv.grandTotal),
          totalDisplay: inv.grandTotal || emptyValue,
          status: inv.status || emptyValue,
          isHrdTraining,
          isEquipment,
          internalPicDisplay:
            inv.internalPic?.code || inv.internalPic?.name || inv.internalPic?.id || emptyValue,
        }
      }),
    [invoices],
  )

  const statsItems = useMemo(() => {
    const unpaidRows = normalizedInvoices.filter((inv) => {
      const status = String(inv.status || '').toLowerCase()
      return status === 'unpaid' || status === 'pending'
    })
    const topPic = getTopGroupBySum(
      normalizedInvoices,
      (inv) => inv.internalPicDisplay,
      (inv) => inv.total,
    )

    return [
      {
        key: 'invoices',
        label: 'Invoices',
        value: formatCount(normalizedInvoices.length),
        tone: 'primary',
      },
      {
        key: 'total',
        label: 'Total Amount',
        value: formatMoney(sumBy(normalizedInvoices, (inv) => inv.total)),
        tone: 'info',
      },
      {
        key: 'unpaid',
        label: 'Unpaid',
        value: formatCount(unpaidRows.length),
        sublabel: formatMoney(sumBy(unpaidRows, (inv) => inv.total)),
        tone: 'warning',
      },
      {
        key: 'top-pic',
        label: 'Top Internal PIC',
        value: topPic.value,
        sublabel: `${formatMoney(topPic.total)} across ${formatCount(topPic.count)} invoices`,
        tone: 'secondary',
        onClick:
          onStatFilter && topPic.value && topPic.value !== emptyValue
            ? () => onStatFilter('pic', topPic.value)
            : undefined,
      },
    ]
  }, [normalizedInvoices, onStatFilter])

  const getActions = (inv) =>
    [
      {
        key: 'view',
        label: 'View',
        onClick: () => onAction('view', inv),
      },
      {
        key: 'edit',
        label: 'Edit',
        onClick: () => onAction('edit', inv),
      },
      inv.isHrdTraining
        ? {
            key: 'updatehrdclaim',
            label: 'HRD Claim Ref',
            onClick: () => onAction('updatehrdclaim', inv),
          }
        : null,
      {
        key: 'generate',
        label: 'PDF Invoice',
        onClick: () => onAction('generate', inv),
      },
      inv.isEquipment
        ? {
            key: 'generate-word',
            label: 'Word Invoice',
            onClick: () => onAction('generateWord', inv),
          }
        : null,
      isPaidInvoice(inv.status)
        ? {
            key: 'receipt',
            label: 'PDF Receipt',
            onClick: () => onAction('receipt', inv),
          }
        : null,
      inv.isEquipment && isPaidInvoice(inv.status)
        ? {
            key: 'receipt-word',
            label: 'Word Receipt',
            onClick: () => onAction('receiptWord', inv),
          }
        : null,
      !isCancelledInvoice(inv.status)
        ? {
            key: 'markpaid',
            label: 'Update Payment',
            onClick: () => onAction('markpaid', inv),
          }
        : null,
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        dividerBefore: true,
        onClick: () => onDelete(inv),
      },
    ].filter(Boolean)

  const renderHrdClaimRefCell = (inv) => (
    <>
      {inv.isHrdTraining && (
        <small className={inv.hrdClaimRef ? 'text-muted' : 'text-danger fw-semibold'}>
          {inv.hrdClaimRef || '??'}
        </small>
      )}
      {!inv.isHrdTraining && <span className="text-muted">{emptyValue}</span>}
    </>
  )

  const renderCell = (inv, column) => {
    if (column.key === 'hrdClaimRef') return renderHrdClaimRefCell(inv)
    if (column.key === 'issued') return inv.issuedDisplay
    if (column.key === 'terms') return inv.termsDisplay
    if (column.key === 'dueDate') return inv.dueDateDisplay
    if (column.key === 'age') {
      return (
        <DataTableStatusBadge tone={getAgeTone(inv.age)}>{inv.ageDisplay}</DataTableStatusBadge>
      )
    }
    if (column.key === 'total') return inv.totalDisplay
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(inv.status)}>{inv.status}</DataTableStatusBadge>
      )
    }

    return inv[column.key] || emptyValue
  }

  return (
    <>
      {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
      {beforeList}
      <DataTableRecordList
        rows={normalizedInvoices}
        loading={loading}
        loadingMessage="Loading invoices..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey={columnStorageKey}
        scrollStorageKey="commercial.invoice.records.scroll"
        idPrefix="invoice-record"
        emptyMessage="No invoice records found."
        exportFilename={`invoices-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId={desktopUtilityPortalId}
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId={mobileUtilityPortalId}
        showMobileUtilityRow={false}
        renderQuickFilters={renderQuickFilters}
        getRowKey={(inv, index) => inv.id || `${inv.invoice}-${index}`}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={(inv) => (onOpen ? onOpen(inv) : onAction('view', inv))}
        getMobileTitle={(inv) => inv.invoice}
        getMobileSubtitle={(inv) => inv.client}
        getMobileMeta={(inv) => `${inv.issuedDisplay} | ${inv.totalDisplay}`}
        getMobileStatus={(inv) => inv.status}
        getMobileStatusTone={(inv) => getStatusTone(inv.status)}
        mobileFieldKeys={{
          title: 'invoice',
          subtitle: 'client',
          meta: ['issued', 'total'],
          status: 'status',
        }}
        initialSortField="issued"
        initialSortDir="desc"
        initialSortDirByField={{ issued: 'desc', total: 'desc', age: 'desc' }}
        getSortValue={(invoice, field) => invoice[field]}
        resetDeps={[]}
        actionColumnWidth="56px"
      />
    </>
  )
}

export default InvoiceTable
