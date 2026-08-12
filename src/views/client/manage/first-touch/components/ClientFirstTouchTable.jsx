import React from 'react'
import { CAlert, CButton, CSpinner, CTooltip } from '@coreui/react'
import {
  differenceInCalendarDays,
  intervalToDuration,
  isAfter,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'
import { DataTableRecordList, DataTableTextCell } from '../../../../../components/datatable'
import {
  formatCompactContributionMoney,
  formatFirstTouchDate,
  getFirstTouchSourceLabel,
} from '../clientFirstTouchUtils'

const actionColumnWidth = '56px'
const columnStorageKey = 'client.first-touch.visible-columns.v2'

const formatDurationPart = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'}`

const getClientAge = (encounterDate) => {
  if (!encounterDate) return null

  const firstTouchDate = startOfDay(parseISO(encounterDate))
  const today = startOfDay(new Date())
  if (!isValid(firstTouchDate) || isAfter(firstTouchDate, today)) return null

  const totalDays = differenceInCalendarDays(today, firstTouchDate)
  const duration = intervalToDuration({ start: firstTouchDate, end: today })
  const years = duration.years || 0
  const months = duration.months || 0
  const days = duration.days || 0
  const exactLabel = years
    ? [
        formatDurationPart(years, 'year'),
        formatDurationPart(months, 'month'),
        formatDurationPart(days, 'day'),
      ].join(' ')
    : months
      ? [formatDurationPart(months, 'month'), formatDurationPart(days, 'day')].join(' ')
      : formatDurationPart(days, 'day')

  let compactLabel
  if (years) {
    const approximateYears = totalDays / 365.2425
    const roundedYears = approximateYears.toFixed(1)
    compactLabel = `${roundedYears} ${roundedYears === '1.0' ? 'year' : 'years'}`
  } else if (months) {
    compactLabel = formatDurationPart(months, 'month')
  } else {
    compactLabel = formatDurationPart(days, 'day')
  }

  return { totalDays, compactLabel, exactLabel }
}

const dataColumns = [
  {
    key: 'companyName',
    label: 'Client',
    width: '250px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '250px',
    previewCharThreshold: 34,
  },
  {
    key: 'sourceLabel',
    label: 'First Touch',
    width: '190px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'collected',
    label: 'Collected to Date',
    width: '160px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'encounterDate',
    label: 'Encounter Date',
    width: '135px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'clientAgeDays',
    label: 'Client Age',
    width: '140px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.clientAgeExactLabel || '',
  },
]

const defaultVisibleColumns = Object.fromEntries(dataColumns.map((column) => [column.key, true]))
const requiredColumns = new Set(['companyName'])

const normalizeRecord = (record) => {
  const encounterDate = record.firstTouch?.occurredAt || ''
  const clientAge = getClientAge(encounterDate)

  return {
    ...record,
    sourceLabel: getFirstTouchSourceLabel(record.firstTouch),
    encounterDate,
    clientAgeDays: clientAge?.totalDays ?? null,
    clientAgeLabel: clientAge?.compactLabel || '',
    clientAgeExactLabel: clientAge?.exactLabel || '',
    collected: Number(record.contribution?.collected || 0),
  }
}

const ClientFirstTouchTable = ({
  records = [],
  totalRecords = records.length,
  hasActiveFilters = false,
  loading = false,
  error = '',
  permissionDenied = false,
  onRetry,
  onOpen,
  onSubmit,
  getRowActions,
}) => {
  if (loading) {
    return (
      <div className="first-touch-table-state" aria-busy="true" role="status">
        <CSpinner size="sm" aria-hidden="true" /> Loading client first-touch records…
      </div>
    )
  }

  if (permissionDenied) {
    return (
      <CAlert color="warning" className="mb-0">
        You do not have permission to view client first-touch evidence. Contact a manager or system
        administrator if access is required.
      </CAlert>
    )
  }

  if (error) {
    return (
      <CAlert
        color="danger"
        className="d-flex align-items-center justify-content-between gap-3 mb-0"
      >
        <span>{error}</span>
        {onRetry ? (
          <CButton color="danger" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </CButton>
        ) : null}
      </CAlert>
    )
  }

  const rows = records.map(normalizeRecord)

  const renderCell = (record, column) => {
    if (column.key === 'companyName' || column.key === 'sourceLabel') {
      return (
        <DataTableTextCell
          value={record[column.key] || '-'}
          maxWidth={column.cellMaxWidth || column.width}
          title={column.label}
          mode={column.textMode || 'expandable'}
          previewCharThreshold={column.previewCharThreshold}
        />
      )
    }
    if (column.key === 'encounterDate') return formatFirstTouchDate(record.encounterDate)
    if (column.key === 'clientAgeDays') {
      if (!record.clientAgeLabel) return '-'
      return (
        <CTooltip content={record.clientAgeExactLabel} placement="top">
          <span className="text-nowrap">{record.clientAgeLabel}</span>
        </CTooltip>
      )
    }
    if (column.key === 'collected') {
      return <span className="fw-semibold">{formatCompactContributionMoney(record.collected)}</span>
    }
    return record[column.key] || '-'
  }

  return (
    <DataTableRecordList
      rows={rows}
      dataColumns={dataColumns}
      defaultVisibleColumns={defaultVisibleColumns}
      requiredColumns={requiredColumns}
      storageKey={columnStorageKey}
      scrollStorageKey="client.first-touch.records.scroll"
      idPrefix="client-first-touch-record"
      emptyMessage={
        totalRecords === 0
          ? 'No clients are available for first-touch documentation.'
          : hasActiveFilters
            ? 'No clients match the current filters. Reset or change the filters to continue.'
            : 'No client first-touch records are available.'
      }
      exportFilename={`client-first-touch-${new Date().toISOString().slice(0, 10)}.csv`}
      showDesktopSummary={false}
      desktopUtilityPlacement="portal"
      desktopUtilityPortalId="client-first-touch-table-tools"
      mobileUtilityPlacement="portal"
      mobileUtilityPortalId="client-first-touch-mobile-table-tools"
      showMobileUtilityRow={false}
      actionColumnWidth={actionColumnWidth}
      getRowKey={(record) => record.companyId}
      renderCell={renderCell}
      onRowOpen={onOpen}
      getActions={(record) =>
        getRowActions?.(record) || [
          record.firstTouch
            ? {
                key: 'open-origin',
                label: 'Open Client Origin',
                onClick: () => onOpen(record),
              }
            : {
                key: 'submit-origin',
                label: 'Submit First Touch',
                onClick: () => onSubmit(record),
              },
        ]
      }
      getMobileTitle={(record) => record.companyName}
      getMobileSubtitle={(record) => record.sourceLabel}
      getMobileMeta={(record) =>
        `${formatFirstTouchDate(record.encounterDate)} | ${record.clientAgeLabel || 'Age unavailable'} | Collected ${formatCompactContributionMoney(record.collected)}`
      }
      mobileFieldKeys={{
        title: 'companyName',
        subtitle: 'sourceLabel',
        meta: ['encounterDate', 'clientAgeDays', 'collected'],
      }}
      initialSortField="companyName"
      initialSortDir="asc"
      getSortValue={(record, field) => record[field]}
      resetDeps={[records]}
    />
  )
}

export default ClientFirstTouchTable
