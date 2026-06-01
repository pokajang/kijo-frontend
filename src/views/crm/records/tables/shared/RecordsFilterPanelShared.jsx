import React from 'react'
import {
  CButton,
  CCol,
  CCollapse,
  CDropdown,
  CDropdownMenu,
  CDropdownToggle,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CTooltip,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilOptions, cilReload } from '@coreui/icons'
import { DataTableToolbar } from '../../../../../components/datatable'
import { PeriodRangeSelector } from '../../../../../components/filters'

const RecordsFilterPanelShared = ({
  visible = true,
  searchInput,
  setSearchInput,
  periodRange,
  setPeriodRange,
  statusFilter,
  setStatusFilter,
  createdByFilter,
  setCreatedByFilter,
  yearFilter,
  setYearFilter,
  followUpFilter,
  setFollowUpFilter,
  followUpRecency,
  setFollowUpRecency,
  quotationAge,
  setQuotationAge,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  showAdvancedFilters,
  setShowAdvancedFilters,
  activeFilterCount,
  creatorOptions,
  yearOptions,
  activeChips,
  clearChip,
  resetFilters,
  handleExportCsv,
  sortedRecordsLength,
  isColumnVisible,
  toggleColumnVisibility,
  resetColumnVisibility,
  requiredColumns,
  columnLabels,
  togglableColumnOrder,
  dropdownColumnIdPrefix,
  renderExtraAdvancedFilters,
}) => {
  if (!visible) return null

  const renderPeriodRangeSelector = () => {
    if (typeof setPeriodRange !== 'function') return null

    return (
      <PeriodRangeSelector
        value={periodRange}
        onChange={setPeriodRange}
        className="d-none d-lg-block"
      />
    )
  }

  const renderDesktopColumnMenu = () => (
    <CDropdown alignment="end" autoClose="outside" className="d-none d-lg-block">
      <CDropdownToggle size="sm" color="secondary" variant="outline">
        Columns
      </CDropdownToggle>
      <CDropdownMenu className="p-2" style={{ minWidth: '220px' }}>
        <div className="small text-muted mb-2">Show/Hide Columns</div>
        {togglableColumnOrder.map((key) => (
          <div key={key} className="mb-1">
            <CFormCheck
              id={`${dropdownColumnIdPrefix}-${key}`}
              label={columnLabels[key] || key}
              checked={isColumnVisible(key)}
              disabled={requiredColumns.has(key)}
              onChange={() => toggleColumnVisibility(key)}
            />
          </div>
        ))}
        <div className="d-flex justify-content-end mt-2">
          <CButton size="sm" color="secondary" variant="outline" onClick={resetColumnVisibility}>
            Reset
          </CButton>
        </div>
      </CDropdownMenu>
    </CDropdown>
  )

  return (
    <>
      <DataTableToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Type to search..."
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
        onExportCsv={handleExportCsv}
        exportDisabled={!sortedRecordsLength}
        renderColumnMenu={renderDesktopColumnMenu}
        renderQuickFilters={renderPeriodRangeSelector}
      />

      <CCollapse visible={showAdvancedFilters}>
        <CRow className="records-filter-advanced mb-3 g-3">
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Status</CFormLabel>
            <CFormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="Open">Open</option>
              <option value="Awarded">Awarded</option>
              <option value="Failed">Failed</option>
              <option value="Terminated">Terminated</option>
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Issuer Code</CFormLabel>
            <CFormSelect
              value={createdByFilter}
              onChange={(e) => setCreatedByFilter(e.target.value)}
            >
              <option value="all">All</option>
              {creatorOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Year</CFormLabel>
            <CFormSelect value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
              <option value="all">All</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </CFormSelect>
          </CCol>
          {typeof renderExtraAdvancedFilters === 'function' ? renderExtraAdvancedFilters() : null}
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Has Follow Up</CFormLabel>
            <CFormSelect value={followUpFilter} onChange={(e) => setFollowUpFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Follow Up Recency</CFormLabel>
            <CFormSelect
              value={followUpRecency}
              onChange={(e) => setFollowUpRecency(e.target.value)}
            >
              <option value="all">All</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Quotation Age</CFormLabel>
            <CFormSelect value={quotationAge} onChange={(e) => setQuotationAge(e.target.value)}>
              <option value="all">All</option>
              <option value="14-30">14-30 days</option>
              <option value="31-60">31-60 days</option>
              <option value="gt60">&gt;60 days</option>
            </CFormSelect>
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Min Amount (RM)</CFormLabel>
            <CFormInput
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
            />
          </CCol>
          <CCol xs={6} md={3} lg={2}>
            <CFormLabel>Max Amount (RM)</CFormLabel>
            <CFormInput
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
            />
          </CCol>
          <CCol xs={12} className="d-flex d-lg-none justify-content-end gap-2">
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
            <CDropdown alignment="end" autoClose="outside">
              <CTooltip content="Columns" placement="top">
                <span className="d-inline-flex">
                  <CDropdownToggle
                    size="sm"
                    color="secondary"
                    variant="outline"
                    className="records-filter-icon-btn"
                    aria-label="Show or hide columns"
                  >
                    <CIcon icon={cilOptions} />
                  </CDropdownToggle>
                </span>
              </CTooltip>
              <CDropdownMenu className="p-2" style={{ minWidth: '220px' }}>
                <div className="small text-muted mb-2">Show/Hide Columns</div>
                {togglableColumnOrder.map((key) => (
                  <div key={key} className="mb-1">
                    <CFormCheck
                      id={`${dropdownColumnIdPrefix}-${key}-mobile`}
                      label={columnLabels[key] || key}
                      checked={isColumnVisible(key)}
                      disabled={requiredColumns.has(key)}
                      onChange={() => toggleColumnVisibility(key)}
                    />
                  </div>
                ))}
                <div className="d-flex justify-content-end mt-2">
                  <CButton
                    size="sm"
                    color="secondary"
                    variant="outline"
                    onClick={resetColumnVisibility}
                  >
                    Reset
                  </CButton>
                </div>
              </CDropdownMenu>
            </CDropdown>
            <CTooltip content="Export filtered rows" placement="top">
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                aria-label="Export CSV"
                onClick={handleExportCsv}
                disabled={!sortedRecordsLength}
                className="records-filter-icon-btn"
              >
                <CIcon icon={cilCloudDownload} />
              </CButton>
            </CTooltip>
          </CCol>
        </CRow>
      </CCollapse>

      {activeChips.length > 0 && (
        <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="badge rounded-pill text-bg-light border fw-normal d-inline-flex align-items-center gap-1"
            >
              {chip.label}
              <button
                type="button"
                className="btn btn-sm p-0 border-0 bg-transparent lh-1"
                aria-label={`Clear ${chip.label}`}
                onClick={() => clearChip(chip.key)}
              >
                x
              </button>
            </span>
          ))}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-decoration-none"
            onClick={resetFilters}
          >
            Clear all
          </button>
        </div>
      )}
    </>
  )
}

export default RecordsFilterPanelShared
