import React, { useEffect, useState } from 'react'
import { CBadge, CButton, CCol, CFormInput, CFormLabel, CRow } from '@coreui/react'
import EvidenceCard from './FirstTouchEvidencePreview'

const clipboardFileExtension = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const createClipboardFile = (blob, index) => {
  if (!blob) return null
  if (blob instanceof File && blob.name) return blob
  const extension = clipboardFileExtension[blob.type] || 'png'
  return new File([blob], `pasted-screenshot-${Date.now()}-${index + 1}.${extension}`, {
    type: blob.type,
  })
}

const FirstTouchEvidenceEditor = ({
  proofs = [],
  maxFiles = 3,
  inputId = 'first-touch-proof',
  evidenceRequired = true,
  busy = false,
  invalid = false,
  errorId,
  onAdd,
  onReplace,
  onRemove,
}) => {
  const [pendingRemovalId, setPendingRemovalId] = useState(null)
  const [clipboardMessage, setClipboardMessage] = useState('')
  const remainingSlots = Math.max(maxFiles - proofs.length, 0)

  useEffect(() => {
    if (!proofs.some((proof) => proof.id === pendingRemovalId)) setPendingRemovalId(null)
  }, [pendingRemovalId, proofs])

  const confirmRemoval = () => {
    const index = proofs.findIndex((proof) => proof.id === pendingRemovalId)
    if (index >= 0) onRemove(index)
    setPendingRemovalId(null)
  }

  const addClipboardFiles = (files) => {
    if (!files.length) {
      setClipboardMessage('The clipboard does not contain an image.')
      return
    }
    setClipboardMessage('')
    onAdd(files)
  }

  const handlePaste = (event) => {
    if (!remainingSlots || busy) return
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item, index) => createClipboardFile(item.getAsFile(), index))
      .filter(Boolean)
    if (files.length) event.preventDefault()
    addClipboardFiles(files)
  }

  const pasteFromClipboard = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.read) {
      setClipboardMessage('Clipboard access is unavailable. Focus this button and press Ctrl+V.')
      return
    }
    try {
      const clipboardItems = await navigator.clipboard.read()
      const blobs = await Promise.all(
        clipboardItems.map(async (item) => {
          const imageType = item.types.find((type) => type.startsWith('image/'))
          return imageType ? item.getType(imageType) : null
        }),
      )
      addClipboardFiles(
        blobs.filter(Boolean).map((blob, index) => createClipboardFile(blob, index)),
      )
    } catch {
      setClipboardMessage('Clipboard access was blocked. Focus this button and press Ctrl+V.')
    }
  }

  return (
    <div className="first-touch-evidence-editor" onPaste={handlePaste}>
      <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
        <CFormLabel htmlFor={inputId} className="mb-0">
          Screenshot or image evidence
        </CFormLabel>
        <span className="small text-muted" aria-live="polite">
          {proofs.length} / {maxFiles}
        </span>
      </div>
      <div className="small text-muted mb-2" id={`${inputId}-help`}>
        Add up to {maxFiles} JPG, PNG, WebP or GIF images, maximum 8 MB each. Choose files or paste
        a screenshot. Redact unrelated personal data.
      </div>
      <div className="d-flex flex-column flex-sm-row gap-2">
        <CFormInput
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          disabled={!remainingSlots || busy}
          aria-invalid={invalid || undefined}
          aria-describedby={[`${inputId}-help`, errorId].filter(Boolean).join(' ') || undefined}
          onChange={(event) => {
            onAdd(event.target.files)
            event.target.value = ''
          }}
        />
        <CButton
          type="button"
          color="secondary"
          variant="outline"
          className="flex-shrink-0"
          disabled={!remainingSlots || busy}
          onClick={pasteFromClipboard}
        >
          Paste screenshot
        </CButton>
      </div>
      {clipboardMessage ? (
        <div className="small text-warning-emphasis mt-2" role="status">
          {clipboardMessage}
        </div>
      ) : null}
      {!remainingSlots ? (
        <div className="small text-muted mt-2" role="status">
          All evidence slots are in use. Remove or replace an image to make a change.
        </div>
      ) : null}
      {busy ? (
        <div className="small text-muted mt-2" role="status">
          Reading the selected image…
        </div>
      ) : null}

      {proofs.length ? (
        <CRow className="g-3 mt-1">
          {proofs.map((proof, index) => {
            const removalPending = pendingRemovalId === proof.id
            return (
              <CCol xs={12} md={6} key={proof.id || index}>
                <div className="first-touch-evidence-slot h-100">
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <span className="small fw-semibold">Evidence {index + 1}</span>
                    <CBadge color={proof.evidenceState === 'existing' ? 'secondary' : 'info'}>
                      {proof.evidenceState === 'existing' ? 'Saved' : 'New'}
                    </CBadge>
                  </div>
                  <EvidenceCard proof={proof} compact />
                  {removalPending ? (
                    <div className="first-touch-evidence-remove mt-2" role="alert">
                      <div className="small mb-2">
                        Remove this image from the evidence record when changes are saved?
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <CButton color="danger" size="sm" onClick={confirmRemoval}>
                          Confirm remove
                        </CButton>
                        <CButton
                          color="secondary"
                          variant="outline"
                          size="sm"
                          onClick={() => setPendingRemovalId(null)}
                        >
                          Keep image
                        </CButton>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex gap-2 flex-wrap mt-2">
                      {proof.previewUrl ? (
                        <CButton
                          color="secondary"
                          variant="outline"
                          size="sm"
                          href={proof.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open preview
                        </CButton>
                      ) : null}
                      <label
                        className={`btn btn-outline-secondary btn-sm mb-0${busy ? ' disabled' : ''}`}
                        aria-disabled={busy || undefined}
                      >
                        Replace
                        <input
                          className="visually-hidden"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          aria-label={`Replace evidence ${index + 1}`}
                          disabled={busy}
                          onChange={(event) => {
                            onReplace(index, event.target.files)
                            event.target.value = ''
                          }}
                        />
                      </label>
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => setPendingRemovalId(proof.id)}
                      >
                        Remove
                      </CButton>
                    </div>
                  )}
                </div>
              </CCol>
            )
          })}
        </CRow>
      ) : (
        <div className="first-touch-evidence-empty mt-3">
          {evidenceRequired
            ? 'No images attached yet. At least one image is required.'
            : 'No supporting images attached.'}
        </div>
      )}
    </div>
  )
}

export default FirstTouchEvidenceEditor
