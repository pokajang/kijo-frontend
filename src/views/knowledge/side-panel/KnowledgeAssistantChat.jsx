import React from 'react'
import { CSpinner } from '@coreui/react'
import KnowledgeAssistantComposer from './KnowledgeAssistantComposer'
import KnowledgeAssistantMessageList from './KnowledgeAssistantMessageList'

const KnowledgeAssistantChat = ({
  articles,
  assistant,
  assistantPrompts,
  currentPageName,
  feedback,
  onOpenInlineRouteRef,
  onOpenRelatedPage,
  onOpenSource,
  onRunSuggestedSearch,
  roles,
}) => (
  <div className="knowledge-assistant-chat">
    <div className="knowledge-assistant-chat-header">
      <div className="knowledge-assistant-chat-heading">
        <span className="knowledge-assistant-chat-title">{assistant.currentChatTitle}</span>
      </div>
    </div>
    <div className="knowledge-assistant-scope-note">
      Scoped to Kijo sources. AI can make mistakes; verify answers.
    </div>

    {assistant.assistantLoading ? (
      <div className="knowledge-side-panel-loading">
        <CSpinner size="sm" />
        <span>Loading chat...</span>
      </div>
    ) : (
      <KnowledgeAssistantMessageList
        articles={articles}
        assistantClearing={assistant.assistantClearing}
        assistantLoading={assistant.assistantLoading}
        assistantMessages={assistant.assistantMessages}
        assistantMessagesRef={assistant.assistantMessagesRef}
        assistantPrompts={assistantPrompts}
        assistantSending={assistant.assistantSending}
        currentPageName={currentPageName}
        feedback={feedback}
        hasAssistantHistory={assistant.hasAssistantHistory}
        onAskPrompt={assistant.askAssistantQuestion}
        onOpenInlineRouteRef={onOpenInlineRouteRef}
        onOpenRelatedPage={onOpenRelatedPage}
        onOpenSource={onOpenSource}
        onRunSuggestedSearch={onRunSuggestedSearch}
        onScroll={assistant.updateAssistantScrollLatestVisibility}
        onScrollLatest={() => assistant.scrollAssistantMessagesToLatest()}
        onUseClarificationOption={assistant.useClarificationOption}
        roles={roles}
        showAssistantScrollLatest={assistant.showAssistantScrollLatest}
      />
    )}

    <KnowledgeAssistantComposer
      assistantClearing={assistant.assistantClearing}
      assistantComposerRef={assistant.assistantComposerRef}
      assistantLoading={assistant.assistantLoading}
      assistantQuestion={assistant.assistantQuestion}
      assistantSending={assistant.assistantSending}
      hasAssistantHistory={assistant.hasAssistantHistory}
      onChange={assistant.setAssistantQuestion}
      onKeyDown={assistant.handleAssistantComposerKeyDown}
      onSubmit={assistant.submitAssistantQuestion}
    />
  </div>
)

export default KnowledgeAssistantChat
