import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
  CSpinner,
} from '@coreui/react'
import dialog from '../dialog/dialogService'
import { showToast } from '../toast/toastService'
import {
  getPersonalSignature,
  uploadPersonalSignature,
  validateSignatureFile,
} from './signatureApi'

const formatFileSize = (size) => `${(size / (1024 * 1024)).toFixed(1)} MB`

const PersonalSignature = ({ onClose, onStatusChange }) => {
  const fileInputRef = useRef(null)
  const [signatureFile, setSignatureFile] = useState(null)
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasExistingSignature = Boolean(currentSignatureUrl)
  const hasSelectedFile = Boolean(signatureFile)
  const activePreviewUrl = previewUrl || currentSignatureUrl
  const saveDisabled = loading || saving || !hasSelectedFile || Boolean(error)

  const statusText = useMemo(() => {
    if (loading) return 'Checking signature...'
    if (error && !activePreviewUrl) return 'Signature status unavailable'
    if (hasSelectedFile) return 'New signature selected'
    return hasExistingSignature ? 'Signature uploaded' : 'Signature missing'
  }, [activePreviewUrl, error, hasExistingSignature, hasSelectedFile, loading])

  useEffect(() => {
    onStatusChange?.({ signatureUploaded: hasExistingSignature })
  }, [hasExistingSignature, onStatusChange])

  useEffect(() => {
    let ignore = false

    const fetchSignature = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getPersonalSignature()
        if (!ignore) {
          setCurrentSignatureUrl(data.url || null)
          setPreviewUrl(null)
        }
      } catch (fetchError) {
        if (!ignore) setError(fetchError.message || 'Failed to load signature.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchSignature()

    return () => {
      ignore = true
    }
  }, [])

  const resetSelectedFile = () => {
    setSignatureFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    setError('')
    setSignatureFile(null)
    setPreviewUrl(null)

    if (!file) return

    const validationError = validateSignatureFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }

    setSignatureFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSaveSignature = async () => {
    if (!signatureFile) {
      setError('Select a signature file before saving.')
      return
    }

    if (hasExistingSignature && !(await dialog.confirm('Replace existing signature?'))) {
      return
    }

    setSaving(true)
    setError('')
    try {
      const data = await uploadPersonalSignature(signatureFile)

      setCurrentSignatureUrl(data.url)
      setPreviewUrl(null)
      setSignatureFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      showToast('Signature saved.')
      window.dispatchEvent(new Event('kijo:signature-updated'))
      onStatusChange?.({ signatureUploaded: true })
      onClose?.()
    } catch (saveError) {
      setError(saveError.message || 'Error saving signature.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CCard className="account-card records-page-card">
      <CCardHeader className="account-card-header records-page-card-header">
        <div>
          <strong>Personal Signature</strong>
        </div>
      </CCardHeader>
      <CCardBody className="records-page-card-body">
        {error && (
          <CAlert id="signatureUpload-error" color="danger" className="mb-3" aria-live="assertive">
            {error}
          </CAlert>
        )}

        <CRow className="g-4">
          <CCol lg={5}>
            <div className="account-signature-preview-panel">
              <div className="account-signature-preview-heading">
                <strong>Current Signature</strong>
                <span>{statusText}</span>
              </div>
              <div className="account-signature-preview-box" aria-live="polite">
                {loading ? (
                  <div className="account-empty-state">
                    <CSpinner size="sm" aria-hidden="true" />
                    <span>Checking for existing signature...</span>
                  </div>
                ) : activePreviewUrl ? (
                  <img src={activePreviewUrl} alt="Current personal signature preview" />
                ) : (
                  <div className="account-empty-state">
                    <strong>No signature uploaded</strong>
                    <span>
                      Upload a signature before issuing invoice documents that require it.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CCol>

          <CCol lg={7}>
            <div className="account-upload-panel">
              <CFormLabel htmlFor="signatureUpload" className="account-field-label">
                Upload Signature
              </CFormLabel>
              <CFormInput
                ref={fileInputRef}
                type="file"
                id="signatureUpload"
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                disabled={loading || saving}
                invalid={Boolean(error)}
                aria-describedby={error ? 'signatureUpload-error' : undefined}
              />

              {hasSelectedFile && (
                <CAlert color="info" className="mt-3 mb-0">
                  Selected {signatureFile.name} ({formatFileSize(signatureFile.size)}).
                </CAlert>
              )}

              <div className="account-form-actions account-form-actions--flush">
                <CButton
                  color="primary"
                  size="sm"
                  onClick={handleSaveSignature}
                  disabled={saveDisabled}
                >
                  {saving ? 'Saving...' : 'Save Signature'}
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={resetSelectedFile}
                  disabled={!hasSelectedFile || saving}
                >
                  Clear Selection
                </CButton>
              </div>
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </CCard>
  )
}

export default PersonalSignature
