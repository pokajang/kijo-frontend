import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CCard, CCardBody } from '@coreui/react'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import {
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatsToggle,
} from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import { fetchAllPagedRecords } from '../../../utils/detailPages'
import { getCurrentReturnTo } from '../../../utils/navigation/returnTo'
import { formatCount, formatMoney, sumBy } from '../../../utils/stats/formatStats'

const API_BASE = import.meta.env.VITE_API_BASE

const columns = [
  { key: 'vendor_name', label: 'Vendor', width: '260px', sortable: true, sortType: 'string' },
  {
    key: 'paid_count',
    label: 'Paid Count',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
  },
  {
    key: 'total_paid_display',
    label: 'Total Paid',
    width: '150px',
    sortable: true,
    sortType: 'number',
    align: 'center',
  },
  {
    key: 'last_paid_date',
    label: 'Last Paid',
    width: '140px',
    sortable: true,
    sortType: 'date',
    align: 'center',
  },
]

const PaidByVendorPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('vendor.paid')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')

  const loadRows = useCallback(async () => {
    setLoading(true)
    try {
      const records = await fetchAllPagedRecords({
        url: `${API_BASE}vendor-payments/paid-by-vendor`,
        dataKeys: ['data'],
        perPage: 100,
      })
      setRows(records)
    } catch (err) {
      console.error('Failed to load vendor ledger', err)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRows()
  }, [loadRows])

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        paid_count: Number(row.paid_count || 0),
        total_paid: Number(row.total_paid || 0),
        total_paid_display: formatMoney(Number(row.total_paid || 0)),
      })),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return normalizedRows
    return normalizedRows.filter((row) =>
      [row.vendor_name, row.vendor_id].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(q),
      ),
    )
  }, [normalizedRows, searchText])

  const statsItems = useMemo(
    () => [
      {
        key: 'vendors',
        label: 'Paid Vendors',
        value: formatCount(filteredRows.length),
        tone: 'primary',
      },
      {
        key: 'payments',
        label: 'Paid Records',
        value: formatCount(sumBy(filteredRows, (row) => row.paid_count)),
        tone: 'success',
      },
      {
        key: 'total',
        label: 'Total Paid',
        value: formatMoney(sumBy(filteredRows, (row) => row.total_paid)),
        tone: 'info',
      },
    ],
    [filteredRows],
  )

  return (
    <>
      <ModuleNavStrip tabs={vendorModuleTabs} ariaLabel="Vendor sections" />
      <CCard className="mb-4">
        <DataTableCardHeader title="Vendor Ledger">
          <DataTableStatsToggle
            visible={statsVisible}
            onToggle={toggleStatsVisible}
            controlsVisible={controlsVisible}
            onControlsToggle={toggleControlsVisible}
          />
        </DataTableCardHeader>
        <CCardBody>
          {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
          <DataTableRecordControls
            visible={controlsVisible}
            searchValue={searchText}
            onSearchChange={setSearchText}
            searchPlaceholder="Search vendor ledger"
            searchAriaLabel="Search vendor ledger"
            showAdvancedFilters={false}
            setShowAdvancedFilters={() => {}}
            activeFilterCount={0}
            activeChips={
              searchText.trim() ? [{ key: 'search', label: `Search: ${searchText.trim()}` }] : []
            }
            clearChip={() => setSearchText('')}
            resetFilters={() => setSearchText('')}
            desktopToolsId="vendor-paid-by-vendor-table-tools"
            mobileToolsId="vendor-paid-by-vendor-mobile-table-tools"
            loading={loading}
          />
          <DataTableRecordList
            rows={filteredRows}
            loading={loading}
            loadingMessage="Loading vendor ledger..."
            dataColumns={columns}
            defaultVisibleColumns={{
              vendor_name: true,
              paid_count: true,
              total_paid_display: true,
              last_paid_date: true,
            }}
            requiredColumns={new Set(['vendor_name', 'total_paid_display'])}
            storageKey="vendor.paid-by-vendor.visible-columns.v1"
            scrollStorageKey="vendor.paid-by-vendor.scroll"
            idPrefix="vendor-paid-by-vendor"
            emptyMessage="No vendor ledger records found."
            exportFilename={`paid-by-vendor-${new Date().toISOString().slice(0, 10)}.csv`}
            showDesktopSummary={false}
            desktopUtilityPlacement="portal"
            desktopUtilityPortalId="vendor-paid-by-vendor-table-tools"
            mobileUtilityPlacement="portal"
            mobileUtilityPortalId="vendor-paid-by-vendor-mobile-table-tools"
            showMobileUtilityRow={false}
            getRowKey={(row) => row.vendor_id}
            renderCell={(row, column) => row[column.key] || '-'}
            onRowOpen={(row) =>
              navigate(`/vendor/paid/${row.vendor_id}`, {
                state: { vendor: row, returnTo: getCurrentReturnTo(location) },
              })
            }
            getMobileTitle={(row) => row.vendor_name}
            getMobileSubtitle={(row) => `${row.paid_count} paid records`}
            getMobileMeta={(row) => row.total_paid_display}
            initialSortField="last_paid_date"
            initialSortDir="desc"
            resetDeps={[searchText]}
          />
        </CCardBody>
      </CCard>
    </>
  )
}

export default PaidByVendorPage
