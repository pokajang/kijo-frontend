import { useMemo } from 'react'
import { getAdvancedFilterCount } from '../../../../components/datatable'
import { getPeriodRangeLabel, isDefaultPeriodRange } from '../../../../components/filters'
import { applyRecordFilters, getQuotationAgeDays } from '../utils/recordFilters'
import { TOGGLABLE_COLUMN_ORDER } from '../config/allRecordsTableConfig'
import {
  getAmountValue,
  getCreatedTime,
  getPrimaryRemarkText,
  getServiceLabel,
  getStatusLabel,
  getStatusTone,
  getSubject,
} from '../utils/allRecordsTableUtils'

export const useDerivedRecords = ({
  records,
  filters,
  sortField,
  sortDir,
  pageSize,
  currentPage,
  currentYear,
  isColumnVisible,
  fmtDate,
}) => {
  const getEstimatedCostValue = (record) =>
    Number(
      record?.approval?.estimated_cost ??
        record?.estimatedCost ??
        record?.estimated_cost ??
        record?.formData?.estimated_cost ??
        NaN,
    )

  const enrichedRecords = useMemo(
    () =>
      records.map((record) => {
        const serviceLabel = getServiceLabel(record)
        const subject = getSubject(record)
        return {
          ...record,
          __tableMeta: {
            serviceLabel,
            subject,
            amountValue: getAmountValue(record),
            estimatedCostValue: getEstimatedCostValue(record),
            createdTime: getCreatedTime(record),
            statusLabel: getStatusLabel(record),
            statusTone: getStatusTone(record?.status),
            quotationAgeDays: getQuotationAgeDays(record?.dateCreated),
            remarksPreview: getPrimaryRemarkText(record, fmtDate),
            searchText: `${serviceLabel} ${subject}`,
          },
        }
      }),
    [records, fmtDate],
  )

  const filtered = useMemo(() => {
    const base = applyRecordFilters({
      records: enrichedRecords,
      filters: {
        searchTerm: filters.searchTerm,
        periodRange: filters.periodRange,
        yearFilter: filters.yearFilter,
        quotationAge: filters.quotationAge,
        statusFilter: filters.statusFilter,
        followUpFilter: filters.followUpFilter,
        followUpRecency: filters.followUpRecency,
        createdByFilter: filters.createdByFilter,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount,
      },
      getSearchText: (record) => record?.__tableMeta?.searchText || '',
      getAmount: (record) => record?.__tableMeta?.amountValue ?? 0,
    })

    if (filters.serviceFilter === 'all') return base
    return base.filter((record) => record?.serviceTab === filters.serviceFilter)
  }, [enrichedRecords, filters])

  const sortedRecords = useMemo(() => {
    const rows = [...filtered]
    rows.sort((a, b) => {
      if (sortField === 'service') {
        return String(a?.__tableMeta?.serviceLabel || '').localeCompare(
          String(b?.__tableMeta?.serviceLabel || ''),
        )
      }
      if (sortField === 'quotationId') {
        return String(a?.quotationId || '').localeCompare(String(b?.quotationId || ''))
      }
      if (sortField === 'amount') {
        return Number(a?.__tableMeta?.amountValue ?? 0) - Number(b?.__tableMeta?.amountValue ?? 0)
      }
      if (sortField === 'estimatedCost') {
        return (
          Number(a?.__tableMeta?.estimatedCostValue ?? 0) -
          Number(b?.__tableMeta?.estimatedCostValue ?? 0)
        )
      }
      if (sortField === 'created') {
        return Number(a?.__tableMeta?.createdTime ?? 0) - Number(b?.__tableMeta?.createdTime ?? 0)
      }
      if (sortField === 'status') {
        return String(a?.status || '').localeCompare(String(b?.status || ''))
      }
      if (sortField === 'subject') {
        return String(a?.__tableMeta?.subject || '').localeCompare(
          String(b?.__tableMeta?.subject || ''),
        )
      }
      if (sortField === 'client') {
        return String(a?.clientDetails?.companyName || '').localeCompare(
          String(b?.clientDetails?.companyName || ''),
        )
      }
      if (sortField === 'age') {
        return (
          Number(a?.__tableMeta?.quotationAgeDays ?? -1) -
          Number(b?.__tableMeta?.quotationAgeDays ?? -1)
        )
      }
      if (sortField === 'pic') {
        return String(a?.personInCharge || a?.clientDetails?.fullName || '').localeCompare(
          String(b?.personInCharge || b?.clientDetails?.fullName || ''),
        )
      }
      if (sortField === 'email') {
        return String(a?.clientDetails?.email || '').localeCompare(
          String(b?.clientDetails?.email || ''),
        )
      }
      return 0
    })
    if (sortDir === 'desc') rows.reverse()
    return rows
  }, [filtered, sortField, sortDir])

  const totalRows = sortedRecords.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, totalRows)
  const pagedRecords = sortedRecords.slice(pageStart, pageEnd)

  const desktopVisibleColumnCount =
    1 + TOGGLABLE_COLUMN_ORDER.filter((key) => isColumnVisible(key)).length + 1
  const emptyStateColSpan = desktopVisibleColumnCount

  const activeChips = []
  if (filters.searchInput.trim())
    activeChips.push({ key: 'search', label: `Search: ${filters.searchInput.trim()}` })
  if (filters.statusFilter !== 'all')
    activeChips.push({ key: 'status', label: `Status: ${filters.statusFilter}` })
  if (filters.serviceFilter !== 'all') {
    activeChips.push({
      key: 'service',
      label: `Service: ${getServiceLabel({ serviceTab: filters.serviceFilter })}`,
    })
  }
  if (filters.createdByFilter !== 'all')
    activeChips.push({ key: 'issuer', label: `Issuer: ${filters.createdByFilter}` })
  if (filters.periodRange && !isDefaultPeriodRange(filters.periodRange))
    activeChips.push({
      key: 'period',
      label: `Period: ${getPeriodRangeLabel(filters.periodRange)}`,
    })
  if (filters.yearFilter !== currentYear && filters.yearFilter !== 'all')
    activeChips.push({ key: 'year', label: `Year: ${filters.yearFilter}` })
  if (filters.quotationAge !== 'all')
    activeChips.push({ key: 'qage', label: `Quote Age: ${filters.quotationAge}` })
  if (filters.followUpFilter !== 'all')
    activeChips.push({ key: 'followUp', label: `Has Follow Up: ${filters.followUpFilter}` })
  if (filters.followUpRecency !== 'all')
    activeChips.push({
      key: 'followUpRecency',
      label: `Follow Up: ${filters.followUpRecency} days`,
    })
  if (filters.minAmount)
    activeChips.push({ key: 'minAmount', label: `Min RM: ${filters.minAmount}` })
  if (filters.maxAmount)
    activeChips.push({ key: 'maxAmount', label: `Max RM: ${filters.maxAmount}` })

  const activeFilterCount = getAdvancedFilterCount(activeChips)

  return {
    enrichedRecords,
    sortedRecords,
    pagedRecords,
    totalRows,
    totalPages,
    safeCurrentPage,
    pageStart,
    pageEnd,
    emptyStateColSpan,
    activeChips,
    activeFilterCount,
  }
}
