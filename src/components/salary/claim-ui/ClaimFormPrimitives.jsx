import React from 'react'
import { CButton, CFormInput, CModal, CModalBody, CModalHeader, CModalTitle } from '@coreui/react'
import { formatAttachmentSize, salaryAttachmentAccept } from '../attachmentUtils'

const attachmentUrl = (attachment) =>
  attachment?.dataUrl || attachment?.url || attachment?.downloadUrl || ''

const attachmentKind = (attachment) => {
  const type = String(attachment?.type || '').toLowerCase()
  const name = String(attachment?.name || attachment?.originalName || '').toLowerCase()
  const url = attachmentUrl(attachment).toLowerCase()

  if (type.includes('pdf') || name.endsWith('.pdf') || url.startsWith('data:application/pdf')) {
    return 'pdf'
  }

  if (type.startsWith('image/') || /\.(png|jpe?g)$/.test(name) || url.startsWith('data:image/')) {
    return 'image'
  }

  return 'file'
}

export const AttachmentPreviewModal = ({ attachment, onClose }) => {
  const url = attachmentUrl(attachment)
  const kind = attachmentKind(attachment)
  const name = attachment?.name || attachment?.originalName || 'Attachment'

  return (
    <CModal visible={Boolean(attachment)} onClose={onClose} size="xl" scrollable>
      <CModalHeader closeButton>
        <CModalTitle>{name}</CModalTitle>
      </CModalHeader>
      <CModalBody className="salary-attachment-preview-body">
        {kind === 'image' && url && (
          <img className="salary-attachment-preview-image" src={url} alt={name} />
        )}
        {kind === 'pdf' && url && (
          <iframe className="salary-attachment-preview-frame" src={url} title={name} />
        )}
        {kind === 'file' && url && (
          <div className="salary-attachment-preview-fallback">
            This attachment type cannot be previewed inline.
          </div>
        )}
      </CModalBody>
    </CModal>
  )
}

export const FormPanelHeading = ({ id, title, action }) => (
  <div className="salary-form-panel-header">
    <h3 className="salary-form-panel-heading" id={id}>
      {title}
    </h3>
    {action}
  </div>
)

export const ClaimDraftActions = ({
  onSave,
  onCancel,
  disabled = false,
  isPreparing = false,
  saveLabel = 'Save',
}) => (
  <div className="salary-claim-draft-actions">
    <CButton
      color="primary"
      variant="outline"
      size="sm"
      type="button"
      className="salary-claim-draft-button"
      onClick={onSave}
      disabled={disabled || isPreparing}
    >
      {isPreparing ? 'Preparing' : saveLabel}
    </CButton>
    <CButton
      color="secondary"
      variant="outline"
      size="sm"
      type="button"
      className="salary-claim-draft-button"
      onClick={onCancel}
      disabled={isPreparing}
    >
      Cancel
    </CButton>
  </div>
)

export const AttachmentInput = ({
  id,
  label = 'Attachment',
  attachment,
  inputKey,
  isPreparing,
  onChange,
}) => (
  <div className="salary-attachment-field">
    <label className="salary-attachment-label" htmlFor={id}>
      {label}
    </label>
    <div className="salary-attachment-control">
      <label className="btn btn-outline-secondary salary-attachment-choose" htmlFor={id}>
        Choose File
      </label>
      {(isPreparing || attachment) && (
        <div className="salary-attachment-meta">
          {isPreparing
            ? 'Preparing attachment...'
            : `${attachment.name} (${formatAttachmentSize(attachment.size)})${
                attachment.compressed ? ' - compressed' : ''
              }`}
        </div>
      )}
    </div>
    <CFormInput
      key={inputKey}
      id={id}
      type="file"
      accept={salaryAttachmentAccept}
      className="salary-attachment-input"
      onChange={(event) => onChange(event.target.files?.[0] || null)}
    />
  </div>
)
