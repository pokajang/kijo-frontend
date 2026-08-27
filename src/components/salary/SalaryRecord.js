import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CAlert, CCol, CFormLabel, CFormSelect, CSpinner } from '@coreui/react'
import StatsStrip from '../stats/StatsStrip'
import { DataTableActionMenu, DataTableRecordControls, DataTableStatusBadge } from '../datatable'
import dialog from '../dialog/dialogService'
import { useAppNotifications } from '../../notifications/AppNotificationProvider'
import { formatMoney, roundMoney } from './salaryCalculations'
import {
  exportSalaryClaimsPdf,
  exportSalaryPayslipPdf,
  findSalaryRecord,
  getSalaryRecordUrlKey,
  getSalaryRecords,
  removeSalaryRecord,
  salaryRecordsChangedEvent,
} from './salaryRecordStorage'
import { SalaryRecordTable } from './SalaryTables'
import { openBlobInNewTab, openPreparingPdfTab } from './salaryFileUtils'
import { getSalaryPayslipAvailability } from './salaryPayslipAvailability'
import { getCurrentReturnTo } from '../../utils/navigation/returnTo'

const monthLabelFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
})

const statusTone = {
  Draft: 'secondary',
  Approved: 'success',
  Checked: 'primary',
  Prepared: 'info',
  Submitted: 'info',
  Pending: 'warning',
  Returned: 'warning',
  Rejected: 'danger',
  Paid: 'success',
}

const statusSortPriority = {
  Draft: -1,
  Submitted: 0,
  Prepared: 0,
  Checked: 1,
  Approved: 2,
  Returned: 3,
  Rejected: 4,
  Paid: 3,
}

const displayStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  return status
}

const dataColumns = [
  {
    key: 'salaryMonth',
    label: 'Month',
    width: '120px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.salaryMonth,
  },
  {
    key: 'basicSalary',
    label: 'Basic Salary',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.basicSalary),
  },
  {
    key: 'claimsTotal',
    label: 'Adjustments',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.claimsTotal),
  },
  {
    key: 'employeeDeductions',
    label: 'Deductions',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => `-${formatMoney(record.employeeDeductions)}`,
  },
  {
    key: 'payableSalary',
    label: 'Net Pay',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.payableSalary),
  },
  {
    key: 'status',
    label: 'Status',
    width: '105px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => displayStatus(record.status),
  },
]

const defaultVisibleColumns = {
  salaryMonth: true,
  basicSalary: true,
  claimsTotal: true,
  employeeDeductions: true,
  payableSalary: true,
  status: true,
}

const requiredColumns = new Set(['salaryMonth', 'payableSalary', 'status'])
const reviewedMutableStatuses = new Set(['Checked', 'Approved'])
const paidStatuses = new Set(['Paid'])

const formatSalaryMonthScope = (salaryMonthValue) => {
  const [year, month] = String(salaryMonthValue || '')
    .split('-')
    .map(Number)
  if (!year || !month) return ''

  return monthLabelFormatter.format(new Date(year, month - 1, 1))
}

const getSalaryRecordsScopeLabel = (records = []) => {
  const salaryMonths = records
    .map((record) => record.salaryMonthValue)
    .filter((value) => /^\d{4}-\d{2}$/.test(String(value || '')))
    .sort()

  if (!salaryMonths.length) return ''

  return formatSalaryMonthScope(salaryMonths[salaryMonths.length - 1])
}

export const downloadSalaryClaims = async (record, pendingTab = null) => {
  if (!record?.id) return

  const { blob, filename } = await exportSalaryClaimsPdf(record.id)
  openBlobInNewTab(blob, filename, pendingTab)
}

export const downloadSalaryPayslip = async (record, pendingTab = null) => {
  if (!record?.id) return

  const { blob, filename } = await exportSalaryPayslipPdf(record.id)
  openBlobInNewTab(blob, filename, pendingTab)
}

const SalaryRecord = ({
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
      setStoredRecords(await getSalaryRecords())
    } catch (err) {
      setError(err?.message || 'Unable to load salary records.')
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
        moduleKeys: ['my.salary'],
      }).catch(() => {})
    })
    window.addEventListener(salaryRecordsChangedEvent, refreshRecords)

    return () => {
      cancelled = true
      window.removeEventListener(salaryRecordsChangedEvent, refreshRecords)
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
        [record.salaryMonth, record.salaryMonthValue, record.status].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query),
        )
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [records, searchText, statusFilter])

  const stats = useMemo(() => {
    const netTakeHome = filteredRecords.reduce(
      (total, record) => total + Number(record.payableSalary || 0),
      0,
    )
    const countForStatus = (status) =>
      filteredRecords.filter((record) => record.status === status).length

    return [
      {
        key: 'draft',
        label: 'Drafts',
        value: countForStatus('Draft'),
        sublabel: 'finish or remove',
        tone: 'secondary',
        onClick: () => setStatusFilter('Draft'),
        actionTooltip: 'Show draft salary records',
      },
      {
        key: 'submitted',
        label: 'Submitted',
        value: countForStatus('Submitted'),
        sublabel: 'awaiting review',
        tone: 'info',
        onClick: () => setStatusFilter('Submitted'),
        actionTooltip: 'Show submitted salary records',
      },
      {
        key: 'rejected',
        label: 'Action Needed',
        value: countForStatus('Rejected'),
        sublabel: 'revise rejected records',
        tone: 'danger',
        onClick: () => setStatusFilter('Rejected'),
        actionTooltip: 'Show rejected salary records',
      },
      {
        key: 'net-pay',
        label: 'Net Pay',
        value: formatMoney(roundMoney(netTakeHome)),
        sublabel: 'shown records',
        tone: 'success',
      },
    ]
  }, [filteredRecords])

  const scopeLabel = useMemo(() => getSalaryRecordsScopeLabel(filteredRecords), [filteredRecords])

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

  const openSalaryRecord = (record) => {
    if (!record?.id) return

    const recordUrlKey = getSalaryRecordUrlKey(record)
    navigate(`/my/salary/records/${encodeURIComponent(recordUrlKey)}`, {
      state: { record, returnTo: returnTo || getCurrentReturnTo(location) },
    })
  }

  const loadSalaryRecordDetail = async (record) => {
    if (
      Array.isArray(record?.claims) &&
      (record.claims.length > 0 || Number(record.claimsTotal) <= 0)
    ) {
      return record
    }

    return findSalaryRecord(record.id)
  }

  const exportSalaryClaims = async (record) => {
    if (!record?.id || exportingRecordId) return

    setExportingRecordId(`claims-${record.id}`)
    setError('')
    const pendingTab = openPreparingPdfTab('Preparing salary claim PDF...')
    try {
      await downloadSalaryClaims(record, pendingTab)
    } catch (err) {
      if (pendingTab && !pendingTab.closed) pendingTab.close()
      setError(err?.message || 'Unable to export salary claims PDF.')
    } finally {
      setExportingRecordId(null)
    }
  }

  const exportSalaryPayslip = async (record) => {
    if (!record?.id || exportingRecordId) return

    setExportingRecordId(`payslip-${record.id}`)
    setError('')
    const pendingTab = openPreparingPdfTab('Preparing salary payslip PDF...')
    try {
      await downloadSalaryPayslip(record, pendingTab)
    } catch (err) {
      if (pendingTab && !pendingTab.closed) pendingTab.close()
      setError(err?.message || 'Unable to export salary payslip PDF.')
    } finally {
      setExportingRecordId(null)
    }
  }

  const editSalaryRecord = async (record) => {
    if (paidStatuses.has(record?.status)) return

    const detailRecord = await loadSalaryRecordDetail(record)
    if (!detailRecord) return
    let amendmentReason = ''
    if (reviewedMutableStatuses.has(detailRecord.status)) {
      const reason = await dialog.prompt(
        `${detailRecord.salaryMonth} has already been ${displayStatus(
          detailRecord.status,
        ).toLowerCase()}. Enter a reason to restart the workflow.`,
        {
          title: 'Edit Reviewed Salary Record',
          confirmText: 'Continue',
          required: true,
          multiline: true,
          rows: 4,
          placeholder: 'Reason for amending this salary record',
        },
      )
      if (reason === null) return
      amendmentReason = String(reason || '').trim()
      if (!amendmentReason) return
    }

    navigate('/my/salary/apply', {
      state: { editRecord: detailRecord, amendmentReason },
    })
  }

  const deleteSalaryRecord = async (record) => {
    if (!record?.id) return
    if (paidStatuses.has(record.status)) return
    let cancellationReason = ''
    if (reviewedMutableStatuses.has(record.status)) {
      const reason = await dialog.prompt(
        `${record.salaryMonth} has already been ${displayStatus(
          record.status,
        ).toLowerCase()}. Enter a reason to cancel this salary record.`,
        {
          title: 'Cancel Reviewed Salary Record',
          confirmText: 'Cancel Record',
          confirmColor: 'danger',
          required: true,
          multiline: true,
          rows: 4,
          placeholder: 'Reason for cancelling this salary record',
        },
      )
      if (reason === null) return
      cancellationReason = String(reason || '').trim()
      if (!cancellationReason) return
    } else if (
      !(await dialog.confirm(`Delete ${record.salaryMonth} salary application?`, {
        title: 'Delete Salary Record',
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    ) {
      return
    }

    try {
      await removeSalaryRecord(record.id, cancellationReason)
      await refreshRecords()
    } catch (err) {
      setError(err?.message || 'Unable to delete salary record.')
    }
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

  const renderCell = (record, column) => {
    if (column.key === 'salaryMonth') return record.salaryMonth
    if (column.key === 'basicSalary') return formatMoney(record.basicSalary)
    if (column.key === 'claimsTotal') return formatMoney(record.claimsTotal)
    if (column.key === 'employeeDeductions') return `-${formatMoney(record.employeeDeductions)}`
    if (column.key === 'payableSalary') return formatMoney(record.payableSalary)
    if (column.key === 'status') return renderStatus(record)

    return record[column.key] || '-'
  }

  const getActions = (record) => {
    const isPaid = paidStatuses.has(record.status)
    const isFinal = isPaid || record.status === 'Rejected'
    const isExportingClaims = exportingRecordId === `claims-${record.id}`
    const isExportingPayslip = exportingRecordId === `payslip-${record.id}`
    const payslipAvailability = getSalaryPayslipAvailability(record)

    return [
      {
        key: 'export-claims',
        label: isExportingClaims ? 'Preparing PDF...' : 'Export Salary',
        hidden: record.status === 'Draft',
        disabled: Boolean(exportingRecordId),
        onClick: exportSalaryClaims,
      },
      {
        key: 'export-payslip',
        label: isExportingPayslip ? 'Preparing PDF...' : 'Generate Payslip',
        disabled: Boolean(exportingRecordId) || !payslipAvailability.available,
        tooltip: payslipAvailability.available ? '' : payslipAvailability.tooltip,
        onClick: exportSalaryPayslip,
      },
      {
        key: 'edit',
        label: record.status === 'Returned' ? 'Edit & Resubmit' : 'Edit',
        disabled: isFinal,
        tooltip: isPaid
          ? 'Paid records cannot be changed.'
          : record.status === 'Rejected'
            ? 'Rejected records have a final decision.'
            : '',
        onClick: editSalaryRecord,
      },
      {
        key: 'delete',
        label: 'Delete',
        danger: true,
        disabled: isFinal,
        tooltip: isPaid
          ? 'Paid records cannot be changed.'
          : record.status === 'Rejected'
            ? 'Rejected records have a final decision.'
            : '',
        onClick: deleteSalaryRecord,
      },
    ]
  }

  const renderMobileRecordItem = (record, index, { rowProps: mobileRowProps = {} } = {}) => {
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
            <span className="records-mobile-quote-id text-truncate">
              {record.salaryMonth || '-'}
            </span>
            <div className="records-mobile-client mt-1">
              Net Pay {formatMoney(record.payableSalary)}
            </div>
          </div>
          <div className="salary-record-mobile-card-actions">
            {renderStatus(record)}
            {actionItems.some((action) => !action.hidden) && (
              <DataTableActionMenu
                record={record}
                actions={actionItems}
                actionKey={`salary-record-${record.id || index}-mobile`}
                ariaLabel={`${record.salaryMonth || 'Salary record'} actions`}
              />
            )}
          </div>
        </div>
      </div>
    )
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
          {String(exportingRecordId).startsWith('payslip-')
            ? 'Preparing salary payslip PDF...'
            : 'Preparing salary claim PDF...'}
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
        searchPlaceholder="Search month or status"
        searchAriaLabel="Search salary records"
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={statusFilter !== 'all' ? 1 : 0}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        desktopToolsId="salary-records-table-tools"
        mobileToolsId="salary-records-mobile-table-tools"
        searchColProps={{ xs: 12, lg: 5 }}
        actionColProps={{ xs: 12, lg: 7 }}
        advancedClassName="mt-2"
        loading={loading}
      >
        <CCol xs={12} md={4}>
          <CFormLabel htmlFor="salaryStatusFilter">Status</CFormLabel>
          <CFormSelect
            id="salaryStatusFilter"
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
        loadingMessage="Loading salary records..."
        dataColumns={dataColumns}
        defaultVisibleColumns={defaultVisibleColumns}
        requiredColumns={requiredColumns}
        storageKey="my.salary-records.visible-columns.v1"
        scrollStorageKey="my.salary-records.scroll"
        idPrefix="salary-record"
        emptyMessage="No salary records found."
        exportFilename={`my-salary-records-${new Date().toISOString().slice(0, 10)}.csv`}
        desktopUtilityPortalId="salary-records-table-tools"
        mobileUtilityPortalId="salary-records-mobile-table-tools"
        getRowKey={(record, index) => record.id || index}
        renderCell={renderCell}
        onRowOpen={openSalaryRecord}
        getActions={getActions}
        renderMobileItem={renderMobileRecordItem}
        mobilePaginationMode="load-more"
        mobileLoadMorePageSize={10}
        mobileLoadMoreLabel="Load more salary records"
        mobileLoadMoreSummaryLabel="salary records"
        getSortValue={(record, field) => {
          if (field === 'status') return statusSortPriority[displayStatus(record.status)] ?? 5
          if (field === 'salaryMonth') return record.salaryMonthValue || record.salaryMonth

          return record[field]
        }}
        mobileRecord={{
          title: (record) => record.salaryMonth,
          meta: (record) => `Payable ${formatMoney(record.payableSalary)}`,
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
              label: 'Adjustments',
              value: formatMoney(record.claimsTotal),
            },
            {
              key: 'deductions',
              label: 'Deductions',
              value: `-${formatMoney(record.employeeDeductions)}`,
            },
            {
              key: 'basicSalary',
              label: 'Basic Salary',
              value: formatMoney(record.basicSalary),
            },
          ],
        }}
        initialSortField="salaryMonth"
        initialSortDir="desc"
        initialSortDirByField={{
          salaryMonth: 'desc',
          payableSalary: 'desc',
          status: 'asc',
        }}
        resetDeps={[searchText, statusFilter]}
      />
    </>
  )
}

export default SalaryRecord
