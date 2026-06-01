import React from 'react'
import { CButton, CFormTextarea } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPaperPlane } from '@coreui/icons'
import AssistantTooltip from './AssistantTooltip'

const KnowledgeAssistantComposer = ({
  assistantClearing,
  assistantComposerRef,
  assistantLoading,
  assistantQuestion,
  assistantSending,
  hasAssistantHistory,
  onChange,
  onKeyDown,
  onSubmit,
}) => (
  <div className="knowledge-assistant-chat-footer">
    <form className="knowledge-assistant-composer" onSubmit={onSubmit}>
      <CFormTextarea
        ref={assistantComposerRef}
        rows={1}
        value={assistantQuestion}
        placeholder={
          hasAssistantHistory ? 'Ask a Kijo follow-up' : 'Ask about Kijo knowledge or records'
        }
        disabled={assistantSending || assistantLoading || assistantClearing}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <AssistantTooltip content="Send message">
        <CButton
          color="primary"
          size="sm"
          type="submit"
          className="knowledge-assistant-send-button"
          aria-label="Send message"
          disabled={
            assistantSending || assistantLoading || assistantClearing || !assistantQuestion.trim()
          }
        >
          <CIcon icon={cilPaperPlane} />
        </CButton>
      </AssistantTooltip>
    </form>
  </div>
)

export default KnowledgeAssistantComposer
