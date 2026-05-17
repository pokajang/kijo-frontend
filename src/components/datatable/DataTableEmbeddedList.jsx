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

const getColumnAlignClass = (align) => {
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

const DataTableEmbeddedList = ({
  rows = [],
  columns = [],
  getRowKey = (row, index) => row?.id || index,
  renderCell,
  renderMobileItem,
  footerRows = [],
  summaryRows = [],
  rowProps,
  emptyMessage = 'No records.',
  tableClassName = '',
  mobileClassName = '',
  dense = true,
  bordered = false,
  hover = true,
  striped = false,
  responsive = true,
  mobileMode = 'stacked',
}) => {
  const renderBodyCell = (row, column, rowIndex) => {
    if (typeof renderCell === 'function') return renderCell(row, column, rowIndex)
    if (typeof column.render === 'function') return column.render(row, rowIndex, column)
    if (typeof column.getValue === 'function') return column.getValue(row, rowIndex, column)
    return renderValue(row?.[column.key])
  }

  const renderDesktopTable = () => (
    <CTable
      bordered={bordered}
      hover={hover}
      striped={striped}
      className={appendClassNames(
        dense && 'data-table-compact',
        'embedded-data-table',
        tableClassName,
      )}
    >
      <CTableHead>
        <CTableRow>
          {columns.map((column) => {
            const noWrap = shouldNoWrapDataTableColumn(column)

            return (
              <CTableHeaderCell
                key={column.key}
                className={appendClassNames(
                  column.headerClassName,
                  getColumnAlignClass(column.align),
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
        {summaryRows.map((row, rowIndex) => (
          <CTableRow key={row.key || `summary-${rowIndex}`} className={row.className}>
            {renderRowCells(row, rowIndex, 'summary')}
          </CTableRow>
        ))}
        {rows.length === 0 && (
          <CTableRow>
            <CTableDataCell
              colSpan={Math.max(columns.length, 1)}
              className="text-center text-muted"
            >
              {emptyMessage}
            </CTableDataCell>
          </CTableRow>
        )}
        {rows.map((row, rowIndex) => {
          const resolvedRowProps =
            typeof rowProps === 'function' ? rowProps(row, rowIndex) || {} : rowProps || {}

          return (
            <CTableRow key={getRowKey(row, rowIndex)} {...resolvedRowProps}>
              {columns.map((column) => {
                const noWrap = shouldNoWrapDataTableColumn(column)

                return (
                  <CTableDataCell
                    key={column.key}
                    className={appendClassNames(
                      column.cellClassName,
                      getColumnAlignClass(column.align),
                      noWrap && 'text-nowrap',
                    )}
                    style={getColumnStyle(column, column.cellStyle)}
                  >
                    {renderBodyCell(row, column, rowIndex)}
                  </CTableDataCell>
                )
              })}
            </CTableRow>
          )
        })}
      </CTableBody>
      {footerRows.length > 0 && (
        <CTableFoot>
          {footerRows.map((row, rowIndex) => (
            <CTableRow key={row.key || `footer-${rowIndex}`} className={row.className}>
              {renderRowCells(row, rowIndex, 'footer')}
            </CTableRow>
          ))}
        </CTableFoot>
      )}
    </CTable>
  )

  const renderRowCells = (row, rowIndex, section) => {
    const cells = Array.isArray(row.cells) ? row.cells : columns.map((column) => ({ ...column }))

    return cells.map((cell, cellIndex) => {
      const baseColumn = columns.find((column) => column.key === cell.key) || {}
      const noWrap = shouldNoWrapDataTableColumn({ ...baseColumn, ...cell })
      const content =
        typeof cell.render === 'function'
          ? cell.render(row, rowIndex, cell)
          : renderValue(cell.content ?? cell.value ?? row?.[cell.key])

      return (
        <CTableDataCell
          key={cell.key || `${section}-${rowIndex}-${cellIndex}`}
          colSpan={cell.colSpan}
          className={appendClassNames(
            cell.className,
            getColumnAlignClass(cell.align || baseColumn.align),
            noWrap && 'text-nowrap',
          )}
          style={getColumnStyle({ ...baseColumn, ...cell }, cell.style)}
        >
          {content}
        </CTableDataCell>
      )
    })
  }

  if (!rows.length && !summaryRows.length && !footerRows.length) {
    return <div className="border rounded p-3 text-muted">{emptyMessage}</div>
  }

  return (
    <>
      {responsive ? (
        <div className="table-responsive d-none d-lg-block data-table-embedded-shell">
          {renderDesktopTable()}
        </div>
      ) : (
        <div className="d-none d-lg-block data-table-embedded-shell">{renderDesktopTable()}</div>
      )}
      <div className={`d-lg-none records-mobile-list ${mobileClassName}`.trim()}>
        {rows.map((row, rowIndex) => {
          if (typeof renderMobileItem === 'function') {
            return (
              <React.Fragment key={getRowKey(row, rowIndex)}>
                {renderMobileItem(row, rowIndex)}
              </React.Fragment>
            )
          }

          if (mobileMode !== 'stacked') return null

          return (
            <div key={getRowKey(row, rowIndex)} className="data-table-mobile-item">
              <div className="records-mobile-item-main">
                {columns.map((column) => (
                  <div key={column.key} className="records-mobile-meta-row">
                    <span className="records-mobile-meta-label">{column.label}</span>
                    <span className="records-mobile-meta-value">
                      {renderBodyCell(row, column, rowIndex)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default DataTableEmbeddedList
