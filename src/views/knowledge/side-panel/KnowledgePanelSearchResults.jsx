import React from 'react'
import { CSpinner } from '@coreui/react'

const KnowledgePanelSearchResults = ({ articles, loadingArticles, onOpenArticle }) => (
  <div className="knowledge-side-panel-results">
    {loadingArticles && (
      <div className="small text-body-secondary d-flex align-items-center gap-2">
        <CSpinner size="sm" /> Loading articles...
      </div>
    )}
    {!loadingArticles && articles.length === 0 && (
      <div className="knowledge-side-panel-empty">
        No matching guides found. Try a module name, action, or keyword.
      </div>
    )}
    {!loadingArticles &&
      articles.map((item) => (
        <button
          type="button"
          className="knowledge-side-panel-result"
          key={item.id || item.slug}
          onClick={() => onOpenArticle(item.slug || item.id)}
        >
          <span className="fw-semibold">{item.title}</span>
          <span className="small text-body-secondary">
            {[item.category, item.summary].filter(Boolean).join(' | ')}
          </span>
        </button>
      ))}
  </div>
)

export default KnowledgePanelSearchResults
