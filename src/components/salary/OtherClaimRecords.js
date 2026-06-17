import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CCol, CFormLabel, CFormSelect, CSpinner } from '@coreui/react'
import StatsStrip from '../stats/StatsStrip'
import { DataTableActionMenu, DataTableRecordControls, DataTableStatusBadge } from '../datatable'
import dialog from '../dialog/dialogService'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { formatMoney, roundMoney } from './salaryCalculations'
import {
  exportOtherClaimPdf,
  findOtherClaimRecord,
  getOtherClaimRecordUrlKey,
  getOtherClaimRecords,
  otherClaimRecordsChangedEvent,
  removeOtherClaimRecord,
} from './otherClaimRecordStorage'
import { SalaryRecordTable } from './SalaryTables'
import { openBlobInNewTab, openPreparingPdfTab } from './salaryFileUtils'

const statusTone = {
  Draft: 'secondary',
  Approved: 'success',
  Checked: 'primary',
  Prepared: 'info',
  Submitted: 'info',
  Pending: 'warning',
  Rejected: 'danger',
}

const statusSortPriority = {
  Draft: -1,
  Submitted: 0,
  Prepared: 0,
  Checked: 1,
  Approved: 2,
  Rejected: 4,
}

const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

const claimDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const displayStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  return status
}

const parseRecordDate = (value) => {
  if (!value) return null
  const normalized = String(value).replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatClaimDate = (record = {}) => {
  const submittedDate = parseRecordDate(record.submittedAt)
  if (submittedDate) return claimDateFormatter.format(submittedDate)

  const draftDate = parseRecordDate(record.draftSavedAt)
  if (draftDate) return `${claimDateFormatter.format(draftDate)} draft`

  return record.claimMonth || '-'
}

const dataColumns = [
  {
    key: 'claimDate',
    label: 'Claim Date',
    width: '190px',
    sortable: true,
    sortType: 'string',
    getExportValue: formatClaimDate,
  },
  {
    key: 'claimsTotal',
    label: 'Claims Total',
    width: '140px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.claimsTotal),
  },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => displayStatus(record.status),
  },
]

const defaultVisibleColumns = {
  claimDate: true,
  claimsTotal: true,
  status: true,
}

const requiredColumns = new Set(['claimDate', 'claimsTotal', 'status'])
const reviewedMutableStatuses = new Set(['Checked', 'Approved'])
const paidStatuses = new Set(['Paid'])
const submittedStatuses = new Set(['Submitted', 'Prepared'])

const formatClaimMonthScope = (claimMonthValue) => {
  const [year, month] = String(claimMonthValue || '')
    .split('-')
    .map(Number)
  if (!year || !month) return ''

  return monthLabelFormatter.format(new Date(year, month - 1, 1))
}

const getOtherClaimRecordsScopeLabel = (records = []) => {
  const claimMonths = records
    .map((record) => record.claimMonthValue)
    .filter((value) => /^\d{4}-\d{2}$/.test(String(value || '')))
    .sort()

  if (!claimMonths.length) return ''

  const first = formatClaimMonthScope(claimMonths[0])
  const last = formatClaimMonthScope(claimMonths[claimMonths.length - 1])

  return first === last ? first : `${first} - ${last}`
}

export const downloadOtherClaim = async (record, pendingTab = null) => {
  if (!record?.id) return

  const { blob, filename } = await exportOtherClaimPdf(record.id)
  openBlobInNewTab(blob, filename, pendingTab)
}

const OtherClaimRecords = ({
  records: recordsProp,
  statsVisible = true,
  controlsVisible = true,
  onScopeLabelChange,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const [storedRecords, setStoredRecords] = useState([])
  const [loading, setLoading] = useState(!recordsProp)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportingRecordId, setExportingRecordId] = useState(null)
  const { consumeRouteGroup } = useAppNotifications()
  const records = recordsProp || storedRecords

  const refreshRecords = useCallback(async () => {
    if (recordsProp) return

    setLoading(true)
    setError('')
    try {
      setStoredRecords(await getOtherClaimRecords())
    } catch (err) {
      setError(err?.message || 'Unable to load other claim records.')
    } finally {
      setLoading(false)
    }
  }, [recordsProp])

  useEffect(() => {
    if (recordsProp) return undefined
    let cancelled = false
    refreshRecords().then(() => {
      if (cancelled) return
      consumeRouteGroup({
        routePrefix: '/my/salary',
        moduleKeys: ['my.other-claims'],
      }).catch(() => {})
    })
    window.addEventListener(otherClaimRecordsChangedEvent, refreshRecords)
    return () => {
      cancelled = true
      window.removeEventListener(otherClaimRecordsChangedEvent, refreshRecords)
    }
  }, [consumeRouteGroup, recordsProp, refreshRecords])

  const statusOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.status).filter(Boolean))).sort(),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return records.filter((record) => {
      const matchesSearch =
        !query ||
        [formatClaimDate(record), record.claimMonth, record.claimMonthValue, record.status].some(
          (value) =>
            String(value || '')
              .toLowerCase()
              .includes(query),
        )
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [records, searchText, statusFilter])

  const stats = useMemo(() => {
    const approvedCount = filteredRecords.filter(
      (record) => displayStatus(record.status) === 'Approved',
    ).length
    const submittedCount = filteredRecords.filter((record) =>
      submittedStatuses.has(record.status),
    ).length
    const claimsTotal = filteredRecords.reduce(
      (total, record) => total + Number(record.claimsTotal || 0),
      0,
    )

    return [
      {
        key: 'approved',
        label: 'Approved',
        value: approvedCount,
        sublabel: 'claim records',
        tone: 'success',
      },
      {
        key: 'submitted',
        label: 'Submitted',
        value: submittedCount,
        sublabel: 'ready for review',
        tone: 'info',
      },
      {
        key: 'claims',
        label: 'Claims Total',
        value: formatMoney(roundMoney(claimsTotal)),
        sublabel: 'shown records',
        tone: 'warning',
      },
    ]
  }, [filteredRecords])

  const scopeLabel = useMemo(
    () => getOtherClaimRecordsScopeLabel(filteredRecords),
    [filteredRecords],
  )

  useEffect(() => {
    if (typeof onScopeLabelChange !== 'function') return undefined
    onScopeLabelChange(scopeLabel)
    return () => onScopeLabelChange('')
  }, [onScopeLabelChange, scopeLabel])

  const renderStatus = (record) => (
    <DataTableStatusBadge tone={statusTone[record.status] || 'secondary'}>
      {displayStatus(record.status)}
    </DataTableStatusBadge>
  )

  const openRecord = (record) => {
    if (!record?.id) return
    const recordUrlKey = getOtherClaimRecordUrlKey(record)
    navigate(`/my/salary/other-claims/records/${encodeURIComponent(recordUrlKey)}`, {
      state: { record, returnTo: returnTo || '/my/salary/other-claims/records' },
    })
  }

  const loadRecordDetail = async (record) => {
    if (
      Array.isArray(record?.claims) &&
      (record.claims.length > 0 || Number(record.claimsTotal) <= 0)
    ) {
      return record
    }
    return findOtherClaimRecord(record.id)
  }

  const editRecord = async (record) => {
    if (paidStatuses.has(record?.status)) return
    const detailRecord = await loadRecordDetail(record)
    if (!detailRecord) return
    let amendmentReason = ''
    if (reviewedMutableStatuses.has(detailRecord.status)) {
      const reason = await dialog.prompt(
        `This other claim has already been ${displayStatus(
          detailRecord.status,
        ).toLowerCase()}. Enter a reason to restart the workflow.`,
        {
          title: 'Edit Reviewed Other Claim',
          confirmText: 'Continue',
          required: true,
          multiline: true,
          rows: 4,
          placeholder: 'Reason for amending this other claim',
        },
      )
      if (reason === null) return
      amendmentReason = String(reason || '').trim()
      if (!amendmentReason) return
    }
    navigate('/my/salary/other-claims/apply', {
      state: { editRecord: detailRecord, amendmentReason },
    })
  }

  const deleteRecord = async (record) => {
    if (!record?.id) return
    if (paidStatuses.has(record.status)) return
    let cancellationReason = ''
    if (reviewedMutableStatuses.has(record.status)) {
      const reason = await dialog.prompt(
        `This other claim has already been ${displayStatus(
          record.status,
        ).toLowerCase()}. Enter a reason to cancel it.`,
        {
          title: 'Cancel Reviewed Other Claim',
          confirmText: 'Cancel Claim',
          confirmColor: 'danger',
          required: true,
          multiline: true,
          rows: 4,
          placeholder: 'Reason for cancelling this other claim',
        },
      )
      if (reason === null) return
      cancellationReason = String(reason || '').trim()
      if (!cancellationReason) return
    } else if (
      !(await dialog.confirm(`Delete this other claim from ${formatClaimDate(record)}?`, {
        title: 'Delete Other Claim',
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    ) {
      return
    }

    try {
      await removeOtherClaimRecord(record.id, cancellationReason)
      await refreshRecords()
    } catch (err) {
      setError(err?.message || 'Unable to delete other claim record.')
    }
  }

  const exportClaim = async (record) => {
    if (!record?.id || exportingRecordId) return

    setExportingRecordId(record.id)
    setError('')
    const pendingTab = openPreparingPdfTab('Preparing other claim PDF...')
    try {
      await downloadOtherClaim(record, pendingTab)
    } catch (err) {
      if (pendingTab && !pendingTab.closed) pendingTab.close()
      setError(err?.message || 'Unable to export other claim PDF.')
    } finally {
      setExportingRecordId(null)
    }
  }

  const getActions = (record) => {
    const isPaid = paidStatuses.has(record.status)
    const isExporting = exportingRecordId === record.id
    return [
      {
        key: 'export-claims',
        label: isExporting ? 'Preparing PDF...' : 'Export Claims',
        hidden: record.status === 'Draft',
        disabled: Boolean(exportingRecordId),
        onClick: exportClaim,
      },
      {
        key: 'edit',
        label: 'Edit',
        disabled: isPaid,
        tooltip: isPaid ? 'Paid records cannot be changed.' : '',
        onClick: editRecord,
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: isPaid,
        tooltip: isPaid ? 'Paid records cannot be changed.' : '',
        onClick: deleteRecord,
      },
    ]
  }

  const renderCell = (record, column) => {
    if (column.key === 'claimDate') return <strong>{formatClaimDate(record)}</strong>
    if (column.key === 'claimsTotal') return <strong>{formatMoney(record.claimsTotal)}</strong>
    if (column.key === 'status') return renderStatus(record)
    return record[column.key] || '-'
  }

  const renderMobileRecordItem = (
    record,
    index,
    { pageStart = 0, rowProps: mobileRowProps = {} } = {},
  ) => {
    const { className: mobileRowClassName = '', ...mobileMainProps } = mobileRowProps
    const actionItems = getActions(record)

    return (
      <div
        className={`data-table-mobile-item records-mobile-item salary-record-mobile-card ${mobileRowClassName}`.trim()}
      >
        <div className="records-mobile-item-head">
          <div
            {...mobileMainProps}
            className={`records-mobile-item-main text-start ${mobileRowClassName}`.trim()}
          >
            <div className="d-flex align-items-center gap-2 min-w-0">
              <span className="records-mobile-row-index text-muted">#{pageStart + index + 1}</span>
              <span className="records-mobile-quote-id text-truncate">
                {formatClaimDate(record)}
              </span>
            </div>
            <div className="records-mobile-client mt-1">
              {record.claimMonth || '-'} · Claims {formatMoney(record.claimsTotal)}
            </div>
          </div>
          <div className="salary-record-mobile-card-actions">
            <DataTableStatusBadge tone={statusTone[record.status] || 'secondary'}>
              {displayStatus(record.status)}
            </DataTableStatusBadge>
            {actionItems.some((action) => !action.hidden) && (
              <DataTableActionMenu
                record={record}
                actions={actionItems}
                actionKey={`other-claim-record-${record.id || index}-mobile`}
                ariaLabel={`${formatClaimDate(record)} other claim actions`}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    statusFilter !== 'all'
      ? { key: 'status', label: `Status: ${displayStatus(statusFilter)}` }
      : null,
  ].filter(Boolean)

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'status') setStatusFilter('all')
  }

  const resetFilters = () => {
    setSearchText('')
    setStatusFilter('all')
  }

  return (
    <>
      {error && (
        <CAlert color="danger" className="py-2">
          {error}
        </CAlert>
      )}
      {exportingRecordId && (
        <CAlert color="info" className="py-2 d-flex align-items-center gap-2">
          <CSpinner size="sm" />
          Preparing other claim PDF...
        </CAlert>
      )}
      {statsVisible && (
        <StatsStrip
          items={stats}
          loading={loading}
          className="mb-3 salary-record-stats"
          layout="auto"
        />
      )}
      <DataTableRecordControls
        visible={controlsVisible}
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search claim date, month, or status"
        searchAriaLabel="Search other claim records"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={statusFilter !== 'all' ? 1 : 0}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="other-claim-records-table-tools"
        mobileToolsId="other-claim-records-mobile-table-tools"
        searchColProps={{ xs: 12, lg: 5 }}
        actionColProps={{ xs: 12, lg: 7 }}
        advancedClassName="mt-2"
        loading={loading}
      >
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="otherClaimStatusFilter">Status</CFormLabel>
          <CFormSelect
            id="otherClaimStatusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {displayStatus(status)}
              </option>
            ))}
          </CFormSelect>
        </CCol>
      </DataTableRecordControls>
      <SalaryRecordTable
        rows={filteredRecords}
        loading={loading}
        loadingMessage="Loading other claim records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="my.other-claim-records.visible-columns.v2"
        scrollStorageKey="my.other-claim-records.scroll"
        idPrefix="other-claim-record"
        emptyMessage="No other claim records found."
        exportFilename={`my-other-claim-records-${new Date().toISOString().slice(0, 10)}.csv`}
        desktopUtilityPortalId="other-claim-records-table-tools"
        mobileUtilityPortalId="other-claim-records-mobile-table-tools"
        getRowKey={(record, index) => record.id || index}
        renderCell={renderCell}
        onRowOpen={openRecord}
        getActions={getActions}
        renderMobileItem={renderMobileRecordItem}
        getSortValue={(record, field) => {
          if (field === 'status') return statusSortPriority[displayStatus(record.status)] ?? 5
          if (field === 'claimDate')
            return (
              record.submittedAt ||
              record.draftSavedAt ||
              record.claimMonthValue ||
              record.claimMonth
            )
          return record[field]
        }}
        mobileRecord={{
          title: formatClaimDate,
          meta: (record) =>
            `${record.claimMonth || '-'} · Claims ${formatMoney(record.claimsTotal)}`,
          badges: (record) => [
            {
              key: 'status',
              label: displayStatus(record.status),
              tone: statusTone[record.status] || 'secondary',
            },
          ],
          kv: (record) => [
            {
              key: 'claimsTotal',
              label: 'Claims Total',
              value: formatMoney(record.claimsTotal),
            },
          ],
        }}
        initialSortField="claimDate"
        initialSortDir="desc"
        initialSortDirByField={{
          claimDate: 'desc',
          claimsTotal: 'desc',
          status: 'asc',
        }}
        resetDeps={[searchText, statusFilter]}
      />
    </>
  )
}

export default OtherClaimRecords
