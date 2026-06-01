import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { DataTableLoadingState, DataTableStatusBadge } from '../../../components/datatable'
import { quoteApiUrl } from '../quotes/quoteApi'
import { useAuth } from '../../../auth/AuthProvider'

const serviceOptions = [
  { value: 'training', label: 'Training' },
  { value: 'ih', label: 'IH' },
  { value: 'manpower', label: 'Manpower' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'special', label: 'Special' },
]

const statusOptions = [
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

const money = (value) =>
  Number(value || 0).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const hasValue = (value) => value !== null && value !== undefined && value !== ''

const amountOrDash = (value) => (hasValue(value) ? `RM ${money(value)}` : '-')

const getOptionLabel = (options, value) =>
  options.find((option) => option.value === value)?.label || value || '-'

const statusTone = (status) => {
  if (status === 'pending') return 'warning'
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'used') return 'info'
  return 'dark'
}

const getRequestedFinalTotal = (row) => {
  if (hasValue(row?.requested_final_total)) return Number(row.requested_final_total || 0)
  return Math.max(
    0,
    Number(row?.current_total_amount || 0) - Number(row?.requested_discount_amount || 0),
  )
}

const getApprovedFinalTotal = (row) => {
  if (hasValue(row?.approved_final_total)) return Number(row.approved_final_total || 0)
  if (hasValue(row?.approved_discount_amount)) {
    return Math.max(
      0,
      Number(row?.current_total_amount || 0) - Number(row?.approved_discount_amount || 0),
    )
  }
  return null
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('en-MY', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const renderField = (label, value, options = {}) => {
  const { mobileInline = false, valueClassName = '' } = options
  if (!mobileInline) {
    return (
      <div className="records-detail-field">
        <div className="small text-muted">{label}</div>
        <div className={valueClassName}>{value || '-'}</div>
      </div>
    )
  }

  return (
    <>
      <div className="d-flex d-md-none justify-content-between align-items-start gap-3">
        <div className="small text-muted">{label}</div>
        <div className={`text-end ms-auto ${valueClassName}`.trim()}>{value || '-'}</div>
      </div>
      <div className="d-none d-md-block">
        <div className="small text-muted">{label}</div>
        <div className={valueClassName}>{value || '-'}</div>
      </div>
    </>
  )
}

const normalizeNegotiation = (row) => {
  if (!row) return null
  const trace =
    row.status === 'used'
      ? `Applied to quote #${row.used_revision_quote_id || row.quote_id || '-'}`
      : row.approved_by_name || '-'

  return {
    ...row,
    request: row.quote_ref_no || 'Pre-quote',
    reason: row.client_negotiation_reason || '',
    serviceLabel: getOptionLabel(serviceOptions, row.service_group),
    requester: row.requested_by_name || '-',
    statusLabel: getOptionLabel(statusOptions, row.status),
    statusTone: statusTone(row.status),
    trace,
  }
}

const NegotiationDetailsPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { requestId } = useParams()
  const { user } = useAuth()
  const returnTo = location.state?.returnTo || '/crm/price-exceptions'
  const [row, setRow] = useState(() => normalizeNegotiation(location.state?.record))
  const [loading, setLoading] = useState(!location.state?.record)
  const [error, setError] = useState('')

  const loadRecord = useCallback(async () => {
    if (!requestId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(
        quoteApiUrl(`quote-price-exceptions/${encodeURIComponent(requestId)}`),
        {
          credentials: 'include',
        },
      )
      const result = await response.json()
      if (!response.ok && result?.status !== 'success') {
        throw new Error(result?.message || 'Failed to load negotiation.')
      }
      setRow(normalizeNegotiation(result?.data))
    } catch (err) {
      setError(err?.message || 'Failed to load negotiation.')
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    loadRecord()
  }, [loadRecord])

  const requestedFinalTotal = useMemo(() => getRequestedFinalTotal(row), [row])
  const approvedFinalTotal = useMemo(() => getApprovedFinalTotal(row), [row])
  const quoteId = Number(row?.quote_id || 0)
  const canOpenQuotation = Boolean(row?.service_group) && quoteId > 0
  const canApply = canApplyNegotiation(row, user)

  const openQuotation = () => {
    if (!canOpenQuotation) return
    const params = new URLSearchParams({
      service: row.service_group,
      edit: 'true',
      quoteId: String(quoteId),
    })
    navigate(`/crm/quotes?${params.toString()}`)
  }

  const applyRequest = () => {
    if (!canApply) return
    const params = new URLSearchParams({
      service: row.service_group,
      priceExceptionRequestId: String(row.id),
    })
    if (quoteId > 0) {
      params.set('edit', 'true')
      params.set('quoteId', String(quoteId))
      params.set('isRevision', 'true')
    }
    navigate(`/crm/quotes?${params.toString()}`)
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
            <strong>Negotiation Details</strong>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => navigate(returnTo)}
            >
              Back
            </CButton>
          </CCardHeader>
          <CCardBody>
            {loading ? (
              <DataTableLoadingState message="Loading details..." />
            ) : error ? (
              <CAlert color="warning" className="mb-0">
                {error}
              </CAlert>
            ) : (
              <CRow className="g-3">
                <CCol xs={12} md={6}>
                  {renderField('Request', row?.request || 'Pre-quote', { mobileInline: true })}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField('Service', row?.serviceLabel || '-', { mobileInline: true })}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField('Requester', row?.requester || '-')}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField(
                    'Status',
                    <DataTableStatusBadge tone={row?.statusTone}>
                      {row?.statusLabel}
                    </DataTableStatusBadge>,
                    { mobileInline: true },
                  )}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Current Total', amountOrDash(row?.current_total_amount), {
                    mobileInline: true,
                  })}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Requested Discount', amountOrDash(row?.requested_discount_amount), {
                    mobileInline: true,
                  })}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Requested Final Total', amountOrDash(requestedFinalTotal), {
                    mobileInline: true,
                  })}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Trace', row?.trace || '-', { mobileInline: true })}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField('Reason', row?.reason || '-')}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField('Requester Remarks', row?.requester_remarks || '-')}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Approved Discount', amountOrDash(row?.approved_discount_amount), {
                    mobileInline: true,
                  })}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Approved Final Total', amountOrDash(approvedFinalTotal), {
                    mobileInline: true,
                    valueClassName: hasValue(approvedFinalTotal) ? 'text-success' : '',
                  })}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Approver', row?.approved_by_name || '-', { mobileInline: true })}
                </CCol>
                <CCol xs={12} md={3}>
                  {renderField('Approved At', formatDateTime(row?.approved_at), {
                    mobileInline: true,
                  })}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField(
                    'Applied Quote',
                    row?.used_revision_quote_id ? `Quote #${row.used_revision_quote_id}` : '-',
                  )}
                </CCol>
                <CCol xs={12} md={6}>
                  {renderField('Applied At', formatDateTime(row?.used_at))}
                </CCol>
                <CCol xs={12}>{renderField('Approval Remarks', row?.approval_remarks || '-')}</CCol>
              </CRow>
            )}
          </CCardBody>
          {!loading && !error && row ? (
            <>
              <CCardHeader>
                <strong>Actions</strong>
              </CCardHeader>
              <CCardBody className="d-flex flex-wrap gap-2">
                {canOpenQuotation ? (
                  <CButton color="primary" variant="outline" size="sm" onClick={openQuotation}>
                    Open Quotation
                  </CButton>
                ) : null}
                {canApply ? (
                  <CButton color="success" variant="outline" size="sm" onClick={applyRequest}>
                    Apply
                  </CButton>
                ) : null}
                {!canOpenQuotation && !canApply ? (
                  <span className="text-muted">No actions available.</span>
                ) : null}
              </CCardBody>
            </>
          ) : null}
        </CCard>
      </CCol>
    </CRow>
  )
}

export default NegotiationDetailsPage
