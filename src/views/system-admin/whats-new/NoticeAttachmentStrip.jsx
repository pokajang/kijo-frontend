import React from 'react'
import { CCol, CRow } from '@coreui/react'

const NoticeAttachmentStrip = ({ attachments = [] }) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return null

  return (
    <CRow className="g-2 mt-3">
      {attachments.map((attachment) => (
        <CCol key={attachment.id || attachment.url} md={4}>
          <div className="bg-body rounded overflow-hidden h-100">
            <img
              src={attachment.url}
              alt={attachment.description || attachment.original_name || "What's New image"}
              className="w-100"
              style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
            />
            {attachment.description && (
              <div className="small text-body-secondary p-2">{attachment.description}</div>
            )}
          </div>
        </CCol>
      ))}
    </CRow>
  )
}

export default NoticeAttachmentStrip
