import React from 'react'
import {
  CTable,
  CTableBody,
  CTableDataCell,
  CTableFoot,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import {
  appendClassNames,
  shouldNoWrapDataTableColumn,
} from '../../utils/datatable/tableFormatters'

const emptyValue = '-'

const getAlignClass = (align) => {
  if (align === 'center') return 'text-center'
  if (align === 'right' || align === 'end') return 'text-end'
  return ''
}

const getColumnStyle = (column = {}, style = {}) => ({
  ...(column.width ? { minWidth: column.width } : {}),
  ...(column.align ? { textAlign: column.align === 'right' ? 'right' : column.align } : {}),
  ...style,
})

const renderValue = (value) => {
  if (value === null || value === undefined || value === '') return emptyValue
  return value
}

const DataTableMatrix = ({
  rows = [],
  columns = [],
  getRowKey = (row, index) => row?.id || row?.key || index,
  renderCell,
  footerRows = [],
  emptyMessage = 'No records.',
  tableClassName = '',
  dense = true,
  bordered = false,
  hover = true,
  striped = false,
  stickyFirstColumn = false,
}) => {
  const renderCellContent = (row, column, rowIndex) => {
    if (typeof renderCell === 'function') return renderCell(row, column, rowIndex)
    if (typeof column.render === 'function') return column.render(row, rowIndex, column)
    if (typeof column.getValue === 'function') return column.getValue(row, rowIndex, column)
    return renderValue(row?.[column.key])
  }

  const renderFooterCells = (row, rowIndex) => {
    const cells = Array.isArray(row.cells) ? row.cells : columns.map((column) => ({ ...column }))

    return cells.map((cell, cellIndex) => {
      const baseColumn = columns.find((column) => column.key === cell.key) || {}
      const mergedColumn = { ...baseColumn, ...cell }
      const noWrap = shouldNoWrapDataTableColumn(mergedColumn)

      return (
        <CTableDataCell
          key={cell.key || `footer-${rowIndex}-${cellIndex}`}
          colSpan={cell.colSpan}
          className={appendClassNames(
            cell.className,
            getAlignClass(mergedColumn.align),
            stickyFirstColumn && cellIndex === 0 && 'data-table-matrix-sticky-cell',
            noWrap && 'text-nowrap',
          )}
          style={getColumnStyle(mergedColumn, cell.style)}
        >
          {typeof cell.render === 'function'
            ? cell.render(row, rowIndex, cell)
            : renderValue(cell.content ?? cell.value ?? row?.[cell.key])}
        </CTableDataCell>
      )
    })
  }

  if (!rows.length) {
    return <div className="border rounded p-3 text-muted">{emptyMessage}</div>
  }

  return (
    <div className="table-responsive data-table-matrix-shell">
      <CTable
        bordered={bordered}
        hover={hover}
        striped={striped}
        className={appendClassNames(
          dense && 'data-table-compact',
          'data-table-matrix',
          tableClassName,
        )}
      >
        <CTableHead>
          <CTableRow>
            {columns.map((column, columnIndex) => {
              const noWrap = shouldNoWrapDataTableColumn(column)

              return (
                <CTableHeaderCell
                  key={column.key}
                  className={appendClassNames(
                    column.headerClassName,
                    getAlignClass(column.align),
                    stickyFirstColumn && columnIndex === 0 && 'data-table-matrix-sticky-cell',
                    noWrap && 'text-nowrap',
                  )}
                  style={getColumnStyle(column, column.headerStyle)}
                >
                  {column.label}
                </CTableHeaderCell>
              )
            })}
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {rows.map((row, rowIndex) => (
            <CTableRow key={getRowKey(row, rowIndex)}>
              {columns.map((column, columnIndex) => {
                const noWrap = shouldNoWrapDataTableColumn(column)

                return (
                  <CTableDataCell
                    key={column.key}
                    className={appendClassNames(
                      column.cellClassName,
                      getAlignClass(column.align),
                      stickyFirstColumn && columnIndex === 0 && 'data-table-matrix-sticky-cell',
                      noWrap && 'text-nowrap',
                    )}
                    style={getColumnStyle(column, column.cellStyle)}
                  >
                    {renderCellContent(row, column, rowIndex)}
                  </CTableDataCell>
                )
              })}
            </CTableRow>
          ))}
        </CTableBody>
        {footerRows.length > 0 && (
          <CTableFoot>
            {footerRows.map((row, rowIndex) => (
              <CTableRow key={row.key || `footer-${rowIndex}`} className={row.className}>
                {renderFooterCells(row, rowIndex)}
              </CTableRow>
            ))}
          </CTableFoot>
        )}
      </CTable>
    </div>
  )
}

export default DataTableMatrix
