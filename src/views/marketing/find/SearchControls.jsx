import React from 'react'
import { CCol, CFormLabel, CFormSelect } from '@coreui/react'
import { DataTableRecordControls } from '../../../components/datatable'
import { MALAYSIAN_STATES } from './constants'

const SearchControls = ({
  q,
  setQ,
  stateFilter,
  setStateFilter,
  limit,
  setLimit,
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
  return (
    <DataTableRecordControls
      searchValue={q}
      onSearchChange={setQ}
      searchPlaceholder='e.g. "factory kilang manufacturer"'
      searchAriaLabel="Search factory directory"
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
      <CCol xs={12} md={3}>
        <CFormLabel htmlFor="state">Region (bias)</CFormLabel>
        <CFormSelect
          id="state"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          {MALAYSIAN_STATES.map((s) => (
            <option key={s || 'all'} value={s}>
              {s || 'Malaysia (All)'}
            </option>
          ))}
        </CFormSelect>
      </CCol>

      <CCol xs={6} md={2}>
        <CFormLabel htmlFor="limit">Generate count</CFormLabel>
        <CFormSelect id="limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
          {[5, 10, 20, 30, 40, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </CFormSelect>
      </CCol>
    </DataTableRecordControls>
  )
}

export default SearchControls
