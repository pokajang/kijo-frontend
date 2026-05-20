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
import { appendClassNames } from '../../utils/datatable/tableFormatters'

const emptyValue = '-'

const getAlignClass = (align) => {
  if (align === 'center') return 'text-center'
  if (align === 'right' || align === 'end') return 'text-end'
  return ''
}

const renderValue = (value) => {
  if (value === null || value === undefined || value === '') return emptyValue
  return value
}

const getRowCells = (row) => (Array.isArray(row) ? row : row?.cells || [])

const renderCells = (cells, section, rowIndex) =>
  getRowCells(cells).map((cell, cellIndex) => {
    const CellComponent = section === 'head' ? CTableHeaderCell : CTableDataCell

    return (
      <CellComponent
        key={cell.key || `${section}-${rowIndex}-${cellIndex}`}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan}
        className={appendClassNames(cell.className, getAlignClass(cell.align))}
        style={cell.style}
      >
        {typeof cell.render === 'function'
          ? cell.render(cell, rowIndex, cellIndex)
          : renderValue(cell.content ?? cell.value)}
      </CellComponent>
    )
  })

const DataTableSheet = ({
  headerRows = [],
  rows = [],
  footerRows = [],
  getRowKey = (row, index) => row?.key || row?.id || index,
  tableClassName = '',
  shellClassName = '',
  desktopBreakpoint = 'md',
  emptyMessage = 'No records.',
}) => {
  if (!rows.length && !footerRows.length) {
    return (
      <div
        className={appendClassNames(
          `d-none d-${desktopBreakpoint}-block`,
          'border rounded p-3 text-muted',
          shellClassName,
        )}
      >
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={appendClassNames(
        'table-responsive',
        'data-table-sheet-shell',
        `d-none d-${desktopBreakpoint}-block`,
        shellClassName,
      )}
    >
      <CTable
        align="middle"
        className={appendClassNames(
          'mb-0 border-0 data-table-compact embedded-data-table data-table-sheet',
          tableClassName,
        )}
      >
        {headerRows.length > 0 && (
          <CTableHead>
            {headerRows.map((row, rowIndex) => (
              <CTableRow key={row.key || `head-${rowIndex}`} className={row.className}>
                {renderCells(row, 'head', rowIndex)}
              </CTableRow>
            ))}
          </CTableHead>
        )}
        <CTableBody>
          {rows.map((row, rowIndex) => (
            <CTableRow key={getRowKey(row, rowIndex)} className={row.className}>
              {renderCells(row, 'body', rowIndex)}
            </CTableRow>
          ))}
        </CTableBody>
        {footerRows.length > 0 && (
          <CTableFoot>
            {footerRows.map((row, rowIndex) => (
              <CTableRow key={row.key || `footer-${rowIndex}`} className={row.className}>
                {renderCells(row, 'foot', rowIndex)}
              </CTableRow>
            ))}
          </CTableFoot>
        )}
      </CTable>
    </div>
  )
}

export default DataTableSheet
