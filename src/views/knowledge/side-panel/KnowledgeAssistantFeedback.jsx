import React, { useState } from 'react'
import { CButton, CFormTextarea } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCopy, cilThumbDown, cilThumbUp } from '@coreui/icons'
import AssistantTooltip from './AssistantTooltip'

const ASSISTANT_FEEDBACK_REASONS = [
  'Wrong information',
  'Wrong source',
  'Outdated',
  'Missing data',
  'Unclear',
  'Other',
]

const copyTextToClipboard = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export const KnowledgeAssistantFeedbackInline = ({
  copyText = '',
  feedbackMessageId,
  feedbackSubmittedIds,
  feedbackSubmittingId,
  message,
  onOpenFeedbackForm,
  onSubmitFeedback,
}) => {
  const feedbackWasSubmitted = feedbackSubmittedIds.includes(message.id)
  const [copied, setCopied] = useState(false)

  const copyAnswer = async () => {
    const text = String(copyText || message.content || '').trim()
    if (!text) return

    try {
      await copyTextToClipboard(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <span
      className={`knowledge-assistant-feedback knowledge-assistant-feedback--inline ${
        feedbackMessageId === message.id || feedbackWasSubmitted
          ? 'knowledge-assistant-feedback--active'
          : ''
      }`}
    >
      <AssistantTooltip content={copied ? 'Copied answer' : 'Copy answer'}>
        <button
          type="button"
          className="knowledge-assistant-feedback-icon"
          aria-label={copied ? 'Answer copied' : 'Copy answer'}
          onClick={copyAnswer}
        >
          <CIcon icon={cilCopy} />
        </button>
      </AssistantTooltip>
      {feedbackWasSubmitted ? (
        <span className="knowledge-assistant-feedback-status">Thanks, feedback saved</span>
      ) : (
        <>
          <AssistantTooltip content="Mark this answer as helpful">
            <button
              type="button"
              className="knowledge-assistant-feedback-icon"
              aria-label="Mark answer helpful"
              disabled={feedbackSubmittingId === message.id}
              onClick={() => onSubmitFeedback(message, 'helpful')}
            >
              <CIcon icon={cilThumbUp} />
            </button>
          </AssistantTooltip>
          <AssistantTooltip content="Report a bad answer">
            <button
              type="button"
              className="knowledge-assistant-feedback-icon"
              aria-label="Report bad answer"
              disabled={feedbackSubmittingId === message.id}
              onClick={() => onOpenFeedbackForm(message.id)}
            >
              <CIcon icon={cilThumbDown} />
            </button>
          </AssistantTooltip>
        </>
      )}
    </span>
  )
}

const KnowledgeAssistantFeedbackForm = ({
  feedbackError,
  feedbackMessageId,
  feedbackNote,
  feedbackReasons,
  feedbackSubmittedIds,
  feedbackSubmittingId,
  message,
  onCancel,
  onFeedbackNoteChange,
  onSubmitFeedback,
  onToggleFeedbackReason,
}) => {
  if (feedbackMessageId !== message.id || feedbackSubmittedIds.includes(message.id)) return null

  return (
    <div className="knowledge-assistant-feedback-form">
      <div className="knowledge-assistant-feedback-reasons">
        {ASSISTANT_FEEDBACK_REASONS.map((reason) => (
          <button
            type="button"
            key={reason}
            className={`knowledge-assistant-feedback-reason ${
              feedbackReasons.includes(reason)
                ? 'knowledge-assistant-feedback-reason--selected'
                : ''
            }`}
            disabled={feedbackSubmittingId === message.id}
            onClick={() => onToggleFeedbackReason(reason)}
          >
            {reason}
          </button>
        ))}
      </div>
      <CFormTextarea
        rows={2}
        value={feedbackNote}
        placeholder="Add a short note for the developer"
        disabled={feedbackSubmittingId === message.id}
        onChange={(event) => onFeedbackNoteChange(event.target.value)}
      />
      {feedbackError ? (
        <span className="knowledge-assistant-feedback-error">{feedbackError}</span>
      ) : null}
      <div className="knowledge-assistant-feedback-actions">
        <AssistantTooltip content="Submit feedback to developer">
          <CButton
            color="primary"
            size="sm"
            type="button"
            disabled={feedbackSubmittingId === message.id}
            onClick={() => onSubmitFeedback(message, 'bad')}
          >
            {feedbackSubmittingId === message.id ? 'Saving...' : 'Submit feedback'}
          </CButton>
        </AssistantTooltip>
        <AssistantTooltip content="Cancel feedback">
          <CButton
            color="secondary"
            size="sm"
            variant="outline"
            type="button"
            disabled={feedbackSubmittingId === message.id}
            onClick={onCancel}
          >
            Cancel
          </CButton>
        </AssistantTooltip>
      </div>
    </div>
  )
}

export default KnowledgeAssistantFeedbackForm
