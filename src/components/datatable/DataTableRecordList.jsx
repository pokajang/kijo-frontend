import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import DataTableActionMenu from './DataTableActionMenu'
import DataTableDesktop from './DataTableDesktop'
import DataTableFooter from './DataTableFooter'
import DataTableMobileList from './DataTableMobileList'
import DataTableShell, { DataTableViewport } from './DataTableShell'
import DataTableTextCell from './DataTableTextCell'
import DataTableLoadingState from './DataTableLoadingState'
import DataTableUtilityControls from './DataTableUtilityControls'
import {
  useColumnPreferences,
  useDataTablePagination,
  useDataTableScrollMemory,
  useDataTableSort,
  useTableViewportHeight,
  useWindowScrollMemory,
} from '../../hooks/datatable'
import { buildCsv, downloadCsv } from '../../utils/datatable/csv'
import {
  createDataTableHeaderCellBaseStyle,
  createStickyActionCellStyle,
  createStickyActionHeaderStyle,
} from '../../utils/datatable/tableFormatters'
import { createRowOpenHandlers } from '../../utils/datatable/rowOpen'

const defaultGetRowKey = (row, index) => row?.id || index
const isPrimitiveTextCell = (content) => typeof content === 'string' || typeof content === 'number'
const mergeClassNames = (...classNames) => classNames.filter(Boolean).join(' ')
const getSafeGroupKey = (groupKey) =>
  groupKey === null || typeof groupKey === 'undefined' || groupKey === ''
    ? 'Ungrouped'
    : String(groupKey)

const resolveUtilityPortalTarget = (portalId, setPortalTarget) => {
  if (!portalId || typeof document === 'undefined') {
    setPortalTarget(null)
    return undefined
  }

  let frameId
  const updatePortalTarget = () => {
    setPortalTarget(document.getElementById(portalId))
  }

  updatePortalTarget()

  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    frameId = window.requestAnimationFrame(updatePortalTarget)
  }

  return () => {
    if (
      frameId &&
      typeof window !== 'undefined' &&
      typeof window.cancelAnimationFrame === 'function'
    ) {
      window.cancelAnimationFrame(frameId)
    }
  }
}

const DataTableRecordList = ({
  rows = [],
  dataColumns = [],
  defaultVisibleColumns = {},
  requiredColumns = new Set(),
  storageKey,
  apiKey,
  idPrefix = 'data-table-record',
  loading = false,
  loadingMessage = 'Loading records...',
  emptyMessage = 'No records to display.',
  exportFilename,
  getRowKey = defaultGetRowKey,
  renderCell,
  rowProps,
  onRowOpen,
  getRowOpenDisabled,
  rowOpenClassName = 'data-table-clickable-row',
  ignoreRowOpenSelector,
  getActions,
  renderActions,
  renderMobileItem,
  getMobileTitle,
  getMobileSubtitle,
  getMobileMeta,
  getMobileStatus,
  getMobileStatusTone,
  mobileFieldKeys = {},
  mobileRecord,
  initialSortField,
  initialSortDir = 'asc',
  initialSortDirByField = {},
  getSortValue,
  sortComparators = {},
  controlledSortField,
  controlledSortDir,
  onControlledSort,
  controlledPageSize,
  controlledSetPageSize,
  controlledCurrentPage,
  controlledSetCurrentPage,
  columnVisibilityController,
  initialPageSize,
  pageSizeOptions,
  resetDeps = [],
  actionColumnWidth = '56px',
  desktopBreakpoint = 'lg',
  showLargeDatasetHint = false,
  recordsLength = rows.length,
  showScrollTip = true,
  tableViewportDeps = [],
  showExport = true,
  showColumnMenu = true,
  renderQuickFilters,
  getRowGroupKey,
  getRowGroupLabel,
  rowGroupSortComparator,
  resetRowIndexOnGroup = false,
  showDesktopSummary = true,
  desktopUtilityPlacement = 'inside',
  desktopUtilityPortalId,
  mobileUtilityPlacement = 'inside',
  mobileUtilityPortalId,
  showMobileUtilityRow = true,
  showMobileTopFooter = true,
  showFooter = true,
  className = '',
  scrollStorageKey,
}) => {
  const [openActionDropdown, setOpenActionDropdown] = useState(null)
  const [desktopUtilityPortalTarget, setDesktopUtilityPortalTarget] = useState(null)
  const [mobileUtilityPortalTarget, setMobileUtilityPortalTarget] = useState(null)
  const didMountControlledPageResetRef = useRef(false)
  const showInitialLoading = loading && rows.length === 0
  const hasControlledColumnVisibility =
    columnVisibilityController && typeof columnVisibilityController.isColumnVisible === 'function'
  const internalColumnVisibility = useColumnPreferences({
    storageKey: hasControlledColumnVisibility ? undefined : storageKey,
    apiKey: hasControlledColumnVisibility ? undefined : apiKey,
    defaultVisibleColumns,
    requiredColumns,
  })
  const { isColumnVisible, toggleColumnVisibility, resetColumnVisibility } =
    hasControlledColumnVisibility ? columnVisibilityController : internalColumnVisibility
  const { tableViewportHeight, tableViewportRef, tableFooterRef } = useTableViewportHeight([
    rows.length,
    ...tableViewportDeps,
  ])
  const headerCellStyle = createDataTableHeaderCellBaseStyle()
  const stickyActionHeaderStyle = createStickyActionHeaderStyle(actionColumnWidth)
  const stickyActionCellStyle = createStickyActionCellStyle(actionColumnWidth)
  const hasActions = typeof getActions === 'function' || typeof renderActions === 'function'

  const visibleDataColumns = useMemo(
    () => dataColumns.filter((column) => isColumnVisible(column.key)),
    [dataColumns, isColumnVisible],
  )

  useEffect(
    () => resolveUtilityPortalTarget(desktopUtilityPortalId, setDesktopUtilityPortalTarget),
    [desktopUtilityPortalId, loading],
  )

  useEffect(
    () => resolveUtilityPortalTarget(mobileUtilityPortalId, setMobileUtilityPortalTarget),
    [mobileUtilityPortalId, loading],
  )

  const isMobileFieldVisible = (keys) => {
    if (!keys) return true
    const list = Array.isArray(keys) ? keys : [keys]
    return list.every((key) => isColumnVisible(key))
  }

  const sortTypes = useMemo(
    () =>
      dataColumns.reduce((acc, column) => {
        acc[column.key] = column.sortType || 'string'
        return acc
      }, {}),
    [dataColumns],
  )

  const internalSort = useDataTableSort({
    rows,
    initialSortField,
    initialSortDir,
    getSortValue: getSortValue || ((row, field) => row?.[field]),
    sortTypes,
    sortComparators,
    initialSortDirByField,
  })
  const hasControlledSort =
    typeof controlledSortField !== 'undefined' && typeof onControlledSort === 'function'
  const sortField = hasControlledSort ? controlledSortField : internalSort.sortField
  const sortDir = hasControlledSort ? controlledSortDir : internalSort.sortDir
  const toggleSort = hasControlledSort ? onControlledSort : internalSort.toggleSort
  const sortedRows = hasControlledSort ? rows : internalSort.sortedRows
  const displayOrderedRows = useMemo(() => {
    if (typeof getRowGroupKey !== 'function') return sortedRows

    const groups = new Map()
    sortedRows.forEach((row) => {
      const safeGroupKey = getSafeGroupKey(getRowGroupKey(row))
      if (!groups.has(safeGroupKey)) groups.set(safeGroupKey, [])
      groups.get(safeGroupKey).push(row)
    })

    const entries = Array.from(groups.entries())
    if (typeof rowGroupSortComparator === 'function') {
      entries.sort(([leftKey, leftRows], [rightKey, rightRows]) =>
        rowGroupSortComparator(leftKey, rightKey, leftRows, rightRows),
      )
    }

    return entries.flatMap(([, groupRows]) => groupRows)
  }, [getRowGroupKey, rowGroupSortComparator, sortedRows])

  const fallbackSortField = useMemo(() => {
    const preferredColumn = dataColumns.find((column) => column.key === initialSortField)
    if (
      preferredColumn &&
      (requiredColumns.has(preferredColumn.key) || isColumnVisible(preferredColumn.key))
    ) {
      return preferredColumn.key
    }

    return (
      visibleDataColumns.find((column) => column.sortable)?.key ||
      visibleDataColumns[0]?.key ||
      undefined
    )
  }, [dataColumns, initialSortField, isColumnVisible, requiredColumns, visibleDataColumns])

  useEffect(() => {
    if (hasControlledSort) return
    if (!sortField) return
    const sortedColumn = dataColumns.find((column) => column.key === sortField)
    if (!sortedColumn) return
    if (requiredColumns.has(sortField) || isColumnVisible(sortField)) return
    if (!fallbackSortField || fallbackSortField === sortField) return
    internalSort.setSortField(fallbackSortField)
    internalSort.setSortDir(initialSortDirByField[fallbackSortField] || initialSortDir)
  }, [
    dataColumns,
    fallbackSortField,
    hasControlledSort,
    initialSortDir,
    initialSortDirByField,
    internalSort,
    isColumnVisible,
    requiredColumns,
    sortField,
  ])

  const {
    pageSize: internalPageSize,
    setPageSize: setInternalPageSize,
    totalRows: internalTotalRows,
    totalPages: internalTotalPages,
    safeCurrentPage: internalSafeCurrentPage,
    pageStart: internalPageStart,
    pageEnd: internalPageEnd,
    pagedRows: internalPagedRows,
    setCurrentPage: setInternalCurrentPage,
  } = useDataTablePagination({
    rows: displayOrderedRows,
    initialPageSize,
    resetDeps: [sortField, sortDir, ...resetDeps],
  })
  const hasControlledPagination =
    Number.isFinite(Number(controlledPageSize)) &&
    Number.isFinite(Number(controlledCurrentPage)) &&
    typeof controlledSetPageSize === 'function' &&
    typeof controlledSetCurrentPage === 'function'
  const controlledTotalRows = displayOrderedRows.length
  const pageSize = hasControlledPagination ? Number(controlledPageSize) : internalPageSize
  const totalRows = hasControlledPagination ? controlledTotalRows : internalTotalRows
  const totalPages = hasControlledPagination
    ? Math.max(1, Math.ceil(totalRows / pageSize))
    : internalTotalPages
  const safeCurrentPage = hasControlledPagination
    ? Math.min(Number(controlledCurrentPage), totalPages)
    : internalSafeCurrentPage
  const pageStart = hasControlledPagination
    ? totalRows === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize
    : internalPageStart
  const pageEnd = hasControlledPagination
    ? Math.min(pageStart + pageSize, totalRows)
    : internalPageEnd
  const pagedRows = hasControlledPagination
    ? displayOrderedRows.slice(pageStart, pageEnd)
    : internalPagedRows
  const displayRows = useMemo(() => {
    if (typeof getRowGroupKey !== 'function') return pagedRows

    const groups = new Map()
    pagedRows.forEach((row) => {
      const safeGroupKey = getSafeGroupKey(getRowGroupKey(row))
      if (!groups.has(safeGroupKey)) groups.set(safeGroupKey, [])
      groups.get(safeGroupKey).push(row)
    })

    const entries = Array.from(groups.entries())
    if (typeof rowGroupSortComparator === 'function') {
      entries.sort(([leftKey, leftRows], [rightKey, rightRows]) =>
        rowGroupSortComparator(leftKey, rightKey, leftRows, rightRows),
      )
    }

    return entries.flatMap(([groupKey, groupRows]) => [
      {
        __dataTableGroupRow: true,
        key: `group-${groupKey}`,
        label:
          typeof getRowGroupLabel === 'function' ? getRowGroupLabel(groupKey, groupRows) : groupKey,
      },
      ...groupRows,
    ])
  }, [getRowGroupKey, getRowGroupLabel, pagedRows, rowGroupSortComparator])
  const scrollMemoryKey = scrollStorageKey || storageKey || idPrefix
  useDataTableScrollMemory(tableViewportRef, scrollMemoryKey, [
    showInitialLoading,
    totalRows,
    tableViewportHeight,
  ])
  useWindowScrollMemory(scrollMemoryKey ? `${scrollMemoryKey}.window` : undefined, [
    showInitialLoading,
    totalRows,
    tableViewportHeight,
  ])
  const setPageSize = hasControlledPagination
    ? (value) => {
        controlledSetPageSize(value)
        controlledSetCurrentPage(1)
      }
    : setInternalPageSize
  const setCurrentPage = hasControlledPagination ? controlledSetCurrentPage : setInternalCurrentPage

  useEffect(() => {
    if (!hasControlledPagination) return
    if (Number(controlledCurrentPage) > totalPages) controlledSetCurrentPage(totalPages)
  }, [controlledCurrentPage, controlledSetCurrentPage, hasControlledPagination, totalPages])

  useEffect(() => {
    if (!hasControlledPagination) {
      didMountControlledPageResetRef.current = false
      return
    }
    if (!didMountControlledPageResetRef.current) {
      didMountControlledPageResetRef.current = true
      return
    }
    controlledSetCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasControlledPagination, ...resetDeps])

  const desktopColumns = useMemo(
    () => [
      {
        key: '__rowIndex',
        label: '#',
        headerStyle: headerCellStyle,
        headerClassName: 'text-center',
        cellClassName: 'text-center',
      },
      ...visibleDataColumns.map((column) => {
        const compactClassName = column.shrinkToFit ? 'text-nowrap' : undefined
        return {
          key: column.key,
          label: column.label,
          sortable: column.sortable,
          align: column.align,
          width: column.width,
          headerStyle: headerCellStyle,
          headerClassName: mergeClassNames(
            column.headerClassName,
            column.align === 'center' ? 'text-center' : undefined,
            compactClassName,
          ),
          cellStyle: column.cellStyle,
          cellClassName: mergeClassNames(
            column.cellClassName,
            column.align === 'center' ? 'text-center' : undefined,
            compactClassName,
          ),
          sourceColumn: column,
        }
      }),
      ...(hasActions
        ? [
            {
              key: '__actions',
              label: <span className="visually-hidden">Actions</span>,
              headerStyle: stickyActionHeaderStyle,
              headerClassName: 'text-center',
              cellStyle: stickyActionCellStyle,
              cellClassName: 'data-table-action-cell record-action-cell text-center',
            },
          ]
        : []),
    ],
    [
      hasActions,
      headerCellStyle,
      stickyActionCellStyle,
      stickyActionHeaderStyle,
      visibleDataColumns,
    ],
  )

  const renderActionMenu = (row, key) => {
    if (typeof renderActions === 'function') return renderActions(row, key)
    return (
      <DataTableActionMenu
        record={row}
        actions={getActions(row)}
        actionKey={key}
        openActionKey={openActionDropdown}
        setOpenActionKey={setOpenActionDropdown}
      />
    )
  }

  const handleExportCsv = () => {
    if (!displayOrderedRows.length || !exportFilename) return

    const exportColumns = visibleDataColumns.map((column) => ({
      key: column.key,
      label: column.label,
      getValue: column.getExportValue,
    }))
    const csv = buildCsv({ rows: displayOrderedRows, columns: exportColumns })
    downloadCsv(exportFilename, csv)
  }

  const renderUtilityControls = (
    toggleClassName = '',
    idSuffix = '',
    { className: utilityClassName = '', exportIconOnly = false } = {},
  ) => (
    <DataTableUtilityControls
      columns={dataColumns.map((column) => ({ key: column.key, label: column.label }))}
      isColumnVisible={isColumnVisible}
      toggleColumnVisibility={toggleColumnVisibility}
      resetColumnVisibility={resetColumnVisibility}
      requiredColumns={requiredColumns}
      idPrefix={`${idPrefix}-column${idSuffix}`}
      showColumnMenu={showColumnMenu}
      showExport={showExport && Boolean(exportFilename)}
      exportDisabled={displayOrderedRows.length === 0}
      onExportCsv={handleExportCsv}
      columnToggleClassName={toggleClassName}
      columnIconOnly={exportIconOnly}
      exportClassName={toggleClassName}
      exportIconOnly={exportIconOnly}
      renderQuickFilters={renderQuickFilters}
      className={utilityClassName}
    />
  )

  const renderDesktopUtilityRow = () => (
    <div
      className={`data-table-utility-row d-none d-${desktopBreakpoint}-flex flex-column flex-${desktopBreakpoint}-row justify-content-between gap-2 mb-3 ${className}`.trim()}
    >
      {showDesktopSummary ? (
        <div className="small text-muted">
          Showing {totalRows === 0 ? 0 : pageStart + 1}-{pageEnd} of {totalRows}
        </div>
      ) : (
        <div />
      )}
      {renderUtilityControls('', '', { className: 'flex-wrap' })}
    </div>
  )

  const getMergedRowProps = (row, rowIndex) => {
    const userProps =
      typeof rowProps === 'function' ? rowProps(row, rowIndex) || {} : rowProps || {}
    const rowOpenProps = createRowOpenHandlers(row, onRowOpen, {
      disabled: getRowOpenDisabled?.(row, rowIndex) || false,
      ignoreSelector: ignoreRowOpenSelector,
    })
    const mergeHandler = (userHandler, generatedHandler) => {
      if (!userHandler) return generatedHandler
      if (!generatedHandler) return userHandler
      return (event) => {
        userHandler(event)
        if (!event.defaultPrevented) generatedHandler(event)
      }
    }

    return {
      ...rowOpenProps,
      ...userProps,
      className: [
        rowOpenProps.onClick ? rowOpenClassName : '',
        rowOpenProps.className,
        userProps.className,
      ]
        .filter(Boolean)
        .join(' '),
      onClick: mergeHandler(userProps.onClick, rowOpenProps.onClick),
      onKeyDown: mergeHandler(userProps.onKeyDown, rowOpenProps.onKeyDown),
      role: userProps.role || rowOpenProps.role,
      tabIndex: userProps.tabIndex ?? rowOpenProps.tabIndex,
    }
  }

  const renderTableCell = (row, column, rowIndex, absoluteRowIndex = rowIndex) => {
    if (column.key === '__rowIndex') {
      return resetRowIndexOnGroup ? rowIndex + 1 : pageStart + rowIndex + 1
    }
    if (column.key === '__actions') {
      return renderActionMenu(row, `${idPrefix}-${getRowKey(row, absoluteRowIndex)}-desktop`)
    }
    const sourceColumn = column.sourceColumn || column
    const renderPrimitiveTextCell = (content) => {
      const text = String(content ?? '').trim()
      const threshold = sourceColumn.previewCharThreshold || 34

      if (!text || text.length <= threshold) return content

      return (
        <DataTableTextCell
          value={text}
          maxWidth={sourceColumn.cellMaxWidth || sourceColumn.width || '200px'}
          title={sourceColumn.label || 'Details'}
          mode={sourceColumn.textMode || 'expandable'}
          previewCharThreshold={threshold}
          truncateCharThreshold={sourceColumn.truncateCharThreshold || threshold}
          className={sourceColumn.textClassName || ''}
        />
      )
    }

    if (typeof renderCell === 'function') {
      const content = renderCell(row, sourceColumn, { rowIndex, pageStart, visibleDataColumns })
      if (content == null) return '-'
      return isPrimitiveTextCell(content) ? renderPrimitiveTextCell(content) : content
    }

    const content = row?.[column.key] ?? '-'
    return isPrimitiveTextCell(content) ? renderPrimitiveTextCell(content) : content
  }

  if (showInitialLoading) {
    return <DataTableLoadingState message={loadingMessage} />
  }

  return (
    <>
      {desktopUtilityPlacement === 'outside' && renderDesktopUtilityRow()}
      {desktopUtilityPlacement === 'portal' &&
        desktopUtilityPortalTarget &&
        createPortal(
          renderUtilityControls('', '', {
            className: `d-none d-${desktopBreakpoint}-flex justify-content-end`,
          }),
          desktopUtilityPortalTarget,
        )}
      {mobileUtilityPlacement === 'portal' &&
        mobileUtilityPortalTarget &&
        createPortal(
          renderUtilityControls('records-filter-icon-btn', '-mobile', {
            className: `d-${desktopBreakpoint}-none justify-content-end`,
            exportIconOnly: true,
          }),
          mobileUtilityPortalTarget,
        )}

      <DataTableShell className={className}>
        {desktopUtilityPlacement !== 'outside' &&
          desktopUtilityPlacement !== 'portal' &&
          desktopUtilityPlacement !== 'hidden' &&
          renderDesktopUtilityRow()}

        {showMobileUtilityRow && mobileUtilityPlacement === 'inside' && (
          <div
            className={`data-table-mobile-utility-row d-${desktopBreakpoint}-none d-flex justify-content-between align-items-center gap-2 mb-2`}
          >
            <div className="small text-muted text-nowrap">{totalRows} rows</div>
            <div className="d-flex gap-2 min-w-0">
              {renderUtilityControls('text-nowrap', '-mobile')}
            </div>
          </div>
        )}

        {showMobileUtilityRow && mobileUtilityPlacement === 'advanced' && (
          <div
            className={`data-table-mobile-utility-row d-${desktopBreakpoint}-none d-flex justify-content-end align-items-center gap-2 mb-2`}
          >
            {renderUtilityControls('records-filter-icon-btn', '-mobile-advanced', {
              exportIconOnly: true,
            })}
          </div>
        )}

        {showMobileTopFooter && (
          <div className={`d-${desktopBreakpoint}-none mb-2`}>
            <DataTableFooter
              desktopBreakpoint={desktopBreakpoint}
              pageSizeOptions={pageSizeOptions}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalRows={totalRows}
              pageStart={pageStart}
              pageEnd={pageEnd}
              safeCurrentPage={safeCurrentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}

        <DataTableViewport
          desktopBreakpoint={desktopBreakpoint}
          tableViewportRef={tableViewportRef}
          tableViewportHeight={tableViewportHeight}
        >
          <DataTableDesktop
            columns={desktopColumns}
            rows={displayRows}
            getRowKey={getRowKey}
            renderCell={renderTableCell}
            emptyMessage={emptyMessage}
            sortField={sortField}
            sortDir={sortDir}
            onSort={toggleSort}
            rowProps={getMergedRowProps}
            resetRowIndexOnGroup={resetRowIndexOnGroup}
          />
        </DataTableViewport>

        <DataTableMobileList
          rows={displayRows}
          getRowKey={getRowKey}
          renderItem={renderMobileItem}
          pageStart={pageStart}
          getTitle={getMobileTitle}
          getSubtitle={getMobileSubtitle}
          getMeta={getMobileMeta}
          getStatus={getMobileStatus}
          getStatusTone={getMobileStatusTone}
          getActions={getActions}
          renderActions={renderActions}
          showTitle={isMobileFieldVisible(mobileFieldKeys.title)}
          showSubtitle={isMobileFieldVisible(mobileFieldKeys.subtitle)}
          showMeta={isMobileFieldVisible(mobileFieldKeys.meta)}
          showStatus={isMobileFieldVisible(mobileFieldKeys.status)}
          emptyMessage={emptyMessage}
          rowProps={getMergedRowProps}
          mobileRecord={mobileRecord}
          desktopBreakpoint={desktopBreakpoint}
          resetRowIndexOnGroup={resetRowIndexOnGroup}
        />

        {showFooter && (
          <DataTableFooter
            desktopBreakpoint={desktopBreakpoint}
            tableFooterRef={tableFooterRef}
            pageSizeOptions={pageSizeOptions}
            showLargeDatasetHint={showLargeDatasetHint}
            recordsLength={recordsLength}
            showScrollTip={showScrollTip}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalRows={totalRows}
            pageStart={pageStart}
            pageEnd={pageEnd}
            safeCurrentPage={safeCurrentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        )}
      </DataTableShell>
    </>
  )
}

export default DataTableRecordList
