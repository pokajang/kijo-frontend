import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CAlert,
  CFormLabel,
  CFormInput,
  CButton,
  CRow,
  CCol,
} from '@coreui/react'
import dialog from '../dialog/dialogService'

const PersonalSignature = ({ onClose }) => {
  const [signatureFile, setSignatureFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasChecked, setHasChecked] = useState(false)

  // 1) Load existing signature on mount
  useEffect(() => {
    const fetchSignature = async () => {
      try {
        setLoading(true)
        const res = await fetch(`${import.meta.env.VITE_API_BASE}signature`, {
          credentials: 'include',
        })
        const data = await res.json()
        if (data.status === 'success' && data.url) {
          setPreviewUrl(data.url)
        }
      } catch {
        setError('Failed to load signature.')
      } finally {
        setHasChecked(true)
        setLoading(false)
      }
    }
    fetchSignature()
  }, [])

  // 2) Handle new file selection (unchanged)
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Please select a JPEG or PNG image.')
      return
    }
    if (previewUrl && !(await dialog.confirm('Replace existing signature?'))) {
      e.target.value = null
      return
    }
    setSignatureFile(file)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result)
    reader.readAsDataURL(file)
  }

  // 3) Upload & save signature (unchanged)
  const handleSaveSignature = async () => {
    if (!signatureFile) {
      setError('No file selected.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('signature', signatureFile)
      const res = await fetch(`${import.meta.env.VITE_API_BASE}signature`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (data.status === 'success' && data.url) {
        setPreviewUrl(data.url)
        onClose?.()
      } else {
        setError(data.message || 'Save failed.')
      }
    } catch {
      setError('Error saving signature.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CCard>
      <CCardBody>
        <CRow className="mb-3">
          <CCol>
            <CAlert color="primary">
              <strong>
                Upload image with transparent background (.png). Your digital signature will be used
                for official invoicing.
              </strong>
            </CAlert>
            <CFormLabel htmlFor="signatureUpload">Upload Signature (JPEG or PNG)</CFormLabel>
            <CFormInput
              type="file"
              id="signatureUpload"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
            />
          </CCol>
        </CRow>

        {loading && <p>Loading...</p>}
        {error && <CAlert color="danger">{error}</CAlert>}

        <CRow className="mb-3">
          <CCol>
            <CFormLabel>Current Signature</CFormLabel>
            {hasChecked ? (
              <CAlert color={previewUrl ? 'success' : 'warning'}>
                {previewUrl
                  ? 'A signature file is present.'
                  : 'No signature found. If you previously uploaded one, please upload again.'}
              </CAlert>
            ) : (
              <CAlert color="secondary">Checking for existing signature...</CAlert>
            )}
          </CCol>
        </CRow>

        <CRow>
          <CCol className="text-end">
            <CButton color="primary" onClick={handleSaveSignature} disabled={loading}>
              {loading ? 'Saving...' : 'Save Signature'}
            </CButton>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default PersonalSignature
