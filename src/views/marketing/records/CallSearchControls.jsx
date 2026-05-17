import React from 'react'
import { CCol, CFormLabel, CFormSelect } from '@coreui/react'
import { DataTableRecordControls } from '../../../components/datatable'

const OUTCOME_OPTIONS = [
  { value: '', label: 'All outcomes' },
  { value: 'No Answer', label: 'No Answer' },
  { value: 'Callback Later', label: 'Callback Later' },
  { value: 'Interested', label: 'Interested' },
  { value: 'Not Interested', label: 'Not Interested' },
]

const CallSearchControls = ({
  q,
  setQ,
  filterCaller,
  setFilterCaller,
  filterOutcome,
  setFilterOutcome,
  selectedYear,
  setSelectedYear,
  yearOptions = [],
  availableCallers = [], // e.g. ['AZM','HAFIZ'] - dedup in parent
  showAdvancedFilters,
  setShowAdvancedFilters,
  activeFilterCount,
  activeChips,
  clearChip,
  resetFilters,
  loading = false,
  desktopToolsId,
  mobileToolsId,
}) => {
  // build caller options from actual data
  const callerOptions = [
    { value: '', label: 'All callers' },
    ...availableCallers.map((c) => ({ value: c, label: c })),
  ]

  return (
    <DataTableRecordControls
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder="Type to search..."
      searchAriaLabel="Search call records"
      showAdvancedFilters={showAdvancedFilters}
      setShowAdvancedFilters={setShowAdvancedFilters}
      activeFilterCount={activeFilterCount}
      activeChips={activeChips}
      clearChip={clearChip}
      resetFilters={resetFilters}
      loading={loading}
      desktopToolsId={desktopToolsId}
      mobileToolsId={mobileToolsId}
    >
      <CCol xs={6} md={3} lg={2}>
        <CFormLabel htmlFor="call-record-year">Year</CFormLabel>
        <CFormSelect
          id="call-record-year"
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="all">All years</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </CFormSelect>
      </CCol>

      <CCol xs={6} md={3} lg={2}>
        <CFormLabel htmlFor="call-record-caller">Caller Code</CFormLabel>
        <CFormSelect
          id="call-record-caller"
          value={filterCaller}
          onChange={(e) => setFilterCaller(e.target.value)}
        >
          {callerOptions.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </CFormSelect>
      </CCol>

      <CCol xs={6} md={3} lg={2}>
        <CFormLabel htmlFor="call-record-outcome">Outcome</CFormLabel>
        <CFormSelect
          id="call-record-outcome"
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
        >
          {OUTCOME_OPTIONS.map((opt) => (
            <option key={opt.value || 'all-outcome'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </CFormSelect>
      </CCol>
    </DataTableRecordControls>
  )
}

export default CallSearchControls
