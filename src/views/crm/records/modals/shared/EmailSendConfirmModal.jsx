import React, { useEffect, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilPaperclip } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CFormInput,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
} from '@coreui/react'
import { buildRecordEmailDraft } from '../../utils/recordEmail'

const SYSTEM_SENDER_EMAIL = 'info.admin@amiosh.com'

const EmailSendConfirmModal = ({
  visible,
  onCancel,
  onConfirm,
  onPreviewPdf,
  onOpenGmailDraft,
  isSubmitting = false,
  userName,
  userEmail,
  record,
  draftSubject,
  onDraftSubjectChange,
  draftBody,
  onDraftBodyChange,
  sendError = '',
}) => {
  const draft = buildRecordEmailDraft(record, {
    replyToName: userName,
    replyToEmail: userEmail,
  })
  const [showBetaAlert, setShowBetaAlert] = useState(true)

  useEffect(() => {
    if (visible) {
      setShowBetaAlert(true)
    }
  }, [visible])

  return (
    <CModal
      visible={visible}
      onClose={isSubmitting ? undefined : onCancel}
      alignment="center"
      size="lg"
    >
      <CModalHeader closeButton={!isSubmitting}>
        <CModalTitle className="d-flex align-items-center gap-2">
          <span>Confirm Email Draft</span>
          <span className="badge rounded-pill text-bg-warning fw-semibold">Beta</span>
        </CModalTitle>
      </CModalHeader>
      <CModalBody>
        {showBetaAlert ? (
          <CAlert color="info" dismissible onClose={() => setShowBetaAlert(false)} className="mb-3">
            This sends through the system from <strong>{SYSTEM_SENDER_EMAIL}</strong>, not your
            Gmail account.
          </CAlert>
        ) : null}
        {sendError ? (
          <CAlert color="danger" className="mb-3">
            <div className="fw-semibold mb-1">System email failed.</div>
            <div className="small">{sendError}</div>
            <div className="small mt-2">
              You can retry the system send or open a Gmail draft and continue manually.
            </div>
          </CAlert>
        ) : null}

        <div className="border rounded-3 overflow-hidden mb-3">
          <div className="px-3 py-2 border-bottom bg-body-tertiary fw-semibold">Email Preview</div>
          <div className="px-3 py-3">
            <div className="d-flex flex-column gap-2">
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  To
                </span>
                <div>
                  <div className="fw-semibold">{draft?.toDisplay || draft?.to || '-'}</div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  From
                </span>
                <div>
                  <div className="fw-semibold">AMIOSH Admin</div>
                  <div className="text-muted">{SYSTEM_SENDER_EMAIL}</div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  Reply-To
                </span>
                <div>
                  <div className="fw-semibold">{userEmail || '-'}</div>
                  <div className="text-muted">
                    Replies from the recipient will come back to you.
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  Cc
                </span>
                <div>
                  <div className="fw-semibold">{draft?.ccDisplay || userEmail || '-'}</div>
                  <div className="text-muted">
                    The internal PIC will receive the same sent email.
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  Subject
                </span>
                <div className="flex-grow-1">
                  <CFormInput
                    size="sm"
                    value={draftSubject ?? draft?.subject ?? ''}
                    onChange={(event) => onDraftSubjectChange?.(event.target.value)}
                  />
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  Message
                </span>
                <div className="flex-grow-1">
                  <CFormTextarea
                    className="records-email-draft-textarea"
                    rows={10}
                    value={draftBody ?? draft?.body ?? ''}
                    onChange={(event) => onDraftBodyChange?.(event.target.value)}
                    style={{ whiteSpace: 'pre-wrap', lineHeight: 1.45 }}
                  />
                </div>
              </div>
              <div className="d-flex align-items-start gap-2">
                <span className="text-muted" style={{ minWidth: '72px' }}>
                  Attached
                </span>
                <div className="px-1 py-1 flex-grow-1 d-flex align-items-start gap-2">
                  <CIcon icon={cilPaperclip} className="text-muted mt-1 flex-shrink-0" />
                  <div>
                    <div className="fw-semibold">{draft?.attachmentName || 'Quotation.pdf'}</div>
                    <div className="text-muted">Quotation PDF will be attached by the system.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="ghost" onClick={onPreviewPdf} disabled={isSubmitting}>
          Preview PDF
        </CButton>
        <CButton
          color="secondary"
          variant="ghost"
          onClick={onOpenGmailDraft}
          disabled={isSubmitting}
        >
          Open Gmail Draft
        </CButton>
        <CButton color="secondary" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Email'}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EmailSendConfirmModal
