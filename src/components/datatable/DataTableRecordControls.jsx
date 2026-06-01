import React from 'react'
import { CButton, CCol, CFormInput, CInputGroup, CRow, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilFilter, cilReload } from '@coreui/icons'
import DataTableFilterPanel from './DataTableFilterPanel'

const joinClassNames = (...classNames) => classNames.filter(Boolean).join(' ')

const DataTableRecordControls = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Type to search...',
  searchAriaLabel = 'Search records',
  showAdvancedFilters = false,
  setShowAdvancedFilters,
  activeFilterCount = 0,
  activeChips = [],
  clearChip,
  resetFilters,
  children,
  desktopToolsId,
  mobileToolsId,
  extraTools,
  mobileExtraTools,
  filterButtonLabel = 'Filters',
  searchColProps = { xs: true },
  actionColProps = { xs: 'auto' },
  inlineFilter,
  advancedClassName = '',
  advancedPanelId,
  loading = false,
  visible = true,
}) => {
  const canToggleFilters = typeof setShowAdvancedFilters === 'function'
  const handleToggleFilters = () => setShowAdvancedFilters((visible) => !visible)
  const generatedPanelId = React.useId()
  const panelId =
    advancedPanelId || `data-table-record-filters-${generatedPanelId.replace(/:/g, '')}`

  if (loading || !visible) return null

  return (
    <>
      <CRow className="data-table-filter-row records-filter-row mb-3 g-2 align-items-center flex-nowrap">
        <CCol
          {...searchColProps}
          className={joinClassNames('data-table-filter-search-col', searchColProps.className)}
        >
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
        {inlineFilter && <CCol xs="auto">{inlineFilter}</CCol>}
        <CCol
          {...actionColProps}
          className={joinClassNames('data-table-filter-action-col', actionColProps.className)}
        >
          <div className="data-table-filter-action records-filter-action d-flex flex-nowrap justify-content-end gap-2">
            {canToggleFilters && (
              <CTooltip content="Advanced filters" placement="top">
                <CButton
                  size="sm"
                  color="secondary"
                  variant={showAdvancedFilters ? undefined : 'outline'}
                  aria-label="Toggle advanced filters"
                  aria-expanded={showAdvancedFilters}
                  aria-controls={panelId}
                  onClick={handleToggleFilters}
                  className="data-table-filter-toggle-btn records-filter-toggle-btn"
                >
                  <CIcon icon={cilFilter} className="me-lg-1" />
                  <span className="d-none d-lg-inline">
                    {filterButtonLabel}
                    {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </span>
                </CButton>
              </CTooltip>
            )}
            {resetFilters && (
              <CTooltip content="Reset filters" placement="top">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  aria-label="Reset filters"
                  onClick={resetFilters}
                  className="d-none d-lg-inline-flex"
                >
                  <CIcon icon={cilReload} className="me-1" />
                  <span>Reset</span>
                </CButton>
              </CTooltip>
            )}
            {desktopToolsId && <div id={desktopToolsId} className="d-none d-lg-flex gap-2" />}
            {extraTools}
          </div>
        </CCol>
      </CRow>

      <DataTableFilterPanel
        id={panelId}
        visible={showAdvancedFilters}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        className={advancedClassName}
        renderMobileActions={() => (
          <CCol xs={12} className="d-flex d-lg-none justify-content-end gap-2">
            {resetFilters && (
              <CTooltip content="Reset filters" placement="top">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  aria-label="Reset filters"
                  onClick={resetFilters}
                  className="records-filter-icon-btn"
                >
                  <CIcon icon={cilReload} />
                </CButton>
              </CTooltip>
            )}
            {mobileToolsId && <div id={mobileToolsId} className="d-flex gap-2" />}
            {mobileExtraTools}
          </CCol>
        )}
      >
        {children}
      </DataTableFilterPanel>
    </>
  )
}

export default DataTableRecordControls
