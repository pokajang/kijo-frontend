import {
  getPeriodRangeLabel,
  isDateInPeriodRange,
  isDefaultPeriodRange,
} from '../../../../components/filters'
import { formatCount, getTopGroupByCount } from '../../../../utils/stats/formatStats'
import {
  formatDate,
  inquiryStatuses,
  serviceLabel,
  serviceOptions,
  statusLabel,
} from '../inquiryUtils'

export const getDefaultInquiryRecordFilters = () => ({
  q: '',
  status: '',
  source: '',
  serviceRequired: '',
})

export const inquiryRecordColumns = [
  {
    key: 'inquiryDate',
    label: 'Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    headerClassName: 'text-center text-nowrap',
    cellClassName: 'text-center text-nowrap',
    getExportValue: (inquiry) => inquiry.inquiryDateDisplay || '-',
  },
  {
    key: 'status',
    label: 'Status',
    width: '150px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inquiry) => inquiry.statusLabel || '-',
  },
  {
    key: 'companyName',
    label: 'Company',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (inquiry) => inquiry.companyName || '-',
  },
  {
    key: 'ssmNumber',
    label: 'SSM',
    width: '160px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (inquiry) => inquiry.ssmNumber || '-',
  },
  {
    key: 'contactName',
    label: 'Contact',
    width: '160px',
    sortable: true,
    sortType: 'string',
    textMode: 'plain',
    cellMaxWidth: '160px',
    getExportValue: (inquiry) => inquiry.contactName || '-',
  },
  {
    key: 'mobile',
    label: 'Mobile',
    width: '150px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (inquiry) => inquiry.mobile || '-',
  },
  {
    key: 'email',
    label: 'Email',
    width: '180px',
    sortable: true,
    sortType: 'string',
    textMode: 'plain',
    cellMaxWidth: '180px',
    getExportValue: (inquiry) => inquiry.email || '-',
  },
  {
    key: 'serviceRequired',
    label: 'Service',
    width: '160px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '160px',
    previewCharThreshold: 30,
    getExportValue: (inquiry) => inquiry.serviceRequiredLabel || '-',
  },
  {
    key: 'source',
    label: 'Source',
    width: '160px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '160px',
    previewCharThreshold: 30,
    getExportValue: (inquiry) => inquiry.source || '-',
  },
  {
    key: 'ownerStaffName',
    label: 'PIC',
    width: '160px',
    sortable: true,
    sortType: 'string',
    textMode: 'plain',
    cellMaxWidth: '160px',
    getExportValue: (inquiry) => inquiry.ownerStaffDisplay || '-',
  },
  {
    key: 'ownerAssignedByName',
    label: 'Assigned By',
    width: '160px',
    sortable: true,
    sortType: 'string',
    textMode: 'plain',
    cellMaxWidth: '160px',
    getExportValue: (inquiry) => inquiry.ownerAssignedByDisplay || '-',
  },
  {
    key: 'proofDataUrl',
    label: 'Proof',
    width: '100px',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (inquiry) => (inquiry.proofCount ? `${inquiry.proofCount} image(s)` : '-'),
  },
  {
    key: 'remarks',
    label: 'Remarks',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (inquiry) => inquiry.remarks || '-',
  },
]

export const defaultInquiryRecordVisibleColumns = {
  inquiryDate: true,
  status: true,
  companyName: true,
  ssmNumber: true,
  contactName: true,
  mobile: true,
  email: false,
  serviceRequired: true,
  source: true,
  ownerStaffName: true,
  ownerAssignedByName: true,
  proofDataUrl: false,
  remarks: false,
}

export const requiredInquiryRecordColumns = new Set(['inquiryDate', 'status', 'companyName'])

export const filterInquiryRecords = (records, filters, periodRange) => {
  const q = filters.q.toLowerCase()

  return records.filter((record) => {
    if (!isDateInPeriodRange(record.inquiryDate, periodRange)) return false
    if (filters.status && record.status !== filters.status) return false
    if (filters.source && record.source !== filters.source) return false
    if (filters.serviceRequired && record.serviceRequired !== filters.serviceRequired) {
      return false
    }
    if (!q) return true

    return [
      record.companyName,
      record.ssmNumber,
      record.taxIdNoTin,
      record.contactName,
      record.mobile,
      record.email,
      record.address,
      record.source,
      record.ownerStaffName,
      record.ownerStaffCode,
      record.ownerAssignedByName,
      record.ownerAssignedByCode,
      record.sourceRemarks,
      record.remarks,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  })
}

export const normalizeInquiryRecord = (inquiry) => ({
  ...inquiry,
  companyNameValue: inquiry.companyName || '',
  companyName: inquiry.companyName || '-',
  ssmNumber: inquiry.ssmNumber || '-',
  contactName: inquiry.contactName || '-',
  mobile: inquiry.mobile || '-',
  email: inquiry.email || '-',
  source: inquiry.source || '-',
  inquiryDateDisplay: formatDate(inquiry.inquiryDate),
  statusLabel: statusLabel(inquiry.status),
  serviceRequiredLabel: serviceLabel(inquiry.serviceRequired),
  proofCount: Number(inquiry.proofCount || inquiry.proofs?.length || 0),
  ownerStaffDisplay: inquiry.ownerStaffCode || inquiry.ownerStaffName || '-',
  ownerAssignedByDisplay: inquiry.ownerAssignedByCode || inquiry.ownerAssignedByName || '-',
  remarks: inquiry.remarks || '',
})

export const getInquiryRecordMobileMeta = (inquiry) =>
  [inquiry.inquiryDateDisplay, inquiry.ssmNumber, inquiry.mobile, inquiry.email]
    .filter(Boolean)
    .join(' | ')

export const buildInquiryRecordStats = (normalizedRecords) => {
  const openRows = normalizedRecords.filter((inquiry) => {
    const status = String(inquiry.statusLabel || inquiry.status || '').toLowerCase()
    return !['converted', 'closed', 'completed', 'lost', 'cancelled', 'cancelled'].some((closed) =>
      status.includes(closed),
    )
  })
  const quoteCreatedRows = normalizedRecords.filter((inquiry) => {
    const status = String(inquiry.statusLabel || inquiry.status || '').toLowerCase()
    return status.includes('quote') || status.includes('converted')
  })
  const topPic = getTopGroupByCount(normalizedRecords, (inquiry) => inquiry.ownerStaffDisplay)

  return [
    {
      key: 'inquiries',
      label: 'Total Inquiries',
      value: formatCount(normalizedRecords.length),
      tone: 'primary',
    },
    {
      key: 'open',
      label: 'Open',
      value: formatCount(openRows.length),
      tone: 'warning',
    },
    {
      key: 'quote-created',
      label: 'Quote Created',
      value: formatCount(quoteCreatedRows.length),
      tone: 'success',
    },
    {
      key: 'top-pic',
      label: 'Top PIC',
      value: topPic.value,
      sublabel: `${formatCount(topPic.count)} inquiries`,
      tone: 'secondary',
    },
  ]
}

export const buildInquiryRecordActiveChips = ({ filters, periodRange, searchInput }) => {
  const chips = []
  const status = inquiryStatuses.find((option) => option.value === filters.status)
  const service = serviceOptions.find((option) => option.value === filters.serviceRequired)

  if (searchInput.trim()) chips.push({ key: 'search', label: `Search: ${searchInput.trim()}` })
  if (filters.status) chips.push({ key: 'status', label: `Status: ${status?.label}` })
  if (filters.source) chips.push({ key: 'source', label: `Source: ${filters.source}` })
  if (filters.serviceRequired) {
    chips.push({
      key: 'serviceRequired',
      label: `Service: ${service?.label || filters.serviceRequired}`,
    })
  }
  if (periodRange && !isDefaultPeriodRange(periodRange)) {
    chips.push({ key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` })
  }

  return chips
}

export const getInquiryRecordSortValue = (inquiry, field) => {
  if (field === 'inquiryDate') return inquiry.inquiryDate
  if (field === 'serviceRequired') return inquiry.serviceRequiredLabel
  if (field === 'status') return inquiry.statusLabel
  if (field === 'ownerStaffName') return inquiry.ownerStaffDisplay
  if (field === 'ownerAssignedByName') return inquiry.ownerAssignedByDisplay
  return inquiry[field]
}
