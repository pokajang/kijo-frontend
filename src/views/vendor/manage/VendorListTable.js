import React, { useMemo } from 'react'
import { DataTableRecordList, DataTableTextCell } from '../../../components/datatable'

const emptyValue = '-'
const columnStorageKey = 'vendor.manage.active.visible-columns.v4'
const actionColumnWidth = '56px'

const defaultVisibleColumns = {
  vendor: true,
  contact: true,
  mobile: true,
  email: false,
  website: false,
  category: true,
  services: false,
  bankName: false,
  bankAccount: false,
  bankHolder: false,
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
  { key: 'website', label: 'Website', width: '180px', sortable: true, sortType: 'string' },
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
  { key: 'bankName', label: 'Bank Name', width: '180px', sortable: true, sortType: 'string' },
  {
    key: 'bankAccount',
    label: 'Bank Account',
    width: '170px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'bankHolder',
    label: 'Account Holder',
    width: '220px',
    sortable: true,
    sortType: 'string',
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
    value={value || emptyValue}
    maxWidth={column.cellMaxWidth || column.width || '180px'}
    title={column.label}
    mode={column.textMode || 'plain'}
    previewCharThreshold={column.previewCharThreshold}
  />
)

const VendorListTable = ({
  vendors = [],
  onEdit,
  onView,
  onDelete,
  desktopToolsId,
  mobileToolsId,
}) => {
  const normalizedVendors = useMemo(
    () =>
      vendors.map((vendor) => ({
        ...vendor,
        vendor: vendor.vendorName || emptyValue,
        contact: vendor.contactPersonName || emptyValue,
        mobile: vendor.mobileNumber || emptyValue,
        email: vendor.email || emptyValue,
        website: vendor.companyWebsite || emptyValue,
        category: flattenCategory(vendor),
        services: flattenServices(vendor),
        bankName: vendor.bankName || emptyValue,
        bankAccount: vendor.bankAccountNumber || emptyValue,
        bankHolder: vendor.bankHolderName || emptyValue,
      })),
    [vendors],
  )

  const getActions = (vendor) => [
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => onEdit(vendor),
    },
    {
      key: 'view',
      label: 'View',
      onClick: () => onView(vendor),
    },
    {
      key: 'deactivate',
      label: 'Deactivate',
      danger: true,
      dividerBefore: true,
      onClick: () => onDelete(vendor),
    },
  ]

  const renderCell = (vendor, column) => {
    if (['vendor', 'email', 'website', 'category', 'services', 'bankHolder'].includes(column.key)) {
      return renderTextCell(vendor[column.key], column)
    }
    return vendor[column.key] || emptyValue
  }

  return (
    <DataTableRecordList
      rows={normalizedVendors}
      dataColumns={dataColumns}
      defaultVisibleColumns={defaultVisibleColumns}
      requiredColumns={requiredColumns}
      storageKey={columnStorageKey}
      idPrefix="vendor-manage-record"
      emptyMessage="No vendors found."
      exportFilename={`vendors-${new Date().toISOString().slice(0, 10)}.csv`}
      showDesktopSummary={false}
      desktopUtilityPlacement="portal"
      desktopUtilityPortalId={desktopToolsId}
      mobileUtilityPlacement="portal"
      mobileUtilityPortalId={mobileToolsId}
      showMobileUtilityRow={false}
      actionColumnWidth={actionColumnWidth}
      getRowKey={(vendor, index) => vendor.id || index}
      renderCell={renderCell}
      getActions={getActions}
      onRowOpen={onView}
      getMobileTitle={(vendor) => vendor.vendor}
      getMobileSubtitle={(vendor) => vendor.contact}
      getMobileMeta={(vendor) =>
        [vendor.mobile, vendor.email].filter((v) => v && v !== emptyValue).join(' | ')
      }
      mobileFieldKeys={{
        title: 'vendor',
        subtitle: 'contact',
        meta: ['mobile', 'email'],
      }}
      mobileRecord={{
        title: (vendor) => vendor.vendor,
        subtitle: (vendor) => vendor.contact,
        meta: (vendor) =>
          [vendor.mobile, vendor.email]
            .filter((value) => value && value !== emptyValue)
            .join(' | '),
        kv: (vendor) => [
          { key: 'category', label: 'Category', value: vendor.category },
          { key: 'services', label: 'Services', value: vendor.services },
        ],
      }}
      initialSortField="vendor"
      getSortValue={(vendor, field) => vendor[field]}
      resetDeps={[vendors]}
    />
  )
}

export default VendorListTable
