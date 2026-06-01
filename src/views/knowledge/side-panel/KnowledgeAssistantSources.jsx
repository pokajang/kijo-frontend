import React from 'react'
import CIcon from '@coreui/icons-react'
import { cilLink, cilSearch } from '@coreui/icons'
import AssistantTooltip from './AssistantTooltip'
import {
  assistantSourceCanOpen,
  assistantSourceStatusLabels,
  assistantSourceTypeLabel,
} from './assistantSourceUtils'

export const KnowledgeAssistantSourceGroup = ({ onOpenSource, sources }) => {
  if (!sources.length) return null

  return (
    <div className="knowledge-assistant-source-group knowledge-assistant-source-group--compact">
      <span className="knowledge-assistant-source-label">Sources</span>
      <div className="knowledge-assistant-sources">
        {sources.map((source) => {
          const statusLabels = assistantSourceStatusLabels(source)
          const sourceTypeLabel = assistantSourceTypeLabel(source)

          return (
            <React.Fragment key={source.slug}>
              <AssistantTooltip
                content={
                  assistantSourceCanOpen(source)
                    ? `Open source: ${source.title}`
                    : `Source reference: ${source.title}`
                }
              >
                <button
                  type="button"
                  className="knowledge-assistant-source"
                  disabled={!assistantSourceCanOpen(source)}
                  onClick={() => onOpenSource(source)}
                >
                  <span className="knowledge-assistant-source-title">{source.title}</span>
                  {sourceTypeLabel ? (
                    <span className="knowledge-assistant-source-type">{sourceTypeLabel}</span>
                  ) : null}
                  {statusLabels.length > 0 ? (
                    <span className="knowledge-assistant-source-badges">
                      {statusLabels.map((label) => (
                        <span key={label} className="knowledge-assistant-source-badge">
                          {label}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </button>
              </AssistantTooltip>
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export const KnowledgeAssistantRelatedPages = ({ items, onOpenRelatedPage }) => {
  if (!items.length) return null

  return (
    <div className="knowledge-assistant-related-pages">
      <span className="knowledge-assistant-source-label">
        <CIcon icon={cilLink} />
        Related pages
      </span>
      <div className="knowledge-assistant-sources">
        {items.map((item) => (
          <React.Fragment key={item.to}>
            <AssistantTooltip content={`Open related page: ${item.label}`}>
              <button
                type="button"
                className="knowledge-assistant-source knowledge-assistant-route"
                onClick={() => onOpenRelatedPage(item)}
              >
                <span>{item.label}</span>
                {item.group ? <span>{item.group}</span> : null}
              </button>
            </AssistantTooltip>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export const KnowledgeAssistantSuggestedSearches = ({ queries, onRunSuggestedSearch }) => {
  if (!queries.length) return null

  return (
    <div className="knowledge-assistant-suggested-searches">
      <span className="knowledge-assistant-source-label">
        <CIcon icon={cilSearch} />
        Try searching
      </span>
      <div className="knowledge-assistant-sources">
        {queries.map((query) => (
          <React.Fragment key={query}>
            <AssistantTooltip content={`Search Knowledge for: ${query}`}>
              <button
                type="button"
                className="knowledge-assistant-source"
                onClick={() => onRunSuggestedSearch(query)}
              >
                {query}
              </button>
            </AssistantTooltip>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
