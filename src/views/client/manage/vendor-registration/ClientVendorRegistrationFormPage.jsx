import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CRow,
} from '@coreui/react'

import Select from '../../../../components/forms/ThemedSelect'
import dialog from '../../../../components/dialog/dialogService'
import { dispatchClientVendorRegistrationChanged } from '../../../../hooks/useClientVendorRegistrationAttentionCount'
import SelectClientCard from '../../../crm/quotes/SelectClientCard'
import ClientModuleNavStrip from '../components/ClientModuleNavStrip'
import { buildVendorRegistrationFormData } from './vendorRegistrationUtils'

const initialForm = {
  id: null,
  selectedClient: null,
  validFrom: '',
  validUntil: '',
  recipientStaffIds: [],
  certificate: null,
  certificateOriginalName: '',
  status: '',
  portalUrl: '',
  portalUsername: '',
  portalPassword: '',
  remarks: '',
}

const formatDate = (value) => String(value || '').slice(0, 10) || ''

const normalizeStaffOptions = (staff = []) =>
  staff
    .filter((item) => {
      const status = String(item.status || '')
        .trim()
        .toLowerCase()
      return item.email && (!status || status === 'active')
    })
    .map((item) => ({
      value: Number(item.staff_id),
      label: `${item.full_name || item.name_code || item.email}${item.name_code ? ` (${item.name_code})` : ''}`,
      email: item.email,
    }))

const mapRegistrationToForm = (row) => ({
  id: row.id,
  selectedClient: {
    company_id: row.client_id,
    company_name: row.client_name || `Client #${row.client_id}`,
    hq_company_name: row.client_name || `Client #${row.client_id}`,
  },
  validFrom: formatDate(row.valid_from),
  validUntil: formatDate(row.valid_until),
  recipientStaffIds: Array.isArray(row.recipient_staff_ids)
    ? row.recipient_staff_ids.map(Number)
    : [],
  certificate: null,
  certificateOriginalName: row.certificate_original_name || '',
  status: row.status || '',
  portalUrl: row.portal_url || '',
  portalUsername: row.portal_username || '',
  portalPassword: row.portal_password || '',
  remarks: row.remarks || '',
})

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

const getPortalUrlError = (value) => {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    return ['http:', 'https:'].includes(url.protocol)
      ? ''
      : 'Enter a valid portal URL starting with http:// or https://.'
  } catch {
    return 'Enter a valid portal URL starting with http:// or https://.'
  }
}

const ClientVendorRegistrationFormPage = () => {
  const navigate = useNavigate()
  const { registrationId } = useParams()
  const isEdit = Boolean(registrationId)
  const [form, setForm] = useState(initialForm)
  const [staffOptions, setStaffOptions] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [portalUrlTouched, setPortalUrlTouched] = useState(false)
  const [credentialFieldsReady, setCredentialFieldsReady] = useState(false)

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/list?per_page=500`, {
          credentials: 'include',
        })
        const result = await parseApiResponse(res)
        const staff = Array.isArray(result.data?.items)
          ? result.data.items
          : Array.isArray(result.staff)
            ? result.staff
            : []
        setStaffOptions(normalizeStaffOptions(staff))
      } catch (err) {
        console.error('Failed to fetch staff options:', err)
        setStaffOptions([])
      }
    }

    loadStaff()
  }, [])

  useEffect(() => {
    if (!isEdit) {
      setLoading(false)
      return
    }

    const loadRegistration = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE}client-vendor-registrations/${registrationId}`,
          { credentials: 'include' },
        )
        const result = await parseApiResponse(res)
        if (!res.ok || result.status !== 'success') {
          throw new Error(result.message || 'Vendor registration not found.')
        }
        setForm(mapRegistrationToForm(result.data))
      } catch (err) {
        dialog.alert(err.message || 'Failed to load vendor registration.')
        navigate('/client/vendor-registration')
      } finally {
        setLoading(false)
      }
    }

    loadRegistration()
  }, [isEdit, navigate, registrationId])

  const submitForm = async () => {
    const recipientStaffIds = Array.isArray(form.recipientStaffIds) ? form.recipientStaffIds : []

    if (!form.selectedClient?.company_id) return dialog.alert('Please select a client.')
    if (!form.validFrom || !form.validUntil)
      return dialog.alert('Please enter validity start and end dates.')
    if (form.validUntil < form.validFrom)
      return dialog.alert('Validity end date must be after start date.')
    if (!recipientStaffIds.length)
      return dialog.alert('Please select at least one notification recipient.')
    const portalUrlError = getPortalUrlError(form.portalUrl)
    if (portalUrlError) {
      setPortalUrlTouched(true)
      return
    }

    setSaving(true)
    try {
      const url = isEdit
        ? `${import.meta.env.VITE_API_BASE}client-vendor-registrations/${registrationId}`
        : `${import.meta.env.VITE_API_BASE}client-vendor-registrations`
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        body: buildVendorRegistrationFormData(form),
      })
      const result = await parseApiResponse(res)
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to save vendor registration.')
      }
      dispatchClientVendorRegistrationChanged()
      navigate('/client/vendor-registration')
    } catch (err) {
      dialog.alert(err.message || 'Server error. Please try again later.')
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => navigate('/client/vendor-registration')
  const portalUrlError = portalUrlTouched ? getPortalUrlError(form.portalUrl) : ''
  const isRenewal = isEdit && form.status === 'expired'
  const pageTitle = isRenewal
    ? 'Renew Vendor Registration'
    : isEdit
      ? 'Edit Vendor Registration'
      : 'Add Vendor Registration'
  const saveLabel = isRenewal ? 'Save Renewal' : 'Save Registration'

  return (
    <>
      <ClientModuleNavStrip />
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                <strong>{pageTitle}</strong>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  data-api-busy-allow="true"
                  onClick={goBack}
                >
                  Back
                </CButton>
              </div>
            </CCardHeader>
            <CCardBody>
              {loading ? (
                <div className="text-muted">Loading vendor registration...</div>
              ) : (
                <>
                  <CRow className="mb-3">
                    <SelectClientCard
                      title="Select Client"
                      shell="none"
                      selectedClient={form.selectedClient}
                      onClientChange={(client) =>
                        setForm((current) => ({ ...current, selectedClient: client }))
                      }
                      onCreateClient={() => {
                        sessionStorage.setItem('cameFromVendorRegistration', 'true')
                        sessionStorage.setItem(
                          'vendorRegistrationReturnPath',
                          '/client/vendor-registration/create',
                        )
                        navigate('/client/create')
                      }}
                    />
                  </CRow>
                  <CRow className="g-3">
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationValidFrom">Validity Start</CFormLabel>
                      <CFormInput
                        id="vendorRegistrationValidFrom"
                        type="date"
                        value={form.validFrom || ''}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, validFrom: event.target.value }))
                        }
                      />
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationValidUntil">Validity End</CFormLabel>
                      <CFormInput
                        id="vendorRegistrationValidUntil"
                        type="date"
                        value={form.validUntil || ''}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, validUntil: event.target.value }))
                        }
                      />
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationRecipients">
                        Notification Recipients
                      </CFormLabel>
                      <Select
                        inputId="vendorRegistrationRecipients"
                        options={staffOptions}
                        isMulti
                        value={staffOptions.filter((option) =>
                          (form.recipientStaffIds || []).includes(option.value),
                        )}
                        onChange={(options) =>
                          setForm((current) => ({
                            ...current,
                            recipientStaffIds: (options || []).map((option) => option.value),
                          }))
                        }
                        placeholder="Select active staff recipients"
                      />
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationCertificate">
                        Registration Certificate
                      </CFormLabel>
                      <CFormInput
                        id="vendorRegistrationCertificate"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            certificate: event.target.files?.[0] || null,
                          }))
                        }
                      />
                      {form.certificateOriginalName && !form.certificate ? (
                        <div className="small text-muted mt-1">
                          Current file: {form.certificateOriginalName}
                        </div>
                      ) : null}
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationPortalUrl">Portal URL</CFormLabel>
                      <CFormInput
                        id="vendorRegistrationPortalUrl"
                        type="url"
                        invalid={Boolean(portalUrlError)}
                        value={form.portalUrl || ''}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, portalUrl: event.target.value }))
                        }}
                        onBlur={() => setPortalUrlTouched(true)}
                        placeholder="https://portal.example.com"
                      />
                      {portalUrlError ? (
                        <CFormFeedback invalid>{portalUrlError}</CFormFeedback>
                      ) : null}
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationPortalUsername">
                        Username or Email
                      </CFormLabel>
                      <CFormInput
                        id="vendorRegistrationPortalUsername"
                        name="vendor-registration-portal-user"
                        value={form.portalUsername || ''}
                        autoComplete="new-username"
                        readOnly={!credentialFieldsReady}
                        onFocus={() => setCredentialFieldsReady(true)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            portalUsername: event.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationPortalPassword">
                        Portal Password
                      </CFormLabel>
                      <CFormInput
                        id="vendorRegistrationPortalPassword"
                        name="vendor-registration-portal-secret"
                        type="password"
                        value={form.portalPassword || ''}
                        autoComplete="new-password"
                        readOnly={!credentialFieldsReady}
                        onFocus={() => setCredentialFieldsReady(true)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            portalPassword: event.target.value,
                          }))
                        }
                      />
                    </CCol>
                    <CCol xs={12} md={6} xl={3}>
                      <CFormLabel htmlFor="vendorRegistrationRemarks">
                        Registration Remarks
                      </CFormLabel>
                      <CFormInput
                        id="vendorRegistrationRemarks"
                        value={form.remarks || ''}
                        placeholder="e.g. Renewal submitted in client portal; pending approval."
                        onChange={(event) =>
                          setForm((current) => ({ ...current, remarks: event.target.value }))
                        }
                      />
                    </CCol>
                  </CRow>
                </>
              )}
            </CCardBody>
            <div className="border-top px-3 py-3 d-flex justify-content-end gap-2">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                data-api-busy-allow="true"
                onClick={goBack}
                disabled={saving}
              >
                Cancel
              </CButton>
              <CButton
                color="primary"
                size="sm"
                data-api-busy-allow="true"
                onClick={submitForm}
                disabled={saving || loading}
              >
                {saving ? 'Saving...' : saveLabel}
              </CButton>
            </div>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default ClientVendorRegistrationFormPage
