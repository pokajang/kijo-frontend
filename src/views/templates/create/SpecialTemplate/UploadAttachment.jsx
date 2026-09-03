// src/templates/create/SpecialTemplate/UploadAttachment.jsx
import React from 'react'
import {
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CListGroup,
  CListGroupItem,
  CButton,
  CAlert,
} from '@coreui/react'
import { ACCEPTED_ATTACHMENT_INPUT } from './attachmentValidation'

export default function UploadAttachment({
  isEdit,
  existingAttachments,
  newAttachments,
  rejectedAttachments = [],
  onNewFileChange,
  onRenameFile,
  onRemoveExistingAttachment,
  onRemoveNewAttachment,
  onPreviewFile,
  onClearRejected,
  validationError = '',
}) {
  return (
    <>
      {isEdit && existingAttachments.length > 0 && (
        <CRow className="mb-3">
          <CCol>
            <CFormLabel>Current proposal PDFs</CFormLabel>
            <CListGroup flush>
              {existingAttachments.map((att) => (
                <CListGroupItem
                  key={att.id}
                  className="d-flex justify-content-between align-items-center"
                >
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0"
                    onClick={() => onPreviewFile(att)}
                  >
                    {att.fileName}
                  </button>
                  <CButton
                    color="danger"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveExistingAttachment(att.id)}
                  >
                    Remove
                  </CButton>
                </CListGroupItem>
              ))}
            </CListGroup>
          </CCol>
        </CRow>
      )}

      <CRow className="mb-3">
        <CCol>
          <CFormLabel htmlFor="special-proposal-attachments">
            {isEdit ? 'Add completed proposal PDFs' : 'Upload completed proposal PDFs'}
          </CFormLabel>
          <CFormInput
            id="special-proposal-attachments"
            type="file"
            name="attachments[]"
            multiple
            accept={ACCEPTED_ATTACHMENT_INPUT}
            onChange={onNewFileChange}
            invalid={Boolean(validationError)}
            aria-invalid={Boolean(validationError) || undefined}
            feedbackInvalid={validationError}
            data-template-field="attachments"
          />
          <small className="text-muted d-block mt-1">PDF only · Maximum 10 MB per file</small>

          {rejectedAttachments.length > 0 && (
            <CAlert color="warning" dismissible onClose={onClearRejected} className="mt-2 mb-0">
              <div className="fw-semibold mb-1">Some files were not added.</div>
              <ul className="mb-0">
                {rejectedAttachments.map((item, index) => (
                  <li key={`${item.fileName}-${index}`}>
                    {item.fileName}: {item.reason}
                  </li>
                ))}
              </ul>
            </CAlert>
          )}

          {newAttachments.length > 0 && (
            <CListGroup flush className="mt-2">
              {newAttachments.map((fileObj, idx) => (
                <CListGroupItem key={idx}>
                  <CRow className="align-items-center">
                    <CCol md={4}>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0"
                        onClick={() => onPreviewFile(fileObj)}
                      >
                        {fileObj.customName || fileObj.file.name}
                      </button>
                    </CCol>
                    <CCol md={4}>
                      <CFormInput
                        type="text"
                        placeholder="Rename file (optional)"
                        value={fileObj.customName}
                        onChange={(e) => onRenameFile(idx, e.target.value)}
                      />
                    </CCol>
                    <CCol md={2} className="text-end">
                      <CButton
                        color="danger"
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveNewAttachment(idx)}
                      >
                        Remove
                      </CButton>
                    </CCol>
                  </CRow>
                </CListGroupItem>
              ))}
            </CListGroup>
          )}
        </CCol>
      </CRow>
    </>
  )
}
