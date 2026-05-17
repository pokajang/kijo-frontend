import React from 'react'
import { CModal, CModalHeader, CModalTitle, CModalBody, CButton } from '@coreui/react'
import { resolveAssetUrl } from '../../../../../utils/assetUrls'

const ViewReceiptModal = ({ visible, onClose, filePath }) => {
  const fullPath = resolveAssetUrl(filePath)

  // Determine file type
  const ext = filePath ? filePath.split('.').pop().toLowerCase() : ''
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)
  const isPDF = ext === 'pdf'

  return (
    <CModal visible={visible} onClose={onClose} alignment="center">
      <CModalHeader>
        <CModalTitle>Receipt Preview</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {filePath ? (
          isImage ? (
            <div style={{ textAlign: 'center' }}>
              <img
                src={fullPath}
                alt="Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '500px',
                  width: 'auto',
                  height: 'auto',
                }}
              />
            </div>
          ) : isPDF ? (
            <iframe
              src={fullPath}
              title="Receipt Preview"
              width="100%"
              height="500px"
              style={{ border: 'none' }}
            />
          ) : (
            <p className="text-danger">Unsupported file format: {ext}</p>
          )
        ) : (
          <p className="text-muted">No file available.</p>
        )}

        <div className="mt-3 text-end">
          <CButton color="secondary" size="sm" onClick={onClose}>
            Close
          </CButton>
        </div>
      </CModalBody>
    </CModal>
  )
}

export default ViewReceiptModal
