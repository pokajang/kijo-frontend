import { useEffect, useMemo, useState } from 'react'
import { getPeriodRangePreset } from '../../../../components/filters'
import { getInitialPageSize } from '../utils/allRecordsTableUtils'
import {
  getInquirySourceOptions,
  getIssuerCodeOptions,
  getYearOptions,
} from '../utils/recordFilters'

const readStoredState = (storageKey) => {
  if (!storageKey || typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey) || '{}') || {}
  } catch {
    return {}
  }
}

const writeStoredState = (storageKey, state) => {
  if (!storageKey || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // Ignore storage failures; table state will fall back to defaults.
  }
}

const getStoredString = (state, key, fallback) =>
  typeof state?.[key] === 'string' ? state[key] : fallback

const getStoredBoolean = (state, key, fallback) =>
  typeof state?.[key] === 'boolean' ? state[key] : fallback

const getStoredNumber = (state, key, fallback) => {
  const value = Number(state?.[key])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export const useServiceRecordsTableState = (
  records = [],
  storageKey = 'crm.records.service.table-state.v1',
) => {
  const currentYear = String(new Date().getFullYear())
  const storedState = useMemo(() => readStoredState(storageKey), [storageKey])

  const [searchInput, setSearchInput] = useState(() =>
    getStoredString(storedState, 'searchInput', ''),
  )
  const [searchTerm, setSearchTerm] = useState(() => getStoredString(storedState, 'searchTerm', ''))
  const [yearFilter, setYearFilter] = useState(() =>
    getStoredString(storedState, 'yearFilter', 'all'),
  )
  const [inquirySourceFilter, setInquirySourceFilter] = useState(() =>
    getStoredString(storedState, 'inquirySourceFilter', 'all'),
  )
  const [periodRange, setPeriodRange] = useState(
    () => storedState.periodRange || getPeriodRangePreset('ytd'),
  )
  const [quotationAge, setQuotationAge] = useState(() =>
    getStoredString(storedState, 'quotationAge', 'all'),
  )
  const [statusFilter, setStatusFilter] = useState(() =>
    getStoredString(storedState, 'statusFilter', 'all'),
  )
  const [followUpFilter, setFollowUpFilter] = useState(() =>
    getStoredString(storedState, 'followUpFilter', 'all'),
  )
  const [followUpRecency, setFollowUpRecency] = useState(() =>
    getStoredString(storedState, 'followUpRecency', 'all'),
  )
  const [createdByFilter, setCreatedByFilter] = useState(() =>
    getStoredString(storedState, 'createdByFilter', 'all'),
  )
  const [minAmount, setMinAmount] = useState(() => getStoredString(storedState, 'minAmount', ''))
  const [maxAmount, setMaxAmount] = useState(() => getStoredString(storedState, 'maxAmount', ''))
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() =>
    getStoredBoolean(storedState, 'showAdvancedFilters', false),
  )
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [sortField, setSortField] = useState(() =>
    getStoredString(storedState, 'sortField', 'created'),
  )
  const [sortDir, setSortDir] = useState(() => getStoredString(storedState, 'sortDir', 'desc'))
  const [pageSize, setPageSize] = useState(() =>
    getStoredNumber(storedState, 'pageSize', getInitialPageSize()),
  )
  const [currentPage, setCurrentPage] = useState(() =>
    getStoredNumber(storedState, 'currentPage', 1),
  )

  const creatorOptions = useMemo(() => getIssuerCodeOptions(records), [records])
  const inquirySourceOptions = useMemo(() => getInquirySourceOptions(records), [records])
  const yearOptions = useMemo(() => getYearOptions(records, currentYear), [records, currentYear])

  useEffect(() => {
    writeStoredState(storageKey, {
      searchInput,
      searchTerm,
      yearFilter,
      inquirySourceFilter,
      periodRange,
      quotationAge,
      statusFilter,
      followUpFilter,
      followUpRecency,
      createdByFilter,
      minAmount,
      maxAmount,
      showAdvancedFilters,
      sortField,
      sortDir,
      pageSize,
      currentPage,
    })
  }, [
    createdByFilter,
    currentPage,
    followUpFilter,
    followUpRecency,
    inquirySourceFilter,
    maxAmount,
    minAmount,
    pageSize,
    periodRange,
    quotationAge,
    searchInput,
    searchTerm,
    showAdvancedFilters,
    sortDir,
    sortField,
    statusFilter,
    storageKey,
    yearFilter,
  ])

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setYearFilter('all')
    setInquirySourceFilter('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setQuotationAge('all')
    setStatusFilter('all')
    setFollowUpFilter('all')
    setFollowUpRecency('all')
    setCreatedByFilter('all')
    setMinAmount('')
    setMaxAmount('')
    setCurrentPage(1)
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      setSearchTerm('')
    }
    if (key === 'status') setStatusFilter('all')
    if (key === 'issuer') setCreatedByFilter('all')
    if (key === 'inquirySource') setInquirySourceFilter('all')
    if (key === 'year') setYearFilter('all')
    if (key === 'period') setPeriodRange(getPeriodRangePreset('ytd'))
    if (key === 'qage') setQuotationAge('all')
    if (key === 'followUp') setFollowUpFilter('all')
    if (key === 'followUpRecency') setFollowUpRecency('all')
    if (key === 'minAmount') setMinAmount('')
    if (key === 'maxAmount') setMaxAmount('')
  }

  return {
    currentYear,
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
    yearFilter,
    setYearFilter,
    inquirySourceFilter,
    setInquirySourceFilter,
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
    inquirySourceOptions,
    yearOptions,
    resetFilters,
    clearChip,
  }
}
