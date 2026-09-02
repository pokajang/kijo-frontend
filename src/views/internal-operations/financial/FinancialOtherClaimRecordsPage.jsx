import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormLabel,
  CFormCheck,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'
import {
  DataTableActionMenu,
  DataTableCardHeader,
  DataTableRecordControls,
  DataTableStatsToggle,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../../components/datatable'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { financialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { StatsStrip } from '../../../components/stats'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import { useAuth } from '../../../auth/AuthProvider'
import { formatMoney } from '../../../components/salary/salaryCalculations'
import { SalaryRecordTable } from '../../../components/salary/SalaryTables'
import { openBlobInNewTab, openPreparingPdfTab } from '../../../components/salary/salaryFileUtils'
import {
  exportFinancialOtherClaimPdf,
  fetchFinancialOtherClaimRecords,
} from './financialOtherClaimApi'
import { submitFinancialWorkflowBulkAction } from './financialWorkflowApi'
import FinancialWorkflowBatchActions, {
  primaryWorkflowAction,
} from './FinancialWorkflowBatchActions'

const submittedStatuses = new Set(['Submitted', 'Prepared'])
const displayStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  if (status === 'Cancelled') return 'Withdrawn'
  return status
}
export const canExportFinancialOtherClaim = (record = {}) =>
  record.canViewFinancialDetails !== false && record.status !== 'Cancelled'

const getStatusTone = (status) => {
  if (displayStatus(status) === 'Approved') return 'success'
  if (status === 'Paid') return 'success'
  if (status === 'Checked') return 'primary'
  if (status === 'Returned') return 'warning'
  if (submittedStatuses.has(status)) return 'info'
  if (status === 'Rejected') return 'danger'
  return 'secondary'
}
const formatSubmittedAt = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const workflowText = (record = {}) => {
  if (record.workflow?.summary) return record.workflow.summary
  const history = Array.isArray(record.workflow?.history) ? record.workflow.history : []
  const steps = history
    .filter((entry) => entry.action !== 'submit')
    .map(
      (entry) =>
        `${entry.label || entry.action}: ${entry.statusTo || '-'}${entry.actorCode ? ` by ${entry.actorCode}` : ''}`,
    )
  if (submittedStatuses.has(record.status)) steps.push('Pending check')
  if (record.status === 'Checked') steps.push('Pending approval')
  return steps.join('\n')
}

export const claimsTotalText = (record = {}) =>
  record.canViewFinancialDetails === false || record.claimsTotal === null
    ? 'Restricted'
    : formatMoney(record.claimsTotal)

export const buildFinancialOtherClaimStats = (records = []) => {
  const submitted = records.filter((record) => submittedStatuses.has(record.status)).length
  const checked = records.filter((record) => record.status === 'Checked').length
  const approved = records.filter((record) => displayStatus(record.status) === 'Approved').length
  const rejected = records.filter((record) => record.status === 'Rejected').length

  return [
    {
      key: 'submitted',
      label: 'Submitted',
      value: submitted,
      sublabel: 'pending check',
      tone: 'info',
    },
    {
      key: 'checked',
      label: 'Checked',
      value: checked,
      sublabel: 'pending approval',
      tone: 'primary',
    },
    {
      key: 'approved',
      label: 'Approved',
      value: approved,
      sublabel: 'decision completed',
      tone: 'success',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: rejected,
      sublabel: 'needs claimant revision',
      tone: 'danger',
    },
  ]
}

const dataColumns = [
  {
    key: 'select',
    label: '',
    width: '44px',
    sortable: false,
    align: 'center',
    shrinkToFit: true,
    getExportValue: () => '',
  },
  {
    key: 'status',
    label: 'Status',
    width: '105px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    getExportValue: (record) => displayStatus(record.status),
  },
  {
    key: 'claimReference',
    label: 'Claim',
    width: '145px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => `${record.claimReference || '-'} rev ${record.revisionNo || 1}`,
  },
  {
    key: 'workflow',
    label: 'Workflow',
    width: '250px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.workflowText,
  },
  {
    key: 'staff',
    label: 'Staff',
    width: '170px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.staffLabel,
  },
  {
    key: 'claimMonth',
    label: 'Claim Month',
    width: '130px',
    sortable: true,
    sortType: 'string',
    getExportValue: (record) => record.claimMonth,
  },
  {
    key: 'submittedAt',
    label: 'Submitted',
    width: '115px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    getExportValue: (record) => record.submittedDisplay,
  },
  {
    key: 'claimsTotal',
    label: 'Claims Total',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    getExportValue: (record) => claimsTotalText(record),
  },
]
const defaultVisibleColumns = {
  select: true,
  status: true,
  claimReference: true,
  workflow: true,
  staff: true,
  claimMonth: true,
  submittedAt: true,
  claimsTotal: true,
}
const requiredColumns = new Set([
  'workflow',
  'staff',
  'claimReference',
  'claimMonth',
  'claimsTotal',
  'status',
])
const statusSortPriority = {
  Submitted: 0,
  Prepared: 0,
  Checked: 1,
  Approved: 2,
  Returned: 3,
  Paid: 3,
  Rejected: 4,
}

const FinancialOtherClaimRecordsPage = () => {
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('financial.other-claim-records')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { consumeRouteGroup } = useAppNotifications()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [recordsScope, setRecordsScope] = useState('current')
  const [reviewScope, setReviewScope] = useState('mine')
  const [selectedIds, setSelectedIds] = useState([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportingRecordId, setExportingRecordId] = useState(null)

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRecords(await fetchFinancialOtherClaimRecords(recordsScope))
    } catch (err) {
      setError(err?.message || 'Unable to load other claim records.')
    } finally {
      setLoading(false)
    }
  }, [recordsScope])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    consumeRouteGroup({
      routePrefix: '/financial/other-claim-records',
      moduleKeys: ['financial.other-claims'],
    }).catch(() => {})
  }, [consumeRouteGroup])

  const canManageArchivedClaims = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['HR', 'System Admin', 'System Administrator'].includes(role))
    : false

  const normalizedRecords = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        staffLabel:
          record.staffName && record.staffCode
            ? `${record.staffName} (${record.staffCode})`
            : record.staffName || record.staffCode || `Staff #${record.staffId}`,
        submittedDisplay: formatSubmittedAt(record.submittedAt),
        workflowText: workflowText(record),
      })),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return normalizedRecords.filter(
      (record) =>
        (!query ||
          [
            record.claimReference,
            record.staffLabel,
            record.claimMonth,
            record.claimMonthValue,
            record.status,
          ].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(query),
          )) &&
        (statusFilter === 'all' || record.status === statusFilter) &&
        (reviewScope !== 'mine' || Boolean(primaryWorkflowAction(record))),
    )
  }, [normalizedRecords, searchText, statusFilter, reviewScope])

  const selectedRecords = useMemo(
    () => filteredRecords.filter((record) => selectedIds.includes(record.id)),
    [filteredRecords, selectedIds],
  )

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredRecords.some((record) => record.id === id)),
    )
  }, [filteredRecords])

  const statusOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.status).filter(Boolean))).sort(),
    [records],
  )

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    statusFilter !== 'all'
      ? { key: 'status', label: `Status: ${displayStatus(statusFilter)}` }
      : null,
    recordsScope === 'archived' ? { key: 'scope', label: 'Archived withdrawals' } : null,
    reviewScope === 'all' ? { key: 'review-scope', label: 'All visible records' } : null,
  ].filter(Boolean)

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'status') setStatusFilter('all')
    if (key === 'scope') {
      setRecordsScope('current')
      setReviewScope('mine')
    }
    if (key === 'review-scope') setReviewScope('mine')
  }

  const resetFilters = () => {
    setSearchText('')
    setStatusFilter('all')
    setRecordsScope('current')
    setReviewScope('mine')
  }

  const statsItems = useMemo(
    () => buildFinancialOtherClaimStats(filteredRecords),
    [filteredRecords],
  )

  const exportClaim = async (record) => {
    if (!record?.id || exportingRecordId) return

    setExportingRecordId(record.id)
    setError('')
    const pendingTab = openPreparingPdfTab('Preparing other claim PDF...')
    try {
      const { blob, filename } = await exportFinancialOtherClaimPdf(record.id)
      openBlobInNewTab(blob, filename, pendingTab)
    } catch (err) {
      if (pendingTab && !pendingTab.closed) pendingTab.close()
      setError(err?.message || 'Unable to export other claim PDF.')
    } finally {
      setExportingRecordId(null)
    }
  }

  const openDetail = (record) => {
    if (!record?.id || record.canViewFinancialDetails === false) return
    navigate(`/financial/other-claim-records/${encodeURIComponent(record.id)}`, {
      state: { record },
    })
  }

  const getActions = (record) => {
    if (record.canViewFinancialDetails === false) return []

    return [
      { key: 'review-details', label: 'Review Details', onClick: openDetail },
      canExportFinancialOtherClaim(record)
        ? {
            key: 'export-claims',
            label: exportingRecordId === record.id ? 'Preparing PDF...' : 'Export Claims',
            disabled: Boolean(exportingRecordId),
            onClick: exportClaim,
          }
        : null,
    ].filter(Boolean)
  }

  const renderWorkflow = (record) => {
    const actions = Array.isArray(record.workflow?.availableActions)
      ? record.workflow.availableActions
      : []

    return (
      <div className="small text-muted" style={{ maxWidth: '250px' }}>
        {record.workflowText && (
          <div className="mb-1">
            <DataTableTextCell
              value={record.workflowText}
              maxWidth="250px"
              title="Workflow"
              mode="expandable"
              previewCharThreshold={58}
              className="small text-muted"
            />
          </div>
        )}
        {actions.length > 0 && (
          <div className="d-flex align-items-center flex-wrap gap-1">
            <CButton
              size="sm"
              color="primary"
              variant="outline"
              className="py-0 px-2"
              data-no-row-open="true"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                openDetail(record)
              }}
            >
              Review details to continue
            </CButton>
          </div>
        )}
        {record.canViewFinancialDetails === false && (
          <div className="small text-muted mt-1">
            Details restricted - not assigned to this workflow.
          </div>
        )}
      </div>
    )
  }

  const renderCell = (record, column) => {
    if (column.key === 'select') {
      const actionable = Boolean(primaryWorkflowAction(record))
      return (
        <CFormCheck
          aria-label={`Select ${record.claimReference || 'claim record'}`}
          checked={selectedIds.includes(record.id)}
          disabled={!actionable || (!selectedIds.includes(record.id) && selectedIds.length >= 50)}
          data-no-row-open="true"
          onClick={(event) => event.stopPropagation()}
          onChange={(event) =>
            setSelectedIds((current) =>
              event.target.checked
                ? [...new Set([...current, record.id])]
                : current.filter((id) => id !== record.id),
            )
          }
        />
      )
    }
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(record.status)}>
          {displayStatus(record.status)}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'workflow') return renderWorkflow(record)
    if (column.key === 'claimReference')
      return `${record.claimReference || '-'} rev ${record.revisionNo || 1}`
    if (column.key === 'staff') return record.staffLabel
    if (column.key === 'claimMonth') return record.claimMonth
    if (column.key === 'submittedAt') return record.submittedDisplay
    if (column.key === 'claimsTotal') return claimsTotalText(record)
    return record[column.key] || '-'
  }

  return (
    <>
      <ModuleNavStrip
        tabs={financialModuleTabs}
        activeTab="other-claim-records"
        ariaLabel="Financial sections"
      />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 records-page-card">
            <DataTableCardHeader title="Review Claims">
              <DataTableStatsToggle
                visible={statsVisible}
                onToggle={toggleStatsVisible}
                controlsVisible={controlsVisible}
                onControlsToggle={toggleControlsVisible}
              />
            </DataTableCardHeader>
            <CCardBody className="records-page-card-body">
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
              {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
              <FinancialWorkflowBatchActions
                selectedRecords={selectedRecords}
                onClear={() => setSelectedIds([])}
                onSubmit={async (action, batchRecords, remarks, paymentRecommendation) => {
                  await submitFinancialWorkflowBulkAction(
                    action,
                    batchRecords,
                    remarks,
                    paymentRecommendation,
                  )
                  await loadRecords()
                }}
                getRecordLabel={(record) =>
                  `${record.claimReference || 'Claim'} · ${record.staffLabel} · ${claimsTotalText(record)}`
                }
                getRecordAmount={(record) => record.claimsTotal}
              />
              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search claim reference, staff, month, or status"
                searchAriaLabel="Search other claim records"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={
                  (statusFilter !== 'all' ? 1 : 0) +
                  (recordsScope === 'archived' ? 1 : 0) +
                  (reviewScope !== 'mine' ? 1 : 0)
                }
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="financial-other-claim-records-table-tools"
                mobileToolsId="financial-other-claim-records-mobile-table-tools"
                searchColProps={{ xs: 12, lg: 5 }}
                actionColProps={{ xs: 12, lg: 7 }}
                advancedClassName="mt-2"
                loading={loading}
              >
                {canManageArchivedClaims && (
                  <CCol xs={12} md={4}>
                    <CFormLabel htmlFor="financialOtherClaimScopeFilter">Records</CFormLabel>
                    <CFormSelect
                      id="financialOtherClaimScopeFilter"
                      value={recordsScope}
                      onChange={(event) => {
                        setStatusFilter('all')
                        const nextScope = event.target.value
                        setRecordsScope(nextScope)
                        setReviewScope(nextScope === 'archived' ? 'all' : 'mine')
                      }}
                    >
                      <option value="current">Current records</option>
                      <option value="archived">Archived withdrawals</option>
                    </CFormSelect>
                  </CCol>
                )}
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="financialOtherClaimReviewScope">Worklist</CFormLabel>
                  <CFormSelect
                    id="financialOtherClaimReviewScope"
                    value={reviewScope}
                    onChange={(event) => setReviewScope(event.target.value)}
                  >
                    <option value="mine">My actionable queue</option>
                    <option value="all">All visible records</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="financialOtherClaimStatusFilter">Status</CFormLabel>
                  <CFormSelect
                    id="financialOtherClaimStatusFilter"
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
                storageKey="financial.other-claim-records.visible-columns.v1"
                scrollStorageKey="financial.other-claim-records.scroll"
                idPrefix="financial-other-claim-record"
                emptyMessage="No submitted other claim records found."
                exportFilename={`other-claim-records-${new Date().toISOString().slice(0, 10)}.csv`}
                desktopUtilityPortalId="financial-other-claim-records-table-tools"
                mobileUtilityPortalId="financial-other-claim-records-mobile-table-tools"
                getRowKey={(record, index) => record.id || index}
                renderCell={renderCell}
                getSortValue={(record, field) => {
                  if (field === 'status')
                    return statusSortPriority[displayStatus(record.status)] ?? 5
                  if (field === 'claimMonth') return record.claimMonthValue || record.claimMonth
                  if (field === 'submittedAt') return record.submittedAt || ''
                  if (field === 'staff') return record.staffLabel
                  if (field === 'workflow') return record.workflowText
                  return record[field]
                }}
                getActions={getActions}
                onRowOpen={openDetail}
                renderMobileItem={(record, index) => (
                  <div className="data-table-mobile-item records-mobile-item salary-record-mobile-card">
                    <div className="records-mobile-item-head">
                      <div className="records-mobile-item-main text-start">
                        <div className="records-mobile-quote-id text-truncate">
                          {record.claimReference || '-'} rev {record.revisionNo || 1}
                        </div>
                        <div className="records-mobile-client mt-1">
                          {record.staffLabel} · {record.claimMonth} · Claims{' '}
                          {claimsTotalText(record)}
                        </div>
                      </div>
                      <div className="salary-record-mobile-card-actions">
                        <DataTableStatusBadge tone={getStatusTone(record.status)}>
                          {displayStatus(record.status)}
                        </DataTableStatusBadge>
                        {getActions(record).length > 0 && (
                          <DataTableActionMenu
                            record={record}
                            actions={getActions(record)}
                            actionKey={`financial-other-claim-${record.id || index}`}
                            ariaLabel="Other claim actions"
                          />
                        )}
                      </div>
                    </div>
                    {renderWorkflow(record)}
                  </div>
                )}
                initialSortField="status"
                initialSortDir="asc"
                initialSortDirByField={{
                  status: 'asc',
                  claimMonth: 'desc',
                  submittedAt: 'desc',
                  claimsTotal: 'desc',
                }}
                resetDeps={[searchText, statusFilter, recordsScope, reviewScope]}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinancialOtherClaimRecordsPage
