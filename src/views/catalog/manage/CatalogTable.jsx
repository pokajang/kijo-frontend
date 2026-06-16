// src/views/catalog/manage/CatalogTable.jsx
import React, { useMemo } from 'react'
import { DataTableRecordList, DataTableTextCell } from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { countByPredicate, formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'

const emptyValue = '-'
const columnStorageKey = 'catalog.manage.visible-columns.v4'
const actionColumnWidth = '56px'

const defaultVisibleColumns = {
  item: true,
  category: true,
  supplier: true,
  latestPrice: true,
  unit: true,
  priceDate: true,
  createdBy: false,
  description: false,
  remarks: false,
  brochure: false,
}

const requiredColumns = new Set(['item', 'supplier'])

const dataColumns = [
  { key: 'item', label: 'Item Name', width: '220px', sortable: true, sortType: 'string' },
  { key: 'category', label: 'Category', width: '150px', sortable: true, sortType: 'string' },
  { key: 'supplier', label: 'Supplier', width: '200px', sortable: true, sortType: 'string' },
  {
    key: 'latestPrice',
    label: 'Latest Price (RM)',
    width: '150px',
    sortable: true,
    sortType: 'number',
    headerClassName: 'text-end',
    cellClassName: 'text-end',
    shrinkToFit: true,
    getExportValue: (item) => item.latestPriceDisplay,
  },
  {
    key: 'unit',
    label: 'Unit',
    width: '110px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'priceDate',
    label: 'Price Date',
    width: '130px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (item) => item.priceDateDisplay,
  },
  {
    key: 'createdBy',
    label: 'Created By',
    width: '120px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'description',
    label: 'Description',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'remarks',
    label: 'Remarks',
    width: '200px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '200px',
    previewCharThreshold: 34,
  },
  {
    key: 'brochure',
    label: 'Brochure',
    width: '120px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
]

const formatMoney = (value) => {
  const price = Number.parseFloat(value)
  return Number.isFinite(price) ? price.toFixed(2) : '0.00'
}

const renderTextCell = (value, column) => (
  <DataTableTextCell
    value={value || emptyValue}
    maxWidth={column.cellMaxWidth || column.width || '200px'}
    title={column.label}
    mode={column.textMode || 'plain'}
    previewCharThreshold={column.previewCharThreshold}
  />
)

const CatalogTable = ({
  data = [],
  beforeList,
  onView,
  onEdit,
  onDelete,
  desktopToolsId,
  mobileToolsId,
  statsVisible = true,
}) => {
  const normalizedItems = useMemo(
    () =>
      data.map((item) => {
        const price = Number.parseFloat(item.supplier_price)
        return {
          ...item,
          item: item.item_name || emptyValue,
          category: item.category_id || emptyValue,
          supplier: item.supplier_name || emptyValue,
          latestPrice: Number.isFinite(price) ? price : 0,
          latestPriceDisplay: formatMoney(item.supplier_price),
          unit: item.unit || emptyValue,
          priceDate: item.price_date || '',
          priceDateDisplay: item.price_date || emptyValue,
          createdBy: item.created_by_code || emptyValue,
          description: item.description || emptyValue,
          remarks: item.remarks || emptyValue,
          brochure: item.brochure_filename ? 'Attached' : 'None',
        }
      }),
    [data],
  )

  const statsItems = useMemo(() => {
    const categories = new Set(
      normalizedItems.map((item) => item.category).filter((value) => value && value !== emptyValue),
    )
    const topCreator = getTopGroupByCount(normalizedItems, (item) => item.createdBy)

    return [
      {
        key: 'items',
        label: 'Items',
        value: formatCount(normalizedItems.length),
        tone: 'primary',
      },
      {
        key: 'categories',
        label: 'Categories',
        value: formatCount(categories.size),
        tone: 'info',
      },
      {
        key: 'missing-supplier',
        label: 'Missing Supplier',
        value: formatCount(
          countByPredicate(
            normalizedItems,
            (item) => !item.supplier || item.supplier === emptyValue,
          ),
        ),
        tone: 'warning',
      },
      {
        key: 'top-creator',
        label: 'Top Creator',
        value: topCreator.value,
        sublabel: `${formatCount(topCreator.count)} catalog items`,
        tone: 'secondary',
      },
    ]
  }, [normalizedItems])

  const getActions = (item) => [
    {
      key: 'view',
      label: 'View',
      onClick: () => onView(item),
    },
    {
      key: 'edit',
      label: 'Edit',
      onClick: () => onEdit(item),
    },
    {
      key: 'delete',
      label: 'Delete',
      danger: true,
      dividerBefore: true,
      onClick: () => onDelete(item.id),
    },
  ]

  const renderCell = (item, column) => {
    if (['item', 'category', 'supplier', 'description', 'remarks'].includes(column.key)) {
      return renderTextCell(item[column.key], column)
    }
    if (column.key === 'latestPrice') return item.latestPriceDisplay
    if (column.key === 'priceDate') return item.priceDateDisplay
    return item[column.key] || emptyValue
  }

  return (
    <>
      {statsVisible && <StatsStrip items={statsItems} />}
      {beforeList}
      <DataTableRecordList
        rows={normalizedItems}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey={columnStorageKey}
        scrollStorageKey="catalog.manage.records.scroll"
        idPrefix="catalog-manage-record"
        emptyMessage="No catalog items found."
        exportFilename={`catalog-items-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId={desktopToolsId}
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId={mobileToolsId}
        showMobileUtilityRow={false}
        actionColumnWidth={actionColumnWidth}
        getRowKey={(item, index) => item.id || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={onView}
        getMobileTitle={(item) => item.item}
        getMobileMeta={(item) =>
          [item.supplier, `RM ${item.latestPriceDisplay}`, item.unit]
            .filter((value) => value && value !== emptyValue)
            .join(' | ')
        }
        mobileFieldKeys={{
          title: 'item',
          meta: ['supplier', 'latestPrice', 'unit'],
        }}
        mobileRecord={{
          title: (item) => item.item,
          meta: (item) =>
            [item.supplier, `RM ${item.latestPriceDisplay}`, item.unit]
              .filter((value) => value && value !== emptyValue)
              .join(' | '),
        }}
        initialSortField="item"
        initialSortDirByField={{
          latestPrice: 'desc',
          priceDate: 'desc',
        }}
        getSortValue={(item, field) => item[field]}
        resetDeps={[]}
      />
    </>
  )
}

export default CatalogTable
