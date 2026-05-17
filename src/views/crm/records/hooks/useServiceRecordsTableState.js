import { useMemo, useState } from 'react'
import { getPeriodRangePreset } from '../../../../components/filters'
import { getInitialPageSize } from '../utils/allRecordsTableUtils'
import { getIssuerCodeOptions, getYearOptions } from '../utils/recordFilters'

export const useServiceRecordsTableState = (records = []) => {
  const currentYear = String(new Date().getFullYear())

  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState('all')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [quotationAge, setQuotationAge] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [followUpFilter, setFollowUpFilter] = useState('all')
  const [followUpRecency, setFollowUpRecency] = useState('all')
  const [createdByFilter, setCreatedByFilter] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [sortField, setSortField] = useState('created')
  const [sortDir, setSortDir] = useState('desc')
  const [pageSize, setPageSize] = useState(getInitialPageSize)
  const [currentPage, setCurrentPage] = useState(1)

  const creatorOptions = useMemo(() => getIssuerCodeOptions(records), [records])
  const yearOptions = useMemo(() => getYearOptions(records, currentYear), [records, currentYear])

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setYearFilter('all')
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
  }
}
