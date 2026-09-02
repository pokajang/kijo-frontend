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
} from './financialSalaryApi'
import { submitFinancialWorkflowBulkAction } from './financialWorkflowApi'
import { SalaryRecordTable } from '../../../components/salary/SalaryTables'
import { openBlobInNewTab, openPreparingPdfTab } from '../../../components/salary/salaryFileUtils'
import { getSalaryPayslipAvailability } from '../../../components/salary/salaryPayslipAvailability'
import FinancialWorkflowBatchActions, {
  primaryWorkflowAction,
} from './FinancialWorkflowBatchActions'

const submittedStatuses = new Set(['Submitted', 'Prepared'])
const displayStatus = (status) => {
  if (status === 'Prepared') return 'Submitted'
  if (status === 'Paid') return 'Approved'
  return status
}

const restrictedMoneyLabel = '-'
const canViewSalaryDetails = (record = {}) =>
  record.canViewSalaryDetails !== false && !record.salaryRestricted
const canViewSalaryAmount = (record = {}) =>
  canViewSalaryDetails(record) && record.canViewFinancialAmounts !== false
const formatSalaryMoney = (record, value) =>
  canViewSalaryAmount(record) ? formatMoney(value || 0) : restrictedMoneyLabel
const numericSalaryValue = (record, value) =>
  canViewSalaryAmount(record) ? Number(value || 0) : null

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
    getExportValue: (record) => formatSalaryMoney(record, record.basicSalary),
  },
  {
    key: 'claimsTotal',
    label: 'Claims Total',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatSalaryMoney(record, record.claimsTotal),
  },
  {
    key: 'employeeDeductions',
    label: 'Deductions',
    width: '110px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) =>
      canViewSalaryAmount(record)
        ? `-${formatMoney(record.employeeDeductions || 0)}`
        : restrictedMoneyLabel,
  },
  {
    key: 'payableSalary',
    label: 'Net Pay',
    width: '120px',
    sortable: true,
    sortType: 'number',
    align: 'right',
    shrinkToFit: true,
    getExportValue: (record) => formatSalaryMoney(record, record.payableSalary),
  },
]

const defaultVisibleColumns = {
  select: true,
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
  if (status === 'Returned') return 'warning'
  if (submittedStatuses.has(status)) return 'info'
  if (status === 'Draft') return 'secondary'
  if (status === 'Rejected') return 'danger'
  return 'warning'
}

const getStatusSortPriority = (status) => {
  if (submittedStatuses.has(status)) return 0
  if (status === 'Checked') return 1
  if (displayStatus(status) === 'Approved') return 2
  if (status === 'Returned') return 3
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

const getLegacyWorkflowPayload = (record = {}) => {
  if (submittedStatuses.has(record.status)) {
    return {
      instanceId: null,
      availableActions: [
        record.checkedBy
          ? { action: 'approve', label: 'Approve', tone: 'success' }
          : { action: 'check', label: 'Check', tone: 'info' },
        { action: 'return', label: 'Return for changes', tone: 'warning' },
        ...(record.checkedBy ? [{ action: 'reject', label: 'Reject', tone: 'danger' }] : []),
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
        { action: 'return', label: 'Return for changes', tone: 'warning' },
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
  const navigate = useNavigate()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [reviewScope, setReviewScope] = useState('mine')
  const [salaryMonthFilter, setSalaryMonthFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState([])
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [exportingRecordId, setExportingRecordId] = useState(null)

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
          staffLabel: record.salaryRestricted
            ? 'Restricted'
            : record.staffName && record.staffCode
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
      const matchesMonth =
        salaryMonthFilter === 'all' || record.salaryMonthValue === salaryMonthFilter
      const matchesScope = reviewScope !== 'mine' || Boolean(primaryWorkflowAction(record))

      return matchesSearch && matchesStatus && matchesMonth && matchesScope
    })
  }, [normalizedRecords, searchText, statusFilter, salaryMonthFilter, reviewScope])

  const salaryMonthOptions = useMemo(
    () =>
      Array.from(
        new Map(
          normalizedRecords
            .filter((record) => record.salaryMonthValue)
            .map((record) => [record.salaryMonthValue, record.salaryMonth]),
        ),
      ).map(([value, label]) => ({ value, label })),
    [normalizedRecords],
  )

  const selectedRecords = useMemo(
    () => filteredRecords.filter((record) => selectedIds.includes(record.id)),
    [filteredRecords, selectedIds],
  )

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredRecords.some((record) => record.id === id)),
    )
  }, [filteredRecords])

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
        label: filteredRecords.some(canViewSalaryAmount) ? 'Visible Payable' : 'Financial totals',
        value: filteredRecords.some(canViewSalaryAmount)
          ? formatMoney(
              sumBy(filteredRecords, (record) =>
                canViewSalaryAmount(record) ? record.payableSalary || 0 : 0,
              ),
            )
          : 'Restricted',
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
    salaryMonthFilter !== 'all'
      ? {
          key: 'month',
          label: `Month: ${salaryMonthOptions.find((item) => item.value === salaryMonthFilter)?.label || salaryMonthFilter}`,
        }
      : null,
    reviewScope === 'all' ? { key: 'review-scope', label: 'All visible records' } : null,
  ].filter(Boolean)

  const resetFilters = () => {
    setSearchText('')
    setStatusFilter('all')
    setSalaryMonthFilter('all')
    setReviewScope('mine')
  }

  const clearChip = (key) => {
    if (key === 'search') setSearchText('')
    if (key === 'status') setStatusFilter('all')
    if (key === 'month') setSalaryMonthFilter('all')
    if (key === 'review-scope') setReviewScope('mine')
  }

  const openDetail = (record) => {
    if (!record?.id || !canViewSalaryDetails(record)) return
    navigate(`/financial/salary-records/${encodeURIComponent(record.id)}`, { state: { record } })
  }

  const renderWorkflowCell = (record) => {
    const availableActions = Array.isArray(record.workflowPayload?.availableActions)
      ? record.workflowPayload.availableActions
      : []
    const isActionable = availableActions.length > 0

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

    const openPendingAction = (event) => {
      event.stopPropagation()
      openDetail(record)
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
          <CButton
            color="primary"
            size="sm"
            variant="outline"
            className="py-0 px-2"
            data-no-row-open="true"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={openPendingAction}
          >
            Review details to continue
          </CButton>
        </div>
      </div>
    )
  }

  const renderCell = (record, column) => {
    if (column.key === 'select') {
      const actionable = Boolean(primaryWorkflowAction(record))
      return (
        <CFormCheck
          aria-label={`Select ${record.salaryMonth || 'salary record'}`}
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
    if (column.key === 'staff') {
      return <DataTableTextCell value={record.staffLabel} maxWidth="170px" title="Staff" />
    }
    if (column.key === 'workflow') return renderWorkflowCell(record)
    if (column.key === 'submittedAt') return record.submittedDisplay
    if (column.key === 'basicSalary') return formatSalaryMoney(record, record.basicSalary)
    if (column.key === 'claimsTotal') return formatSalaryMoney(record, record.claimsTotal)
    if (column.key === 'employeeDeductions') {
      return canViewSalaryAmount(record)
        ? `-${formatMoney(record.employeeDeductions || 0)}`
        : restrictedMoneyLabel
    }
    if (column.key === 'payableSalary') {
      return canViewSalaryAmount(record) ? (
        <strong>{formatMoney(record.payableSalary || 0)}</strong>
      ) : (
        restrictedMoneyLabel
      )
    }
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
    if (!canViewSalaryDetails(record)) {
      return []
    }

    const isExportingClaims = exportingRecordId === `claims-${record.id}`
    const isExportingPayslip = exportingRecordId === `payslip-${record.id}`
    const payslipAvailability = getSalaryPayslipAvailability(record)

    const actions = [
      {
        key: 'review-details',
        label: 'Review Details',
        onClick: openDetail,
      },
    ]

    if (!canViewSalaryAmount(record)) {
      return actions
    }

    return [
      ...actions,
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

  const renderActions = (record, actionKey) => {
    if (!canViewSalaryDetails(record)) return null

    return (
      <DataTableActionMenu record={record} actions={getActions(record)} actionKey={actionKey} />
    )
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
              Payable {formatSalaryMoney(record, record.payableSalary)}
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
            <span className="records-mobile-v">
              {formatSalaryMoney(record, record.claimsTotal)}
            </span>
          </div>
          <div className="records-mobile-kv">
            <span className="records-mobile-k">Deductions</span>
            <span className="records-mobile-v">
              {canViewSalaryAmount(record)
                ? `-${formatMoney(record.employeeDeductions || 0)}`
                : restrictedMoneyLabel}
            </span>
          </div>
          <div className="records-mobile-kv">
            <span className="records-mobile-k">Basic Salary</span>
            <span className="records-mobile-v">
              {formatSalaryMoney(record, record.basicSalary)}
            </span>
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
            <DataTableCardHeader title="Review Salary">
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
                  `${record.salaryMonth || 'Salary'} · ${record.staffLabel} · ${formatSalaryMoney(record, record.payableSalary)}`
                }
                getRecordAmount={(record) => record.payableSalary}
                showAmounts={selectedRecords.every(canViewSalaryAmount)}
              />
              <DataTableRecordControls
                visible={controlsVisible}
                searchValue={searchText}
                onSearchChange={setSearchText}
                searchPlaceholder="Search staff, month, or status"
                searchAriaLabel="Search salary records"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={
                  (statusFilter !== 'all' ? 1 : 0) +
                  (salaryMonthFilter !== 'all' ? 1 : 0) +
                  (reviewScope !== 'mine' ? 1 : 0)
                }
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
                  <CFormLabel htmlFor="financialSalaryReviewScope">Worklist</CFormLabel>
                  <CFormSelect
                    id="financialSalaryReviewScope"
                    value={reviewScope}
                    onChange={(event) => setReviewScope(event.target.value)}
                  >
                    <option value="mine">My actionable queue</option>
                    <option value="all">All visible records</option>
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={4}>
                  <CFormLabel htmlFor="financialSalaryMonthFilter">Salary month</CFormLabel>
                  <CFormSelect
                    id="financialSalaryMonthFilter"
                    value={salaryMonthFilter}
                    onChange={(event) => setSalaryMonthFilter(event.target.value)}
                  >
                    <option value="all">All months</option>
                    {salaryMonthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
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
                scrollStorageKey="financial.salary-records.scroll"
                idPrefix="financial-salary-record"
                emptyMessage="No submitted salary records found."
                exportFilename={`salary-records-${new Date().toISOString().slice(0, 10)}.csv`}
                desktopUtilityPortalId="financial-salary-records-table-tools"
                mobileUtilityPortalId="financial-salary-records-mobile-table-tools"
                getRowKey={(record, index) => record.id || index}
                renderCell={renderCell}
                getActions={getActions}
                onRowOpen={openDetail}
                renderActions={renderActions}
                renderMobileItem={renderMobileRecordItem}
                getSortValue={(record, field) => {
                  if (field === 'status') return getStatusSortPriority(record.status)
                  if (field === 'staff') return record.staffLabel
                  if (field === 'salaryMonth') return record.salaryMonthValue
                  if (field === 'submittedAt') return record.submittedAt
                  if (field === 'workflow') return record.workflow
                  if (
                    ['basicSalary', 'claimsTotal', 'employeeDeductions', 'payableSalary'].includes(
                      field,
                    )
                  ) {
                    return numericSalaryValue(record, record[field])
                  }

                  return record[field]
                }}
                getMobileTitle={(record) => record.staffLabel}
                getMobileSubtitle={(record) => record.salaryMonth}
                getMobileMeta={(record) =>
                  `${formatSalaryMoney(record, record.payableSalary)} | Claims ${formatSalaryMoney(
                    record,
                    record.claimsTotal,
                  )}`
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
                    `Payable ${formatSalaryMoney(record, record.payableSalary)} | ${
                      record.submittedDisplay
                    }`,
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
                      value: formatSalaryMoney(record, record.claimsTotal),
                    },
                    {
                      key: 'deductions',
                      label: 'Deductions',
                      value: canViewSalaryAmount(record)
                        ? `-${formatMoney(record.employeeDeductions || 0)}`
                        : restrictedMoneyLabel,
                    },
                    {
                      key: 'basicSalary',
                      label: 'Basic Salary',
                      value: formatSalaryMoney(record, record.basicSalary),
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
                resetDeps={[searchText, statusFilter, salaryMonthFilter, reviewScope]}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default FinancialSalaryRecordsPage
