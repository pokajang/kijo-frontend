import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilSwapVertical } from '@coreui/icons'

const getAriaSort = (field, sortField, sortDir) => {
  if (sortField !== field) return 'none'
  return sortDir === 'asc' ? 'ascending' : 'descending'
}

const getSortIcon = (field, sortField, sortDir) => {
  if (sortField !== field) return cilSwapVertical
  return sortDir === 'asc' ? cilArrowTop : cilArrowBottom
}

const DataTableSortHeader = ({
  field,
  label,
  sortField,
  sortDir,
  onSort,
  centered = false,
  className = '',
}) => (
  <button
    type="button"
    className={`btn btn-link p-0 text-decoration-none data-table-sort-btn records-table-sort-btn ${centered ? 'text-center w-100' : ''} ${className}`.trim()}
    onClick={() => onSort(field)}
  >
    {label}
    <CIcon
      icon={getSortIcon(field, sortField, sortDir)}
      className={`data-table-sort-icon records-table-sort-icon ms-1 ${
        sortField !== field ? 'text-muted' : ''
      }`}
      size="sm"
    />
  </button>
)

export default DataTableSortHeader
export { getAriaSort, getSortIcon }
