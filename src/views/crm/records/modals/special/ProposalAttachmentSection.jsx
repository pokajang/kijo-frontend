// crm/records/modals/special/ProposalAttachmentSection.jsx
import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel } from '@coreui/react'

export default function ProposalAttachmentSection({ attachProposal }) {
  return (
    <>
      <CCardHeader>
        <strong>Proposal Attachment</strong>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol md={12}>
            <CFormLabel>Attach Full Proposal?</CFormLabel>
            <br />
            {attachProposal ? (
              <span className="text-success fw-bold">✅ Yes — Proposal attached.</span>
            ) : (
              <span className="text-muted">❌ No proposal attached.</span>
            )}
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}
