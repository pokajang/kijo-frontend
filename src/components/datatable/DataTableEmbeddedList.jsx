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
  ...(column.shrinkToFit
    ? {
        width: column.width || '1%',
        ...(column.width ? { minWidth: column.width, maxWidth: column.width } : {}),
      }
    : column.width
      ? { minWidth: column.width }
      : {}),
  ...(column.align ? { textAlign: column.align === 'right' ? 'right' : column.align } : {}),
  ...style,
})

const renderValue = (value) => {
  if (value === null || value === undefined || value === '') return emptyValue
  return value
}

const renderCellContent = (row, rowIndex, cell) =>
  typeof cell.render === 'function'
    ? cell.render(row, rowIndex, cell)
    : renderValue(cell.content ?? cell.value ?? row?.[cell.key])

const formatMobileFooterFallbackLabel = (key, cellIndex) => {
  if (!key) return `Cell ${cellIndex + 1}`

  return String(key)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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
  shellClassName = '',
  shellStyle,
  tableProps = {},
  mobileClassName = '',
  dense = true,
  bordered = false,
  hover = true,
  striped = false,
  responsive = true,
  desktopBreakpoint = 'lg',
  hideMobileList = false,
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
      {...tableProps}
      className={appendClassNames(
        dense && 'data-table-compact',
        'embedded-data-table',
        tableClassName,
        tableProps.className,
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
      const content = renderCellContent(row, rowIndex, cell)

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

  const getFooterCells = (row) =>
    Array.isArray(row.cells) ? row.cells : columns.map((column) => ({ ...column }))

  const getMobileFooterLabel = (cell, cellIndex) => {
    const baseColumn = columns.find((column) => column.key === cell.key) || {}
    return (
      cell.mobileLabel ||
      cell.label ||
      baseColumn.mobileLabel ||
      baseColumn.label ||
      formatMobileFooterFallbackLabel(cell.key, cellIndex)
    )
  }

  const renderMobileFooterRow = (row, rowIndex) => {
    const cells = getFooterCells(row)

    if (cells.length === 2 && row.mobileLayout !== 'details' && row.mobileSummary !== false) {
      return (
        <div
          key={row.key || `mobile-footer-${rowIndex}`}
          className={appendClassNames(
            'data-table-mobile-item data-table-mobile-footer-item data-table-mobile-footer-item--summary',
            row.className,
          )}
        >
          <span className="data-table-mobile-footer-label">
            {renderCellContent(row, rowIndex, cells[0])}
          </span>
          <span className="data-table-mobile-footer-value">
            {renderCellContent(row, rowIndex, cells[1])}
          </span>
        </div>
      )
    }

    return (
      <div
        key={row.key || `mobile-footer-${rowIndex}`}
        className={appendClassNames(
          'data-table-mobile-item data-table-mobile-footer-item',
          row.className,
        )}
      >
        <div className="records-mobile-item-main">
          {cells.map((cell, cellIndex) => (
            <div
              key={cell.key || `mobile-footer-${rowIndex}-${cellIndex}`}
              className="records-mobile-meta-row"
            >
              <span className="records-mobile-meta-label">
                {getMobileFooterLabel(cell, cellIndex)}
              </span>
              <span className="records-mobile-meta-value">
                {renderCellContent(row, rowIndex, cell)}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!rows.length && !summaryRows.length && !footerRows.length) {
    return <div className="border rounded p-3 text-muted">{emptyMessage}</div>
  }

  return (
    <>
      {responsive ? (
        <div
          className={appendClassNames(
            'table-responsive',
            `d-none d-${desktopBreakpoint}-block`,
            'data-table-embedded-shell',
            shellClassName,
          )}
          style={shellStyle}
        >
          {renderDesktopTable()}
        </div>
      ) : (
        <div
          className={appendClassNames(
            `d-none d-${desktopBreakpoint}-block`,
            'data-table-embedded-shell',
            shellClassName,
          )}
          style={shellStyle}
        >
          {renderDesktopTable()}
        </div>
      )}
      {!hideMobileList && (
        <div
          className={appendClassNames(
            `d-${desktopBreakpoint}-none`,
            'records-mobile-list',
            mobileClassName,
          )}
        >
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
          {footerRows.map((row, rowIndex) => renderMobileFooterRow(row, rowIndex))}
        </div>
      )}
    </>
  )
}

export default DataTableEmbeddedList
