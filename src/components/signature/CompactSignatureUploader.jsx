import React, { useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CAlert, CButton, CFormInput, CFormLabel } from '@coreui/react'
import { uploadPersonalSignature, validateSignatureFile } from './signatureApi'

const CompactSignatureUploader = ({ onUploaded = () => {}, disabled = false }) => {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const selectFile = (event) => {
    const nextFile = event.target.files?.[0] || null
    const validationError = validateSignatureFile(nextFile)
    setError(validationError)
    setFile(validationError ? null : nextFile)
    setPreviewUrl(null)
    if (validationError) {
      event.target.value = ''
      return
    }
    if (nextFile) {
      const reader = new FileReader()
      reader.onloadend = () => setPreviewUrl(reader.result)
      reader.readAsDataURL(nextFile)
    }
  }

  const upload = async () => {
    if (!file || saving) return
    setSaving(true)
    setError('')
    try {
      const signature = await uploadPersonalSignature(file)
      setFile(null)
      setPreviewUrl(null)
      if (inputRef.current) inputRef.current.value = ''
      window.dispatchEvent(new Event('kijo:signature-updated'))
      await onUploaded(signature)
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to upload signature.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <CFormLabel htmlFor="handbookSignatureUpload">Upload Personal Signature</CFormLabel>
      <CFormInput
        ref={inputRef}
        id="handbookSignatureUpload"
        type="file"
        accept="image/jpeg,image/png"
        onChange={selectFile}
        disabled={disabled || saving}
      />
      {previewUrl && (
        <div className="border rounded p-2 mt-2 text-center">
          <img
            src={previewUrl}
            alt="Selected signature preview"
            style={{ maxWidth: '100%', maxHeight: '110px' }}
          />
        </div>
      )}
      {error && (
        <CAlert color="danger" className="py-2 mt-2 mb-0">
          {error}
        </CAlert>
      )}
      <CButton
        color="secondary"
        size="sm"
        className="mt-2"
        onClick={upload}
        disabled={disabled || saving || !file}
      >
        {saving ? 'Uploading...' : 'Save Personal Signature'}
      </CButton>
    </div>
  )
}

CompactSignatureUploader.propTypes = {
  onUploaded: PropTypes.func,
  disabled: PropTypes.bool,
}

export default CompactSignatureUploader
