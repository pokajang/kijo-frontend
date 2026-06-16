import React, { useMemo, useState } from 'react'
import { CCard, CCardBody, CCol, CFormLabel, CFormSelect, CRow } from '@coreui/react'
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
  getPeriodRangePreset,
  isDefaultPeriodRange,
} from '../../../../components/filters'
import { StatsStrip } from '../../../../components/stats'
import { useDataTableStatsVisibility } from '../../../../hooks/datatable'
import { formatCount, formatMoney } from '../../../../utils/stats/formatStats'

const emptyValue = '-'
const columnStorageKey = 'client.roi.visible-columns.v1'
const actionColumnWidth = '56px'

const defaultVisibleColumns = {
  company: true,
  awardedJobs: true,
  awardedValue: true,
  invoices: true,
  invoicedTotal: true,
  receivedTotal: true,
  vendorCost: false,
  expenseCost: false,
  totalCost: true,
  actualProfit: true,
  actualRoi: true,
  projectedProfit: true,
  projectedRoi: true,
  lastPaid: true,
}

const requiredColumns = new Set(['company'])

const dataColumns = [
  {
    key: 'company',
    label: 'Client',
    width: '230px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '230px',
    previewCharThreshold: 34,
  },
  {
    key: 'awardedJobs',
    label: 'Awarded Jobs',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  moneyColumn('awardedValue', 'Awarded Value'),
  {
    key: 'invoices',
    label: 'Invoices',
    width: '105px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  moneyColumn('invoicedTotal', 'Invoiced Total'),
  moneyColumn('receivedTotal', 'Received Total'),
  moneyColumn('vendorCost', 'Vendor Cost'),
  moneyColumn('expenseCost', 'Expenses'),
  moneyColumn('totalCost', 'Total Cost'),
  moneyColumn('actualProfit', 'Actual Profit'),
  percentColumn('actualRoi', 'Actual ROI'),
  moneyColumn('projectedProfit', 'Projected Profit'),
  percentColumn('projectedRoi', 'Projected ROI'),
  {
    key: 'lastPaid',
    label: 'Last Paid',
    width: '120px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
]

function moneyColumn(key, label) {
  return {
    key,
    label,
    width: '140px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row[key],
  }
}

function percentColumn(key, label) {
  return {
    key,
    label,
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row[key] ?? '',
  }
}

const toNumber = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

export const formatRoiPercent = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return emptyValue
  const number = Number(value)
  if (!Number.isFinite(number)) return emptyValue
  return `${number.toLocaleString('en-MY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}

const getProfitTone = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number) || number === 0) return 'secondary'
  return number > 0 ? 'success' : 'danger'
}

const getClientName = (row) => row?.company || emptyValue

const formatPaymentDays = (value) => {
  if (value === null || typeof value === 'undefined' || value === '') return emptyValue
  const number = Number(value)
  if (!Number.isFinite(number)) return emptyValue

  const formatted = number.toLocaleString('en-MY', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 1,
    maximumFractionDigits: 1,
  })

  return `${formatted} day${number === 1 ? '' : 's'}`
}

const pickTopAwardedClient = (rows) =>
  rows.reduce(
    (best, row) =>
      !best ||
      row.awardedValue > best.awardedValue ||
      (row.awardedValue === best.awardedValue && row.actualProfit > best.actualProfit)
        ? row
        : best,
    null,
  )

const pickFastestPayer = (rows) =>
  rows
    .filter((row) => Number.isFinite(Number(row.averagePaymentDays)))
    .reduce(
      (best, row) =>
        !best ||
        row.averagePaymentDays < best.averagePaymentDays ||
        (row.averagePaymentDays === best.averagePaymentDays &&
          row.receivedTotal > best.receivedTotal)
          ? row
          : best,
      null,
    )

const pickBestRoiClient = (rows) =>
  rows
    .filter((row) => row.totalCost > 0 && Number.isFinite(Number(row.actualRoi)))
    .reduce(
      (best, row) =>
        !best ||
        Number(row.actualRoi) > Number(best.actualRoi) ||
        (Number(row.actualRoi) === Number(best.actualRoi) && row.actualProfit > best.actualProfit)
          ? row
          : best,
      null,
    )

const pickLowestEngagementClient = (rows) =>
  rows.reduce(
    (best, row) =>
      !best ||
      row.awardedJobs < best.awardedJobs ||
      (row.awardedJobs === best.awardedJobs && row.awardedValue < best.awardedValue)
        ? row
        : best,
    null,
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

const profitabilityFilterLabel = (value) => {
  if (value === 'profitable') return 'Profitable'
  if (value === 'loss') return 'Loss-making'
  if (value === 'no_cost') return 'No Cost'
  return 'All'
}

const ClientRoiTableCard = ({
  rows = [],
  loading = false,
  searchTerm,
  onSearchChange,
  profitabilityFilter,
  onProfitabilityFilterChange,
  periodRange,
  onPeriodRangeChange,
  scopeLabel,
  onResetFilters,
  onOpenCommercialHistory,
  onViewClient,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('client.roi')

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        company: row.company_name || emptyValue,
        awardedJobs: Number(row.awarded_project_count || 0),
        awardedValue: toNumber(row.awarded_value),
        invoices: Number(row.invoice_count || 0),
        invoicedTotal: toNumber(row.invoiced_total),
        receivedTotal: toNumber(row.received_total),
        vendorCost: toNumber(row.vendor_cost),
        expenseCost: toNumber(row.expense_cost),
        totalCost: toNumber(row.total_cost),
        actualProfit: toNumber(row.actual_profit),
        actualRoi: row.actual_roi_percent,
        projectedProfit: toNumber(row.projected_profit),
        projectedRoi: row.projected_roi_percent,
        averagePaymentDays:
          row.average_payment_days === null || typeof row.average_payment_days === 'undefined'
            ? null
            : Number(row.average_payment_days),
        lastPaid: row.last_paid_date || '',
      })),
    [rows],
  )

  const statsItems = useMemo(() => {
    const topAwardedClient = pickTopAwardedClient(normalizedRows)
    const fastestPayer = pickFastestPayer(normalizedRows)
    const bestRoiClient = pickBestRoiClient(normalizedRows)
    const lowestEngagementClient = pickLowestEngagementClient(normalizedRows)

    return [
      {
        key: 'top-client',
        label: 'Top Client',
        value: getClientName(topAwardedClient),
        sublabel: topAwardedClient
          ? `Awarded ${formatMoney(topAwardedClient.awardedValue)}`
          : 'No clients',
        tone: 'info',
        size: 'md',
      },
      {
        key: 'fastest-payer',
        label: 'Fastest Payer',
        value: getClientName(fastestPayer),
        sublabel: fastestPayer
          ? `${formatPaymentDays(fastestPayer.averagePaymentDays)} avg invoice to paid`
          : 'No paid invoices',
        tone: 'success',
        size: 'md',
      },
      {
        key: 'best-roi-client',
        label: 'Best ROI',
        value: getClientName(bestRoiClient),
        sublabel: bestRoiClient
          ? `${formatRoiPercent(bestRoiClient.actualRoi)} actual ROI`
          : 'No cost base',
        tone: 'primary',
        size: 'md',
      },
      {
        key: 'lowest-engagement',
        label: 'Lowest Engagement',
        value: getClientName(lowestEngagementClient),
        sublabel: lowestEngagementClient
          ? `${formatCount(lowestEngagementClient.awardedJobs)} awarded job${
              lowestEngagementClient.awardedJobs === 1 ? '' : 's'
            }`
          : 'No clients',
        tone: 'warning',
        size: 'md',
      },
    ]
  }, [normalizedRows])

  const activeChips = [
    searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}` } : null,
    profitabilityFilter !== 'all'
      ? {
          key: 'profitability',
          label: `Profitability: ${profitabilityFilterLabel(profitabilityFilter)}`,
        }
      : null,
    periodRange && !isDefaultPeriodRange(periodRange)
      ? { key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` }
      : null,
  ].filter(Boolean)
  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const clearChip = (key) => {
    if (key === 'search') onSearchChange('')
    if (key === 'profitability') onProfitabilityFilterChange('all')
    if (key === 'period') onPeriodRangeChange(getPeriodRangePreset('ytd'))
  }

  const renderCell = (row, column) => {
    if (column.key === 'company') return renderText(row.company, column)
    if (column.key === 'awardedJobs' || column.key === 'invoices')
      return formatCount(row[column.key])
    if (column.key === 'actualRoi' || column.key === 'projectedRoi') {
      return (
        <DataTableStatusBadge tone={getProfitTone(row[column.key])}>
          {formatRoiPercent(row[column.key])}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'actualProfit' || column.key === 'projectedProfit') {
      return (
        <span
          className={
            row[column.key] < 0 ? 'text-danger' : row[column.key] > 0 ? 'text-success' : ''
          }
        >
          {formatMoney(row[column.key])}
        </span>
      )
    }
    if (column.key === 'lastPaid') return row.lastPaid || emptyValue
    return formatMoney(row[column.key])
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <DataTableCardHeader title="ROI per Client" scopeLabel={scopeLabel}>
            <DataTableStatsToggle
              visible={statsVisible}
              onToggle={toggleStatsVisible}
              controlsVisible={controlsVisible}
              onControlsToggle={toggleControlsVisible}
            />
          </DataTableCardHeader>
          <CCardBody>
            {statsVisible && (
              <StatsStrip
                items={statsItems}
                loading={loading}
                className="client-roi-stats"
                layout="balanced"
              />
            )}

            <DataTableRecordControls
              visible={controlsVisible}
              searchValue={searchTerm}
              onSearchChange={onSearchChange}
              searchPlaceholder="Search client"
              searchAriaLabel="Search client ROI"
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              activeFilterCount={activeFilterCount}
              activeChips={activeChips}
              clearChip={clearChip}
              resetFilters={onResetFilters}
              loading={loading}
              desktopToolsId="client-roi-table-tools"
              mobileToolsId="client-roi-mobile-table-tools"
            >
              <CCol xs={12} md={4} lg={3}>
                <CFormLabel htmlFor="clientRoiProfitabilityFilter">Profitability</CFormLabel>
                <CFormSelect
                  id="clientRoiProfitabilityFilter"
                  value={profitabilityFilter}
                  onChange={(event) => onProfitabilityFilterChange(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="profitable">Profitable</option>
                  <option value="loss">Loss-making</option>
                  <option value="no_cost">No Cost</option>
                </CFormSelect>
              </CCol>
            </DataTableRecordControls>

            <DataTableRecordList
              rows={normalizedRows}
              dataColumns={dataColumns}
              defaultVisibleColumns={defaultVisibleColumns}
              requiredColumns={requiredColumns}
              storageKey={columnStorageKey}
              scrollStorageKey="client.roi.records.scroll"
              idPrefix="client-roi-record"
              emptyMessage="No client ROI records found."
              exportFilename={`client-roi-${new Date().toISOString().slice(0, 10)}.csv`}
              loading={loading}
              loadingMessage="Loading client ROI..."
              showDesktopSummary={false}
              desktopUtilityPlacement="portal"
              desktopUtilityPortalId="client-roi-table-tools"
              mobileUtilityPlacement="portal"
              mobileUtilityPortalId="client-roi-mobile-table-tools"
              showMobileUtilityRow={false}
              actionColumnWidth={actionColumnWidth}
              getRowKey={(row, index) => row.company_id || index}
              renderCell={renderCell}
              onRowOpen={onOpenCommercialHistory}
              getActions={(row) => [
                {
                  key: 'commercial-history',
                  label: 'Commercial History',
                  onClick: () => onOpenCommercialHistory(row),
                },
                {
                  key: 'view-client',
                  label: 'View Client Details',
                  dividerBefore: true,
                  onClick: () => onViewClient(row),
                },
              ]}
              getMobileTitle={(row) => row.company}
              getMobileSubtitle={(row) => `Received ${formatMoney(row.receivedTotal)}`}
              getMobileMeta={(row) =>
                `Actual Profit ${formatMoney(row.actualProfit)} | ROI ${formatRoiPercent(row.actualRoi)}`
              }
              getMobileStatus={(row) => formatRoiPercent(row.projectedRoi)}
              getMobileStatusTone={(row) => getProfitTone(row.projectedRoi)}
              mobileFieldKeys={{
                title: 'company',
                subtitle: 'receivedTotal',
                meta: ['actualProfit', 'actualRoi'],
                status: 'projectedRoi',
              }}
              initialSortField="awardedValue"
              initialSortDir="desc"
              getSortValue={(row, field) => row[field]}
              renderQuickFilters={() => (
                <PeriodRangeSelector value={periodRange} onChange={onPeriodRangeChange} />
              )}
              resetDeps={[searchTerm, profitabilityFilter, periodRange]}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ClientRoiTableCard
