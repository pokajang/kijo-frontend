import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import DataTableSortHeader, { getAriaSort } from './DataTableSortHeader'
import EmptyTableState from './EmptyTableState'
import {
  appendClassNames,
  shouldNoWrapDataTableColumn,
} from '../../utils/datatable/tableFormatters'

const isGroupRow = (row) => row?.__dataTableGroupRow === true

const getColumnStyle = (column, style) => ({
  ...(column.key === '__rowIndex'
    ? { width: '1%', minWidth: '3.25rem', maxWidth: '4.5rem', whiteSpace: 'nowrap' }
    : {}),
  ...(column.key !== '__rowIndex' && column.width ? { minWidth: column.width } : {}),
  ...style,
})

const DataTableDesktop = ({
  columns = [],
  rows = [],
  getRowKey = (row, index) => row?.id || index,
  renderCell,
  emptyMessage = 'No records to display.',
  sortField,
  sortDir,
  onSort,
  className = '',
  rowProps,
  resetRowIndexOnGroup = false,
}) => (
  <CTable className={`align-middle mb-0 records-table-compact ${className}`.trim()} hover>
    <CTableHead>
      <CTableRow>
        {columns.map((column) => {
          const isRowIndexColumn = column.key === '__rowIndex'
          const noWrap = isRowIndexColumn || shouldNoWrapDataTableColumn(column)

          return (
            <CTableHeaderCell
              key={column.key}
              className={appendClassNames(
                column.headerClassName,
                isRowIndexColumn && 'data-table-row-index-cell',
                noWrap && 'text-nowrap',
              )}
              style={getColumnStyle(column, column.headerStyle)}
              aria-sort={column.sortable ? getAriaSort(column.key, sortField, sortDir) : undefined}
            >
              {column.sortable ? (
                <DataTableSortHeader
                  field={column.key}
                  label={column.label}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={onSort}
                  centered={column.align === 'center'}
                />
              ) : (
                column.label
              )}
            </CTableHeaderCell>
          )
        })}
      </CTableRow>
    </CTableHead>
    <CTableBody>
      {rows.length === 0 ? (
        <CTableRow>
          <CTableDataCell colSpan={columns.length} className="text-center text-muted">
            <EmptyTableState message={emptyMessage} compact />
          </CTableDataCell>
        </CTableRow>
      ) : (
        (() => {
          let recordIndex = -1
          let groupRecordIndex = -1

          return rows.map((row, rowIndex) => {
            if (isGroupRow(row)) {
              groupRecordIndex = -1
              return (
                <CTableRow
                  key={row.key || `group-${rowIndex}`}
                  className="data-table-group-row"
                  data-group-row="true"
                >
                  <CTableDataCell colSpan={columns.length} className="data-table-group-cell">
                    {row.label}
                  </CTableDataCell>
                </CTableRow>
              )
            }

            recordIndex += 1
            groupRecordIndex += 1
            const displayRowIndex = resetRowIndexOnGroup ? groupRecordIndex : recordIndex
            return (
              <CTableRow
                key={getRowKey(row, recordIndex)}
                {...(rowProps?.(row, recordIndex) || {})}
              >
                {columns.map((column) => {
                  const isRowIndexColumn = column.key === '__rowIndex'
                  const noWrap = isRowIndexColumn || shouldNoWrapDataTableColumn(column)

                  return (
                    <CTableDataCell
                      key={column.key}
                      className={appendClassNames(
                        column.cellClassName,
                        isRowIndexColumn && 'data-table-row-index-cell',
                        noWrap && 'text-nowrap',
                      )}
                      style={getColumnStyle(column, column.cellStyle)}
                    >
                      {renderCell
                        ? renderCell(row, column, displayRowIndex, recordIndex)
                        : row?.[column.key]}
                    </CTableDataCell>
                  )
                })}
              </CTableRow>
            )
          })
        })()
      )}
    </CTableBody>
  </CTable>
)

export default DataTableDesktop
