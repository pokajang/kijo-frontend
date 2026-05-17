import { useState } from 'react'
import { getPeriodRangePreset } from '../../../../components/filters'
import { getInitialPageSize } from '../utils/allRecordsTableUtils'

export const useRecordTableState = () => {
  const [copiedEmail, setCopiedEmail] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [createdByFilter, setCreatedByFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState('all')
  const [periodRange, setPeriodRange] = useState(() => getPeriodRangePreset('ytd'))
  const [quotationAge, setQuotationAge] = useState('all')
  const [followUpFilter, setFollowUpFilter] = useState('all')
  const [followUpRecency, setFollowUpRecency] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [sortField, setSortField] = useState('created')
  const [sortDir, setSortDir] = useState('desc')
  const [pageSize, setPageSize] = useState(getInitialPageSize)
  const [currentPage, setCurrentPage] = useState(1)

  const resetFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setStatusFilter('all')
    setServiceFilter('all')
    setCreatedByFilter('all')
    setYearFilter('all')
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
