import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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
import { formatMoney, roundMoney } from '../../../components/salary/salaryCalculations'
import { SalaryRecordTable } from '../../../components/salary/SalaryTables'
import { openBlobInNewTab, openPreparingPdfTab } from '../../../components/salary/salaryFileUtils'
import {
  exportFinancialOtherClaimPdf,
  fetchFinancialOtherClaimRecords,
  submitFinancialOtherClaimAction,
} from './financialOtherClaimApi'

const submittedStatuses = new Set(['Submitted', 'Prepared'])
const displayStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  if (status === 'Paid') return 'Approved'
  return status
}
const getStatusTone = (status) => {
  if (displayStatus(status) === 'Approved') return 'success'
  if (status === 'Checked') return 'primary'
  if (submittedStatuses.has(status)) return 'info'
  if (status === 'Rejected') return 'danger'
  return 'secondary'
}
const getWorkflowActionColor = (action = {}) => {
  if (action.tone === 'danger' || action.action === 'reject') return 'danger'
  if (action.tone === 'success' || action.action === 'approve') return 'success'
  return 'info'
}
const getPastActionLabel = (action) => {
  if (action === 'check') return 'checked'
  if (action === 'approve') return 'approved'
  if (action === 'reject') return 'rejected'
  return 'updated'
}
const formatSubmittedAt = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}
const workflowText = (record = {}) => {
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

const dataColumns = [
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
    getExportValue: (record) => formatMoney(record.claimsTotal),
  },
]
const defaultVisibleColumns = {
  status: true,
  workflow: true,
  staff: true,
  claimMonth: true,
  submittedAt: true,
  claimsTotal: true,
}
const requiredColumns = new Set(['workflow', 'staff', 'claimMonth', 'claimsTotal', 'status'])
const statusSortPriority = {
  Submitted: 0,
  Prepared: 0,
  Checked: 1,
  Approved: 2,
  Rejected: 4,
}

const FinancialOtherClaimRecordsPage = () => {
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('financial.other-claim-records')
  const { consumeRouteGroup } = useAppNotifications()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportingRecordId, setExportingRecordId] = useState(null)
  const [actionModal, setActionModal] = useState({
    visible: false,
    recordId: null,
    workflowInstanceId: null,
    action: '',
    label: '',
  })
  const [remarks, setRemarks] = useState('')
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [responseModal, setResponseModal] = useState({
    visible: false,
    title: '',
    message: '',
    color: 'info',
  })

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRecords(await fetchFinancialOtherClaimRecords())
    } catch (err) {
      setError(err?.message || 'Unable to load other claim records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    consumeRouteGroup({
      routePrefix: '/financial/other-claim-records',
      moduleKeys: ['financial.other-claims'],
    }).catch(() => {})
  }, [consumeRouteGroup])

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
          [record.staffLabel, record.claimMonth, record.claimMonthValue, record.status].some(
            (value) =>
              String(value || '')
                .toLowerCase()
                .includes(query),
          )) &&
        (statusFilter === 'all' || record.status === statusFilter),
    )
  }, [normalizedRecords, searchText, statusFilter])

  const statusOptions = useMemo(
    () => Array.from(new Set(records.map((record) => record.status).filter(Boolean))).sort(),
    [records],
  )

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

  const statsItems = useMemo(() => {
    const submitted = filteredRecords.filter((record) =>
      submittedStatuses.has(record.status),
    ).length
    const checked = filteredRecords.filter((record) => record.status === 'Checked').length
    const approved = filteredRecords.filter(
      (record) => displayStatus(record.status) === 'Approved',
    ).length
    const claimsTotal = filteredRecords.reduce(
      (sum, record) => sum + Number(record.claimsTotal || 0),
      0,
    )
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
        sublabel: 'finalized',
        tone: 'success',
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

  const openActionModal = (record, action) => {
    setRemarks('')
    setActionModal({
      visible: true,
      recordId: record.id,
      workflowInstanceId: record.workflow?.instanceId || null,
      action: action.action,
      label: action.label || action.action,
    })
  }

  const closeActionModal = (force = false) => {
    if (isSubmittingAction && !force) return
    setActionModal({
      visible: false,
      recordId: null,
      workflowInstanceId: null,
      action: '',
      label: '',
    })
    setRemarks('')
  }

  const submitAction = async () => {
    if (!actionModal.recordId || !actionModal.action) return

    setIsSubmittingAction(true)
    try {
      const updatedRecord = await submitFinancialOtherClaimAction(
        actionModal.recordId,
        actionModal.action,
        remarks,
        actionModal.workflowInstanceId,
      )
      if (updatedRecord) {
        setRecords((currentRecords) =>
          currentRecords.map((record) =>
            record.id === updatedRecord.id ? { ...record, ...updatedRecord } : record,
          ),
        )
      } else {
        await loadRecords()
      }
      closeActionModal(true)
      setResponseModal({
        visible: true,
        title: 'Action Completed',
        message: `Other claim record successfully ${getPastActionLabel(actionModal.action)}.`,
        color: 'success',
      })
    } catch (err) {
      closeActionModal(true)
      setResponseModal({
        visible: true,
        title: 'Action Failed',
        message: err?.message || `Failed to ${actionModal.action} other claim record.`,
        color: 'danger',
      })
    } finally {
      setIsSubmittingAction(false)
    }
  }

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

  const getActions = (record) => [
    {
      key: 'export-claims',
      label: exportingRecordId === record.id ? 'Preparing PDF...' : 'Export Claims',
      disabled: Boolean(exportingRecordId),
      onClick: exportClaim,
    },
  ]

  const renderWorkflow = (record) => {
    const actions = Array.isArray(record.workflow?.availableActions)
      ? record.workflow.availableActions
      : []
    const openPendingAction = (event, action) => {
      event.stopPropagation()
      openActionModal(record, action)
    }

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
        <div className="d-flex align-items-center flex-wrap gap-1">
          {actions.map((action) => (
            <CButton
              key={action.action}
              size="sm"
              color={getWorkflowActionColor(action)}
              variant="outline"
              className="py-0 px-2"
              data-no-row-open="true"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => openPendingAction(event, action)}
            >
              {action.label}
            </CButton>
          ))}
        </div>
      </div>
    )
  }

  const renderCell = (record, column) => {
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(record.status)}>
          {displayStatus(record.status)}
        </DataTableStatusBadge>
      )
    }
    if (column.key === 'workflow') return renderWorkflow(record)
    if (column.key === 'staff') return record.staffLabel
    if (column.key === 'claimMonth') return <strong>{record.claimMonth}</strong>
    if (column.key === 'submittedAt') return record.submittedDisplay
    if (column.key === 'claimsTotal') return <strong>{formatMoney(record.claimsTotal)}</strong>
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
            <DataTableCardHeader title="Other Claim Records">
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
              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search staff, claim month, or status"
                searchAriaLabel="Search other claim records"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={statusFilter !== 'all' ? 1 : 0}
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
                renderMobileItem={(record, index) => (
                  <div className="data-table-mobile-item records-mobile-item salary-record-mobile-card">
                    <div className="records-mobile-item-head">
                      <div className="records-mobile-item-main text-start">
                        <div className="records-mobile-quote-id text-truncate">
                          {record.staffLabel}
                        </div>
                        <div className="records-mobile-client mt-1">
                          {record.claimMonth} | Claims {formatMoney(record.claimsTotal)}
                        </div>
                      </div>
                      <div className="salary-record-mobile-card-actions">
                        <DataTableStatusBadge tone={getStatusTone(record.status)}>
                          {displayStatus(record.status)}
                        </DataTableStatusBadge>
                        <DataTableActionMenu
                          record={record}
                          actions={getActions(record)}
                          actionKey={`financial-other-claim-${record.id || index}`}
                          ariaLabel="Other claim actions"
                        />
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
                resetDeps={[records, searchText, statusFilter]}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
      <CModal
        visible={actionModal.visible}
        onClose={closeActionModal}
        alignment="center"
        backdrop="static"
      >
        <CModalHeader>
          <CModalTitle>{actionModal.label} Other Claim</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">
            Confirm to {actionModal.label.toLowerCase()} this other claim record and provide
            remarks.
          </p>
          <CFormTextarea
            rows={4}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Enter remarks"
            disabled={isSubmittingAction}
          />
        </CModalBody>
        <CModalFooter>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={closeActionModal}
            disabled={isSubmittingAction}
          >
            Cancel
          </CButton>
          <CButton
            color={getWorkflowActionColor({ action: actionModal.action })}
            size="sm"
            onClick={submitAction}
            disabled={isSubmittingAction}
          >
            {isSubmittingAction ? 'Submitting...' : actionModal.label || 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
      <CModal
        visible={responseModal.visible}
        onClose={() => setResponseModal((prev) => ({ ...prev, visible: false }))}
        alignment="center"
      >
        <CModalHeader>
          <CModalTitle>{responseModal.title}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color={responseModal.color} className="mb-0">
            {responseModal.message}
          </CAlert>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="primary"
            size="sm"
            onClick={() => setResponseModal((prev) => ({ ...prev, visible: false }))}
          >
            OK
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default FinancialOtherClaimRecordsPage
