import React, { useState } from 'react'
import { CButton, CFormTextarea } from '@coreui/react'

import { submitFeedback } from '../../../views/feedback/actionHandlers'
import dialog from '../../dialog/dialogService'
import { useMobileNavSheet } from '../MobileNavSheetContext'

const MobileSupportTicketView = () => {
  const { goBack } = useMobileNavSheet()
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    const text = message.trim()
    if (!text) {
      dialog.alert('Please describe the issue before submitting.')
      return
    }
    setSubmitting(true)
    try {
      const result = await submitFeedback(text)
      if (result.status !== 'success') {
        dialog.alert(result.message || 'Failed to submit ticket.')
        return
      }
      dialog.alert(
        result.mail_sent === false
          ? result.message || 'Ticket submitted, but the email notification could not be sent.'
          : 'Ticket submitted successfully.',
      )
      goBack()
    } catch {
      dialog.alert('Unable to submit ticket right now.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="d-grid gap-3">
      <p className="text-body-secondary small mb-0">
        Describe the issue you are facing or the improvement you would like to request.
      </p>
      <CFormTextarea
        rows={5}
        placeholder="Enter your feedback here..."
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        autoFocus
      />
      <div className="d-flex justify-content-end gap-2">
        <CButton color="secondary" variant="outline" onClick={goBack} disabled={submitting}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={submit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </CButton>
      </div>
    </div>
  )
}

export default MobileSupportTicketView
