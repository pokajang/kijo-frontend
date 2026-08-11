import React from 'react'
import { CButton } from '@coreui/react'
import { DataTableRecordList, DataTableTextCell } from '../../../../../components/datatable'
import { formatFirstTouchDate, getFirstTouchSourceLabel } from '../clientFirstTouchUtils'

const columns = [
  { key: 'companyName', label: 'Client', width: '260px', sortable: true, sortType: 'string' },
  { key: 'currentClaim', label: 'Current Claim', width: '230px' },
  { key: 'competingCount', label: 'Competing', width: '100px', align: 'center' },
  { key: 'disputeCount', label: 'Disputes', width: '100px', align: 'center' },
  { key: 'openedAt', label: 'Opened', width: '130px', sortable: true, sortType: 'date' },
  { key: 'resolutionAction', label: 'Review', width: '120px', align: 'center' },
]

const visibleColumns = Object.fromEntries(columns.map((column) => [column.key, true]))

const FirstTouchConflictQueue = ({ records = [], onResolve }) => {
  const rows = records.map((record) => ({
    ...record,
    currentClaim: getFirstTouchSourceLabel(record.firstTouch),
    competingCount: record.conflict?.competingClaimIds?.length || 0,
    disputeCount: record.conflict?.disputeIds?.length || 0,
    openedAt: record.conflict?.openedAt,
  }))

  return (
    <>
      <div className="first-touch-attribution-note mb-3" role="note">
        <div>
          <div className="fw-semibold">Independent conflict review</div>
          <div>
            This queue is limited to managers and system administrators. Routine first-touch
            submissions never appear here; only competing claims and disputes do.
          </div>
        </div>
      </div>
      <DataTableRecordList
        rows={rows}
        dataColumns={columns}
        defaultVisibleColumns={visibleColumns}
        requiredColumns={new Set(['companyName', 'resolutionAction'])}
        storageKey="client.first-touch.conflicts.visible-columns.v1"
        scrollStorageKey="client.first-touch.conflicts.scroll"
        idPrefix="client-first-touch-conflict"
        emptyMessage="There are no first-touch conflicts awaiting review."
        showDesktopSummary={false}
        showMobileUtilityRow={false}
        getRowKey={(record) => record.companyId}
        renderCell={(record, column) => {
          if (column.key === 'companyName' || column.key === 'currentClaim') {
            return <DataTableTextCell value={record[column.key]} maxWidth={column.width} />
          }
          if (column.key === 'openedAt') return formatFirstTouchDate(record.openedAt)
          if (column.key === 'resolutionAction') {
            return (
              <CButton
                size="sm"
                color="primary"
                variant="outline"
                onClick={() => onResolve(record)}
              >
                Resolve
              </CButton>
            )
          }
          return record[column.key]
        }}
        getMobileTitle={(record) => record.companyName}
        getMobileSubtitle={(record) => record.currentClaim}
        getMobileMeta={(record) =>
          `${record.competingCount} competing · ${record.disputeCount} disputes`
        }
        initialSortField="openedAt"
        initialSortDir="asc"
        getSortValue={(record, field) => record[field]}
        resetDeps={[records]}
      />
    </>
  )
}

export default FirstTouchConflictQueue
