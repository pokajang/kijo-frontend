import React, { useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCol,
  CFormLabel,
  CFormSelect,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CSpinner,
} from '@coreui/react'
import { apiFetch } from '../../../api/apiClient'
import { isTrustedAssetUrl, resolveAssetUrl } from '../../../utils/assetUrls'

const getExtension = (value = '') => String(value).split('.').pop()?.toLowerCase() || ''
const initialPreviewState = { status: 'idle', objectUrl: '', error: '' }

const normalizeMimeType = (value = '') => String(value).split(';')[0].trim().toLowerCase()

const safeDownloadName = (value = '') => {
  const name = String(value).split(/[\\/]/).pop()?.trim()
  return name || 'attachment'
}

const getPreviewInfo = (attachment) => {
  const rawUrl = resolveAssetUrl(attachment?.fileUrl)
  const extension = getExtension(attachment?.fileName || attachment?.fileUrl)
  const isSafeUrl = isTrustedAssetUrl(rawUrl)

  if (!isSafeUrl) {
    return { type: 'blocked', url: '' }
  }
  if (['jpg', 'jpeg', 'png'].includes(extension)) {
    return { type: 'image', url: rawUrl }
  }
  if (extension === 'pdf') {
    return { type: 'pdf', url: rawUrl }
  }
  return { type: 'unsupported', url: '' }
}

/**
 * @param {boolean} visible
 * @param {() => void} onClose
 * @param {Array<{id:number,fileName:string,fileUrl:string}>} attachments
 */
export default function AttachmentsModal({ visible, onClose, attachments }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [previewState, setPreviewState] = useState(initialPreviewState)

  useEffect(() => {
    if (!visible) {
      setSelectedIndex(0)
    } else if (attachments && attachments.length > 0) {
      setSelectedIndex(0)
    }
  }, [visible, attachments])

  const chosen = attachments?.[selectedIndex]
  const preview = getPreviewInfo(chosen)

  useEffect(() => {
    if (!visible || !chosen || !['image', 'pdf'].includes(preview.type)) {
      setPreviewState(initialPreviewState)
      return undefined
    }

    const controller = new AbortController()
    let active = true
    let objectUrl = ''
    const expectedMimeTypes =
      preview.type === 'pdf' ? new Set(['application/pdf']) : new Set(['image/jpeg', 'image/png'])

    setPreviewState({ ...initialPreviewState, status: 'loading' })

    const loadPreview = async () => {
      try {
        const response = await apiFetch(preview.url, {
          credentials: 'include',
          headers: {
            Accept: preview.type === 'pdf' ? 'application/pdf' : 'image/jpeg, image/png',
          },
          signal: controller.signal,
          silentError: true,
        })

        if (!response.ok) {
          const payload = await response
            .clone()
            .json()
            .catch(() => ({}))
          throw new Error(
            payload?.message || 'The attachment could not be loaded. Please try again.',
          )
        }

        const mimeType = normalizeMimeType(response.headers.get('content-type'))
        if (!expectedMimeTypes.has(mimeType)) {
          throw new Error('The attachment has an unsupported file type.')
        }

        const blob = await response.blob()
        if (preview.type === 'pdf' && (await blob.slice(0, 5).text()) !== '%PDF-') {
          throw new Error('The attachment is not a valid PDF file.')
        }
        if (!active) return

        objectUrl = URL.createObjectURL(blob)
        setPreviewState({ status: 'ready', objectUrl, error: '' })
      } catch (error) {
        if (!active || error?.name === 'AbortError') return
        setPreviewState({
          ...initialPreviewState,
          status: 'error',
          error: error?.message || 'The attachment could not be loaded. Please try again.',
        })
      }
    }

    loadPreview()

    return () => {
      active = false
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [chosen, preview.type, preview.url, reloadKey, visible])

  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>Attachments</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {attachments.length > 1 && (
          <CRow className="mb-3">
            <CCol md={12}>
              <CFormLabel>Select a file to preview</CFormLabel>
              <CFormSelect
                value={selectedIndex}
                onChange={(event) => setSelectedIndex(Number(event.target.value))}
              >
                {attachments.map((attachment, index) => (
                  <option key={attachment.id || index} value={index}>
                    {attachment.fileName}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
        )}
        {chosen && (
          <CRow>
            <CCol>
              {previewState.status === 'loading' && (
                <div
                  className="d-flex align-items-center justify-content-center gap-2 py-5 text-body-secondary"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <CSpinner size="sm" />
                  <span>Loading attachment…</span>
                </div>
              )}
              {previewState.status === 'error' && (
                <CAlert color="danger" className="mb-0">
                  {previewState.error}
                </CAlert>
              )}
              {preview.type === 'image' && previewState.status === 'ready' && (
                <img
                  src={previewState.objectUrl}
                  alt={chosen.fileName}
                  style={{
                    width: '100%',
                    maxHeight: '500px',
                    objectFit: 'contain',
                    border: '1px solid var(--app-border-card)',
                    borderRadius: 4,
                  }}
                />
              )}
              {preview.type === 'pdf' && previewState.status === 'ready' && (
                <div>
                  <p className="small text-body-secondary mb-2">
                    PDF loaded. If the preview does not appear in your browser, use Download below.
                  </p>
                  <iframe
                    src={previewState.objectUrl}
                    title={chosen.fileName}
                    style={{
                      width: '100%',
                      height: 'min(70vh, 720px)',
                      border: '1px solid var(--app-border-card)',
                      borderRadius: 4,
                    }}
                  />
                </div>
              )}
              {preview.type === 'unsupported' && (
                <p className="mb-0">Preview is available only for PDF and image attachments.</p>
              )}
              {preview.type === 'blocked' && (
                <p className="mb-0">This attachment URL cannot be previewed safely.</p>
              )}
            </CCol>
          </CRow>
        )}
      </CModalBody>
      <CModalFooter>
        {previewState.status === 'error' && ['image', 'pdf'].includes(preview.type) && (
          <CButton color="primary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            Retry
          </CButton>
        )}
        {previewState.status === 'ready' && (
          <CButton
            color="primary"
            size="sm"
            as="a"
            href={previewState.objectUrl}
            download={safeDownloadName(chosen.fileName)}
          >
            Download
          </CButton>
        )}
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
