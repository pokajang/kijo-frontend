import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CBadge, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'

import { DataTableLoadingState } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import { dispatchClientVendorRegistrationChanged } from '../../../../hooks/useClientVendorRegistrationAttentionCount'
import { getDetailReturnTo } from '../../../../utils/navigation/returnTo'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import {
  buildVendorRegistrationEditPath,
  getVendorRegistrationEditActionLabel,
  normalizeVendorRegistrationRows,
} from './vendorRegistrationUtils'

const emptyValue = '-'

const statusTones = {
  active: 'success',
  expiring_soon: 'warning',
  expired: 'danger',
  missing_certificate: 'secondary',
  unknown: 'secondary',
}

const renderField = (label, value, options = {}) => {
  const { valueClassName = '' } = options
  const content = value || emptyValue

  return (
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div className={valueClassName}>{content}</div>
    </div>
  )
}

const parseApiResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return {
      status: 'error',
      message: response.ok ? '' : `Request failed with HTTP ${response.status}.`,
    }
  }

  return response.json()
}

const ClientVendorRegistrationDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { registrationId } = useParams()
  const returnTo = getDetailReturnTo(location, '/client/vendor-registration')
  const [row, setRow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showPortalPassword, setShowPortalPassword] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadRegistration = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}client-vendor-registrations/${registrationId}`,
          { credentials: 'include', signal: controller.signal },
        )
        const result = await parseApiResponse(res)
        if (!res.ok || result.status !== 'success') {
          throw new Error(result.message || 'Vendor registration not found.')
        }
        setRow(result.data || null)
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load vendor registration.')
          setRow(null)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadRegistration()

    return () => controller.abort()
  }, [registrationId])

  const detail = useMemo(() => normalizeVendorRegistrationRows(row ? [row] : [])[0], [row])

  const goBack = () => navigate(returnTo)
  const goEdit = () =>
    navigate(buildVendorRegistrationEditPath(registrationId), {
      state: { record: detail, returnTo },
    })

  const deleteRegistration = async () => {
    if (!detail) return
    const ok = await dialog.confirm(`Delete vendor registration for ${detail.client}?`, {
      confirmText: 'Delete',
      confirmColor: 'danger',
    })
    if (!ok) return

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}client-vendor-registrations/${registrationId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )
      const result = await parseApiResponse(res)
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to delete vendor registration.')
      }
      dispatchClientVendorRegistrationChanged()
      navigate(returnTo)
    } catch (err) {
      dialog.alert(err.message || 'Server error. Please try again later.')
    }
  }

  useEffect(() => {
    if (!passwordCopied) return undefined
    const timeoutId = window.setTimeout(() => setPasswordCopied(false), 1500)
    return () => window.clearTimeout(timeoutId)
  }, [passwordCopied])

  const copyPortalPassword = async () => {
    if (!detail?.portalPassword) return

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(detail.portalPassword)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = detail.portalPassword
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setPasswordCopied(true)
    } catch (err) {
      console.error('Failed to copy portal password:', err)
      setPasswordCopied(false)
    }
  }

  return (
    <>
      <ClientModuleNavStrip />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
              <strong>Vendor Registration Details</strong>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                data-api-busy-allow="true"
                onClick={goBack}
              >
                Back
              </CButton>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <DataTableLoadingState message="Loading vendor registration..." />
              ) : error ? (
                <CAlert color="warning" className="mb-0">
                  {error}
                </CAlert>
              ) : detail ? (
                <CRow className="g-4">
                  <CCol xs={12} md={6}>
                    {renderField('Client', detail.client)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Client Status', detail.client_status || emptyValue)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Valid From', detail.validFrom)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Valid Until', detail.validUntil)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField(
                      'Days Left',
                      detail.daysLeft === null ? emptyValue : String(detail.daysLeft),
                      { valueClassName: detail.daysLeft < 0 ? 'text-danger fw-semibold' : '' },
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField(
                      'Status',
                      <CBadge color={statusTones[detail.status] || 'secondary'}>
                        {detail.statusLabel}
                      </CBadge>,
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Notification Recipients', detail.recipientsText)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField(
                      'Certificate',
                      detail.certificateUrl ? (
                        <a href={detail.certificateUrl} target="_blank" rel="noreferrer">
                          {detail.certificate}
                        </a>
                      ) : (
                        emptyValue
                      ),
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Updated At', detail.updatedAt || emptyValue)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField(
                      'Portal URL',
                      detail.portalUrl ? (
                        <a href={detail.portalUrl} target="_blank" rel="noreferrer">
                          {detail.portalUrl}
                        </a>
                      ) : (
                        emptyValue
                      ),
                    )}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Username or Email', detail.portalUsername || emptyValue)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    <div className="small text-muted">Portal Password</div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span>
                        {detail.portalPassword
                          ? showPortalPassword
                            ? detail.portalPassword
                            : '********'
                          : emptyValue}
                      </span>
                      {detail.portalPassword ? (
                        <>
                          <CButton
                            size="sm"
                            color="secondary"
                            variant="outline"
                            data-api-busy-allow="true"
                            onClick={() => setShowPortalPassword((current) => !current)}
                          >
                            {showPortalPassword ? 'Hide' : 'Show'}
                          </CButton>
                          <CButton
                            size="sm"
                            color="primary"
                            variant="outline"
                            data-api-busy-allow="true"
                            onClick={copyPortalPassword}
                          >
                            {passwordCopied ? 'Copied' : 'Copy'}
                          </CButton>
                        </>
                      ) : null}
                    </div>
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Registration Remarks', detail.remarks || emptyValue)}
                  </CCol>
                </CRow>
              ) : (
                <CAlert color="warning" className="mb-0">
                  Vendor registration not found.
                </CAlert>
              )}
            </CCardBody>
            {!loading && !error && detail ? (
              <>
                <CCardHeader>
                  <strong>Actions</strong>
                </CCardHeader>
                <CCardBody>
                  <div className="d-flex flex-wrap gap-2">
                    <CButton
                      size="sm"
                      color="secondary"
                      variant="outline"
                      data-api-busy-allow="true"
                      onClick={goEdit}
                    >
                      {getVendorRegistrationEditActionLabel(detail.status)}
                    </CButton>
                    {detail.certificateUrl ? (
                      <CButton
                        size="sm"
                        color="primary"
                        variant="outline"
                        data-api-busy-allow="true"
                        href={detail.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Certificate
                      </CButton>
                    ) : null}
                    <CButton
                      size="sm"
                      color="danger"
                      variant="outline"
                      data-api-busy-allow="true"
                      onClick={deleteRegistration}
                    >
                      Delete
                    </CButton>
                  </div>
                </CCardBody>
              </>
            ) : null}
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ClientVendorRegistrationDetailPage
