import { useEffect, useMemo, useState } from 'react'
import { getPeriodRangePreset } from '../../../../components/filters'
import { getInitialPageSize } from '../utils/allRecordsTableUtils'

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

export const useRecordTableState = (storageKey = 'crm.records.all.table-state.v1') => {
  const storedState = useMemo(() => readStoredState(storageKey), [storageKey])
  const [copiedEmail, setCopiedEmail] = useState(null)
  const [searchInput, setSearchInput] = useState(() =>
    getStoredString(storedState, 'searchInput', ''),
  )
  const [searchTerm, setSearchTerm] = useState(() => getStoredString(storedState, 'searchTerm', ''))
  const [statusFilter, setStatusFilter] = useState(() =>
    getStoredString(storedState, 'statusFilter', 'all'),
  )
  const [serviceFilter, setServiceFilter] = useState(() =>
    getStoredString(storedState, 'serviceFilter', 'all'),
  )
  const [createdByFilter, setCreatedByFilter] = useState(() =>
    getStoredString(storedState, 'createdByFilter', 'all'),
  )
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
  const [followUpFilter, setFollowUpFilter] = useState(() =>
    getStoredString(storedState, 'followUpFilter', 'all'),
  )
  const [followUpRecency, setFollowUpRecency] = useState(() =>
    getStoredString(storedState, 'followUpRecency', 'all'),
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

  useEffect(() => {
    writeStoredState(storageKey, {
      searchInput,
      searchTerm,
      statusFilter,
      serviceFilter,
      createdByFilter,
      yearFilter,
      inquirySourceFilter,
      periodRange,
      quotationAge,
      followUpFilter,
      followUpRecency,
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
    maxAmount,
    minAmount,
    pageSize,
    periodRange,
    quotationAge,
    searchInput,
    searchTerm,
    serviceFilter,
    showAdvancedFilters,
    inquirySourceFilter,
    sortDir,
    sortField,
    statusFilter,
    storageKey,
    yearFilter,
  ])

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setStatusFilter('all')
    setServiceFilter('all')
    setCreatedByFilter('all')
    setYearFilter('all')
    setInquirySourceFilter('all')
    setPeriodRange(getPeriodRangePreset('ytd'))
    setQuotationAge('all')
    setFollowUpFilter('all')
    setFollowUpRecency('all')
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
    if (key === 'service') setServiceFilter('all')
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
    inquirySourceFilter,
    setInquirySourceFilter,
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
  }
}
