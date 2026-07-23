import React, { useRef } from 'react'
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
  attachments,
  inputKey,
  isPreparing,
  multiple = false,
  required = false,
  helpText = 'PDF, JPG, or PNG up to 5 MB.',
  onChange,
  onRemove,
}) => (
  <AttachmentField
    id={id}
    label={label}
    attachment={attachment}
    attachments={attachments}
    inputKey={inputKey}
    isPreparing={isPreparing}
    multiple={multiple}
    required={required}
    helpText={helpText}
    onChange={onChange}
    onRemove={onRemove}
  />
)

const AttachmentField = ({
  id,
  label,
  attachment,
  attachments,
  inputKey,
  isPreparing,
  multiple,
  required,
  helpText,
  onChange,
  onRemove,
}) => {
  const inputRef = useRef(null)
  const selectedAttachments = Array.isArray(attachments)
    ? attachments.filter(Boolean)
    : attachment
      ? [attachment]
      : []
  const helpId = `${id}Help`

  return (
    <div className="salary-attachment-field">
      <div className="salary-attachment-label" id={`${id}Label`}>
        {label}
        {required && <span className="salary-attachment-required"> (required)</span>}
      </div>
      <div className="salary-attachment-control">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          type="button"
          className="salary-attachment-choose"
          onClick={() => inputRef.current?.click()}
          aria-label={`Choose ${multiple ? 'files' : 'a file'} for ${label}`}
        >
          Choose File{multiple ? 's' : ''}
        </CButton>
        {isPreparing && (
          <div className="salary-attachment-meta" role="status" aria-live="polite">
            Preparing attachment...
          </div>
        )}
      </div>
      <CFormInput
        key={inputKey}
        ref={inputRef}
        id={id}
        type="file"
        accept={salaryAttachmentAccept}
        multiple={multiple}
        className="salary-attachment-input"
        tabIndex={-1}
        aria-labelledby={`${id}Label`}
        aria-describedby={helpId}
        onChange={(event) => {
          const files = Array.from(event.target.files || [])
          onChange(multiple ? files : files[0] || null)
        }}
      />
      {helpText && (
        <div className="salary-field-help" id={helpId}>
          {helpText}
        </div>
      )}
      {selectedAttachments.length > 0 && (
        <div className="salary-attachment-list" aria-live="polite">
          {selectedAttachments.map((selectedAttachment, index) => (
            <div
              className="salary-attachment-meta salary-attachment-meta--selected"
              key={
                selectedAttachment.clientId ||
                selectedAttachment.id ||
                `${selectedAttachment.name}-${index}`
              }
            >
              <span>
                {selectedAttachment.name} ({formatAttachmentSize(selectedAttachment.size)})
                {selectedAttachment.compressed ? ' - compressed' : ''}
              </span>
              {onRemove && (
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${selectedAttachment.name || 'attachment'}`}
                >
                  Remove
                </CButton>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
