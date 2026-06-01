import React from 'react'
import KnowledgePanelLoading from './KnowledgePanelLoading'

const KnowledgePanelOverview = ({ loadingArticles, overviewArticles, onOpenArticle }) => (
  <>
    {loadingArticles && <KnowledgePanelLoading>Loading guides...</KnowledgePanelLoading>}
    {!loadingArticles && overviewArticles.length > 0 && (
      <div className="knowledge-side-panel-overview">
        {overviewArticles.map((item) => (
          <button
            type="button"
            className="knowledge-side-panel-overview-card"
            key={item.id || item.slug}
            onClick={() => onOpenArticle(item.slug || item.id)}
          >
            <span className="knowledge-side-panel-overview-title">{item.title}</span>
            <span className="knowledge-side-panel-overview-summary">{item.summary}</span>
          </button>
        ))}
      </div>
    )}
    {!loadingArticles && overviewArticles.length === 0 && (
      <div className="knowledge-side-panel-empty">
        Search guides, or open help from a module with a Knowledge article.
      </div>
    )}
  </>
)

export default KnowledgePanelOverview
