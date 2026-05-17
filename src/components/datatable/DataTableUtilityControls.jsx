import React from 'react'
import { CButton, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCloudDownload, cilOptions } from '@coreui/icons'
import DataTableColumnMenu from './DataTableColumnMenu'

const DataTableUtilityControls = ({
  columns = [],
  isColumnVisible,
  toggleColumnVisibility,
  resetColumnVisibility,
  requiredColumns = new Set(),
  idPrefix = 'data-table-column',
  showColumnMenu = true,
  showExport = true,
  exportDisabled = false,
  onExportCsv,
  columnLabel = 'Columns',
  columnIcon,
  columnIconOnly = false,
  columnToggleClassName = '',
  exportClassName = '',
  exportLabel = 'CSV',
  exportIconOnly = false,
  renderColumnMenu,
  renderQuickFilters,
  className = '',
}) => (
  <div
    className={`data-table-utility-controls records-filter-action d-flex gap-2 ${className}`.trim()}
  >
    {showColumnMenu && typeof renderColumnMenu === 'function' && renderColumnMenu()}
    {showColumnMenu && typeof renderColumnMenu !== 'function' && (
      <DataTableColumnMenu
        columns={columns}
        isColumnVisible={isColumnVisible}
        toggleColumnVisibility={toggleColumnVisibility}
        resetColumnVisibility={resetColumnVisibility}
        requiredColumns={requiredColumns}
        idPrefix={idPrefix}
        label={columnLabel}
        icon={columnIcon || (columnIconOnly ? <CIcon icon={cilOptions} /> : undefined)}
        toggleClassName={columnToggleClassName}
      />
    )}
    {typeof renderQuickFilters === 'function' && renderQuickFilters()}
    {showExport && typeof onExportCsv === 'function' && (
      <CTooltip content="Export filtered rows" placement="top">
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          className={`records-filter-export-btn ${exportClassName}`.trim()}
          disabled={exportDisabled}
          onClick={onExportCsv}
          aria-label="Export CSV"
        >
          <CIcon icon={cilCloudDownload} className={exportIconOnly ? undefined : 'me-1'} />
          {exportIconOnly ? null : exportLabel}
        </CButton>
      </CTooltip>
    )}
  </div>
)

export default DataTableUtilityControls
