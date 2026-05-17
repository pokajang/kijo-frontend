import React from 'react'
import { CButton, CCollapse, CRow } from '@coreui/react'

const DataTableFilterPanel = ({
  id,
  visible = false,
  children,
  activeChips = [],
  clearChip,
  resetFilters,
  renderMobileActions,
  className = '',
}) => (
  <>
    <CCollapse id={id} visible={visible}>
      <CRow
        className={`data-table-filter-advanced records-filter-advanced mb-3 g-3 ${className}`.trim()}
      >
        {children}
        {typeof renderMobileActions === 'function' ? renderMobileActions() : null}
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
            {typeof clearChip === 'function' && (
              <button
                type="button"
                className="btn btn-sm p-0 border-0 bg-transparent lh-1"
                aria-label={`Clear ${chip.label}`}
                onClick={() => clearChip(chip.key)}
              >
                x
              </button>
            )}
          </span>
        ))}
        {typeof resetFilters === 'function' && (
          <CButton
            type="button"
            color="link"
            size="sm"
            className="p-0 text-decoration-none"
            onClick={resetFilters}
          >
            Clear all
          </CButton>
        )}
      </div>
    )}
  </>
)

export default DataTableFilterPanel
