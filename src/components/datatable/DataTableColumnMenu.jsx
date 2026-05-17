import React from 'react'
import { CButton, CDropdown, CDropdownMenu, CDropdownToggle, CFormCheck } from '@coreui/react'

const DataTableColumnMenu = ({
  columns = [],
  isColumnVisible,
  toggleColumnVisibility,
  resetColumnVisibility,
  requiredColumns = new Set(),
  idPrefix = 'data-table-column',
  label = 'Columns',
  icon,
  toggleClassName = '',
}) => (
  <CDropdown alignment="end" autoClose="outside">
    <CDropdownToggle
      size="sm"
      color="secondary"
      variant="outline"
      className={toggleClassName}
      aria-label={icon ? 'Show or hide columns' : undefined}
    >
      {icon || label}
    </CDropdownToggle>
    <CDropdownMenu className="p-2" style={{ minWidth: '220px' }}>
      <div className="small text-muted mb-2">Show/Hide Columns</div>
      {columns.map((column) => {
        const key = column.key || column
        const columnLabel = column.label || key
        return (
          <div key={key} className="mb-1">
            <CFormCheck
              id={`${idPrefix}-${key}`}
              label={columnLabel}
              checked={isColumnVisible(key)}
              disabled={requiredColumns.has(key)}
              onChange={() => toggleColumnVisibility(key)}
            />
          </div>
        )
      })}
      <div className="d-flex justify-content-end mt-2">
        <CButton size="sm" color="secondary" variant="ghost" onClick={resetColumnVisibility}>
          Reset
        </CButton>
      </div>
    </CDropdownMenu>
  </CDropdown>
)

export default DataTableColumnMenu
