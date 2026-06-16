import React, { useMemo } from 'react'
import { DataTableRecordList, DataTableTextCell } from '../../../components/datatable'

const dataColumns = [
  {
    key: 'date',
    label: 'Date-Timestamp',
    width: '180px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'user_code',
    label: 'User Code',
    width: '130px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'details',
    label: 'Details',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
  },
]

const defaultVisibleColumns = {
  date: true,
  user_code: true,
  details: true,
}

const requiredColumns = new Set(['date', 'user_code'])

const ActivityTable = ({
  data = [],
  loading = false,
  renderQuickFilters,
  desktopUtilityPortalId,
  mobileUtilityPortalId,
}) => {
  const rows = useMemo(
    () =>
      data.map((activity) => ({
        ...activity,
        date: activity.date || '-',
        user_code: activity.user_code || '-',
        details: activity.details || '-',
      })),
    [data],
  )

  const renderCell = (activity, column) => {
    if (column.key === 'details')
      return (
        <DataTableTextCell
          value={activity.details}
          maxWidth="220px"
          title="Details"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    return activity[column.key] || '-'
  }

  return (
    <DataTableRecordList
      rows={rows}
      dataColumns={dataColumns}
      defaultVisibleColumns={defaultVisibleColumns}
      requiredColumns={requiredColumns}
      storageKey="staff.activities.visible-columns.v3"
      scrollStorageKey="staff.activities.scroll"
      idPrefix="staff-activity"
      emptyMessage="No records found for the selected filters."
      exportFilename={`activity-log-${new Date().toISOString().slice(0, 10)}.csv`}
      loading={loading}
      loadingMessage="Loading activity logs..."
      getRowKey={(activity, index) => activity.id || index}
      renderCell={renderCell}
      getMobileTitle={(activity) => activity.details}
      getMobileSubtitle={(activity) => activity.user_code}
      getMobileMeta={(activity) => activity.date}
      mobileFieldKeys={{
        title: 'details',
        subtitle: 'user_code',
        meta: 'date',
      }}
      initialSortField="date"
      initialSortDir="desc"
      resetDeps={[]}
      desktopUtilityPlacement="portal"
      desktopUtilityPortalId={desktopUtilityPortalId}
      mobileUtilityPlacement="portal"
      mobileUtilityPortalId={mobileUtilityPortalId}
      showMobileUtilityRow={false}
      renderQuickFilters={renderQuickFilters}
    />
  )
}

export default ActivityTable
