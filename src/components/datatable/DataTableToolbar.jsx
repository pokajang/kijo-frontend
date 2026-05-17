import React from 'react'
import { CButton, CCol, CFormInput, CInputGroup, CRow, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFilter, cilReload } from '@coreui/icons'
import DataTableUtilityControls from './DataTableUtilityControls'

const DataTableToolbar = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Type to search...',
  searchAriaLabel = 'Search records',
  showAdvancedFilters = false,
  setShowAdvancedFilters,
  activeFilterCount = 0,
  onResetFilters,
  onExportCsv,
  exportDisabled = false,
  renderColumnMenu,
  renderQuickFilters,
}) => (
  <CRow className="data-table-filter-row records-filter-row mb-3 g-2 align-items-center flex-nowrap">
    <CCol xs={true} className="data-table-filter-search-col">
      <CInputGroup>
        <CFormInput
          className="data-table-filter-search-input records-filter-search-input"
          placeholder={searchPlaceholder}
          aria-label={searchAriaLabel}
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
        />
      </CInputGroup>
    </CCol>
    <CCol xs="auto" className="data-table-filter-action-col">
      <div className="data-table-filter-action records-filter-action d-flex flex-nowrap justify-content-end justify-content-lg-end gap-2">
        {setShowAdvancedFilters && (
          <CTooltip content="Advanced filters" placement="top">
            <CButton
              size="sm"
              color="secondary"
              variant={showAdvancedFilters ? undefined : 'outline'}
              aria-label="Toggle advanced filters"
              onClick={() => setShowAdvancedFilters((value) => !value)}
              className="data-table-filter-toggle-btn records-filter-toggle-btn"
            >
              <CIcon icon={cilFilter} className="me-lg-1" />
              <span className="d-none d-lg-inline">
                Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </CButton>
          </CTooltip>
        )}
        {onResetFilters && (
          <CTooltip content="Reset filters" placement="top">
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              aria-label="Reset filters"
              onClick={onResetFilters}
              className="d-none d-lg-inline-flex"
            >
              <CIcon icon={cilReload} className="me-1" />
              <span>Reset</span>
            </CButton>
          </CTooltip>
        )}
        <DataTableUtilityControls
          showColumnMenu={Boolean(renderColumnMenu)}
          renderColumnMenu={renderColumnMenu}
          showExport={Boolean(onExportCsv)}
          onExportCsv={onExportCsv}
          exportDisabled={exportDisabled}
          renderQuickFilters={renderQuickFilters}
          exportClassName="d-none d-lg-inline-flex data-table-filter-export-btn"
        />
      </div>
    </CCol>
  </CRow>
)

export default DataTableToolbar
