import React, { useMemo, useState } from 'react'
import {
  DataTableColumnMenu,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
  DataTableToolbar,
} from '../../../components/datatable'
import { useColumnPreferences } from '../../../hooks/datatable'
import { buildCsv, downloadCsv } from '../../../utils/datatable/csv'
import { scriptsColumnPreferenceApiKey, scriptsColumnStorageKey } from './constants'
import {
  scriptsDataColumns,
  scriptsDefaultVisibleColumns,
  scriptsRequiredColumns,
} from './schemaSyncColumns'
import { getStatusTone } from './schemaSyncUtils'

const SchemaScriptsTable = ({ rows, dataFiles }) => {
  const [searchInput, setSearchInput] = useState('')
  const { isColumnVisible, toggleColumnVisibility, resetColumnVisibility } = useColumnPreferences({
    storageKey: scriptsColumnStorageKey,
    apiKey: scriptsColumnPreferenceApiKey,
    defaultVisibleColumns: scriptsDefaultVisibleColumns,
    requiredColumns: scriptsRequiredColumns,
  })

  const filteredRows = useMemo(() => {
    const query = searchInput.trim().toLowerCase()
    if (!query) return rows

    return rows.filter((file) =>
      [file.migration, file.fileStatus, file.databaseStatus, file.batch, file.drift]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(query)),
    )
  }, [rows, searchInput])

  const visibleExportColumns = useMemo(
    () =>
      scriptsDataColumns
        .filter((column) => isColumnVisible(column.key))
        .map((column) => ({
          key: column.key,
          label: column.label,
          getValue: (file) => file[column.key],
        })),
    [isColumnVisible],
  )

  const handleExportCsv = () => {
    const csv = buildCsv({ rows: filteredRows, columns: visibleExportColumns })
    downloadCsv(`laravel-migrations-${new Date().toISOString().slice(0, 10)}.csv`, csv)
  }

  const renderColumnMenu = () => (
    <DataTableColumnMenu
      columns={scriptsDataColumns.map((column) => ({ key: column.key, label: column.label }))}
      isColumnVisible={isColumnVisible}
      toggleColumnVisibility={toggleColumnVisibility}
      resetColumnVisibility={resetColumnVisibility}
      requiredColumns={scriptsRequiredColumns}
      idPrefix="system-admin-migration-column"
    />
  )

  const renderScriptCell = (file, column) => {
    if (column.key === 'migration') {
      return (
        <DataTableTextCell
          value={file.migration}
          maxWidth="320px"
          title="Migration"
          mode="expandable"
          previewCharThreshold={48}
          className="font-monospace"
        />
      )
    }
    if (column.key === 'fileStatus') {
      return (
        <DataTableStatusBadge tone={file.fileStatusTone}>{file.fileStatus}</DataTableStatusBadge>
      )
    }
    if (column.key === 'databaseStatus') {
      return (
        <DataTableStatusBadge tone={file.databaseStatusTone}>
          {file.databaseStatus}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'drift') {
      return <DataTableStatusBadge tone={file.driftTone}>{file.drift}</DataTableStatusBadge>
    }
    return file[column.key] || '-'
  }

  return (
    <>
      <DataTableToolbar
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search migrations..."
        searchAriaLabel="Search migrations"
        onResetFilters={() => setSearchInput('')}
        onExportCsv={handleExportCsv}
        exportDisabled={filteredRows.length === 0}
        renderColumnMenu={renderColumnMenu}
      />

      <DataTableRecordList
        rows={filteredRows}
        dataColumns={scriptsDataColumns}
        defaultVisibleColumns={scriptsDefaultVisibleColumns}
        requiredColumns={scriptsRequiredColumns}
        columnVisibilityController={{
          isColumnVisible,
          toggleColumnVisibility,
          resetColumnVisibility,
        }}
        idPrefix="system-admin-migration"
        getRowKey={(file, index) => file.name || index}
        renderCell={renderScriptCell}
        emptyMessage={searchInput.trim() ? 'No matching migrations found.' : 'No migrations found.'}
        initialSortField="statusRank"
        getSortValue={(file, field) => file[field]}
        resetDeps={[dataFiles, searchInput]}
        showDesktopSummary={false}
        desktopUtilityPlacement="hidden"
        mobileUtilityPlacement="hidden"
        showMobileUtilityRow={false}
        showExport={false}
        showColumnMenu={false}
        recordsLength={rows.length}
        getMobileTitle={(file) => file.migration}
        getMobileSubtitle={(file) => `File: ${file.fileStatus} | DB: ${file.databaseStatus}`}
        getMobileMeta={(file) => `Batch: ${file.batch}`}
        getMobileStatus={(file) => file.drift}
        getMobileStatusTone={(file) => getStatusTone(file.drift)}
      />
    </>
  )
}

export default SchemaScriptsTable
