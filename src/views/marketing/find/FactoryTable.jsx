import React, { useMemo } from 'react'
import { CButton } from '@coreui/react'
import { DataTableRecordList } from '../../../components/datatable'
import { shorten } from './constants'

const dataColumns = [
  {
    key: 'name',
    label: 'Name',
    width: '240px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'address',
    label: 'Address',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
  {
    key: 'phone',
    label: 'Phone (live)',
    width: '180px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
]

const defaultVisibleColumns = {
  name: true,
  address: true,
  phone: true,
}

const requiredColumns = new Set(['name', 'address'])

const FactoryTable = ({
  filtered = [],
  details = {},
  loading,
  onFetchPhone,
  onOpenRegister,
  desktopUtilityPortalId,
  mobileUtilityPortalId,
  renderQuickFilters,
}) => {
  const rows = useMemo(
    () =>
      filtered.map((record) => {
        const detail = details[record.place_id] || {}
        return {
          ...record,
          name: record.name || '-',
          address: record.address || record.address_full || '-',
          phone: detail.phone || '',
          website: detail.website || '',
          detailsFailed: Boolean(detail.detailsFailed),
          detailsError: detail.detailsError || '',
        }
      }),
    [details, filtered],
  )

  const getActions = (record) =>
    [
      !record.phone
        ? {
            key: 'phone',
            label: record.detailsFailed ? 'Phone unavailable' : 'Show phone',
            disabled: !record.place_id || record.detailsFailed,
            onClick: () => onFetchPhone(record.place_id),
          }
        : null,
      {
        key: 'register',
        label: 'Register to Call Records',
        disabled: !record.place_id,
        onClick: () => onOpenRegister({ ...record, phone: record.phone }),
      },
      record.website
        ? {
            key: 'website',
            label: 'Open website',
            onClick: () => window.open(record.website, '_blank', 'noopener,noreferrer'),
          }
        : null,
    ].filter(Boolean)

  const renderCell = (record, column) => {
    if (column.key === 'address') return shorten(record.address, 140)
    if (column.key === 'phone') {
      if (record.detailsFailed) {
        return (
          <CButton size="sm" color="secondary" variant="outline" disabled>
            Unavailable
          </CButton>
        )
      }

      return record.phone ? (
        <span className="text-primary">{record.phone}</span>
      ) : (
        <CButton
          size="sm"
          color="secondary"
          variant="outline"
          onClick={() => onFetchPhone(record.place_id)}
        >
          Show phone
        </CButton>
      )
    }
    return record[column.key] || '-'
  }

  return (
    <DataTableRecordList
      rows={rows}
      dataColumns={dataColumns}
      defaultVisibleColumns={defaultVisibleColumns}
      requiredColumns={requiredColumns}
      storageKey="marketing.factory-find.visible-columns.v3"
      scrollStorageKey="marketing.factory-find.scroll"
      idPrefix="marketing-factory"
      emptyMessage='No factories found. Try "Generate", different keywords, or a different region.'
      exportFilename={`factory-results-${new Date().toISOString().slice(0, 10)}.csv`}
      loading={loading}
      loadingMessage="Loading factories..."
      showDesktopSummary={false}
      desktopUtilityPlacement={desktopUtilityPortalId ? 'portal' : 'inside'}
      desktopUtilityPortalId={desktopUtilityPortalId}
      mobileUtilityPlacement={mobileUtilityPortalId ? 'portal' : 'inside'}
      mobileUtilityPortalId={mobileUtilityPortalId}
      showMobileUtilityRow={!mobileUtilityPortalId}
      getRowKey={(record, index) => record.place_id || index}
      renderCell={renderCell}
      getActions={getActions}
      getMobileTitle={(record) => record.name}
      getMobileSubtitle={(record) =>
        record.phone || (record.detailsFailed ? 'Phone unavailable' : 'Phone not loaded')
      }
      getMobileMeta={(record) => shorten(record.address, 96)}
      mobileRecord={{
        title: (record) => record.name,
        subtitle: (record) =>
          record.phone || (record.detailsFailed ? 'Phone unavailable' : 'Phone not loaded'),
        meta: (record) => shorten(record.address, 96),
      }}
      mobileFieldKeys={{
        title: 'name',
        subtitle: 'phone',
        meta: 'address',
      }}
      initialSortField="name"
      renderQuickFilters={renderQuickFilters}
      resetDeps={[details]}
      actionColumnWidth="56px"
      className="factory-directory-table"
    />
  )
}

export default FactoryTable
