import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LoadingImage from '../../../components/LoadingImage'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CRow,
} from '@coreui/react'
import useDuplicateChecker from '../../../hooks/useDuplicateChecker'
import InquiryShell from './InquiryShell'
import {
  MAX_PROOF_IMAGE_BYTES,
  compressProofImage,
  createBlankInquiry,
  fileToDataUrl,
  inquirySources,
  inquiryStatuses,
  saveInquiry,
  serviceOptions,
} from './inquiryUtils'

const draftStorageKey = 'marketing.inquiries.create-draft.v1'

const readDraft = () => {
  try {
    const raw = localStorage.getItem(draftStorageKey)
    return raw ? { ...createBlankInquiry(), ...JSON.parse(raw) } : createBlankInquiry()
  } catch {
    return createBlankInquiry()
  }
}

const writeDraft = (form) => {
  try {
    const draft = { ...form }
    delete draft.proofs
    delete draft.proofDataUrl
    delete draft.proofOriginalName
    delete draft.proofMimeType
    localStorage.setItem(draftStorageKey, JSON.stringify(draft))
  } catch {
    // Draft restore is best effort.
  }
}

const clearDraft = () => {
  try {
    localStorage.removeItem(draftStorageKey)
  } catch {
    // ignore storage failures
  }
}

const isValidISODate = (value) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const [, year, month, day] = match
  const date = new Date(`${value}T00:00:00`)
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day)
  )
}

const InquiryCreate = () => {
  const navigate = useNavigate()
  const [form, setForm] = useState(readDraft)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [proofProcessing, setProofProcessing] = useState(false)
  const [proofInputKey, setProofInputKey] = useState(Date.now())
  const [clientDatabase, setClientDatabase] = useState([])
  const [picDatabase, setPicDatabase] = useState([])

  const {
    isDuplicate: isDuplicateCompany,
    matchedValue: duplicateCompanyName,
    partialMatch: partialMatchCompany,
  } = useDuplicateChecker({
    valueToCheck: form.companyName,
    key: 'company_name',
    dataset: clientDatabase,
    matchType: 'partial',
  })

  const { isDuplicate: isDuplicateSsm, matchedValue: duplicateSsmNumber } = useDuplicateChecker({
    valueToCheck: form.ssmNumber,
    key: 'ssm_number',
    dataset: clientDatabase,
  })

  const {
    isDuplicate: isDuplicatePIC,
    matchedValue: duplicatePICName,
    partialMatch: partialMatchPIC,
  } = useDuplicateChecker({
    valueToCheck: form.contactName,
    key: 'full_name',
    dataset: picDatabase,
    matchType: 'partial',
  })

  const { isDuplicate: isDuplicateEmail, matchedValue: duplicateEmail } = useDuplicateChecker({
    valueToCheck: form.email,
    key: 'email',
    dataset: picDatabase,
  })

  useEffect(() => {
    writeDraft(form)
  }, [form])

  useEffect(() => {
    const fetchDuplicateDatasets = async () => {
      try {
        const [companyRes, picRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE}client-companies/basic`),
          fetch(`${import.meta.env.VITE_API_BASE}client-pics`),
        ])
        const [companyResult, picResult] = await Promise.all([companyRes.json(), picRes.json()])
        if (companyResult.status === 'success') setClientDatabase(companyResult.data || [])
        if (picResult.status === 'success') setPicDatabase(picResult.data || [])
      } catch (err) {
        console.error('Failed to fetch duplicate check datasets:', err)
      }
    }

    fetchDuplicateDatasets()
  }, [])

  const updateForm = (updates) => {
    setForm((current) => ({ ...current, ...updates }))
  }

  const trimOnBlur = (field) => (event) => {
    const value = String(event.target.value || '')
      .trim()
      .replace(/[\s,;:/\\.!-]+$/g, '')

    if (value !== event.target.value) {
      updateForm({ [field]: value })
    }
  }

  const handleProofFileChange = async (files) => {
    const selectedFiles = Array.from(files || [])
    if (selectedFiles.length === 0) return

    setError('')
    setProofProcessing(true)

    try {
      const existingCount = Array.isArray(form.proofs) ? form.proofs.length : 0
      const availableSlots = Math.max(0, 10 - existingCount)
      const filesToProcess = selectedFiles.slice(0, availableSlots)

      if (filesToProcess.length < selectedFiles.length) {
        setError('A maximum of 10 screenshot proofs can be attached.')
      }

      const nextProofs = []
      for (const file of filesToProcess) {
        const compressedFile = await compressProofImage(file)
        if (compressedFile.size > MAX_PROOF_IMAGE_BYTES) {
          setError(`${compressedFile.name} is still over 500KB after compression.`)
          continue
        }

        nextProofs.push({
          localId: `${Date.now()}-${file.name}-${nextProofs.length}`,
          dataUrl: await fileToDataUrl(compressedFile),
          originalName: compressedFile.name,
          mimeType: compressedFile.type,
        })
      }

      if (nextProofs.length > 0) {
        setForm((current) => ({
          ...current,
          proofs: [...(current.proofs || []), ...nextProofs],
        }))
      }
    } catch (err) {
      setError('Unable to process screenshot proofs.')
    } finally {
      setProofProcessing(false)
      setProofInputKey(Date.now())
    }
  }

  const removeProof = (index) => {
    setForm((current) => ({
      ...current,
      proofs: (current.proofs || []).filter((_, proofIndex) => proofIndex !== index),
    }))
  }

  const validate = () => {
    if (!form.companyName.trim()) return 'Company name is required.'
    if (!form.mobile.trim() && !form.email.trim()) return 'Mobile or email is required.'
    if (!form.serviceRequired) return 'Service required is required.'
    if (!form.source.trim()) return 'Inquiry source is required.'
    if (!form.inquiryDate) return 'Inquiry date is required.'
    if (!isValidISODate(form.inquiryDate)) return 'Inquiry date must use YYYY-MM-DD format.'
    return ''
  }

  const handleSubmit = async () => {
    if (proofProcessing) {
      setError('Please wait for screenshot proof processing to finish.')
      return
    }

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError('')

    try {
      const inquiry = await saveInquiry(form)
      clearDraft()
      navigate(`/pipeline/inquiries/${inquiry.id}`, {
        state: { inquiryMessage: 'Inquiry saved.' },
      })
    } catch (err) {
      setError(err?.message || 'Unable to save inquiry.')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    if (!window.confirm('Reset this inquiry form?')) return
    clearDraft()
    setForm(createBlankInquiry())
    setProofInputKey(Date.now())
    setError('')
  }

  return (
    <InquiryShell>
      {error && (
        <CAlert color="danger" className="mb-3">
          {error}
        </CAlert>
      )}

      <CCard className="mb-4">
        <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>New Sales Inquiry</strong>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            disabled={saving}
            onClick={() => navigate('/pipeline/inquiries')}
          >
            Back to Records
          </CButton>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-company">Company Name</CFormLabel>
              <CFormInput
                id="inquiry-company"
                value={form.companyName}
                placeholder="Example: ABC Manufacturing Sdn Bhd"
                onChange={(event) => updateForm({ companyName: event.target.value })}
                onBlur={trimOnBlur('companyName')}
              />
              {isDuplicateCompany && (
                <CAlert color="danger" className="mt-2 mb-0 py-2">
                  <strong>{duplicateCompanyName}</strong> already exists. If this is a branch,
                  append a branch remark in the name, for example:
                  <strong> XYZ Sdn Bhd - KL Branch</strong>.
                </CAlert>
              )}
              {!isDuplicateCompany && partialMatchCompany && (
                <CAlert color="primary" className="mt-2 mb-0 py-2">
                  <strong>{partialMatchCompany}</strong> looks similar. Please confirm it is not a
                  duplicate.
                </CAlert>
              )}
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-ssm">SSM Number</CFormLabel>
              <CFormInput
                id="inquiry-ssm"
                value={form.ssmNumber}
                placeholder="e.g., 202401234567"
                onChange={(event) => updateForm({ ssmNumber: event.target.value })}
                onBlur={trimOnBlur('ssmNumber')}
              />
              {isDuplicateSsm && (
                <CAlert color="warning" className="mt-2 mb-0 py-2">
                  <strong>{duplicateSsmNumber}</strong> is already used by an existing client.
                </CAlert>
              )}
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-tin">Tax Id. No. (TIN)</CFormLabel>
              <CFormInput
                id="inquiry-tin"
                value={form.taxIdNoTin}
                placeholder="e.g., C1234567890"
                onChange={(event) => updateForm({ taxIdNoTin: event.target.value })}
                onBlur={trimOnBlur('taxIdNoTin')}
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel htmlFor="inquiry-address">Address</CFormLabel>
              <CFormInput
                id="inquiry-address"
                value={form.address}
                placeholder="Company address"
                onChange={(event) => updateForm({ address: event.target.value })}
                onBlur={trimOnBlur('address')}
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="inquiry-city">City</CFormLabel>
              <CFormInput
                id="inquiry-city"
                value={form.city}
                onChange={(event) => updateForm({ city: event.target.value })}
                onBlur={trimOnBlur('city')}
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="inquiry-state">State</CFormLabel>
              <CFormInput
                id="inquiry-state"
                value={form.state}
                onChange={(event) => updateForm({ state: event.target.value })}
                onBlur={trimOnBlur('state')}
              />
            </CCol>
            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="inquiry-zip">Postcode</CFormLabel>
              <CFormInput
                id="inquiry-zip"
                value={form.zip}
                onChange={(event) => updateForm({ zip: event.target.value })}
                onBlur={trimOnBlur('zip')}
              />
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-contact">Contact Name</CFormLabel>
              <CFormInput
                id="inquiry-contact"
                value={form.contactName}
                placeholder="PIC name if available"
                onChange={(event) => updateForm({ contactName: event.target.value })}
                onBlur={trimOnBlur('contactName')}
              />
              {isDuplicatePIC && (
                <CAlert color="danger" className="mt-2 mb-0 py-2">
                  <strong>{duplicatePICName}</strong> already exists in the system.
                </CAlert>
              )}
              {!isDuplicatePIC && partialMatchPIC && (
                <CAlert color="primary" className="mt-2 mb-0 py-2">
                  <strong>{partialMatchPIC}</strong> looks similar. Please confirm it is not a
                  duplicate.
                </CAlert>
              )}
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-mobile">Mobile</CFormLabel>
              <CFormInput
                id="inquiry-mobile"
                value={form.mobile}
                placeholder="601..."
                onChange={(event) => updateForm({ mobile: event.target.value })}
                onBlur={trimOnBlur('mobile')}
              />
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-email">Email</CFormLabel>
              <CFormInput
                id="inquiry-email"
                type="email"
                value={form.email}
                placeholder="name@company.com"
                onChange={(event) => updateForm({ email: event.target.value })}
                onBlur={trimOnBlur('email')}
              />
              {isDuplicateEmail && (
                <CAlert color="warning" className="mt-2 mb-0 py-2">
                  <strong>{duplicateEmail}</strong> is already used by another contact.
                </CAlert>
              )}
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-service">Service Required</CFormLabel>
              <CFormSelect
                id="inquiry-service"
                value={form.serviceRequired}
                onChange={(event) => updateForm({ serviceRequired: event.target.value })}
              >
                {serviceOptions.map((service) => (
                  <option key={service.value || 'none'} value={service.value}>
                    {service.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-date">Date of Inquiry</CFormLabel>
              <CFormInput
                id="inquiry-date"
                type="text"
                inputMode="numeric"
                maxLength={10}
                pattern="\d{4}-\d{2}-\d{2}"
                placeholder="YYYY-MM-DD"
                value={form.inquiryDate}
                onChange={(event) => updateForm({ inquiryDate: event.target.value })}
                onBlur={trimOnBlur('inquiryDate')}
              />
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-source">Inquiry Source</CFormLabel>
              <CFormSelect
                id="inquiry-source"
                value={form.source}
                onChange={(event) => updateForm({ source: event.target.value })}
              >
                <option value="">Select source</option>
                {inquirySources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-status">Status</CFormLabel>
              <CFormSelect
                id="inquiry-status"
                value={form.status}
                onChange={(event) => updateForm({ status: event.target.value })}
              >
                {inquiryStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md={6} xl={4}>
              <CFormLabel htmlFor="inquiry-source-remarks">Source Remarks</CFormLabel>
              <CFormInput
                id="inquiry-source-remarks"
                value={form.sourceRemarks}
                placeholder="Example: SSS Telegram group"
                onChange={(event) => updateForm({ sourceRemarks: event.target.value })}
                onBlur={trimOnBlur('sourceRemarks')}
              />
            </CCol>
            <CCol xs={12}>
              <CFormLabel htmlFor="inquiry-remarks">Remarks</CFormLabel>
              <CFormTextarea
                id="inquiry-remarks"
                rows={4}
                value={form.remarks}
                placeholder="Requested scope, urgency, quoted context, next action"
                onChange={(event) => updateForm({ remarks: event.target.value })}
              />
            </CCol>
            <CCol xs={12}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <CFormLabel htmlFor="inquiry-proof" className="mb-0">
                  Screenshot Proofs
                </CFormLabel>
                {(proofProcessing || form.proofs?.length > 0) && (
                  <span className="text-muted">
                    {proofProcessing
                      ? 'Processing screenshots...'
                      : `${form.proofs.length} image${form.proofs.length === 1 ? '' : 's'} attached`}
                  </span>
                )}
              </div>
              <CFormInput
                id="inquiry-proof"
                key={proofInputKey}
                className="mt-2"
                type="file"
                accept="image/*"
                multiple
                disabled={proofProcessing}
                onChange={(event) => handleProofFileChange(event.target.files)}
              />
              {form.proofs?.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-3">
                  {form.proofs.map((proof, index) => (
                    <div
                      key={proof.localId || `${proof.originalName}-${index}`}
                      className="border rounded p-2 bg-white"
                      style={{ width: 176 }}
                    >
                      <LoadingImage
                        src={proof.dataUrl}
                        alt={proof.originalName || `Inquiry proof ${index + 1}`}
                        className="rounded border bg-white w-100"
                        style={{ height: 104, objectFit: 'cover' }}
                        placeholderStyle={{ minHeight: 104, height: 104 }}
                      />
                      <div className="small text-truncate mt-2" title={proof.originalName}>
                        {proof.originalName || `Proof ${index + 1}`}
                      </div>
                      <CButton
                        type="button"
                        size="sm"
                        color="secondary"
                        variant="outline"
                        className="mt-2 w-100"
                        disabled={saving || proofProcessing}
                        onClick={() => removeProof(index)}
                      >
                        Remove
                      </CButton>
                    </div>
                  ))}
                </div>
              )}
            </CCol>
            <CCol xs={12}>
              <div className="d-flex justify-content-end gap-2 flex-wrap">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Reset
                </CButton>
                <CButton
                  size="sm"
                  color="primary"
                  disabled={saving || proofProcessing}
                  onClick={handleSubmit}
                >
                  {saving ? 'Saving...' : 'Save Inquiry'}
                </CButton>
              </div>
            </CCol>
          </CRow>
        </CCardBody>
      </CCard>
    </InquiryShell>
  )
}

export default InquiryCreate
