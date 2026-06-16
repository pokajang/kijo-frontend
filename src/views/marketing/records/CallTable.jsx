// CallTable.jsx
import React, { useMemo } from 'react'
import {
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { countByPredicate, formatCount, getTopGroupByCount } from '../../../utils/stats/formatStats'

const formatDT = (iso) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
}

const getCallCountLabel = (contact) => {
  const count = contact?.displayCalls?.length || 0
  return `${count} call${count === 1 ? '' : 's'}`
}

const getLatestCall = (calls = []) => {
  const rows = Array.isArray(calls) ? calls.filter(Boolean) : []
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => {
    const aTime = new Date(a?.called_at || 0).getTime()
    const bTime = new Date(b?.called_at || 0).getTime()
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
  })[0]
}

const getOutcomeTone = (outcome) => {
  const normalized = String(outcome || '').toLowerCase()
  if (normalized === 'interested') return 'success'
  if (normalized === 'callback later') return 'info'
  if (normalized === 'not interested') return 'danger'
  if (normalized === 'no answer') return 'secondary'
  if (normalized) return 'warning'
  return 'secondary'
}

const canDeleteCall = (call, currentUser) => {
  if (!call) return false
  const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : []
  const isAdmin = userRoles.some((role) => {
    const roleText = String(role || '').toLowerCase()
    return roleText.includes('admin') || roleText.includes('manager') || roleText.includes('super')
  })
  if (isAdmin) return true

  const userId = Number(currentUser?.id || 0)
  const ownerId = Number(call?.called_by || 0)
  if (userId && ownerId && userId === ownerId) return true

  if (currentUser?.code && call?.called_by_code) {
    return String(currentUser.code).toLowerCase() === String(call.called_by_code).toLowerCase()
  }

  return false
}

const dataColumns = [
  {
    key: 'name',
    label: 'Name',
    width: '220px',
    sortable: true,
    sortType: 'string',
    getExportValue: (contact) => contact.name || '-',
  },
  {
    key: 'phone',
    label: 'Phone',
    width: '160px',
    sortable: true,
    sortType: 'string',
    getExportValue: (contact) => contact.phone || '-',
  },
  {
    key: 'website',
    label: 'Website',
    width: '180px',
    sortable: true,
    sortType: 'string',
    getExportValue: (contact) => contact.website || '-',
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
    getExportValue: (contact) => contact.address || '-',
  },
  {
    key: 'latestOutcome',
    label: 'Outcome',
    width: '150px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (contact) => contact.latestOutcome || '-',
  },
  {
    key: 'lastCalledAt',
    label: 'Last Called',
    width: '150px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (contact) => contact.lastCalledAt || '-',
  },
  {
    key: 'caller',
    label: 'Caller',
    width: '110px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (contact) => contact.caller || '-',
  },
  {
    key: 'latestNote',
    label: 'Latest Note',
    width: '220px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '220px',
    previewCharThreshold: 34,
    getExportValue: (contact) => contact.latestNote || '-',
  },
  {
    key: 'callCount',
    label: 'Calls',
    width: '90px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (contact) => contact.callCount || 0,
  },
]

const defaultVisibleColumns = {
  name: true,
  phone: true,
  website: false,
  address: false,
  latestOutcome: true,
  lastCalledAt: true,
  caller: true,
  latestNote: false,
  callCount: true,
}

const requiredColumns = new Set(['name'])

const CallTable = ({
  contacts = [],
  loading,
  beforeList,
  onAddCall,
  onOpenContact,
  onDeleteCall,
  onViewContact,
  onEditContact,
  onDeleteContact,
  currentUser,
  showInlineStats = true,
  renderQuickFilters,
  desktopUtilityPortalId,
  mobileUtilityPortalId,
}) => {
  const rows = useMemo(
    () =>
      contacts.map((contact) => {
        const displayCalls = Array.isArray(contact?.visibleCalls)
          ? contact.visibleCalls
          : contact.calls || []
        const latestCall = getLatestCall(displayCalls)
        return {
          ...contact,
          name: contact.name || '-',
          phone: contact.phone || '-',
          website: contact.website || '',
          address: contact.address || '-',
          displayCalls,
          latestCall,
          latestOutcome: latestCall?.outcome || '',
          lastCalledAt: latestCall?.called_at ? formatDT(latestCall.called_at) : '',
          caller: latestCall?.called_by_code || '',
          latestNote: latestCall?.note || latestCall?.remarks || latestCall?.status || '',
          callCount: displayCalls.length,
        }
      }),
    [contacts],
  )

  const statsItems = useMemo(() => {
    const visibleCalls = rows.flatMap((contact) =>
      Array.isArray(contact.displayCalls) ? contact.displayCalls : [],
    )
    const topCaller = getTopGroupByCount(
      visibleCalls,
      (call) => call?.called_by_code || call?.called_by_name || call?.called_by,
    )
    const followUpCount = countByPredicate(rows, (contact) => {
      const outcome = String(contact.latestOutcome || '').toLowerCase()
      const note = String(contact.latestNote || '').toLowerCase()
      return outcome.includes('callback') || outcome.includes('follow') || note.includes('follow')
    })

    return [
      {
        key: 'contacts',
        label: 'Contacts',
        value: formatCount(rows.length),
        tone: 'primary',
      },
      {
        key: 'calls',
        label: 'Total Calls',
        value: formatCount(visibleCalls.length),
        tone: 'info',
      },
      {
        key: 'follow-up',
        label: 'Follow-up Needed',
        value: formatCount(followUpCount),
        tone: followUpCount ? 'warning' : 'success',
      },
      {
        key: 'top-caller',
        label: 'Top Caller',
        value: topCaller.value,
        sublabel: `${formatCount(topCaller.count)} calls`,
        tone: 'success',
      },
    ]
  }, [rows])

  const getActions = (contact) => {
    const hasCallLogs = Array.isArray(contact?.calls) && contact.calls.length > 0
    const canDeleteLatestCall = onDeleteCall && canDeleteCall(contact?.latestCall, currentUser)
    return [
      { key: 'add-log', label: 'Add Log', onClick: () => onAddCall(contact) },
      { key: 'view', label: 'View Contact', onClick: () => onViewContact?.(contact) },
      { key: 'edit', label: 'Edit Contact', onClick: () => onEditContact?.(contact) },
      contact?.latestCall
        ? {
            key: 'delete-latest-call',
            label: 'Delete Latest Call Log',
            disabled: !canDeleteLatestCall,
            danger: true,
            dividerBefore: true,
            tooltip: canDeleteLatestCall ? undefined : 'Only the owner or managers can delete it.',
            onClick: () => onDeleteCall?.(contact, contact.latestCall),
          }
        : null,
      !hasCallLogs
        ? {
            key: 'delete',
            label: 'Delete Contact',
            danger: true,
            dividerBefore: !contact?.latestCall,
            onClick: () => onDeleteContact?.(contact),
          }
        : null,
    ].filter(Boolean)
  }

  const renderCell = (contact, column) => {
    if (column.key === 'phone') {
      return <DataTableTextCell value={contact.phone} maxWidth="140px" title="Phone" />
    }
    if (column.key === 'website') {
      if (!contact.website) return '-'
      const href = contact.website.startsWith('http')
        ? contact.website
        : `https://${contact.website}`
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="d-block text-truncate"
          style={{ maxWidth: '160px' }}
          data-no-row-open="true"
          onClick={(event) => event.stopPropagation()}
        >
          {contact.website}
        </a>
      )
    }
    if (column.key === 'address') {
      return (
        <DataTableTextCell
          value={contact.address}
          maxWidth="220px"
          title="Address"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    if (column.key === 'latestOutcome') {
      return contact.latestOutcome ? (
        <DataTableStatusBadge tone={getOutcomeTone(contact.latestOutcome)}>
          {contact.latestOutcome}
        </DataTableStatusBadge>
      ) : (
        <span className="text-muted">-</span>
      )
    }
    if (column.key === 'latestNote') {
      return (
        <DataTableTextCell
          value={contact.latestNote || '-'}
          maxWidth="220px"
          title="Latest Note"
          mode="expandable"
          previewCharThreshold={34}
        />
      )
    }
    return contact[column.key] || '-'
  }

  return (
    <>
      {showInlineStats && <StatsStrip loading={loading} items={statsItems} />}
      {beforeList}
      <DataTableRecordList
        rows={rows}
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="marketing.call-records.visible-columns.v3"
        scrollStorageKey="marketing.call-records.scroll"
        idPrefix="marketing-call-record"
        emptyMessage="No contacts found with current filters."
        exportFilename={`call-records-${new Date().toISOString().slice(0, 10)}.csv`}
        loading={loading}
        loadingMessage="Loading call records..."
        showDesktopSummary={false}
        desktopUtilityPlacement={desktopUtilityPortalId ? 'portal' : 'inside'}
        desktopUtilityPortalId={desktopUtilityPortalId}
        mobileUtilityPlacement={mobileUtilityPortalId ? 'portal' : 'inside'}
        mobileUtilityPortalId={mobileUtilityPortalId}
        showMobileUtilityRow={!mobileUtilityPortalId}
        renderQuickFilters={renderQuickFilters}
        getRowKey={(contact, index) => contact.id || index}
        renderCell={renderCell}
        getActions={getActions}
        onRowOpen={(contact) => (onOpenContact || onViewContact)?.(contact)}
        getMobileTitle={(contact) => contact.name}
        getMobileSubtitle={(contact) => contact.phone}
        getMobileMeta={(contact) => contact.address}
        getMobileStatus={() => null}
        mobileRecord={{
          title: (contact) => contact.name,
          subtitle: (contact) => contact.phone,
          meta: (contact) => contact.address,
          badges: (contact) =>
            [
              contact.latestOutcome
                ? {
                    key: 'outcome',
                    label: contact.latestOutcome,
                    tone: getOutcomeTone(contact.latestOutcome),
                  }
                : null,
              { key: 'calls', label: getCallCountLabel(contact), tone: 'info' },
            ].filter(Boolean),
        }}
        mobileFieldKeys={{
          title: 'name',
          subtitle: 'phone',
          meta: ['address', 'latestNote'],
          status: ['latestOutcome', 'callCount'],
        }}
        initialSortField="name"
        getSortValue={(contact, field) => {
          if (field === 'lastCalledAt') return contact.lastCalledAt || ''
          if (field === 'callCount') return contact.callCount || 0
          return contact[field]
        }}
        resetDeps={[]}
        actionColumnWidth="56px"
        className="call-records-table"
      />
    </>
  )
}

export default CallTable
