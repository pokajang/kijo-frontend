import React, { useEffect, useState } from 'react'
import LoadingImage from '../../../components/LoadingImage'
import {
  CAlert,
  CButton,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import useDuplicateChecker from '../../../hooks/useDuplicateChecker'
import {
  MAX_PROOF_IMAGE_BYTES,
  compressProofImage,
  createBlankInquiry,
  fileToDataUrl,
  getInquiryProofUrl,
  inquirySources,
  inquiryStatuses,
  saveInquiry,
  serviceOptions,
} from './inquiryUtils'

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

const InquiryEditModal = ({ visible, inquiry, onClose, onSaved }) => {
  const [form, setForm] = useState(() => ({ ...createBlankInquiry(), ...inquiry }))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [proofProcessing, setProofProcessing] = useState(false)
  const [proofInputKey, setProofInputKey] = useState(Date.now())
  const [proofChanged, setProofChanged] = useState(false)
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
    if (visible) {
      setForm({ ...createBlankInquiry(), ...inquiry })
      setError('')
      setSaving(false)
      setProofProcessing(false)
      setProofInputKey(Date.now())
      setProofChanged(false)
    }
  }, [inquiry, visible])

  useEffect(() => {
    if (!visible) return

    const fetchDuplicateDatasets = async () => {
      try {
        const [companyRes, picRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE}client-companies/basic`, {
            credentials: 'include',
          }),
          fetch(`${import.meta.env.VITE_API_BASE}client-pics`, {
            credentials: 'include',
          }),
        ])
        const [companyResult, picResult] = await Promise.all([companyRes.json(), picRes.json()])
        if (companyResult.status === 'success') setClientDatabase(companyResult.data || [])
        if (picResult.status === 'success') setPicDatabase(picResult.data || [])
      } catch (err) {
        console.error('Failed to fetch duplicate check datasets:', err)
      }
    }

    fetchDuplicateDatasets()
  }, [visible])

  const updateForm = (updates) => setForm((current) => ({ ...current, ...updates }))

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
        setProofChanged(true)
      }
    } catch (err) {
      setError('Unable to process screenshot proofs.')
    } finally {
      setProofProcessing(false)
      setProofInputKey(Date.now())
    }
  }

  const removeProof = (index) => {
    setForm((current) => {
      const proof = current.proofs?.[index]
      const removedProofIds = proof?.id
        ? [...(current.removedProofIds || []), proof.id]
        : current.removedProofIds || []

      return {
        ...current,
        proofs: (current.proofs || []).filter((_, proofIndex) => proofIndex !== index),
        removedProofIds,
      }
    })
    setProofChanged(true)
  }

  const saveChanges = async () => {
    if (!form.companyName.trim()) {
      setError('Company name is required.')
      return
    }
    if (!form.mobile.trim() && !form.email.trim()) {
      setError('Mobile or email is required.')
      return
    }
    if (!form.serviceRequired) {
      setError('Service required is required.')
      return
    }
    if (!form.inquiryDate) {
      setError('Inquiry date is required.')
      return
    }
    if (!isValidISODate(form.inquiryDate)) {
      setError('Inquiry date must use YYYY-MM-DD format.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const saved = await saveInquiry(form, { includeProof: proofChanged })
      onSaved?.(saved)
    } catch (err) {
      setError(err?.message || 'Unable to update inquiry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CModal visible={visible} onClose={saving ? undefined : onClose} alignment="center" size="xl">
      <CModalHeader>
        <CModalTitle>Edit Inquiry</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {error && (
          <CAlert color="danger" className="mb-3">
            {error}
          </CAlert>
        )}
        <CRow className="g-3">
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="edit-inquiry-company">Company Name</CFormLabel>
            <CFormInput
              id="edit-inquiry-company"
              value={form.companyName}
              onChange={(event) => updateForm({ companyName: event.target.value })}
              onBlur={trimOnBlur('companyName')}
            />
            {isDuplicateCompany && (
              <CAlert color="danger" className="mt-2 mb-0 py-2">
                <strong>{duplicateCompanyName}</strong> already exists. If this is a branch, append
                a branch remark in the name, for example:
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
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="edit-inquiry-ssm">SSM Number</CFormLabel>
            <CFormInput
              id="edit-inquiry-ssm"
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
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="edit-inquiry-tin">Tax Id. No. (TIN)</CFormLabel>
            <CFormInput
              id="edit-inquiry-tin"
              value={form.taxIdNoTin}
              placeholder="e.g., C1234567890"
              onChange={(event) => updateForm({ taxIdNoTin: event.target.value })}
              onBlur={trimOnBlur('taxIdNoTin')}
            />
          </CCol>
          <CCol xs={12}>
            <CFormLabel htmlFor="edit-inquiry-address">Address</CFormLabel>
            <CFormInput
              id="edit-inquiry-address"
              value={form.address}
              onChange={(event) => updateForm({ address: event.target.value })}
              onBlur={trimOnBlur('address')}
            />
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="edit-inquiry-city">City</CFormLabel>
            <CFormInput
              id="edit-inquiry-city"
              value={form.city}
              onChange={(event) => updateForm({ city: event.target.value })}
              onBlur={trimOnBlur('city')}
            />
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="edit-inquiry-state">State</CFormLabel>
            <CFormInput
              id="edit-inquiry-state"
              value={form.state}
              onChange={(event) => updateForm({ state: event.target.value })}
              onBlur={trimOnBlur('state')}
            />
          </CCol>
          <CCol xs={12} md={4}>
            <CFormLabel htmlFor="edit-inquiry-zip">Postcode</CFormLabel>
            <CFormInput
              id="edit-inquiry-zip"
              value={form.zip}
              onChange={(event) => updateForm({ zip: event.target.value })}
              onBlur={trimOnBlur('zip')}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="edit-inquiry-contact">Contact Name</CFormLabel>
            <CFormInput
              id="edit-inquiry-contact"
              value={form.contactName}
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
          <CCol xs={12} md={6} lg={4}>
            <CFormLabel htmlFor="edit-inquiry-mobile">Mobile</CFormLabel>
            <CFormInput
              id="edit-inquiry-mobile"
              value={form.mobile}
              onChange={(event) => updateForm({ mobile: event.target.value })}
              onBlur={trimOnBlur('mobile')}
            />
          </CCol>
          <CCol xs={12} md={6} lg={4}>
            <CFormLabel htmlFor="edit-inquiry-email">Email</CFormLabel>
            <CFormInput
              id="edit-inquiry-email"
              type="email"
              value={form.email}
              onChange={(event) => updateForm({ email: event.target.value })}
              onBlur={trimOnBlur('email')}
            />
            {isDuplicateEmail && (
              <CAlert color="warning" className="mt-2 mb-0 py-2">
                <strong>{duplicateEmail}</strong> is already used by another contact.
              </CAlert>
            )}
          </CCol>
          <CCol xs={12} md={6} lg={4}>
            <CFormLabel htmlFor="edit-inquiry-date">Inquiry Date</CFormLabel>
            <CFormInput
              id="edit-inquiry-date"
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
          <CCol xs={12} md={6} lg={4}>
            <CFormLabel htmlFor="edit-inquiry-service">Service Required</CFormLabel>
            <CFormSelect
              id="edit-inquiry-service"
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
          <CCol xs={12} md={6} lg={4}>
            <CFormLabel htmlFor="edit-inquiry-source">Source</CFormLabel>
            <CFormSelect
              id="edit-inquiry-source"
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
          <CCol xs={12} md={6} lg={4}>
            <CFormLabel htmlFor="edit-inquiry-status">Status</CFormLabel>
            <CFormSelect
              id="edit-inquiry-status"
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
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="edit-inquiry-source-remarks">Source Remarks</CFormLabel>
            <CFormInput
              id="edit-inquiry-source-remarks"
              value={form.sourceRemarks}
              onChange={(event) => updateForm({ sourceRemarks: event.target.value })}
              onBlur={trimOnBlur('sourceRemarks')}
            />
          </CCol>
          <CCol xs={12} md={6}>
            <CFormLabel htmlFor="edit-inquiry-proof">Add Screenshot Proofs</CFormLabel>
            <CFormInput
              id="edit-inquiry-proof"
              key={proofInputKey}
              type="file"
              accept="image/*"
              multiple
              disabled={proofProcessing}
              onChange={(event) => handleProofFileChange(event.target.files)}
            />
            {(proofProcessing || form.proofs?.length > 0) && (
              <div className="text-muted mt-1">
                {proofProcessing
                  ? 'Processing screenshots...'
                  : `${form.proofs.length} image${form.proofs.length === 1 ? '' : 's'} attached`}
              </div>
            )}
          </CCol>
          {form.proofs?.length > 0 && (
            <CCol xs={12}>
              <div className="d-flex flex-wrap gap-2">
                {form.proofs.map((proof, index) => (
                  <div
                    key={proof.id || proof.localId || `${proof.originalName}-${index}`}
                    className="border rounded p-2 app-proof-card"
                    style={{ width: 176 }}
                  >
                    <LoadingImage
                      src={getInquiryProofUrl(form.id, proof)}
                      alt={proof.originalName || `Inquiry proof ${index + 1}`}
                      className="rounded border app-proof-image w-100"
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
            </CCol>
          )}
          <CCol xs={12}>
            <CFormLabel htmlFor="edit-inquiry-remarks">Remarks</CFormLabel>
            <CFormTextarea
              id="edit-inquiry-remarks"
              rows={4}
              value={form.remarks}
              onChange={(event) => updateForm({ remarks: event.target.value })}
            />
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" disabled={saving} onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" disabled={saving || proofProcessing} onClick={saveChanges}>
          {saving ? 'Saving...' : 'Save Changes'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default InquiryEditModal
