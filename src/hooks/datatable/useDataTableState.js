import { useEffect, useState } from 'react'
import { getInitialPageSize } from '../../utils/datatable/tableFormatters'

export const useDataTableState = ({
  initialSortField,
  initialSortDir = 'asc',
  initialPageSize,
  initialFilters = {},
  initialSearch = '',
  searchDelay = 220,
} = {}) => {
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [filters, setFilters] = useState(initialFilters)
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [sortField, setSortField] = useState(initialSortField)
  const [sortDir, setSortDir] = useState(initialSortDir)
  const [pageSize, setPageSize] = useState(initialPageSize || getInitialPageSize)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(String(searchInput || '').trim())
      setCurrentPage(1)
    }, searchDelay)

    return () => clearTimeout(timer)
  }, [searchDelay, searchInput])

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
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

  const resetFilters = () => {
    setSearchInput(initialSearch)
    setSearchTerm(initialSearch)
    setFilters(initialFilters)
    setCurrentPage(1)
  }

  const clearChip = (key) => {
    if (key === 'search') {
      setSearchInput('')
      setSearchTerm('')
      return
    }
    setFilter(key, initialFilters[key])
  }

  return {
    searchInput,
    setSearchInput,
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    setFilter,
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
    resetFilters,
    clearChip,
  }
}

export default useDataTableState
