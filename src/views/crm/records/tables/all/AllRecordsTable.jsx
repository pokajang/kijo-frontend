import React, { useEffect, useMemo, useRef } from 'react'
import { CBadge, CTooltip } from '@coreui/react'
import { getDateOnly, getIssuerCodeOptions, getYearOptions } from '../../utils/recordFilters'
import {
  COLUMN_LABELS,
  COLUMN_PREFERENCE_API_KEY,
  COLUMN_STORAGE_KEY,
  DEFAULT_VISIBLE_COLUMNS,
  LARGE_DATASET_THRESHOLD,
  PAGE_SIZE_OPTIONS,
  REQUIRED_COLUMNS,
  columnWidths,
} from '../../config/allRecordsTableConfig'
import { recordsDesktopBreakpoint, recordsTruncateStyle } from '../../config/recordsTableUiShared'
import {
  escapeCsvValue,
  getProjectOutcomeLabel,
  truncateFront,
} from '../../utils/allRecordsTableUtils'
import { useRecordTableState } from '../../hooks/useRecordTableState'
import { useDerivedRecords } from '../../hooks/useDerivedRecords'
import { useColumnPreferences } from '../../../../../hooks/datatable'
import { DataTableRecordList } from '../../../../../components/datatable'
import { getPeriodRangeScopeLabel } from '../../../../../components/filters'
import { StatsStrip } from '../../../../../components/stats'
import { buildQuoteRecordStatsItems } from '../../utils/quoteRecordStats'
import AllRecordsFilterPanel from './AllRecordsFilterPanel'
import RemarksCell from '../shared/RemarksCell'
import RecordActionMenu from '../shared/RecordActionMenu'
import QuoteApprovalBadge from '../shared/QuoteApprovalBadge'
import { actionMenuPopperConfig } from '../shared/actionMenuPopperConfig'

const formatRecordAmount = (record) => {
  const amount = Number(record?.__tableMeta?.amountValue ?? 0)
  return Number.isFinite(amount)
    ? `RM ${amount.toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '-'
}

const formatRecordMoneyValue = (value) =>
  Number.isFinite(value)
    ? `RM ${value.toLocaleString('en-MY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : '-'

const getEstimatedCostValue = (record) =>
  Number(record?.approval?.estimated_cost ?? record?.estimatedCost ?? record?.estimated_cost ?? NaN)

const getAllRecordRowKey = (record, index) =>
  `${record?.serviceTab || 'unknown'}-${record?.id || index}`

const AllRecordsTable = ({
  records = [],
  loading = false,
  activeTab = 'all-tab',
  onOpen,
  onView,
  onDelete,
  onRevise,
  onEdit,
  onNegotiate,
  onChangeToFail,
  onChangeToSuccess,
  onGenerate,
  onReAward,
  onUnAward,
  onFollowUp,
  onSyncClientDetails,
  onEmail,
  onSharePdf,
  onStatsScopeLabelChange,
  onFilterContextChange,
  statsVisible = true,
  controlsVisible = true,
}) => {
  const desktopBreakpoint = recordsDesktopBreakpoint
  const truncateStyle = recordsTruncateStyle
  const currentYear = String(new Date().getFullYear())
  const fmtDate = getDateOnly
  const didMountPageResetRef = useRef(false)
  const dataColumns = useMemo(
    () => [
      {
        key: 'service',
        label: COLUMN_LABELS.service,
        width: columnWidths.service,
        sortable: true,
        noWrap: true,
      },
      {
        key: 'quotationId',
        label: COLUMN_LABELS.quotationId,
        width: columnWidths.quotationId,
        sortable: true,
        noWrap: true,
      },
      {
        key: 'client',
        label: COLUMN_LABELS.client,
        width: columnWidths.client,
        sortable: true,
        cellMaxWidth: '210px',
      },
      {
        key: 'email',
        label: COLUMN_LABELS.email,
        width: columnWidths.email,
        sortable: true,
        cellMaxWidth: '200px',
      },
      {
        key: 'status',
        label: COLUMN_LABELS.status,
        width: columnWidths.status,
        sortable: true,
        align: 'center',
        noWrap: true,
      },
      {
        key: 'subject',
        label: COLUMN_LABELS.subject,
        width: columnWidths.subject,
        sortable: true,
        cellMaxWidth: '250px',
      },
      {
        key: 'amount',
        label: COLUMN_LABELS.amount,
        width: columnWidths.amount,
        sortable: true,
        align: 'center',
        noWrap: true,
        sortType: 'number',
      },
      {
        key: 'estimatedCost',
        label: COLUMN_LABELS.estimatedCost,
        width: columnWidths.estimatedCost,
        sortable: true,
        align: 'center',
        noWrap: true,
        sortType: 'number',
      },
      {
        key: 'created',
        label: COLUMN_LABELS.created,
        width: columnWidths.created,
        sortable: true,
        align: 'center',
        noWrap: true,
        sortType: 'date',
      },
      {
        key: 'age',
        label: COLUMN_LABELS.age,
        width: columnWidths.age,
        sortable: true,
        align: 'center',
        noWrap: true,
        sortType: 'number',
      },
      {
        key: 'pic',
        label: COLUMN_LABELS.pic,
        width: columnWidths.pic,
        sortable: true,
        cellMaxWidth: '160px',
      },
      {
        key: 'remarks',
        label: COLUMN_LABELS.remarks,
        width: columnWidths.remarks,
      },
    ],
    [],
  )

  const state = useRecordTableState(`crm.records.${activeTab}.table-state.v1`)
  const {
    copiedEmail,
    setCopiedEmail,
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    serviceFilter,
    setServiceFilter,
    createdByFilter,
    setCreatedByFilter,
    yearFilter,
    setYearFilter,
    periodRange,
    setPeriodRange,
    quotationAge,
    setQuotationAge,
    followUpFilter,
    setFollowUpFilter,
    followUpRecency,
    setFollowUpRecency,
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
    resetFilters,
    clearChip,
  } = state

  const { isColumnVisible, toggleColumnVisibility, resetColumnVisibility } = useColumnPreferences({
    storageKey: COLUMN_STORAGE_KEY,
    apiKey: COLUMN_PREFERENCE_API_KEY,
    defaultVisibleColumns: DEFAULT_VISIBLE_COLUMNS,
    requiredColumns: REQUIRED_COLUMNS,
  })
  const creatorOptions = useMemo(() => getIssuerCodeOptions(records), [records])
  const yearOptions = useMemo(() => getYearOptions(records, currentYear), [records, currentYear])

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim())
    }, 220)
    return () => clearTimeout(timer)
  }, [searchInput, setSearchTerm])

  const derived = useDerivedRecords({
    records,
    filters: {
      searchInput,
      searchTerm,
      statusFilter,
      serviceFilter,
      createdByFilter,
      yearFilter,
      periodRange,
      quotationAge,
      followUpFilter,
      followUpRecency,
      minAmount,
      maxAmount,
    },
    sortField,
    sortDir,
    pageSize,
    currentPage,
    currentYear,
    isColumnVisible,
    fmtDate,
  })

  const { sortedRecords, totalPages, activeChips, activeFilterCount } = derived
  const activeChipSignature = activeChips.map((chip) => `${chip.key}:${chip.label}`).join('|')

  useEffect(() => {
    onFilterContextChange?.({
      activeFilterCount,
      activeChips,
      statusFilter,
      searchInput,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilterCount, activeChipSignature, onFilterContextChange, searchInput, statusFilter])

  const statsItems = useMemo(
    () =>
      buildQuoteRecordStatsItems(sortedRecords, {
        finalMetric: activeTab === 'my-tab' ? 'top-source' : 'top-creator',
      }).map((item) => {
        if (item.key === 'awarded') {
          return {
            ...item,
            onClick: () => {
              setStatusFilter('Awarded')
              setShowAdvancedFilters(true)
              setCurrentPage(1)
            },
          }
        }
        if (item.key === 'top-creator' && creatorOptions.includes(item.value)) {
          return {
            ...item,
            onClick: () => {
              setCreatedByFilter(item.value)
              setShowAdvancedFilters(true)
              setCurrentPage(1)
            },
          }
        }
        return item
      }),
    [
      activeTab,
      creatorOptions,
      setCreatedByFilter,
      setCurrentPage,
      setShowAdvancedFilters,
      setStatusFilter,
      sortedRecords,
    ],
  )
  const statsScopeLabel = periodRange ? getPeriodRangeScopeLabel(periodRange) : ''

  useEffect(() => {
    onStatsScopeLabelChange?.(statsScopeLabel)
    return () => onStatsScopeLabelChange?.('')
  }, [onStatsScopeLabelChange, statsScopeLabel])

  useEffect(() => {
    const sortFieldVisible = REQUIRED_COLUMNS.has(sortField) || isColumnVisible(sortField)
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
    if (!didMountPageResetRef.current) {
      didMountPageResetRef.current = true
      return
    }
    setCurrentPage(1)
  }, [
    searchTerm,
    statusFilter,
    serviceFilter,
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

  const handleExportCsv = () => {
    if (!sortedRecords.length) return
    const exportColumns = [
      {
        key: 'service',
        label: 'Service',
        getValue: (record) => record?.__tableMeta?.serviceLabel || '',
      },
      {
        key: 'quotationId',
        label: 'Quotation ID',
        getValue: (record) => record?.quotationId || '',
      },
      {
        key: 'client',
        label: 'Client',
        getValue: (record) => record?.clientDetails?.companyName || '',
      },
      {
        key: 'email',
        label: 'Email',
        getValue: (record) => record?.clientDetails?.email || '',
      },
      {
        key: 'status',
        label: 'Status',
        getValue: (record) => record?.__tableMeta?.statusLabel || '',
      },
      {
        key: 'subject',
        label: 'Subject',
        getValue: (record) => record?.__tableMeta?.subject || '',
      },
      {
        key: 'amount',
        label: 'Amount',
        getValue: (record) => {
          const amount = Number(record?.__tableMeta?.amountValue ?? 0)
          return Number.isFinite(amount) ? amount.toFixed(2) : ''
        },
      },
      {
        key: 'estimatedCost',
        label: 'Est. Cost',
        getValue: (record) => {
          const estimatedCost = getEstimatedCostValue(record)
          return Number.isFinite(estimatedCost) ? estimatedCost.toFixed(2) : ''
        },
      },
      {
        key: 'created',
        label: 'Created',
        getValue: (record) => fmtDate(record?.dateCreated) || '',
      },
      {
        key: 'age',
        label: 'Age (days)',
        getValue: (record) => record?.__tableMeta?.quotationAgeDays ?? '',
      },
      {
        key: 'pic',
        label: 'PIC',
        getValue: (record) => record?.personInCharge || record?.clientDetails?.fullName || '',
      },
      {
        key: 'remarks',
        label: 'Remarks',
        getValue: (record) => record?.__tableMeta?.remarksPreview || '',
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
    link.download = `quotation-records-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleCopyEmail = (email) => {
    if (!email) return
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 1500)
  }

  const renderRecordCell = (record, column) => {
    if (column.key === 'service') return record?.__tableMeta?.serviceLabel || '-'

    if (column.key === 'quotationId') {
      return (
        <>
          {record?.quotationId || '-'}
          {record?.revisionNo > 0 && (
            <span className="text-muted ms-1">
              <i>(Rev0{record.revisionNo})</i>
            </span>
          )}
        </>
      )
    }

    if (column.key === 'client') {
      const companyName = record?.clientDetails?.companyName || '-'
      return (
        <CTooltip content={companyName} placement="top">
          <span style={{ ...truncateStyle, maxWidth: '210px' }}>{companyName}</span>
        </CTooltip>
      )
    }

    if (column.key === 'email') {
      const email = record?.clientDetails?.email
      if (!email) return '-'

      return (
        <CTooltip content={copiedEmail === email ? 'Copied!' : 'Click to copy'} placement="top">
          <span
            data-no-row-open="true"
            onClick={(event) => {
              event.stopPropagation()
              handleCopyEmail(email)
            }}
            style={{
              ...truncateStyle,
              maxWidth: '200px',
              cursor: 'pointer',
              color: 'var(--cui-primary)',
            }}
          >
            {email}
          </span>
        </CTooltip>
      )
    }

    if (column.key === 'status') {
      const statusTone = record?.__tableMeta?.statusTone
      const outcomeLabel = getProjectOutcomeLabel(record)
      return (
        <div className="d-inline-flex flex-column align-items-center gap-1">
          <CBadge className={`records-status-badge records-status-badge--${statusTone}`}>
            {record?.__tableMeta?.statusLabel}
          </CBadge>
          <QuoteApprovalBadge approval={record?.approval} />
          {outcomeLabel && <span className="small text-muted">{outcomeLabel}</span>}
        </div>
      )
    }

    if (column.key === 'subject') {
      const subjectText = record?.__tableMeta?.subject || '-'
      return (
        <CTooltip content={subjectText} placement="top">
          <span style={{ ...truncateStyle, maxWidth: '250px' }}>{subjectText}</span>
        </CTooltip>
      )
    }

    if (column.key === 'amount') return formatRecordAmount(record)
    if (column.key === 'estimatedCost') return formatRecordMoneyValue(getEstimatedCostValue(record))

    if (column.key === 'created') return <span>{fmtDate(record?.dateCreated) || '-'}</span>

    if (column.key === 'age') {
      const quotationAgeDays = record?.__tableMeta?.quotationAgeDays
      return quotationAgeDays != null ? (
        <span className={quotationAgeDays > 60 ? 'text-danger' : 'text-muted'}>
          {quotationAgeDays}d
        </span>
      ) : (
        '-'
      )
    }

    if (column.key === 'pic') {
      const picName = record?.personInCharge || record?.clientDetails?.fullName || 'Unknown'
      return (
        <CTooltip content={picName} placement="top">
          <span style={{ ...truncateStyle, maxWidth: '160px' }}>{picName}</span>
        </CTooltip>
      )
    }

    if (column.key === 'remarks') return <RemarksCell record={record} fmtDate={fmtDate} compact />

    return record?.[column.key] ?? '-'
  }

  const renderRecordActions = (record, actionKey) => (
    <RecordActionMenu
      record={record}
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
      onSyncClient={onSyncClientDetails}
      onOpenTab={onOpen}
      onDelete={onDelete}
      popperConfig={actionMenuPopperConfig}
      actionKey={actionKey}
      openActionKey={openActionDropdown}
      setOpenActionKey={setOpenActionDropdown}
    />
  )

  const mobileRecord = {
    title: (record) => (
      <CTooltip content={record?.quotationId || '-'} placement="top">
        <span>{truncateFront(record?.quotationId, 12)}</span>
      </CTooltip>
    ),
    badges: (record) => [
      {
        key: 'status',
        label: record?.__tableMeta?.statusLabel,
        tone: record?.__tableMeta?.statusTone || 'info',
      },
      ...(getProjectOutcomeLabel(record)
        ? [
            {
              key: 'project-outcome',
              label: getProjectOutcomeLabel(record),
              tone: 'secondary',
            },
          ]
        : []),
    ],
    subtitle: (record) => {
      const subjectText = record?.__tableMeta?.subject || '-'
      return (
        <CTooltip content={subjectText} placement="top">
          <span style={{ ...truncateStyle, maxWidth: '100%' }}>{subjectText}</span>
        </CTooltip>
      )
    },
    meta: (record) => {
      const companyName = record?.clientDetails?.companyName || '-'
      return (
        <CTooltip content={companyName} placement="top">
          <span style={{ ...truncateStyle, maxWidth: '100%' }}>{companyName}</span>
        </CTooltip>
      )
    },
    kv: (record) =>
      [
        isColumnVisible('amount') && {
          key: 'amount',
          label: COLUMN_LABELS.amount,
          value: formatRecordAmount(record),
        },
        isColumnVisible('estimatedCost') && {
          key: 'estimatedCost',
          label: COLUMN_LABELS.estimatedCost,
          value: formatRecordMoneyValue(getEstimatedCostValue(record)),
        },
      ].filter(Boolean),
  }

  const isLargeDataset = records.length > LARGE_DATASET_THRESHOLD

  return (
    <>
      {statsVisible && <StatsStrip items={statsItems} />}
      <AllRecordsFilterPanel
        visible={controlsVisible}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        periodRange={periodRange}
        setPeriodRange={setPeriodRange}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        createdByFilter={createdByFilter}
        setCreatedByFilter={setCreatedByFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        serviceFilter={serviceFilter}
        setServiceFilter={setServiceFilter}
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
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={activeFilterCount}
        creatorOptions={creatorOptions}
        yearOptions={yearOptions}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        handleExportCsv={handleExportCsv}
        sortedRecordsLength={sortedRecords.length}
        isColumnVisible={isColumnVisible}
        toggleColumnVisibility={toggleColumnVisibility}
        resetColumnVisibility={resetColumnVisibility}
        requiredColumns={REQUIRED_COLUMNS}
      />

      <DataTableRecordList
        rows={sortedRecords}
        loading={loading}
        loadingMessage="Loading records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={DEFAULT_VISIBLE_COLUMNS}
        requiredColumns={REQUIRED_COLUMNS}
        storageKey={COLUMN_STORAGE_KEY}
        apiKey={COLUMN_PREFERENCE_API_KEY}
        idPrefix="all-records"
        scrollStorageKey={`crm.records.${activeTab}.scroll`}
        getRowKey={getAllRecordRowKey}
        renderCell={renderRecordCell}
        renderActions={renderRecordActions}
        onRowOpen={onView}
        controlledSortField={sortField}
        controlledSortDir={sortDir}
        onControlledSort={toggleSort}
        controlledPageSize={pageSize}
        controlledSetPageSize={setPageSize}
        controlledCurrentPage={currentPage}
        controlledSetCurrentPage={setCurrentPage}
        columnVisibilityController={{
          isColumnVisible,
          toggleColumnVisibility,
          resetColumnVisibility,
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        actionColumnWidth={columnWidths.action}
        desktopBreakpoint={desktopBreakpoint}
        showDesktopSummary={false}
        desktopUtilityPlacement="hidden"
        mobileUtilityPlacement="hidden"
        showMobileUtilityRow={false}
        showExport={false}
        showColumnMenu={false}
        showLargeDatasetHint={isLargeDataset}
        recordsLength={records.length}
        mobileRecord={mobileRecord}
        tableViewportDeps={[
          showAdvancedFilters,
          searchInput,
          statusFilter,
          serviceFilter,
          createdByFilter,
          yearFilter,
          periodRange,
          quotationAge,
          followUpFilter,
          followUpRecency,
          minAmount,
          maxAmount,
        ]}
      />
    </>
  )
}

export default AllRecordsTable
