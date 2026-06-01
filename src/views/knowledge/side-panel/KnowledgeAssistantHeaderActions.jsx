import React from 'react'
import { CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHistory, cilPen } from '@coreui/icons'
import AssistantTooltip from './AssistantTooltip'

const KnowledgeAssistantHeaderActions = ({
  assistantClearing,
  assistantLoading,
  assistantSending,
  assistantView,
  onSetAssistantView,
  onStartNewChat,
}) => (
  <div className="knowledge-assistant-view-switch knowledge-assistant-view-switch--header">
    <AssistantTooltip content="Open chat history" placement="bottom">
      <CButton
        color={assistantView === 'history' ? 'primary' : 'secondary'}
        size="sm"
        variant={assistantView === 'history' ? undefined : 'outline'}
        type="button"
        aria-label="History"
        className="knowledge-assistant-history-button"
        onClick={() => onSetAssistantView('history')}
      >
        <CIcon icon={cilHistory} />
      </CButton>
    </AssistantTooltip>
    <AssistantTooltip content="Start a new chat" placement="bottom">
      <CButton
        color="secondary"
        size="sm"
        variant="outline"
        type="button"
        className="knowledge-assistant-new-chat"
        aria-label="New chat"
        disabled={assistantLoading || assistantSending || assistantClearing}
        onClick={onStartNewChat}
      >
        <CIcon icon={cilPen} />
      </CButton>
    </AssistantTooltip>
  </div>
)

export default KnowledgeAssistantHeaderActions
