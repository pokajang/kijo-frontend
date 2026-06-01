import React from 'react'
import { CAlert } from '@coreui/react'
import KnowledgeAssistantChat from './KnowledgeAssistantChat'
import KnowledgeAssistantHistory from './KnowledgeAssistantHistory'

const KnowledgeAssistantPanel = ({
  articles,
  assistant,
  assistantPrompts,
  currentPageName,
  onOpenInlineRouteRef,
  onOpenRelatedPage,
  onOpenSource,
  onRunSuggestedSearch,
  roles,
}) => {
  const feedback = {
    cancelFeedback: assistant.cancelFeedback,
    feedbackError: assistant.feedbackError,
    feedbackMessageId: assistant.feedbackMessageId,
    feedbackNote: assistant.feedbackNote,
    feedbackReasons: assistant.feedbackReasons,
    feedbackSubmittedIds: assistant.feedbackSubmittedIds,
    feedbackSubmittingId: assistant.feedbackSubmittingId,
    openFeedbackForm: assistant.openFeedbackForm,
    setFeedbackNote: assistant.setFeedbackNote,
    submitAssistantFeedback: assistant.submitAssistantFeedback,
    toggleFeedbackReason: assistant.toggleFeedbackReason,
  }

  return (
    <div className="knowledge-assistant">
      {assistant.assistantError && <CAlert color="warning">{assistant.assistantError}</CAlert>}

      {assistant.assistantView === 'history' ? (
        <KnowledgeAssistantHistory
          activeAssistantThreadId={assistant.activeAssistantThreadId}
          assistantClearing={assistant.assistantClearing}
          assistantLoading={assistant.assistantLoading}
          assistantSending={assistant.assistantSending}
          assistantThreads={assistant.assistantThreads}
          bulkDeleteConfirm={assistant.bulkDeleteConfirm}
          deleteConfirmThreadId={assistant.deleteConfirmThreadId}
          hasAssistantThreads={assistant.hasAssistantThreads}
          onClearSelection={assistant.clearAssistantThreadSelection}
          onDeleteThread={assistant.deleteAssistantThread}
          onDeleteSelectedThreads={assistant.deleteSelectedAssistantThreads}
          onOpenThread={assistant.openAssistantThread}
          onSelectAllThreads={assistant.selectAllAssistantThreads}
          onStartNewChat={assistant.startNewAssistantChat}
          onToggleThreadSelection={assistant.toggleAssistantThreadSelection}
          onWillOpenThread={() => assistant.setDeleteConfirmThreadId(null)}
          selectedAssistantThreadIds={assistant.selectedAssistantThreadIds}
        />
      ) : (
        <KnowledgeAssistantChat
          articles={articles}
          assistant={assistant}
          assistantPrompts={assistantPrompts}
          currentPageName={currentPageName}
          feedback={feedback}
          onOpenInlineRouteRef={onOpenInlineRouteRef}
          onOpenRelatedPage={onOpenRelatedPage}
          onOpenSource={onOpenSource}
          onRunSuggestedSearch={onRunSuggestedSearch}
          roles={roles}
        />
      )}
    </div>
  )
}

export default KnowledgeAssistantPanel
