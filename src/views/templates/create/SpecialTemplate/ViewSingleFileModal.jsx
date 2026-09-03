// src/templates/create/SpecialTemplate/ViewSingleFileModal.jsx
import React, { useState, useEffect } from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
} from '@coreui/react'
import { isTrustedAssetUrl, resolveAssetUrl } from '../../../../utils/assetUrls'

const getExtension = (value = '') => String(value).split('.').pop()?.toLowerCase() || ''

/**
 * Preview a single file (existing or newly selected) in a modal.
 * Props:
 * - visible: boolean
 * - file: object with either { file: File, customName } or { fileName, fileUrl, mimeType }
 * - onClose: () => void
 */
export default function ViewSingleFileModal({ visible, file, onClose }) {
  const [blobUrl, setBlobUrl] = useState('')

  // Always run hook for blob URL creation
  useEffect(() => {
    if (file && file.file) {
      const url = URL.createObjectURL(file.file)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    // noop if existing file
    return undefined
  }, [file])

  if (!visible || !file) {
    return null
  }

  // Determine source for iframe/img
  const src = file.file ? blobUrl : resolveAssetUrl(file.fileUrl)

  const title = file.customName || file.fileName || (file.file && file.file.name) || 'Preview'
  const extension = getExtension(title || file.fileUrl)
  const isPdf =
    extension === 'pdf' ||
    file.mimeType === 'application/pdf' ||
    file.file?.type === 'application/pdf'
  const isImage =
    ['jpg', 'jpeg', 'png'].includes(extension) ||
    ['image/jpeg', 'image/png'].includes(file.mimeType || file.file?.type)
  const canPreview = file.file || isTrustedAssetUrl(src)

  return (
    <CModal visible={visible} onClose={onClose} size="xl" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>{title}</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CRow>
          <CCol>
            {!canPreview && <p className="mb-0">This attachment URL cannot be previewed safely.</p>}
            {canPreview && isPdf && (
              <iframe
                src={src}
                title={title}
                sandbox=""
                referrerPolicy="no-referrer"
                style={{
                  width: '100%',
                  height: '500px',
                  border: '1px solid var(--app-border-card)',
                  borderRadius: 4,
                }}
              />
            )}
            {canPreview && isImage && (
              <img
                src={src}
                alt={title}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '500px',
                  margin: '0 auto',
                  border: '1px solid var(--app-border-card)',
                  borderRadius: 4,
                }}
              />
            )}
            {canPreview && !isPdf && !isImage && (
              <p className="mb-0">Preview is available only for PDF and image attachments.</p>
            )}
          </CCol>
        </CRow>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
