import React from 'react'
import { CSpinner } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom } from '@coreui/icons'
import AssistantTooltip from './AssistantTooltip'
import KnowledgeAssistantMessage from './KnowledgeAssistantMessage'

const KnowledgeAssistantMessageList = ({
  articles,
  assistantClearing,
  assistantLoading,
  assistantMessages,
  assistantMessagesRef,
  assistantPrompts,
  assistantSending,
  currentPageName,
  feedback,
  hasAssistantHistory,
  onAskPrompt,
  onOpenInlineRouteRef,
  onOpenRelatedPage,
  onOpenSource,
  onRunSuggestedSearch,
  onScroll,
  onScrollLatest,
  onUseClarificationOption,
  roles,
  showAssistantScrollLatest,
}) => (
  <div ref={assistantMessagesRef} className="knowledge-assistant-messages" onScroll={onScroll}>
    {!hasAssistantHistory ? (
      <div className="knowledge-assistant-empty">
        {assistantPrompts.map((prompt) => (
          <React.Fragment key={prompt}>
            <AssistantTooltip content={`Ask: ${prompt}`}>
              <button
                type="button"
                className="knowledge-assistant-prompt"
                disabled={assistantSending || assistantLoading || assistantClearing}
                onClick={() => onAskPrompt(prompt)}
              >
                {prompt}
              </button>
            </AssistantTooltip>
          </React.Fragment>
        ))}
      </div>
    ) : (
      assistantMessages.map((message, messageIndex) => (
        <KnowledgeAssistantMessage
          key={message.id}
          articles={articles}
          currentPageName={currentPageName}
          feedback={feedback}
          message={message}
          messageIndex={messageIndex}
          messages={assistantMessages}
          onOpenInlineRouteRef={onOpenInlineRouteRef}
          onOpenRelatedPage={onOpenRelatedPage}
          onOpenSource={onOpenSource}
          onRunSuggestedSearch={onRunSuggestedSearch}
          onUseClarificationOption={onUseClarificationOption}
          roles={roles}
        />
      ))
    )}
    {assistantSending ? (
      <div className="knowledge-side-panel-loading">
        <CSpinner size="sm" />
        <span>Checking Kijo sources...</span>
      </div>
    ) : null}
    {showAssistantScrollLatest ? (
      <AssistantTooltip content="Scroll to latest response">
        <button
          type="button"
          className="knowledge-assistant-scroll-latest"
          aria-label="Scroll to latest response"
          onClick={onScrollLatest}
        >
          <CIcon icon={cilArrowBottom} />
        </button>
      </AssistantTooltip>
    ) : null}
  </div>
)

export default KnowledgeAssistantMessageList
