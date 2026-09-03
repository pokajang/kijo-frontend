import React, { useCallback, useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput } from '@coreui/react'

export const PAYMENT_PROOF_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])
export const MAX_PAYMENT_PROOF_SIZE = 5 * 1024 * 1024
export const MAX_PAYMENT_PROOF_TOTAL = 20 * 1024 * 1024
export const MAX_PAYMENT_PROOFS = 5

export const getPaymentProofValidationError = (proofs, maxFiles = MAX_PAYMENT_PROOFS) => {
  if (proofs.length > maxFiles) return `You can attach up to ${maxFiles} evidence file(s).`
  if (proofs.some(({ file }) => !PAYMENT_PROOF_TYPES.has(file.type))) {
    return 'Evidence must be a PDF, JPG, or PNG file.'
  }
  if (proofs.some(({ file }) => file.size > MAX_PAYMENT_PROOF_SIZE)) {
    return 'Each evidence file must not exceed 5 MB.'
  }
  if (proofs.reduce((total, { file }) => total + file.size, 0) > MAX_PAYMENT_PROOF_TOTAL) {
    return 'Payment evidence cannot exceed 20 MB in total.'
  }
  return ''
}

const fileKey = (item) => `${item.file.name}:${item.file.size}:${item.file.lastModified}`
const isTypingTarget = (target) =>
  target instanceof HTMLElement &&
  (target.matches('input, textarea, select') || target.isContentEditable)

const LocalFilePreview = ({ file }) => {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file.type.startsWith('image/') || typeof URL.createObjectURL !== 'function') {
      return undefined
    }
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return url ? (
    <img className="vendor-payment-proof-capture__thumbnail" src={url} alt="" />
  ) : (
    <span className="vendor-payment-proof-capture__filetype" aria-hidden="true">
      {file.type === 'application/pdf' ? 'PDF' : 'IMG'}
    </span>
  )
}

LocalFilePreview.propTypes = { file: PropTypes.instanceOf(File).isRequired }

const PaymentProofCapture = ({
  files,
  onChange,
  disabled = false,
  enabled = true,
  error = '',
  inputRef,
  maxFiles = MAX_PAYMENT_PROOFS,
}) => {
  const localInputRef = useRef(null)
  const resolvedInputRef = inputRef || localInputRef
  const [captureError, setCaptureError] = useState('')

  useEffect(() => {
    if (!enabled || files.length === 0) setCaptureError('')
  }, [enabled, files.length])

  const addFiles = useCallback(
    (incoming, captureMethod) => {
      const known = new Set(files.map(fileKey))
      const additions = Array.from(incoming || [])
        .map((file) => ({ file, captureMethod }))
        .filter((item) => {
          const key = fileKey(item)
          if (known.has(key)) return false
          known.add(key)
          return true
        })
      if (files.length + additions.length > maxFiles) {
        setCaptureError(`Only the first ${maxFiles} evidence file(s) were added.`)
      } else {
        setCaptureError('')
      }
      onChange([...files, ...additions].slice(0, maxFiles))
    },
    [files, maxFiles, onChange],
  )

  useEffect(() => {
    if (disabled || !enabled) return undefined
    const handlePaste = (event) => {
      if (isTypingTarget(event.target)) return
      const clipboardFiles = Array.from(event.clipboardData?.files || [])
      const itemFiles = Array.from(event.clipboardData?.items || [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter(Boolean)
      const images = (clipboardFiles.length ? clipboardFiles : itemFiles).filter((file) =>
        ['image/jpeg', 'image/png'].includes(file.type),
      )
      if (!images.length) return
      event.preventDefault()
      const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
      const named = images.map(
        (file, index) =>
          new File(
            [file],
            `payment-proof-${timestamp}-${index + 1}.${file.type === 'image/png' ? 'png' : 'jpg'}`,
            {
              type: file.type,
              lastModified: Date.now(),
            },
          ),
      )
      addFiles(named, 'paste')
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [addFiles, disabled, enabled])

  return (
    <div className={`vendor-payment-proof-capture ${error || captureError ? 'is-invalid' : ''}`}>
      <div className="vendor-payment-proof-capture__dropzone">
        <strong>Attach payment evidence</strong>
        <div className="small text-body-secondary mt-1">
          Paste a screenshot here with Ctrl+V, or choose PDF, JPG, or PNG files.
        </div>
        <CButton
          type="button"
          size="sm"
          color="primary"
          variant="outline"
          className="mt-2"
          disabled={disabled || files.length >= maxFiles}
          onClick={() => resolvedInputRef.current?.click()}
        >
          Choose files
        </CButton>
        <CFormInput
          ref={resolvedInputRef}
          className="visually-hidden"
          type="file"
          multiple
          accept="application/pdf,image/jpeg,image/png"
          disabled={disabled}
          onChange={(event) => {
            addFiles(event.target.files, 'upload')
            event.target.value = ''
          }}
          aria-label="Choose payment evidence files"
        />
      </div>
      {files.length > 0 && (
        <ul className="vendor-payment-proof-capture__files" aria-label="Evidence ready to attach">
          {files.map((item, index) => (
            <li key={fileKey(item)}>
              <LocalFilePreview file={item.file} />
              <div className="min-w-0">
                <strong className="d-block text-truncate">{item.file.name}</strong>
                <span className="small text-body-secondary">
                  {(item.file.size / 1024 / 1024).toFixed(2)} MB ·{' '}
                  {item.captureMethod === 'paste' ? 'Pasted screenshot' : 'Uploaded file'}
                </span>
              </div>
              <CButton
                type="button"
                size="sm"
                color="danger"
                variant="ghost"
                disabled={disabled}
                aria-label={`Remove ${item.file.name}`}
                onClick={() => {
                  setCaptureError('')
                  onChange(files.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                Remove
              </CButton>
            </li>
          ))}
        </ul>
      )}
      <div className="form-text">
        Maximum {maxFiles} {maxFiles === 1 ? 'file' : 'files'}, 5 MB each and 20 MB total.
      </div>
      {captureError && <div className="invalid-feedback d-block">{captureError}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  )
}

PaymentProofCapture.propTypes = {
  disabled: PropTypes.bool,
  enabled: PropTypes.bool,
  error: PropTypes.string,
  files: PropTypes.arrayOf(
    PropTypes.shape({
      file: PropTypes.instanceOf(File).isRequired,
      captureMethod: PropTypes.string,
    }),
  ).isRequired,
  inputRef: PropTypes.shape({ current: PropTypes.any }),
  maxFiles: PropTypes.number,
  onChange: PropTypes.func.isRequired,
}

export default PaymentProofCapture
