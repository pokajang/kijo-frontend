// src/templates/create/SpecialTemplate/AttachmentModal.jsx
import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CCard,
  CCardHeader,
  CCardBody,
} from '@coreui/react'

/**
 * Modal with guidelines for attaching files to the proposal.
 */
export default function AttachmentModal({ visible, onClose }) {
  return (
    <CModal visible={visible} onClose={onClose} size="lg" alignment="center" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>Attachment Guidelines</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CCard>
          <CCardHeader>
            <strong>What to Attach</strong>
          </CCardHeader>
          <CCardBody>
            <p>Include any supporting documents that strengthen your proposal, such as:</p>
            <ul>
              <li>Technical drawings, diagrams, or schematics</li>
              <li>Infographics or data tables</li>
              <li>Previous reports or case studies</li>
              <li>Relevant certifications or permits</li>
            </ul>
            <p>
              <strong>File types:</strong> PDF, JPG, PNG
              <br />
              <strong>Max file size:</strong> 10 MB per attachment
            </p>
            <p>
              Attachments will be bundled with your proposal PDF, so please ensure each file is
              clear, legible, and properly named.
            </p>
          </CCardBody>
        </CCard>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}
