import React from 'react'
import { getAssistantRelatedPageLinks } from '../knowledgeAssistantLinks'
import {
  inlineRouteRefMap,
  inlineRouteTargets,
  normalizeInlineRouteTarget,
} from './assistantRouteUtils'
import {
  assistantMessageCopyText,
  renderAssistantMessageContent,
  removeRedundantSourceTitleLines,
} from './assistantMessageUtils'
import { visibleSuggestedQueries } from './assistantSuggestionUtils'
import { isAssistantHelpSource } from './assistantSourceUtils'
import AssistantTooltip from './AssistantTooltip'
import KnowledgeAssistantDisplayBlocks from './KnowledgeAssistantDisplayBlocks'
import KnowledgeAssistantFeedbackForm, {
  KnowledgeAssistantFeedbackInline,
} from './KnowledgeAssistantFeedback'
import {
  KnowledgeAssistantRelatedPages,
  KnowledgeAssistantSourceGroup,
  KnowledgeAssistantSuggestedSearches,
} from './KnowledgeAssistantSources'

const degradedAssistantNotice = (message, hasMessageSources) => {
  const status = String(message.ai_status || '').toLowerCase()
  if (!status || status === 'ok') return ''

  if (status === 'usage_limit' || status === 'rate_limit') {
    return hasMessageSources
      ? 'AI usage limit reached - showing Kijo source fallback.'
      : 'AI usage limit reached - no approved Kijo source found.'
  }

  return hasMessageSources
    ? 'AI response unavailable - showing Kijo source fallback.'
    : 'AI response unavailable - no approved Kijo source found.'
}

const KnowledgeAssistantMessage = ({
  articles,
  currentPageName,
  feedback,
  message,
  messageIndex,
  messages,
  onOpenInlineRouteRef,
  onOpenRelatedPage,
  onOpenSource,
  onRunSuggestedSearch,
  onUseClarificationOption = () => {},
  roles,
}) => {
  const messageSources = Array.isArray(message.sources) ? message.sources : []
  const clarificationOptions = Array.isArray(message.clarification_options)
    ? message.clarification_options.filter((option) => option && typeof option === 'object')
    : []
  const hasMessageSources = messageSources.length > 0
  const isAssistantHelpMessage = messageSources.some(isAssistantHelpSource)
  const isLowConfidence = String(message.confidence || '').toLowerCase() === 'low'
  const messageRouteRefs =
    message.role === 'assistant' ? inlineRouteRefMap(message.route_refs, roles) : new Map()
  const messageInlineRouteTargets =
    message.role === 'assistant' ? inlineRouteTargets(message.route_refs, roles) : new Set()
  const renderedMessageContent =
    message.role === 'assistant'
      ? removeRedundantSourceTitleLines(message.content, messageSources)
      : message.content
  const previousUserMessage =
    message.role === 'assistant'
      ? messages
          .slice(0, messageIndex)
          .reverse()
          .find((item) => item.role === 'user')
      : null
  const relatedPageLinks =
    hasMessageSources && !isLowConfidence && !isAssistantHelpMessage
      ? getAssistantRelatedPageLinks({
          message,
          previousUserMessage,
          currentPageName,
          roles,
        }).filter((item) => !messageInlineRouteTargets.has(normalizeInlineRouteTarget(item.to)))
      : []
  const suggestedSearches = hasMessageSources
    ? []
    : visibleSuggestedQueries(message.suggested_queries, articles)
  const degradedNotice =
    message.role === 'assistant' ? degradedAssistantNotice(message, hasMessageSources) : ''
  const lowConfidenceNotice =
    message.role === 'assistant' &&
    !degradedNotice &&
    isLowConfidence &&
    (!hasMessageSources || clarificationOptions.length > 0)
      ? clarificationOptions.length > 0
        ? 'Choose one previous item to continue.'
        : 'I need a clearer Kijo source or record to answer this.'
      : ''

  return (
    <div
      className={`knowledge-assistant-message knowledge-assistant-message--${message.role} ${
        message.role === 'assistant' && !hasMessageSources
          ? 'knowledge-assistant-message--no-source'
          : ''
      }`}
    >
      <div className="knowledge-assistant-message-content">
        {degradedNotice ? (
          <div className="knowledge-assistant-degraded-notice">{degradedNotice}</div>
        ) : null}
        {lowConfidenceNotice ? (
          <div className="knowledge-assistant-low-confidence-notice">{lowConfidenceNotice}</div>
        ) : null}
        {renderAssistantMessageContent(renderedMessageContent, null, {
          routeRefs: messageRouteRefs,
          onOpenRouteRef: onOpenInlineRouteRef,
        })}
        {message.role === 'assistant' ? (
          <KnowledgeAssistantDisplayBlocks blocks={message.display_blocks} />
        ) : null}
        {message.role === 'assistant' ? (
          <KnowledgeAssistantFeedbackInline
            copyText={assistantMessageCopyText(renderedMessageContent)}
            feedbackMessageId={feedback.feedbackMessageId}
            feedbackSubmittedIds={feedback.feedbackSubmittedIds}
            feedbackSubmittingId={feedback.feedbackSubmittingId}
            message={message}
            onOpenFeedbackForm={feedback.openFeedbackForm}
            onSubmitFeedback={feedback.submitAssistantFeedback}
          />
        ) : null}
        {message.role === 'assistant' ? (
          <KnowledgeAssistantFeedbackForm
            feedbackError={feedback.feedbackError}
            feedbackMessageId={feedback.feedbackMessageId}
            feedbackNote={feedback.feedbackNote}
            feedbackReasons={feedback.feedbackReasons}
            feedbackSubmittedIds={feedback.feedbackSubmittedIds}
            feedbackSubmittingId={feedback.feedbackSubmittingId}
            message={message}
            onCancel={feedback.cancelFeedback}
            onFeedbackNoteChange={feedback.setFeedbackNote}
            onSubmitFeedback={feedback.submitAssistantFeedback}
            onToggleFeedbackReason={feedback.toggleFeedbackReason}
          />
        ) : null}
      </div>
      <KnowledgeAssistantSourceGroup sources={messageSources} onOpenSource={onOpenSource} />
      <KnowledgeAssistantRelatedPages
        items={relatedPageLinks}
        onOpenRelatedPage={onOpenRelatedPage}
      />
      {clarificationOptions.length > 0 ? (
        <div className="knowledge-assistant-clarification-options">
          {clarificationOptions.map((option) => (
            <AssistantTooltip
              key={`${option.source_slug || option.label}`}
              content={`Use ${option.label}`}
            >
              <button
                type="button"
                className="knowledge-assistant-clarification-chip"
                onClick={() => onUseClarificationOption(option)}
              >
                {option.label}
              </button>
            </AssistantTooltip>
          ))}
        </div>
      ) : null}
      {!hasMessageSources ? (
        <KnowledgeAssistantSuggestedSearches
          queries={suggestedSearches}
          onRunSuggestedSearch={onRunSuggestedSearch}
        />
      ) : null}
    </div>
  )
}

export default KnowledgeAssistantMessage
