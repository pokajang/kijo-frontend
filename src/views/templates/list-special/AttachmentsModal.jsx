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
  CFormLabel,
  CFormSelect,
} from '@coreui/react'
import { isTrustedAssetUrl, resolveAssetUrl } from '../../../utils/assetUrls'

const getExtension = (value = '') => String(value).split('.').pop()?.toLowerCase() || ''

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

  useEffect(() => {
    if (!visible) {
      setSelectedIndex(0)
    } else if (attachments && attachments.length > 0) {
      setSelectedIndex(0)
    }
  }, [visible, attachments])

  if (!attachments || attachments.length === 0) {
    return null
  }

  const chosen = attachments[selectedIndex]
  const preview = getPreviewInfo(chosen)

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
                onChange={(e) => setSelectedIndex(Number(e.target.value))}
              >
                {attachments.map((att, idx) => (
                  <option key={att.id || idx} value={idx}>
                    {att.fileName}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
          </CRow>
        )}
        {chosen && (
          <CRow>
            <CCol>
              {preview.type === 'image' && (
                <img
                  src={preview.url}
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
              {preview.type === 'pdf' && (
                <iframe
                  src={preview.url}
                  title={chosen.fileName}
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
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
