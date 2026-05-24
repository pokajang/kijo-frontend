import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilReload } from '@coreui/icons'
import dialog from '../../../components/dialog/dialogService'
import {
  DataTableActionMenu,
  DataTableRecordControls,
  DataTableRecordList,
  DataTableStatusBadge,
  DataTableTextCell,
} from '../../../components/datatable'
import { StatsStrip } from '../../../components/stats'
import { useAuth } from '../../../auth/AuthProvider'
import { extractRolesFromSession, hasAnyAllowedRole } from '../../../utils/roles'
import { quoteApiUrl } from '../quotes/quoteApi'
import { dispatchAppNotificationsChanged } from '../../../notifications/appNotificationEvents'

const serviceOptions = [
  { value: 'all', label: 'All services' },
  { value: 'training', label: 'Training' },
  { value: 'ih', label: 'IH' },
  { value: 'manpower', label: 'Manpower' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'special', label: 'Special' },
]

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'used', label: 'Applied' },
]

const negotiableServices = new Set(['training', 'manpower'])

const getUserStaffId = (user) => Number(user?.staff_id || user?.staffId || 0)

const canApplyNegotiation = (row, user) =>
  row?.status === 'approved' &&
  row?.request_type === 'quote' &&
  Number(row?.quote_id || 0) > 0 &&
  negotiableServices.has(String(row?.service_group || '').toLowerCase()) &&
  getUserStaffId(user) > 0 &&
  getUserStaffId(user) === Number(row?.requested_by_id || 0)

const canDecideNegotiation = (row) =>
  row?.status === 'pending' &&
  row?.request_type === 'quote' &&
  Number(row?.quote_id || 0) > 0 &&
  negotiableServices.has(String(row?.service_group || '').toLowerCase())

const dataColumns = [
  {
    key: 'request',
    label: 'Request',
    width: '160px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'reason',
    label: 'Reason',
    width: '240px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'service',
    label: 'Service',
    width: '120px',
    sortable: true,
    sortType: 'string',
    shrinkToFit: true,
  },
  {
    key: 'requester',
    label: 'Requester',
    width: '160px',
    sortable: true,
    sortType: 'string',
  },
  {
    key: 'currentTotal',
    label: 'Current',
    width: '130px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'requestedDiscount',
    label: 'Requested Discount',
    width: '170px',
    sortable: true,
    sortType: 'number',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'status',
    label: 'Status',
    width: '110px',
    sortable: true,
    sortType: 'string',
    align: 'center',
    shrinkToFit: true,
  },
  {
    key: 'trace',
    label: 'Trace',
    width: '180px',
    sortable: true,
    sortType: 'string',
  },
]

const defaultVisibleColumns = {
  request: true,
  reason: true,
  service: true,
  requester: true,
  currentTotal: true,
  requestedDiscount: true,
  status: true,
  trace: true,
}

const requiredColumns = new Set(['request', 'status'])

const money = (value) =>
  Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const statusTone = (status) => {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'used') return 'info'
  return 'dark'
}

const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value || '-'

const formatStatus = (status) => getOptionLabel(statusOptions, status)
const formatService = (service) => getOptionLabel(serviceOptions, service)

const Negotiation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const roles = extractRolesFromSession({ user })
  const isApprover = hasAnyAllowedRole(roles, ['Manager', 'System Admin'])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('all')
  const [service, setService] = useState('all')
  const [requester, setRequester] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [decision, setDecision] = useState(null)
  const [decisionForm, setDecisionForm] = useState({
    approvedDiscountAmount: '',
    remarks: '',
    acknowledged: false,
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchRows = useCallback(async () => {
    setLoading(true)
    try {
      const query = new URLSearchParams({ status, service })
      const response = await fetch(quoteApiUrl(`quote-price-exceptions?${query.toString()}`), {
        credentials: 'include',
      })
      const result = await response.json()
      if (!response.ok && result?.status !== 'success') {
        throw new Error(result?.message || 'Failed to load negotiations.')
      }
      setRows(Array.isArray(result?.data) ? result.data : [])
    } catch (error) {
      dialog.alert(error?.message || 'Failed to load negotiations.')
    } finally {
      setLoading(false)
    }
  }, [service, status])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  useEffect(() => {
    window.addEventListener('quote-price-exceptions:changed', fetchRows)
    return () => window.removeEventListener('quote-price-exceptions:changed', fetchRows)
  }, [fetchRows])

  const normalizedRows = useMemo(
    () =>
      rows.map((row) => {
        const trace =
          row.status === 'used'
            ? `Applied to quote #${row.used_revision_quote_id || row.quote_id || '-'}`
            : row.approved_by_name || '-'

        return {
          ...row,
          request: row.quote_ref_no || 'Pre-quote',
          reason: row.client_negotiation_reason || '',
          service: row.service_group || '-',
          serviceLabel: formatService(row.service_group),
          requester: row.requested_by_name || '-',
          currentTotal: Number(row.current_total_amount || 0),
          currentTotalDisplay: `RM ${money(row.current_total_amount)}`,
          requestedDiscount: Number(row.requested_discount_amount || 0),
          requestedDiscountDisplay: `RM ${money(row.requested_discount_amount)}`,
          statusLabel: formatStatus(row.status),
          statusTone: statusTone(row.status),
          trace,
        }
      }),
    [rows],
  )

  const requesterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          normalizedRows.map((row) => row.requester).filter((value) => value && value !== '-'),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [normalizedRows],
  )

  useEffect(() => {
    if (requester !== 'all' && !requesterOptions.includes(requester)) {
      setRequester('all')
    }
  }, [requester, requesterOptions])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const requesterFilteredRows =
      requester === 'all'
        ? normalizedRows
        : normalizedRows.filter((row) => row.requester === requester)

    if (!term) return requesterFilteredRows

    return requesterFilteredRows.filter((row) =>
      [
        row.request,
        row.reason,
        row.service,
        row.serviceLabel,
        row.status,
        row.statusLabel,
        row.requested_by_name,
        row.requester,
        row.requester_remarks,
        row.trace,
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    )
  }, [normalizedRows, requester, search])

  const applyStatFilter = useCallback((nextStatus) => {
    setStatus(nextStatus)
    setShowAdvancedFilters(true)
  }, [])

  const statsItems = useMemo(() => {
    const used = normalizedRows.filter((row) => row.status === 'used').length
    const pending = normalizedRows.filter((row) => row.status === 'pending').length
    const approved = normalizedRows.filter((row) => row.status === 'approved').length
    const rejected = normalizedRows.filter((row) => row.status === 'rejected').length
    const approvedDiscountTotal = normalizedRows
      .filter((row) => row.status === 'approved' || row.status === 'used')
      .reduce((sum, row) => sum + Number(row.approved_discount_amount || 0), 0)

    return [
      {
        key: 'used',
        label: 'Applied',
        value: used,
        sublabel: 'Applied to quote',
        tone: 'info',
        onClick: () => applyStatFilter('used'),
      },
      {
        key: 'pending',
        label: 'Pending',
        value: pending,
        sublabel: 'Open requests',
        tone: 'warning',
        onClick: () => applyStatFilter('pending'),
      },
      {
        key: 'approved',
        label: 'Approved',
        value: approved,
        sublabel: `RM ${money(approvedDiscountTotal)} approved`,
        tone: 'success',
        onClick: () => applyStatFilter('approved'),
      },
      {
        key: 'rejected',
        label: 'Rejected',
        value: rejected,
        sublabel: 'Declined requests',
        tone: 'danger',
        onClick: () => applyStatFilter('rejected'),
      },
    ]
  }, [applyStatFilter, normalizedRows])

  const activeChips = [
    search.trim() ? { key: 'search', label: `Search: ${search.trim()}` } : null,
    status !== 'all' ? { key: 'status', label: `Status: ${formatStatus(status)}` } : null,
    service !== 'all' ? { key: 'service', label: `Service: ${formatService(service)}` } : null,
    requester !== 'all' ? { key: 'requester', label: `Requester: ${requester}` } : null,
  ].filter(Boolean)

  const activeFilterCount = [status !== 'all', service !== 'all', requester !== 'all'].filter(
    Boolean,
  ).length

  const clearChip = (key) => {
    if (key === 'search') setSearch('')
    if (key === 'status') setStatus('all')
    if (key === 'service') setService('all')
    if (key === 'requester') setRequester('all')
  }

  const resetFilters = () => {
    setSearch('')
    setStatus('all')
    setService('all')
    setRequester('all')
  }

  const openDecision = (row, type) => {
    setDecision({ row, type })
    setDecisionForm({
      approvedDiscountAmount: row.approved_discount_amount || row.requested_discount_amount || '',
      remarks: '',
      acknowledged: false,
    })
  }

  const submitDecision = async () => {
    if (!decision) return
    if (!decisionForm.acknowledged) {
      dialog.alert('Please acknowledge the decision before confirming.')
      return
    }
    if (decision.type === 'reject' && !decisionForm.remarks.trim()) {
      dialog.alert('Rejection remarks are required.')
      return
    }
    if (decision.type === 'approve') {
      const approvedDiscount = Number(
        decisionForm.approvedDiscountAmount || decision.row.requested_discount_amount || 0,
      )
      const currentTotal = Number(decision.row.current_total_amount || 0)
      if (approvedDiscount <= 0 || approvedDiscount > currentTotal) {
        dialog.alert(
          'Approved discount must be greater than zero and cannot exceed the current quote amount.',
        )
        return
      }
    }

    setSubmitting(true)
    try {
      const response = await fetch(
        quoteApiUrl(`quote-price-exceptions/${decision.row.id}/${decision.type}`),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...(decision.type === 'approve' && {
              approved_discount_amount:
                decisionForm.approvedDiscountAmount === ''
                  ? null
                  : Number(decisionForm.approvedDiscountAmount),
            }),
            approval_remarks: decisionForm.remarks?.trim() || null,
          }),
        },
      )
      const result = await response.json()
      if (!response.ok && result?.status !== 'success') {
        throw new Error(result?.message || 'Failed to update request.')
      }
      window.dispatchEvent(new Event('quote-price-exceptions:changed'))
      dispatchAppNotificationsChanged()
      setDecision(null)
      await fetchRows()
    } catch (error) {
      dialog.alert(error?.message || 'Failed to update request.')
    } finally {
      setSubmitting(false)
    }
  }

  const applyRequest = (row) => {
    const serviceGroup = row.service_group
    const quoteId = Number(row.quote_id || 0)
    if (!canApplyNegotiation(row, user)) return
    const params = new URLSearchParams({
      service: serviceGroup,
      priceExceptionRequestId: String(row.id),
    })
    if (quoteId > 0) {
      params.set('edit', 'true')
      params.set('quoteId', String(quoteId))
      params.set('isRevision', 'true')
    }
    navigate(`/crm/quotes?${params.toString()}`)
  }

  const openQuotation = (row) => {
    const serviceGroup = row.service_group
    const quoteId = Number(row.quote_id || 0)
    if (!serviceGroup || quoteId <= 0) return

    const params = new URLSearchParams({
      service: serviceGroup,
      edit: 'true',
      quoteId: String(quoteId),
    })
    navigate(`/crm/quotes?${params.toString()}`)
  }

  const openDetail = (row) => {
    if (!row?.id) return
    navigate(`/crm/price-exceptions/${encodeURIComponent(row.id)}`, {
      state: { returnTo: `${location.pathname}${location.search}`, record: row },
    })
  }

  const getActions = (row) =>
    [
      Number(row.quote_id || 0) > 0
        ? {
            key: 'open-quotation',
            label: 'Open Quotation',
            onClick: () => openQuotation(row),
          }
        : null,
      isApprover && canDecideNegotiation(row)
        ? {
            key: 'approve',
            label: 'Approve',
            onClick: () => openDecision(row, 'approve'),
          }
        : null,
      isApprover && canDecideNegotiation(row)
        ? {
            key: 'reject',
            label: 'Reject',
            danger: true,
            dividerBefore: true,
            onClick: () => openDecision(row, 'reject'),
          }
        : null,
      canApplyNegotiation(row, user)
        ? {
            key: 'apply',
            label: 'Apply',
            onClick: () => applyRequest(row),
          }
        : null,
    ].filter(Boolean)

  const renderActions = (row, actionKey) => {
    const actions = getActions(row)
    if (!actions.length) return <span className="text-muted">-</span>

    return <DataTableActionMenu record={row} actions={actions} actionKey={actionKey} />
  }

  const renderCell = (row, column) => {
    if (column.key === 'request') {
      return <span className="text-nowrap">{row.request}</span>
    }
    if (column.key === 'reason') {
      return (
        <DataTableTextCell
          value={row.reason}
          emptyText="-"
          maxWidth="240px"
          title="Negotiation Reason"
          mode="tooltip"
          previewCharThreshold={42}
        />
      )
    }

    if (column.key === 'service') return row.serviceLabel
    if (column.key === 'currentTotal') return row.currentTotalDisplay
    if (column.key === 'requestedDiscount') return row.requestedDiscountDisplay
    if (column.key === 'status') {
      return <DataTableStatusBadge tone={row.statusTone}>{row.statusLabel}</DataTableStatusBadge>
    }
    if (column.key === 'trace') {
      return (
        <DataTableTextCell
          value={row.trace}
          maxWidth="180px"
          title="Trace"
          mode="tooltip"
          previewCharThreshold={28}
        />
      )
    }

    return row[column.key] || '-'
  }

  const mobileRecord = {
    title: (row) => row.request,
    subtitle: (row) => row.reason || row.requester,
    meta: (row) =>
      [row.serviceLabel, row.requestedDiscountDisplay, row.trace].filter(Boolean).join(' | '),
    badges: (row) => [
      {
        key: 'status',
        label: row.statusLabel,
        tone: row.statusTone,
      },
    ],
    kv: (row) => [
      { key: 'current', label: 'Current', value: row.currentTotalDisplay },
      { key: 'discount', label: 'Discount', value: row.requestedDiscountDisplay },
    ],
  }

  const decisionRow = decision?.row || null
  const requestedDiscountAmount = Number(decisionRow?.requested_discount_amount || 0)
  const currentTotalAmount = Number(decisionRow?.current_total_amount || 0)
  const approvedDiscountAmount =
    decisionForm.approvedDiscountAmount === ''
      ? requestedDiscountAmount
      : Number(decisionForm.approvedDiscountAmount || 0)
  const requestedFinalTotal =
    decisionRow?.requested_final_total !== null && decisionRow?.requested_final_total !== undefined
      ? Number(decisionRow.requested_final_total || 0)
      : Math.max(0, currentTotalAmount - requestedDiscountAmount)
  const approvedFinalTotal = Math.max(0, currentTotalAmount - approvedDiscountAmount)
  const approvedDiscountInvalid =
    decision?.type === 'approve' &&
    (approvedDiscountAmount <= 0 || approvedDiscountAmount > currentTotalAmount)
  const acknowledgementText =
    decision?.type === 'approve'
      ? 'I acknowledge that approving this request authorizes the negotiated discount above and it will replace any existing discount when applied to the quote revision.'
      : 'I acknowledge that rejecting this request will prevent this negotiation request from being applied to the quotation.'

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4 records-page-card">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap records-page-card-header">
            <strong>Negotiations</strong>
            <CButton
              color="primary"
              size="sm"
              className="d-inline-flex align-items-center gap-1"
              onClick={fetchRows}
              disabled={loading}
            >
              <CIcon icon={cilReload} />
              Refresh
            </CButton>
          </CCardHeader>
          <CCardBody className="records-page-card-body">
            <div>
              <StatsStrip items={statsItems} loading={loading && rows.length === 0} />
              <DataTableRecordControls
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search request, quote, requester, reason, or trace"
                searchAriaLabel="Search negotiations"
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
                activeFilterCount={activeFilterCount}
                activeChips={activeChips}
                clearChip={clearChip}
                resetFilters={resetFilters}
                desktopToolsId="negotiations-table-tools"
                mobileToolsId="negotiations-mobile-table-tools"
              >
                <CCol xs={12} md={6} lg={3}>
                  <CFormLabel htmlFor="negotiation-status-filter">Status</CFormLabel>
                  <CFormSelect
                    id="negotiation-status-filter"
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={6} lg={3}>
                  <CFormLabel htmlFor="negotiation-service-filter">Service</CFormLabel>
                  <CFormSelect
                    id="negotiation-service-filter"
                    value={service}
                    onChange={(event) => setService(event.target.value)}
                  >
                    {serviceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md={6} lg={3}>
                  <CFormLabel htmlFor="negotiation-requester-filter">Requester</CFormLabel>
                  <CFormSelect
                    id="negotiation-requester-filter"
                    value={requester}
                    onChange={(event) => setRequester(event.target.value)}
                  >
                    <option value="all">All requesters</option>
                    {requesterOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </DataTableRecordControls>

              <DataTableRecordList
                rows={filteredRows}
                dataColumns={dataColumns}
                defaultVisibleColumns={defaultVisibleColumns}
                requiredColumns={requiredColumns}
                storageKey="crm.negotiations.visible-columns.v1"
                idPrefix="crm-negotiation"
                loading={loading}
                loadingMessage="Loading negotiations..."
                emptyMessage="No negotiations found."
                exportFilename={`negotiations-${new Date().toISOString().slice(0, 10)}.csv`}
                showDesktopSummary={false}
                desktopUtilityPlacement="portal"
                desktopUtilityPortalId="negotiations-table-tools"
                mobileUtilityPlacement="portal"
                mobileUtilityPortalId="negotiations-mobile-table-tools"
                showMobileUtilityRow={false}
                actionColumnWidth="56px"
                getRowKey={(row, index) => row.id || index}
                renderCell={renderCell}
                renderActions={renderActions}
                onRowOpen={openDetail}
                initialSortField="request"
                initialSortDirByField={{
                  currentTotal: 'desc',
                  requestedDiscount: 'desc',
                }}
                getSortValue={(row, field) => row[field]}
                mobileRecord={mobileRecord}
                getMobileTitle={(row) => row.request}
                getMobileSubtitle={(row) => row.reason || row.requester}
                getMobileMeta={(row) =>
                  [row.serviceLabel, row.requestedDiscountDisplay, row.trace]
                    .filter(Boolean)
                    .join(' | ')
                }
                getMobileStatus={(row) => row.statusLabel}
                getMobileStatusTone={(row) => row.statusTone}
                mobileFieldKeys={{
                  title: 'request',
                  subtitle: 'requester',
                  meta: ['service', 'requestedDiscount', 'trace'],
                  status: 'status',
                }}
                tableViewportDeps={[showAdvancedFilters, search, status, service, requester]}
                resetDeps={[search, status, service, requester]}
              />
            </div>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={Boolean(decision)} onClose={() => setDecision(null)} alignment="center">
        <CModalHeader closeButton>
          <CModalTitle>
            {decision?.type === 'approve' ? 'Approve Request' : 'Reject Request'}
          </CModalTitle>
        </CModalHeader>
        <CModalBody>
          {decisionRow && (
            <div className="border rounded p-3 mb-3 app-surface-panel">
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Quote</span>
                <span className="fw-semibold text-end">{decisionRow.request || 'Pre-quote'}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Requester</span>
                <span className="text-end">{decisionRow.requester || '-'}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Current Quote Total</span>
                <span className="fw-semibold">RM {money(currentTotalAmount)}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Requested Discount</span>
                <span>RM {money(requestedDiscountAmount)}</span>
              </div>
              <div className="d-flex justify-content-between gap-3 mb-2">
                <span className="text-muted">Requested Final Total</span>
                <span>RM {money(requestedFinalTotal)}</span>
              </div>
              {decision.type === 'approve' && (
                <div className="d-flex justify-content-between gap-3 pt-2 border-top">
                  <span className="text-muted">Final Total After Approval</span>
                  <span className="fw-semibold text-success">RM {money(approvedFinalTotal)}</span>
                </div>
              )}
              {(decisionRow.reason || decisionRow.requester_remarks) && (
                <div className="mt-3 pt-2 border-top small">
                  <CRow className="g-3">
                    {decisionRow.reason && (
                      <CCol xs={12} md={6}>
                        <div className="text-muted">Reason</div>
                        <div>{decisionRow.reason}</div>
                      </CCol>
                    )}
                    {decisionRow.requester_remarks && (
                      <CCol xs={12} md={6}>
                        <div className="text-muted">Requester Remarks</div>
                        <div>{decisionRow.requester_remarks}</div>
                      </CCol>
                    )}
                  </CRow>
                </div>
              )}
            </div>
          )}

          {decision?.type === 'approve' && (
            <div className="mb-3">
              <CFormLabel htmlFor="approvedDiscountAmount">Approved Discount</CFormLabel>
              <CInputGroup>
                <CInputGroupText>RM</CInputGroupText>
                <CFormInput
                  id="approvedDiscountAmount"
                  type="number"
                  min="0"
                  max={currentTotalAmount || undefined}
                  step="0.01"
                  value={decisionForm.approvedDiscountAmount}
                  onChange={(event) =>
                    setDecisionForm((prev) => ({
                      ...prev,
                      approvedDiscountAmount: event.target.value,
                    }))
                  }
                />
              </CInputGroup>
            </div>
          )}
          <CFormLabel htmlFor="approvalRemarks">Remarks</CFormLabel>
          <CFormInput
            id="approvalRemarks"
            value={decisionForm.remarks}
            onChange={(event) =>
              setDecisionForm((prev) => ({ ...prev, remarks: event.target.value }))
            }
          />
          <CFormCheck
            id="decisionAcknowledgement"
            className="mt-3"
            checked={decisionForm.acknowledged}
            onChange={(event) =>
              setDecisionForm((prev) => ({ ...prev, acknowledged: event.target.checked }))
            }
            label={acknowledgementText}
          />
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDecision(null)} disabled={submitting}>
            Cancel
          </CButton>
          <CButton
            color={decision?.type === 'approve' ? 'success' : 'danger'}
            onClick={submitDecision}
            disabled={submitting || !decisionForm.acknowledged || approvedDiscountInvalid}
          >
            {submitting ? 'Submitting...' : 'Confirm'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Negotiation
