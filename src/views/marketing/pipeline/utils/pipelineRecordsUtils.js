import { getPeriodRangeLabel, isDefaultPeriodRange } from '../../../../components/filters'
import {
  formatCount,
  formatMoney,
  getTopGroupBySum,
  sumBy,
} from '../../../../utils/stats/formatStats'
import {
  classificationLabel,
  classificationTypes,
  entryTypes,
  formatDate,
  serviceCategories,
  serviceCategoryLabel,
  typeLabel,
} from '../pipelineEntryUtils'

export const getDefaultPipelineRecordFilters = () => ({
  q: '',
  entry_type: '',
  staff_code: '',
  source: '',
  segment_type: '',
  service_category: '',
})

export const getPipelineEntryTypeTone = (entryType) => {
  if (entryType === 'closed') return 'success'
  if (entryType === 'negotiation' || entryType === 'qualified') return 'info'
  if (entryType === 'proposal') return 'warning'
  if (entryType === 'meeting_pitching') return 'primary'
  return 'secondary'
}

export const formatPipelineCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '-'
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export const getPipelineRecordMobileMeta = (entry) =>
  [entry.entryDateDisplay, entry.ownerStaffCode, entry.notes].filter(Boolean).join(' | ')

export const pipelineRecordColumns = [
  {
    key: 'entryDate',
    label: 'Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    headerClassName: 'text-center text-nowrap',
    cellClassName: 'text-center text-nowrap',
    getExportValue: (entry) => entry.entryDateDisplay || '-',
  },
  {
    key: 'entryType',
    label: 'Type',
    width: '130px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (entry) => entry.entryTypeLabel || '-',
  },
  {
    key: 'prospectName',
    label: 'Prospect',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (entry) => entry.prospectName || '-',
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
    getExportValue: (entry) => entry.source || '-',
  },
  {
    key: 'segmentType',
    label: 'Classification',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (entry) => entry.segmentType || '-',
  },
  {
    key: 'serviceCategory',
    label: 'Service',
    width: '160px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '160px',
    previewCharThreshold: 30,
    getExportValue: (entry) => entry.serviceCategory || '-',
  },
  {
    key: 'estimatedRm',
    label: 'Estimated RM',
    width: '150px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (entry) => formatPipelineCurrency(entry.estimatedRm),
  },
  {
    key: 'ownerStaffCode',
    label: 'Owner',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (entry) => entry.ownerStaffCode || '-',
  },
  {
    key: 'photoUrl',
    label: 'Screenshot',
    width: '130px',
    sortable: false,
    align: 'center',
    shrinkToFit: true,
    getExportValue: (entry) => (entry.photoUrl ? 'Available' : '-'),
  },
  {
    key: 'notes',
    label: 'Notes',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (entry) => entry.notes || '-',
  },
]

export const defaultPipelineRecordVisibleColumns = {
  entryDate: true,
  entryType: true,
  prospectName: true,
  source: true,
  segmentType: false,
  serviceCategory: true,
  estimatedRm: true,
  ownerStaffCode: true,
  photoUrl: false,
  notes: false,
}

export const requiredPipelineRecordColumns = new Set(['entryDate', 'entryType', 'prospectName'])

export const normalizePipelineRecord = (entry) => ({
  ...entry,
  entryDateDisplay: formatDate(entry.entryDate),
  entryTypeLabel: typeLabel(entry.entryType),
  prospectNameValue: entry.prospectName || '',
  prospectName: entry.prospectName || '-',
  sourceValue: entry.source || '',
  source: entry.source || '-',
  segmentTypeValue: entry.segmentType || '',
  segmentType: classificationLabel(entry.segmentType),
  serviceCategoryValue: entry.serviceCategory || '',
  serviceCategory: serviceCategoryLabel(entry.serviceCategory),
  estimatedRm:
    entry.estimatedRm === null || entry.estimatedRm === undefined
      ? null
      : Number(entry.estimatedRm),
  ownerStaffCode: entry.ownerStaffCode || '-',
  ownerStaffName: entry.ownerStaffName || '',
  notes: entry.notes || '',
})

export const buildPipelineRecordStats = (normalizedEntries) => {
  const qualifiedRows = normalizedEntries.filter((entry) =>
    ['qualified', 'proposal'].includes(String(entry.entryType || '').toLowerCase()),
  )
  const closedRows = normalizedEntries.filter(
    (entry) => String(entry.entryType || '').toLowerCase() === 'closed',
  )
  const topOwner = getTopGroupBySum(
    normalizedEntries,
    (entry) => entry.ownerStaffCode,
    (entry) => entry.estimatedRm,
  )

  return [
    {
      key: 'estimated',
      label: 'Estimated Value',
      value: formatMoney(sumBy(normalizedEntries, (entry) => entry.estimatedRm)),
      tone: 'info',
    },
    {
      key: 'qualified',
      label: 'Qualified/Proposal',
      value: formatCount(qualifiedRows.length),
      sublabel: formatMoney(sumBy(qualifiedRows, (entry) => entry.estimatedRm)),
      tone: 'warning',
    },
    {
      key: 'closed',
      label: 'Closed',
      value: formatCount(closedRows.length),
      sublabel: formatMoney(sumBy(closedRows, (entry) => entry.estimatedRm)),
      tone: 'success',
    },
    {
      key: 'top-owner',
      label: 'Top Owner',
      value: topOwner.value,
      sublabel: `${formatMoney(topOwner.total)} across ${formatCount(topOwner.count)} entries`,
      tone: 'secondary',
    },
  ]
}

export const buildPipelineRecordActiveChips = ({
  filters,
  periodRange,
  searchInput,
  staffOptions,
}) => {
  const chips = []
  const entryType = entryTypes.find((type) => type.value === filters.entry_type)
  const staff = staffOptions.find((option) => option.value === filters.staff_code)
  const classification = classificationTypes.find((option) => option.value === filters.segment_type)
  const service = serviceCategories.find((option) => option.value === filters.service_category)

  if (searchInput.trim()) chips.push({ key: 'search', label: `Search: ${searchInput.trim()}` })
  if (filters.entry_type) chips.push({ key: 'entry_type', label: `Type: ${entryType?.label}` })
  if (filters.staff_code) {
    chips.push({ key: 'staff_code', label: `Owner: ${staff?.label || filters.staff_code}` })
  }
  if (filters.source) chips.push({ key: 'source', label: `Source: ${filters.source}` })
  if (filters.segment_type) {
    chips.push({
      key: 'segment_type',
      label: `Classification: ${classification?.label || filters.segment_type}`,
    })
  }
  if (filters.service_category) {
    chips.push({
      key: 'service_category',
      label: `Service: ${service?.label || filters.service_category}`,
    })
  }
  if (periodRange && !isDefaultPeriodRange(periodRange)) {
    chips.push({ key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` })
  }

  return chips
}

export const getPipelineRecordSortValue = (entry, field) => {
  if (field === 'entryDate') return entry.entryDate
  if (field === 'estimatedRm') return entry.estimatedRm ?? null
  return entry[field]
}
