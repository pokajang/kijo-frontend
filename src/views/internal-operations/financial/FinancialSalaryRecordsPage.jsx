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
  DataTableRecordControls,
  DataTableCardHeader,
  DataTableStatsToggle,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../../components/datatable'
import { useDataTableStatsVisibility } from '../../../hooks/datatable'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { financialModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { StatsStrip } from '../../../components/stats'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import { formatCount, formatMoney, sumBy } from '../../../utils/stats/formatStats'
import {
  exportFinancialSalaryClaimsPdf,
  exportFinancialSalaryPayslipPdf,
  fetchFinancialSalaryRecords,
  submitFinancialSalaryAction,
} from './financialSalaryApi'
import { SalaryRecordTable } from '../../../components/salary/SalaryTables'
import { openBlobInNewTab, openPreparingPdfTab } from '../../../components/salary/salaryFileUtils'
import { getSalaryPayslipAvailability } from '../../../components/salary/salaryPayslipAvailability'

const submittedStatuses = new Set(['Submitted', 'Prepared'])
const displayStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  if (status === 'Paid') return 'Approved'
  return status
}

const dataColumns = [
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
  {
    key: 'workflow',
    label: 'Workflow',
    width: '250px',
    sortable: true,
    sortType: 'string',
    textMode: 'expandable',
    cellMaxWidth: '250px',
    previewCharThreshold: 42,
    getExportValue: (record) => record.workflow,
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
    key: 'salaryMonth',
    label: 'Month',
    width: '105px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
    getExportValue: (record) => record.salaryMonth,
  },
  {
    key: 'submittedAt',
    label: 'Submitted',
    width: '115px',
    sortable: true,
    sortType: 'date',
    align: 'center',
    shrinkToFit: true,
    getExportValue: (record) => record.submittedDisplay,
  },
  {
    key: 'basicSalary',
    label: 'Basic Salary',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.basicSalary),
  },
  {
    key: 'claimsTotal',
    label: 'Claims Total',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.claimsTotal),
  },
  {
    key: 'employeeDeductions',
    label: 'Deductions',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => `-${formatMoney(record.employeeDeductions)}`,
  },
  {
    key: 'payableSalary',
    label: 'Payable Salary',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatMoney(record.payableSalary),
  },
]

const defaultVisibleColumns = {
  status: true,
  workflow: true,
  staff: true,
  salaryMonth: true,
  submittedAt: true,
  basicSalary: true,
  claimsTotal: true,
  employeeDeductions: true,
  payableSalary: true,
}

const requiredColumns = new Set(['workflow', 'staff', 'salaryMonth', 'payableSalary', 'status'])

const getStatusTone = (status) => {
  if (displayStatus(status) === 'Approved') return 'success'
  if (status === 'Checked') return 'primary'
  if (submittedStatuses.has(status)) return 'info'
  if (status === 'Draft') return 'secondary'
  if (status === 'Rejected') return 'danger'
  return 'warning'
}

const getStatusSortPriority = (status) => {
  if (submittedStatuses.has(status)) return 0
  if (status === 'Checked') return 1
  if (displayStatus(status) === 'Approved') return 2
  if (status === 'Rejected') return 4
  return 3
}

const formatSubmittedAt = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)

  return date.toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const buildWorkflowStep = ({ label, person, at, status, remarks }) =>
  [
    `${label}: ${status || '-'}`,
    person ? `by ${person}` : '',
    at ? `at ${formatSubmittedAt(at)}` : '',
    remarks ? `Remarks: ${remarks}` : '',
  ]
    .filter(Boolean)
    .join(' ')

const getSalaryWorkflowHistory = (record = {}) => {
  if (Array.isArray(record.workflowPayload?.history) && record.workflowPayload.history.length > 0) {
    return record.workflowPayload.history
      .filter((entry) => entry.action !== 'submit')
      .map((entry) =>
        buildWorkflowStep({
          label: entry.label || entry.action,
          person: entry.actorCode
            ? `${entry.actorName || 'Staff'} (${entry.actorCode})`
            : entry.actorName || '',
          at: entry.actedAt,
          status: entry.statusTo,
          remarks: entry.remarks,
        }),
      )
  }

  const checker = record.checkerCode
    ? `${record.checkerName || 'Checker'} (${record.checkerCode})`
    : ''
  const approver = record.approverCode
    ? `${record.approverName || 'Approver'} (${record.approverCode})`
    : ''

  return [
    record.checkedBy
      ? buildWorkflowStep({
          label: 'Check',
          person: checker,
          at: record.checkedAt,
          status: record.checkedStatus,
          remarks: record.checkedRemarks,
        })
      : '',
    record.approvedBy
      ? buildWorkflowStep({
          label: 'Approval',
          person: approver,
          at: record.approvedAt,
          status: record.approvedStatus,
          remarks: record.approvedRemarks,
        })
      : '',
  ].filter(Boolean)
}

const getSalaryWorkflowText = (record = {}) => {
  const steps = getSalaryWorkflowHistory(record)

  if (submittedStatuses.has(record.status)) {
    steps.push('Pending check')
  } else if (record.status === 'Checked') {
    steps.push('Pending approval')
  }

  return steps.join('\n')
}

const getActionLabel = (action) => {
  if (action === 'check') return 'Check'
  if (action === 'approve') return 'Approve'
  if (action === 'reject') return 'Reject'
  return 'Action'
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

const getLegacyWorkflowPayload = (record = {}) => {
  if (submittedStatuses.has(record.status)) {
    return {
      instanceId: null,
      availableActions: [
        record.checkedBy
          ? { action: 'approve', label: 'Approve', tone: 'success' }
          : { action: 'check', label: 'Check', tone: 'info' },
        { action: 'reject', label: 'Reject', tone: 'danger' },
      ],
      history: [],
      currentStepLabel: record.checkedBy ? 'Approve' : 'Check',
    }
  }
  if (record.status === 'Checked') {
    return {
      instanceId: null,
      availableActions: [
        { action: 'approve', label: 'Approve', tone: 'success' },
        { action: 'reject', label: 'Reject', tone: 'danger' },
      ],
      history: [],
      currentStepLabel: 'Approve',
    }
  }

  return null
}

const FinancialSalaryRecordsPage = () => {
  const { statsVisible, toggleStatsVisible, controlsVisible, toggleControlsVisible } =
    useDataTableStatsVisibility('financial.salary-records')
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
      const rows = await fetchFinancialSalaryRecords()
      setRecords(rows)
    } catch (err) {
      setError(err?.message || 'Unable to load salary records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    consumeRouteGroup({
      routePrefix: '/financial/salary-records',
      moduleKeys: ['financial.salary'],
    }).catch(() => {})
  }, [consumeRouteGroup])

  const normalizedRecords = useMemo(
    () =>
      records.map((record) => {
        const workflowPayload = record.workflow || getLegacyWorkflowPayload(record)
        const normalizedRecord = {
          ...record,
          workflowPayload,
          staffLabel:
            record.staffName && record.staffCode
              ? `${record.staffName} (${record.staffCode})`
              : record.staffName || record.staffCode || `Staff #${record.staffId || '-'}`,
          submittedDisplay: formatSubmittedAt(record.submittedAt),
        }

        return {
          ...normalizedRecord,
          workflowSteps: getSalaryWorkflowHistory(normalizedRecord),
          workflow: getSalaryWorkflowText(normalizedRecord),
        }
      }),
    [records],
  )

  const statusOptions = useMemo(
    () =>
      Array.from(new Set(normalizedRecords.map((record) => record.status).filter(Boolean))).sort(),
    [normalizedRecords],
  )

  const filteredRecords = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return normalizedRecords.filter((record) => {
      const matchesSearch =
        !query ||
        [
          record.staffName,
          record.staffCode,
          record.salaryMonth,
          record.salaryMonthValue,
          record.status,
          record.workflow,
        ].some((value) =>
          String(value || '')
            .toLowerCase()
            .includes(query),
        )
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [normalizedRecords, searchText, statusFilter])

  const statsItems = useMemo(
    () => [
      {
        key: 'pending-check',
        label: 'Pending Check',
        value: formatCount(
          filteredRecords.filter((record) => submittedStatuses.has(record.status)).length,
        ),
        tone: 'info',
      },
      {
        key: 'pending-approval',
        label: 'Pending Approval',
        value: formatCount(filteredRecords.filter((record) => record.status === 'Checked').length),
        tone: 'primary',
      },
      {
        key: 'approved',
        label: 'Approved',
        value: formatCount(filteredRecords.filter((record) => record.status === 'Approved').length),
        tone: 'success',
      },
      {
        key: 'payable',
        label: 'Total Payable',
        value: formatMoney(sumBy(filteredRecords, (record) => record.payableSalary)),
        tone: 'warning',
      },
    ],
    [filteredRecords],
  )

  const activeChips = [
    searchText.trim() ? { key: 'search', label: `Search: ${searchText.trim()}` } : null,
    statusFilter !== 'all'
      ? { key: 'status', label: `Status: ${displayStatus(statusFilter)}` }
      : null,
  ].filter(Boolean)

  const resetFilters = () => {
    setSearchText('')
    setStatusFilter('all')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'status') setStatusFilter('all')
  }

  const openActionModal = (record, action) => {
    const actionKey = typeof action === 'string' ? action : action?.action
    const label = (typeof action === 'object' && action?.label) || getActionLabel(actionKey)
    setActionModal({
      visible: true,
      recordId: record?.id || record,
      workflowInstanceId: record?.workflowPayload?.instanceId || null,
      action: actionKey,
      label,
    })
    setRemarks('')
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

  const handleActionSubmit = async () => {
    if (!actionModal.recordId || !actionModal.action) return

    try {
      setIsSubmittingAction(true)
      const updatedRecord = await submitFinancialSalaryAction(
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
        message: `Salary record successfully ${getPastActionLabel(actionModal.action)}.`,
        color: 'success',
      })
    } catch (err) {
      closeActionModal(true)
      setResponseModal({
        visible: true,
        title: 'Action Failed',
        message: err?.message || `Failed to ${actionModal.action} salary record.`,
        color: 'danger',
      })
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const renderWorkflowCell = (record) => {
    const availableActions = Array.isArray(record.workflowPayload?.availableActions)
      ? record.workflowPayload.availableActions
      : []
    const primaryAction = availableActions.find((action) => action.action !== 'reject')
    const rejectAction = availableActions.find((action) => action.action === 'reject')
    const workflowActions = [primaryAction, rejectAction].filter(Boolean)
    const isActionable = workflowActions.length > 0

    if (!isActionable) {
      const steps = record.workflowSteps?.length ? record.workflowSteps : [record.workflow]

      return steps.length ? (
        <div className="d-flex flex-column gap-1" style={{ maxWidth: '250px' }}>
          {steps.map((step, index) => (
            <DataTableTextCell
              key={`${record.id || 'salary-workflow'}-${index}`}
              value={step}
              maxWidth="250px"
              title="Workflow"
              mode="expandable"
              previewCharThreshold={58}
              className="small text-muted"
            />
          ))}
        </div>
      ) : (
        '-'
      )
    }

    const openPendingAction = (event, action) => {
      event.stopPropagation()
      openActionModal(record, action)
    }

    return (
      <div className="small text-muted" style={{ maxWidth: '250px' }}>
        {record.workflowSteps?.length > 0 && (
          <div className="mb-1">
            <DataTableTextCell
              value={record.workflowSteps.join('\n')}
              maxWidth="250px"
              title="Workflow"
              mode="expandable"
              previewCharThreshold={44}
              className="small text-muted"
            />
          </div>
        )}
        <div className="d-flex align-items-center flex-wrap gap-1">
          {workflowActions.map((action) => (
            <CButton
              key={action.action}
              color={getWorkflowActionColor(action)}
              size="sm"
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
    if (column.key === 'staff') {
      return <DataTableTextCell value={record.staffLabel} maxWidth="170px" title="Staff" />
    }
    if (column.key === 'workflow') return renderWorkflowCell(record)
    if (column.key === 'submittedAt') return record.submittedDisplay
    if (column.key === 'basicSalary') return formatMoney(record.basicSalary)
    if (column.key === 'claimsTotal') return formatMoney(record.claimsTotal)
    if (column.key === 'employeeDeductions') return `-${formatMoney(record.employeeDeductions)}`
    if (column.key === 'payableSalary') return <strong>{formatMoney(record.payableSalary)}</strong>
    if (column.key === 'status') {
      return (
        <DataTableStatusBadge tone={getStatusTone(record.status)}>
          {displayStatus(record.status)}
        </DataTableStatusBadge>
      )
    }

    return record[column.key] || '-'
  }

  const getActions = (record) => {
    const isExportingClaims = exportingRecordId === `claims-${record.id}`
    const isExportingPayslip = exportingRecordId === `payslip-${record.id}`
    const payslipAvailability = getSalaryPayslipAvailability(record)

    return [
      {
        key: 'export-claims',
        label: isExportingClaims ? 'Preparing PDF...' : 'Export Claims',
        disabled: Boolean(exportingRecordId),
        onClick: async () => {
          if (exportingRecordId) return

          setExportingRecordId(`claims-${record.id}`)
          setError('')
          const pendingTab = openPreparingPdfTab('Preparing salary claim PDF...')
          try {
            const { blob, filename } = await exportFinancialSalaryClaimsPdf(record.id)
            openBlobInNewTab(blob, filename, pendingTab)
          } catch (err) {
            if (pendingTab && !pendingTab.closed) pendingTab.close()
            setError(err?.message || 'Unable to export salary claims PDF.')
          } finally {
            setExportingRecordId(null)
          }
        },
      },
      {
        key: 'export-payslip',
        label: isExportingPayslip ? 'Preparing PDF...' : 'Export Payslip',
        disabled: Boolean(exportingRecordId) || !payslipAvailability.available,
        tooltip: payslipAvailability.available ? '' : payslipAvailability.tooltip,
        onClick: async () => {
          if (exportingRecordId || !payslipAvailability.available) return

          setExportingRecordId(`payslip-${record.id}`)
          setError('')
          const pendingTab = openPreparingPdfTab('Preparing salary payslip PDF...')
          try {
            const { blob, filename } = await exportFinancialSalaryPayslipPdf(record.id)
            openBlobInNewTab(blob, filename, pendingTab)
          } catch (err) {
            if (pendingTab && !pendingTab.closed) pendingTab.close()
            setError(err?.message || 'Unable to export salary payslip PDF.')
          } finally {
            setExportingRecordId(null)
          }
        },
      },
    ]
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
                {record.staffLabel || '-'}
              </span>
            </div>
            {record.salaryMonth && (
              <div className="records-mobile-subtitle mt-1 text-truncate">{record.salaryMonth}</div>
            )}
            <div className="records-mobile-client mt-1">
              Payable {formatMoney(record.payableSalary)}
            </div>
          </div>
          <div className="salary-record-mobile-card-actions">
            <DataTableStatusBadge tone={getStatusTone(record.status)}>
              {displayStatus(record.status)}
            </DataTableStatusBadge>
            {actionItems.some((action) => !action.hidden) && (
              <DataTableActionMenu
                record={record}
                actions={actionItems}
                actionKey={`financial-salary-record-${record.id || index}-mobile`}
                ariaLabel={`${record.staffLabel || 'Salary record'} actions`}
              />
            )}
          </div>
        </div>
        <div className="records-mobile-kv-grid mt-2">
          <div className="records-mobile-kv">
            <span className="records-mobile-k">Workflow</span>
            <span className="records-mobile-v">{record.workflow || '-'}</span>
          </div>
          <div className="records-mobile-kv">
            <span className="records-mobile-k">Claims</span>
            <span className="records-mobile-v">{formatMoney(record.claimsTotal)}</span>
          </div>
          <div className="records-mobile-kv">
            <span className="records-mobile-k">Deductions</span>
            <span className="records-mobile-v">-{formatMoney(record.employeeDeductions)}</span>
          </div>
          <div className="records-mobile-kv">
            <span className="records-mobile-k">Basic Salary</span>
            <span className="records-mobile-v">{formatMoney(record.basicSalary)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <ModuleNavStrip
        tabs={financialModuleTabs}
        activeTab="salary-records"
        ariaLabel="Financial sections"
      />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 records-page-card">
            <DataTableCardHeader title="Salary Records">
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
                  {String(exportingRecordId).startsWith('payslip-')
                    ? 'Preparing salary payslip PDF...'
                    : 'Preparing salary claim PDF...'}
                </CAlert>
              )}
              {statsVisible && <StatsStrip items={statsItems} loading={loading} />}
              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search staff, month, or status"
                searchAriaLabel="Search salary records"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={statusFilter !== 'all' ? 1 : 0}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="financial-salary-records-table-tools"
                mobileToolsId="financial-salary-records-mobile-table-tools"
                searchColProps={{ xs: 12, lg: 5 }}
                actionColProps={{ xs: 12, lg: 7 }}
                advancedClassName="mt-2"
                loading={loading}
              >
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="financialSalaryStatusFilter">Status</CFormLabel>
                  <CFormSelect
                    id="financialSalaryStatusFilter"
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
                storageKey="financial.salary-records.visible-columns.v2"
                idPrefix="financial-salary-record"
                emptyMessage="No submitted salary records found."
                exportFilename={`salary-records-${new Date().toISOString().slice(0, 10)}.csv`}
                desktopUtilityPortalId="financial-salary-records-table-tools"
                mobileUtilityPortalId="financial-salary-records-mobile-table-tools"
                getRowKey={(record, index) => record.id || index}
                renderCell={renderCell}
                getActions={getActions}
                renderMobileItem={renderMobileRecordItem}
                getSortValue={(record, field) => {
                  if (field === 'status') return getStatusSortPriority(record.status)
                  if (field === 'staff') return record.staffLabel
                  if (field === 'salaryMonth') return record.salaryMonthValue
                  if (field === 'submittedAt') return record.submittedAt
                  if (field === 'workflow') return record.workflow

                  return record[field]
                }}
                getMobileTitle={(record) => record.staffLabel}
                getMobileSubtitle={(record) => record.salaryMonth}
                getMobileMeta={(record) =>
                  `${formatMoney(record.payableSalary)} | Claims ${formatMoney(record.claimsTotal)}`
                }
                getMobileStatus={(record) => displayStatus(record.status)}
                getMobileStatusTone={(record) => getStatusTone(record.status)}
                mobileFieldKeys={{
                  title: 'staff',
                  subtitle: 'salaryMonth',
                  meta: ['payableSalary', 'claimsTotal'],
                  status: 'status',
                }}
                mobileRecord={{
                  title: (record) => record.staffLabel,
                  subtitle: (record) => record.salaryMonth,
                  meta: (record) =>
                    `Payable ${formatMoney(record.payableSalary)} | ${record.submittedDisplay}`,
                  badges: (record) => [
                    {
                      key: 'status',
                      label: displayStatus(record.status),
                      tone: getStatusTone(record.status),
                    },
                  ],
                  kv: (record) => [
                    {
                      key: 'workflow',
                      label: 'Workflow',
                      value: record.workflow || '-',
                    },
                    {
                      key: 'claimsTotal',
                      label: 'Claims',
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
                initialSortField="status"
                initialSortDir="asc"
                initialSortDirByField={{
                  status: 'asc',
                  salaryMonth: 'desc',
                  submittedAt: 'desc',
                  payableSalary: 'desc',
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
          <CModalTitle>{actionModal.label} Salary</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <p className="mb-3">
            Confirm to {actionModal.label.toLowerCase()} this salary record and provide remarks.
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
            onClick={handleActionSubmit}
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

export default FinancialSalaryRecordsPage
