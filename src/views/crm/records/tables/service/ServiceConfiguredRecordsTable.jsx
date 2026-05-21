import React, { useEffect, useMemo, useState } from 'react'
import { CTableRow } from '@coreui/react'
import { LARGE_DATASET_THRESHOLD, PAGE_SIZE_OPTIONS } from '../../config/allRecordsTableConfig'
import {
  getServiceTableColumnPreferenceApiKey,
  getServiceTableColumnStorageKey,
  SERVICE_TABLE_DEFAULT_VISIBLE_COLUMNS,
  SERVICE_TABLE_REQUIRED_COLUMNS,
} from '../../config/serviceTableUiConfig'
import { applyRecordFilters, getDateOnly, getQuotationAgeDays } from '../../utils/recordFilters'
import { useServiceRecordsTableState } from '../../hooks/useServiceRecordsTableState'
import {
  getPeriodRangeLabel,
  getPeriodRangeScopeLabel,
  isDefaultPeriodRange,
} from '../../../../../components/filters'
import { getAdvancedFilterCount } from '../../../../../components/datatable'
import { useColumnPreferences } from '../../../../../hooks/datatable'
import { serviceRecordTableConfigs } from '../../config/serviceRecordTableConfigs'
import {
  serviceRecordColumnWidths,
  serviceRecordTruncateStyle,
} from '../../config/serviceRecordsTableShared'
import {
  escapeCsvValue,
  getPrimaryRemarkText,
  getStatusLabel,
  getStatusTone,
} from '../../utils/allRecordsTableUtils'
import {
  buildQuoteRecordStatsItems,
  buildServiceQuoteRecordStatsItems,
} from '../../utils/quoteRecordStats'
import ServiceRecordsTableBase from './ServiceRecordsTableBase'
import {
  ServiceRecordActionCell,
  ServiceRecordAgeCell,
  ServiceRecordAmountCell,
  ServiceRecordClientCell,
  ServiceRecordCreatedCell,
  ServiceRecordEmailCell,
  ServiceRecordIdCell,
  ServiceRecordIndexCell,
  ServiceRecordPicCell,
  ServiceRecordRemarksCell,
  ServiceRecordStatusCell,
  ServiceRecordSubjectCell,
  formatServiceRecordAmount,
} from './ServiceRecordCells'

const getRecordServiceTitle = (record) => record?.formData?.serviceTitle || ''

const serviceStatsConfigs = {
  training: {
    topKey: 'top-training',
    secondKey: 'second-top-training',
    topLabel: 'Top Training',
    secondLabel: '2nd Top Training',
    emptyTopLabel: 'No training recorded',
    emptySecondLabel: 'No second training',
    getServiceLabel: (record) => record?.formData?.trainingTopic || '',
  },
  ih: {
    topKey: 'top-ih-service',
    secondKey: 'second-top-ih-service',
    topLabel: 'Top IH Service',
    secondLabel: '2nd Top IH Service',
    emptyTopLabel: 'No IH service recorded',
    emptySecondLabel: 'No second IH service',
    getServiceLabel: getRecordServiceTitle,
  },
  manpower: {
    topKey: 'top-manpower',
    secondKey: 'second-top-manpower',
    topLabel: 'Top Manpower',
    secondLabel: '2nd Top Manpower',
    emptyTopLabel: 'No manpower recorded',
    emptySecondLabel: 'No second manpower',
    getServiceLabel: getRecordServiceTitle,
  },
  special: {
    topKey: 'top-special',
    secondKey: 'second-top-special',
    topLabel: 'Top Special',
    secondLabel: '2nd Top Special',
    emptyTopLabel: 'No special service recorded',
    emptySecondLabel: 'No second special service',
    getServiceLabel: getRecordServiceTitle,
  },
  equipment: {
    topKey: 'top-equipment',
    secondKey: 'second-top-equipment',
    topLabel: 'Top Equipment',
    secondLabel: '2nd Top Equipment',
    emptyTopLabel: 'No equipment recorded',
    emptySecondLabel: 'No second equipment',
    countSingular: 'item',
    countPlural: 'items',
    getServiceEntries: (record) =>
      Array.isArray(record?.lineItems)
        ? record.lineItems.map((item) => ({
            label:
              item?.itemName ||
              item?.description ||
              (item?.itemId != null || item?.id != null ? `#${item?.itemId ?? item?.id}` : ''),
            amount: item?.lineTotal,
          }))
        : [],
  },
}

const ServiceConfiguredRecordsTable = ({
  serviceKey,
  searchInputId,
  getRowKey,
  getSubjectTextArgs,
  renderSubjectCell,
  renderAmountCell,
  renderMobileSubjectExtra,
  renderMobileAmountSecondary,
  records = [],
  loading = false,
  onOpen,
  onView,
  onDelete,
  onRevise,
  onEdit,
  onChangeToFail,
  onChangeToSuccess,
  onNegotiate,
  onGenerate,
  onReAward,
  onUnAward,
  onFollowUp,
  onSyncClientDetails,
  onEmail,
  onSharePdf,
}) => {
  const columnWidths = serviceRecordColumnWidths
  const truncateStyle = serviceRecordTruncateStyle
  const fmtDate = getDateOnly
  const tableConfig = serviceRecordTableConfigs[serviceKey]
  const getSearchText = tableConfig.getSearchText
  const getSubjectText = tableConfig.getSubjectText
  const getSubjectTooltip = tableConfig.getSubjectTooltip
  const getAmountValue = tableConfig.getAmountValue
  const {
    currentYear,
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
    yearFilter,
    setYearFilter,
    periodRange,
    setPeriodRange,
    quotationAge,
    setQuotationAge,
    statusFilter,
    setStatusFilter,
    followUpFilter,
    setFollowUpFilter,
    followUpRecency,
    setFollowUpRecency,
    createdByFilter,
    setCreatedByFilter,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    showAdvancedFilters,
    setShowAdvancedFilters,
    openActionDropdown,
    setOpenActionDropdown,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    creatorOptions,
    yearOptions,
    resetFilters,
    clearChip,
  } = useServiceRecordsTableState(records)
  const { isColumnVisible, toggleColumnVisibility, resetColumnVisibility } = useColumnPreferences({
    storageKey: getServiceTableColumnStorageKey(serviceKey),
    apiKey: getServiceTableColumnPreferenceApiKey(serviceKey),
    defaultVisibleColumns: SERVICE_TABLE_DEFAULT_VISIBLE_COLUMNS,
    requiredColumns: SERVICE_TABLE_REQUIRED_COLUMNS,
  })

  const [copiedEmail, setCopiedEmail] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 220)
    return () => clearTimeout(timer)
  }, [searchInput, setSearchTerm])

  const handleCopyEmail = (email) => {
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 1500)
  }

  const shouldIgnoreRowOpen = (event) => {
    const target = event?.target
    if (!(target instanceof Element)) return false
    return Boolean(
      target.closest(
        'a, button, input, select, textarea, [role="button"], [data-no-row-open="true"], .dropdown-menu, .dropdown-toggle',
      ),
    )
  }

  const preparedRecords = useMemo(
    () =>
      records.map((record) => {
        const subjectTextArgs =
          typeof getSubjectTextArgs === 'function' ? getSubjectTextArgs(record) : undefined
        const subjectText = getSubjectText(record, subjectTextArgs)
        const amountValue = getAmountValue(record)
        const displayDate = fmtDate(record?.dateCreated) || '-'
        const quotationAgeDays = getQuotationAgeDays(record?.dateCreated)

        return {
          ...record,
          __serviceTableMeta: {
            subjectTextArgs,
            subjectText,
            subjectTooltip: getSubjectTooltip(record, subjectTextArgs),
            amountValue,
            displayDate,
            quotationAgeDays,
            clientName: record?.clientDetails?.companyName || '-',
            email: record?.clientDetails?.email || '',
            pic: record?.personInCharge || record?.clientDetails?.fullName || 'Unknown',
            statusLabel: getStatusLabel(record),
            statusTone: getStatusTone(record?.status),
            remarksPreview: getPrimaryRemarkText(record, fmtDate),
            searchText: getSearchText(record),
          },
        }
      }),
    [
      fmtDate,
      getAmountValue,
      getSearchText,
      getSubjectText,
      getSubjectTextArgs,
      getSubjectTooltip,
      records,
    ],
  )

  const filtered = useMemo(
    () =>
      applyRecordFilters({
        records: preparedRecords,
        filters: {
          searchTerm,
          periodRange,
          yearFilter,
          quotationAge,
          statusFilter,
          followUpFilter,
          followUpRecency,
          createdByFilter,
          minAmount,
          maxAmount,
        },
        getSearchText: (record) => record?.__serviceTableMeta?.searchText || '',
        getAmount: (record) => record?.__serviceTableMeta?.amountValue ?? 0,
      }),
    [
      preparedRecords,
      searchTerm,
      periodRange,
      yearFilter,
      quotationAge,
      statusFilter,
      followUpFilter,
      followUpRecency,
      createdByFilter,
      minAmount,
      maxAmount,
    ],
  )

  const sortedRecords = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      if (sortField === 'quotationId') {
        return String(a?.quotationId || '').localeCompare(String(b?.quotationId || ''))
      }
      if (sortField === 'amount') {
        return (
          Number(a?.__serviceTableMeta?.amountValue ?? 0) -
          Number(b?.__serviceTableMeta?.amountValue ?? 0)
        )
      }
      if (sortField === 'created') {
        return Date.parse(a?.dateCreated || 0) - Date.parse(b?.dateCreated || 0)
      }
      if (sortField === 'age') {
        return (
          Number(a?.__serviceTableMeta?.quotationAgeDays ?? -1) -
          Number(b?.__serviceTableMeta?.quotationAgeDays ?? -1)
        )
      }
      if (sortField === 'status') {
        return String(a?.status || '').localeCompare(String(b?.status || ''))
      }
      if (sortField === 'client') {
        return String(a?.__serviceTableMeta?.clientName || '').localeCompare(
          String(b?.__serviceTableMeta?.clientName || ''),
        )
      }
      if (sortField === 'email') {
        return String(a?.__serviceTableMeta?.email || '').localeCompare(
          String(b?.__serviceTableMeta?.email || ''),
        )
      }
      if (sortField === 'subject') {
        return String(a?.__serviceTableMeta?.subjectText || '').localeCompare(
          String(b?.__serviceTableMeta?.subjectText || ''),
        )
      }
      if (sortField === 'pic') {
        return String(a?.__serviceTableMeta?.pic || '').localeCompare(
          String(b?.__serviceTableMeta?.pic || ''),
        )
      }
      return 0
    })
    if (sortDir === 'desc') rows.reverse()
    return rows
  }, [filtered, sortDir, sortField])

  const statsItems = useMemo(
    () =>
      (serviceStatsConfigs[serviceKey]
        ? buildServiceQuoteRecordStatsItems(sortedRecords, serviceStatsConfigs[serviceKey])
        : buildQuoteRecordStatsItems(sortedRecords)
      ).map((item) => {
        if (item.key !== 'awarded') return item
        return {
          ...item,
          onClick: () => {
            setStatusFilter('Awarded')
            setShowAdvancedFilters(true)
            setCurrentPage(1)
          },
        }
      }),
    [serviceKey, setCurrentPage, setShowAdvancedFilters, setStatusFilter, sortedRecords],
  )

  const totalRows = sortedRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const pageEnd = totalRows === 0 ? 0 : Math.min(pageStart + pageSize, totalRows)
  const pagedRecords = useMemo(
    () => sortedRecords.slice(pageStart, pageEnd),
    [pageEnd, pageStart, sortedRecords],
  )

  useEffect(() => {
    const sortFieldVisible =
      SERVICE_TABLE_REQUIRED_COLUMNS.has(sortField) || isColumnVisible(sortField)
    if (sortFieldVisible) return
    setSortField('created')
    setSortDir('desc')
  }, [isColumnVisible, sortField, setSortField, setSortDir])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages, setCurrentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [
    searchTerm,
    statusFilter,
    createdByFilter,
    yearFilter,
    periodRange,
    quotationAge,
    followUpFilter,
    followUpRecency,
    minAmount,
    maxAmount,
    sortField,
    sortDir,
    pageSize,
    setCurrentPage,
  ])

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDir(field === 'created' ? 'desc' : 'asc')
  }

  const getAriaSort = (field) => {
    if (sortField !== field) return 'none'
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  const activeChips = []
  if (searchInput.trim()) {
    activeChips.push({ key: 'search', label: `Search: ${searchInput.trim()}` })
  }
  if (statusFilter !== 'all') {
    activeChips.push({ key: 'status', label: `Status: ${statusFilter}` })
  }
  if (createdByFilter !== 'all') {
    activeChips.push({ key: 'issuer', label: `Issuer: ${createdByFilter}` })
  }
  if (periodRange && !isDefaultPeriodRange(periodRange)) {
    activeChips.push({ key: 'period', label: `Period: ${getPeriodRangeLabel(periodRange)}` })
  }
  if (yearFilter !== currentYear && yearFilter !== 'all') {
    activeChips.push({ key: 'year', label: `Year: ${yearFilter}` })
  }
  if (quotationAge !== 'all') {
    activeChips.push({ key: 'qage', label: `Quote Age: ${quotationAge}` })
  }
  if (followUpFilter !== 'all')
    activeChips.push({ key: 'followUp', label: `Has Follow Up: ${followUpFilter}` })
  if (followUpRecency !== 'all')
    activeChips.push({
      key: 'followUpRecency',
      label: `Follow Up: ${followUpRecency} days`,
    })
  if (minAmount) activeChips.push({ key: 'minAmount', label: `Min RM: ${minAmount}` })
  if (maxAmount) activeChips.push({ key: 'maxAmount', label: `Max RM: ${maxAmount}` })

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  const handleExportCsv = () => {
    if (!sortedRecords.length) return

    const exportColumns = [
      {
        key: 'quotationId',
        label: 'Quotation ID',
        getValue: (record) => record?.quotationId || '',
      },
      {
        key: 'client',
        label: 'Client',
        getValue: (record) => record?.__serviceTableMeta?.clientName || '',
      },
      {
        key: 'email',
        label: 'Email',
        getValue: (record) => record?.__serviceTableMeta?.email || '',
      },
      {
        key: 'status',
        label: 'Status',
        getValue: (record) => record?.__serviceTableMeta?.statusLabel || '',
      },
      {
        key: 'subject',
        label: 'Subject',
        getValue: (record) => record?.__serviceTableMeta?.subjectText || '',
      },
      {
        key: 'amount',
        label: 'Amount',
        getValue: (record) => {
          const amount = Number(record?.__serviceTableMeta?.amountValue ?? 0)
          return Number.isFinite(amount) ? amount.toFixed(2) : ''
        },
      },
      {
        key: 'created',
        label: 'Created',
        getValue: (record) => record?.__serviceTableMeta?.displayDate || '',
      },
      {
        key: 'age',
        label: 'Age',
        getValue: (record) => {
          const age = record?.__serviceTableMeta?.quotationAgeDays
          return age != null ? `${age}d` : ''
        },
      },
      {
        key: 'pic',
        label: 'PIC',
        getValue: (record) => record?.__serviceTableMeta?.pic || '',
      },
      {
        key: 'remarks',
        label: 'Remarks',
        getValue: (record) => record?.__serviceTableMeta?.remarksPreview || '',
      },
    ]

    const visibleExportColumns = exportColumns.filter((col) => isColumnVisible(col.key))
    const headers = ['#', ...visibleExportColumns.map((col) => col.label)]
    const lines = [headers.map(escapeCsvValue).join(',')]

    sortedRecords.forEach((record, idx) => {
      lines.push(
        [idx + 1, ...visibleExportColumns.map((col) => col.getValue(record))]
          .map(escapeCsvValue)
          .join(','),
      )
    })

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${serviceKey}-records-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const isLargeDataset = records.length > LARGE_DATASET_THRESHOLD

  const renderRow = (record, idx, rowUi = {}) => {
    const meta = record?.__serviceTableMeta || {}
    const rowKey = typeof getRowKey === 'function' ? getRowKey(record, idx) : record.id
    const rowActionKey = `${serviceKey}-${record?.id || rowKey || idx}`

    return (
      <CTableRow
        key={rowKey}
        onClick={(event) => {
          if (typeof onView !== 'function') return
          if (shouldIgnoreRowOpen(event)) return
          onView(record)
        }}
        onKeyDown={(event) => {
          if (typeof onView !== 'function') return
          if (event.key !== 'Enter' && event.key !== ' ') return
          if (shouldIgnoreRowOpen(event)) return
          event.preventDefault()
          onView(record)
        }}
        tabIndex={typeof onView === 'function' ? 0 : undefined}
        style={{ cursor: typeof onView === 'function' ? 'pointer' : 'default' }}
      >
        <ServiceRecordIndexCell displayIndex={pageStart + idx + 1} />
        {rowUi.isColumnVisible?.('quotationId') && (
          <ServiceRecordIdCell record={record} columnWidths={columnWidths} />
        )}
        {rowUi.isColumnVisible?.('client') && (
          <ServiceRecordClientCell
            record={record}
            columnWidths={columnWidths}
            truncateStyle={truncateStyle}
          />
        )}
        {rowUi.isColumnVisible?.('email') && (
          <ServiceRecordEmailCell
            record={record}
            columnWidths={columnWidths}
            truncateStyle={truncateStyle}
            copiedEmail={copiedEmail}
            onCopyEmail={handleCopyEmail}
          />
        )}
        {rowUi.isColumnVisible?.('status') && (
          <ServiceRecordStatusCell record={record} columnWidths={columnWidths} />
        )}
        {rowUi.isColumnVisible?.('subject') && (
          <ServiceRecordSubjectCell
            columnWidths={columnWidths}
            truncateStyle={truncateStyle}
            subjectText={meta.subjectText}
            subjectTooltip={meta.subjectTooltip}
          >
            {typeof renderSubjectCell === 'function'
              ? renderSubjectCell({
                  record,
                  idx,
                  subjectText: meta.subjectText,
                  subjectTooltip: meta.subjectTooltip,
                  truncateStyle,
                  columnWidths,
                })
              : null}
          </ServiceRecordSubjectCell>
        )}
        {rowUi.isColumnVisible?.('amount') && (
          <ServiceRecordAmountCell columnWidths={columnWidths} amountValue={meta.amountValue}>
            {typeof renderAmountCell === 'function'
              ? renderAmountCell({
                  record,
                  idx,
                  amountValue: meta.amountValue,
                  columnWidths,
                  formatAmount: formatServiceRecordAmount,
                })
              : null}
          </ServiceRecordAmountCell>
        )}
        {rowUi.isColumnVisible?.('created') && (
          <ServiceRecordCreatedCell columnWidths={columnWidths} displayDate={meta.displayDate} />
        )}
        {rowUi.isColumnVisible?.('age') && (
          <ServiceRecordAgeCell
            columnWidths={columnWidths}
            quotationAgeDays={meta.quotationAgeDays}
          />
        )}
        {rowUi.isColumnVisible?.('pic') && (
          <ServiceRecordPicCell
            record={record}
            columnWidths={columnWidths}
            truncateStyle={truncateStyle}
          />
        )}
        {rowUi.isColumnVisible?.('remarks') && (
          <ServiceRecordRemarksCell record={record} columnWidths={columnWidths} fmtDate={fmtDate} />
        )}
        <ServiceRecordActionCell
          record={record}
          columnWidths={columnWidths}
          actionCellStyle={rowUi.stickyActionCellStyle}
          onOpenTab={onOpen}
          onGenerate={onGenerate}
          onFollowUp={onFollowUp}
          onChangeToFail={onChangeToFail}
          onChangeToSuccess={onChangeToSuccess}
          onUnAward={onUnAward}
          onReAward={onReAward}
          onEdit={onEdit}
          onRevise={onRevise}
          onNegotiate={onNegotiate}
          onView={onView}
          onEmail={onEmail}
          onSharePdf={onSharePdf}
          onSyncClientDetails={onSyncClientDetails}
          onDelete={onDelete}
          actionKey={`${rowActionKey}-desktop`}
          openActionKey={openActionDropdown}
          setOpenActionKey={setOpenActionDropdown}
        />
      </CTableRow>
    )
  }

  return (
    <ServiceRecordsTableBase
      loading={loading}
      searchInput={searchInput}
      setSearchInput={setSearchInput}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      createdByFilter={createdByFilter}
      setCreatedByFilter={setCreatedByFilter}
      creatorOptions={creatorOptions}
      yearFilter={yearFilter}
      setYearFilter={setYearFilter}
      periodRange={periodRange}
      setPeriodRange={setPeriodRange}
      yearOptions={yearOptions}
      showAdvancedFilters={showAdvancedFilters}
      setShowAdvancedFilters={setShowAdvancedFilters}
      resetFilters={resetFilters}
      followUpFilter={followUpFilter}
      setFollowUpFilter={setFollowUpFilter}
      followUpRecency={followUpRecency}
      setFollowUpRecency={setFollowUpRecency}
      quotationAge={quotationAge}
      setQuotationAge={setQuotationAge}
      minAmount={minAmount}
      setMinAmount={setMinAmount}
      maxAmount={maxAmount}
      setMaxAmount={setMaxAmount}
      activeFilterCount={activeFilterCount}
      activeChips={activeChips}
      statsItems={statsItems}
      statsScopeLabel={periodRange ? getPeriodRangeScopeLabel(periodRange) : ''}
      clearChip={clearChip}
      handleExportCsv={handleExportCsv}
      sortedRecordsLength={sortedRecords.length}
      isColumnVisible={isColumnVisible}
      toggleColumnVisibility={toggleColumnVisibility}
      resetColumnVisibility={resetColumnVisibility}
      onView={onView}
      onOpen={onOpen}
      onGenerate={onGenerate}
      onFollowUp={onFollowUp}
      onChangeToFail={onChangeToFail}
      onChangeToSuccess={onChangeToSuccess}
      onUnAward={onUnAward}
      onReAward={onReAward}
      onEdit={onEdit}
      onRevise={onRevise}
      onNegotiate={onNegotiate}
      onSyncClientDetails={onSyncClientDetails}
      onDelete={onDelete}
      onEmail={onEmail}
      onSharePdf={onSharePdf}
      openActionDropdown={openActionDropdown}
      setOpenActionDropdown={setOpenActionDropdown}
      truncateStyle={truncateStyle}
      renderMobileSubjectExtra={renderMobileSubjectExtra}
      renderMobileAmountSecondary={renderMobileAmountSecondary}
      showLargeDatasetHint={isLargeDataset}
      pageSizeOptions={PAGE_SIZE_OPTIONS}
      pageSize={pageSize}
      setPageSize={setPageSize}
      totalRows={totalRows}
      pageStart={pageStart}
      pageEnd={pageEnd}
      safeCurrentPage={safeCurrentPage}
      totalPages={totalPages}
      setCurrentPage={setCurrentPage}
      filteredRecords={pagedRecords}
      sortField={sortField}
      toggleSort={toggleSort}
      getAriaSort={getAriaSort}
      columnWidths={columnWidths}
      renderRow={renderRow}
    />
  )
}

export default ServiceConfiguredRecordsTable
