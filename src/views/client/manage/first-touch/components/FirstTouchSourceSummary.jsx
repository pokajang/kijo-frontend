import React from 'react'
import { DataTableRecordList } from '../../../../../components/datatable'
import { formatCompactContributionMoney } from '../clientFirstTouchUtils'

const dataColumns = [
  {
    key: 'sourceGroup',
    label: 'First-touch Source',
    width: '230px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'clientCount',
    label: 'Clients',
    width: '100px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  moneyColumn('awarded', 'Awarded'),
  moneyColumn('invoiced', 'Invoiced'),
  moneyColumn('collected', 'Collected'),
  moneyColumn('grossProfit', 'Gross Profit'),
]

function moneyColumn(key, label) {
  return {
    key,
    label,
    width: '145px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (row) => row[key],
  }
}

const defaultVisibleColumns = Object.fromEntries(dataColumns.map((column) => [column.key, true]))
const requiredColumns = new Set(['sourceGroup'])

const FirstTouchSourceSummary = ({ rows = [] }) => {
  const renderCell = (row, column) => {
    if (['awarded', 'invoiced', 'collected', 'grossProfit'].includes(column.key)) {
      return (
        <span className={column.key === 'collected' ? 'fw-semibold' : undefined}>
          {formatCompactContributionMoney(row[column.key])}
        </span>
      )
    }
    return row[column.key]
  }

  return (
    <>
      <div className="first-touch-attribution-note mb-3" role="note">
        <div>
          <div className="fw-semibold">Commercial context by documented origin</div>
          <div>
            These all-time figures include only uncontested or resolved current claims. Sales credit
            stays with the salesperson assigned to each project.
          </div>
        </div>
      </div>
      <DataTableRecordList
        rows={rows}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="client.first-touch.sources.visible-columns.v1"
        scrollStorageKey="client.first-touch.sources.scroll"
        idPrefix="client-first-touch-source"
        emptyMessage="No source groups match the current filters."
        exportFilename={`client-first-touch-sources-${new Date().toISOString().slice(0, 10)}.csv`}
        showDesktopSummary={false}
        desktopUtilityPlacement="portal"
        desktopUtilityPortalId="client-first-touch-table-tools"
        mobileUtilityPlacement="portal"
        mobileUtilityPortalId="client-first-touch-mobile-table-tools"
        showMobileUtilityRow={false}
        getRowKey={(row) => row.sourceGroup}
        renderCell={renderCell}
        getMobileTitle={(row) => row.sourceGroup}
        getMobileSubtitle={(row) => `${row.clientCount} clients`}
        getMobileMeta={(row) =>
          `Collected ${formatCompactContributionMoney(row.collected)} | Gross profit ${formatCompactContributionMoney(row.grossProfit)}`
        }
        getMobileStatus={(row) => `${row.clientCount} current clients`}
        getMobileStatusTone={() => 'success'}
        mobileFieldKeys={{
          title: 'sourceGroup',
          subtitle: 'clientCount',
          meta: ['collected', 'grossProfit'],
          status: 'clientCount',
        }}
        initialSortField="collected"
        initialSortDir="desc"
        getSortValue={(row, field) => row[field]}
        resetDeps={[rows]}
      />
    </>
  )
}

export default FirstTouchSourceSummary
