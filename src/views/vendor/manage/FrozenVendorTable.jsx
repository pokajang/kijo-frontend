import React, { useMemo, useState } from 'react'
import { CCol, CFormLabel, CFormSelect } from '@coreui/react'
import {
  DataTableRecordControls,
  DataTableRecordList,
  DataTableTextCell,
} from '../../../components/datatable'

const emptyValue = '-'
const columnStorageKey = 'vendor.manage.frozen.visible-columns.v4'
const actionColumnWidth = '56px'

const defaultVisibleColumns = {
  vendor: true,
  contact: true,
  mobile: true,
  email: false,
  category: true,
  services: false,
  reason: true,
}

const requiredColumns = new Set(['vendor', 'contact'])

const dataColumns = [
  { key: 'vendor', label: 'Vendor Name', width: '220px', sortable: true, sortType: 'string' },
  { key: 'contact', label: 'Contact Person', width: '180px', sortable: true, sortType: 'string' },
  {
    key: 'mobile',
    label: 'Mobile',
    width: '140px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  { key: 'email', label: 'Email', width: '180px', sortable: true, sortType: 'string' },
  { key: 'category', label: 'Category', width: '160px', sortable: true, sortType: 'string' },
  {
    key: 'services',
    label: 'Services',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'reason',
    label: 'Deactivation Reason',
    width: '200px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '200px',
    previewCharThreshold: 34,
  },
]

const flattenServices = (vendor) =>
  [
    ...(vendor.trainingTopics || []),
    ...(vendor.competency || []),
    ...(vendor.supplierProducts || []),
    ...(vendor.consultancy || []),
    ...(vendor.servicesOffered || []),
  ]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ') || emptyValue

const flattenCategory = (vendor) =>
  (vendor.category || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(', ') || emptyValue

const renderTextCell = (value, column) => (
  <DataTableTextCell
    value={value}
    maxWidth={column.cellMaxWidth || column.width || '180px'}
    title={column.label}
    mode={column.textMode || 'plain'}
    previewCharThreshold={column.previewCharThreshold}
  />
)

const FrozenVendorTable = ({
  inactiveVendors = [],
  onDeleteVendor,
  onReactivateVendor,
  onViewVendor,
}) => {
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const normalizedVendors = useMemo(
    () =>
      inactiveVendors.map((vendor) => ({
        ...vendor,
        vendor: vendor.vendorName || emptyValue,
        contact: vendor.contactPersonName || emptyValue,
        mobile: vendor.mobileNumber || emptyValue,
        email: vendor.email || emptyValue,
        category: flattenCategory(vendor),
        services: flattenServices(vendor),
        reason: vendor.delete_reason || emptyValue,
      })),
    [inactiveVendors],
  )

  const availableCategories = useMemo(() => {
    const categories = new Set()
    normalizedVendors.forEach((vendor) => {
      if (vendor.category && vendor.category !== emptyValue) categories.add(vendor.category)
    })
    return Array.from(categories).sort()
  }, [normalizedVendors])

  const filteredVendors = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return normalizedVendors.filter((vendor) => {
      const matchesSearch =
        !q ||
        [
          vendor.vendor,
          vendor.contact,
          vendor.mobile,
          vendor.email,
          vendor.services,
          vendor.reason,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(q),
        )
      const matchesCategory = !categoryFilter || vendor.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [categoryFilter, normalizedVendors, searchText])

  const resetFilters = () => {
    setSearchText('')
    setCategoryFilter('')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'category') setCategoryFilter('')
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    categoryFilter ? { key: 'category', label: `Category: ${categoryFilter}` } : null,
  ].filter(Boolean)

  const getActions = (vendor) => [
    {
      key: 'reactivate',
      label: 'Reactivate',
      onClick: () => onReactivateVendor(vendor),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => onDeleteVendor(vendor),
    },
  ]

  const renderCell = (vendor, column) => {
    if (['vendor', 'email', 'category', 'services', 'reason'].includes(column.key)) {
      return renderTextCell(vendor[column.key], column)
    }
    return vendor[column.key] || emptyValue
  }

  return (
    <>
      <DataTableRecordControls
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search frozen vendor, contact, reason"
        searchAriaLabel="Search frozen vendors"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={categoryFilter ? 1 : 0}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="frozen-vendor-table-tools"
        mobileToolsId="frozen-vendor-mobile-table-tools"
      >
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="frozenVendorCategoryFilter">Category</CFormLabel>
          <CFormSelect
            id="frozenVendorCategoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>

      <DataTableRecordList
        rows={filteredVendors}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey={columnStorageKey}
        idPrefix="frozen-vendor-record"
        emptyMessage="No frozen vendors found."
        exportFilename={`frozen-vendors-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId="frozen-vendor-table-tools"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="frozen-vendor-mobile-table-tools"
        showMobileUtilityRow={false}
        actionColumnWidth={actionColumnWidth}
        getRowKey={(vendor, index) => vendor.id || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={onViewVendor}
        getMobileTitle={(vendor) => vendor.vendor}
        getMobileSubtitle={(vendor) => vendor.contact}
        getMobileMeta={(vendor) => vendor.reason}
        mobileFieldKeys={{
          title: 'vendor',
          subtitle: 'contact',
          meta: 'reason',
        }}
        mobileRecord={{
          title: (vendor) => vendor.vendor,
          subtitle: (vendor) => vendor.contact,
          meta: (vendor) => vendor.reason,
          kv: (vendor) => [
            { key: 'mobile', label: 'Mobile', value: vendor.mobile },
            { key: 'category', label: 'Category', value: vendor.category },
          ],
        }}
        initialSortField="vendor"
        getSortValue={(vendor, field) => vendor[field]}
        resetDeps={[filteredVendors, searchText, categoryFilter]}
      />
    </>
  )
}

export default FrozenVendorTable
