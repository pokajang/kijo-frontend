import { useEffect, useMemo, useState } from 'react'
import { getInitialPageSize } from '../../utils/datatable/tableFormatters'

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

const getStoredObject = (state, key, fallback) =>
  state?.[key] && typeof state[key] === 'object' && !Array.isArray(state[key])
    ? state[key]
    : fallback

export const usePersistentTableState = (
  storageKey,
  {
    defaultSearch = '',
    defaultFilters = {},
    defaultSortField,
    defaultSortDir = 'asc',
    defaultPageSize,
    defaultShowAdvancedFilters = false,
    persistOpenActionDropdown = false,
    extraDefaults = {},
  } = {},
) => {
  const storedState = useMemo(() => readStoredState(storageKey), [storageKey])
  const [searchInput, setSearchInput] = useState(() =>
    getStoredString(storedState, 'searchInput', defaultSearch),
  )
  const [searchTerm, setSearchTerm] = useState(() =>
    getStoredString(storedState, 'searchTerm', defaultSearch),
  )
  const [filters, setFilters] = useState(() =>
    getStoredObject(storedState, 'filters', defaultFilters),
  )
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() =>
    getStoredBoolean(storedState, 'showAdvancedFilters', defaultShowAdvancedFilters),
  )
  const [openActionDropdown, setOpenActionDropdown] = useState(() =>
    persistOpenActionDropdown ? getStoredString(storedState, 'openActionDropdown', '') : '',
  )
  const [sortField, setSortField] = useState(() =>
    getStoredString(storedState, 'sortField', defaultSortField),
  )
  const [sortDir, setSortDir] = useState(() =>
    getStoredString(storedState, 'sortDir', defaultSortDir),
  )
  const [pageSize, setPageSize] = useState(() =>
    getStoredNumber(storedState, 'pageSize', defaultPageSize || getInitialPageSize()),
  )
  const [currentPage, setCurrentPage] = useState(() =>
    getStoredNumber(storedState, 'currentPage', 1),
  )
  const [extraState, setExtraState] = useState(() => ({
    ...extraDefaults,
    ...getStoredObject(storedState, 'extraState', {}),
  }))

  useEffect(() => {
    writeStoredState(storageKey, {
      searchInput,
      searchTerm,
      filters,
      showAdvancedFilters,
      openActionDropdown: persistOpenActionDropdown ? openActionDropdown : '',
      sortField,
      sortDir,
      pageSize,
      currentPage,
      extraState,
    })
  }, [
    currentPage,
    extraState,
    filters,
    openActionDropdown,
    pageSize,
    persistOpenActionDropdown,
    searchInput,
    searchTerm,
    showAdvancedFilters,
    sortDir,
    sortField,
    storageKey,
  ])

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setCurrentPage(1)
  }

  const clearFilter = (key) => {
    setFilters((prev) => ({
      ...prev,
      [key]: defaultFilters[key],
    }))
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setSearchInput(defaultSearch)
    setSearchTerm(defaultSearch)
    setFilters(defaultFilters)
    setCurrentPage(1)
  }

  const updatePageSize = (value) => {
    setPageSize(value)
    setCurrentPage(1)
  }

  const toggleSort = (field, nextInitialDir = 'asc') => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(nextInitialDir)
    }
    setCurrentPage(1)
  }

  return {
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    setFilter,
    clearFilter,
    resetFilters,
    showAdvancedFilters,
    setShowAdvancedFilters,
    openActionDropdown,
    setOpenActionDropdown,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    toggleSort,
    pageSize,
    setPageSize: updatePageSize,
    currentPage,
    setCurrentPage,
    extraState,
    setExtraState,
  }
}

export default usePersistentTableState
