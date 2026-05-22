import React, { useMemo } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CFormInput,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilSearch, cilX } from '@coreui/icons'
import { useKnowledgePanel } from './KnowledgePanelContext'
import { searchKnowledgeArticles } from './knowledgeSearch'
import { formatDateTime, sanitizeKnowledgeHtml } from './knowledgeUtils'

const KnowledgeSidePanel = () => {
  const {
    isOpen,
    article,
    articles,
    search,
    loadingArticle,
    loadingArticles,
    error,
    closeKnowledgePanel,
    setKnowledgeSearch,
    loadKnowledgeArticle,
  } = useKnowledgePanel()

  const filteredArticles = useMemo(
    () => searchKnowledgeArticles(articles, search, { limit: 20 }),
    [articles, search],
  )

  const overviewArticles = useMemo(() => {
    const copy = [...articles]
    for (let index = copy.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
    }
    return copy.slice(0, 3)
  }, [articles])

  const hasSearch = search.trim().length > 0

  const openArticleFromSearch = (slugOrId) => {
    setKnowledgeSearch('')
    loadKnowledgeArticle(slugOrId)
  }

  return (
    <aside className={`knowledge-side-panel${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen}>
      <CCard className="knowledge-side-panel-card">
        <CCardHeader className="knowledge-side-panel-header">
          <div className="knowledge-side-panel-title">
            Learn <strong>kijo</strong>
          </div>
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="knowledge-side-panel-close"
            onClick={closeKnowledgePanel}
            aria-label="Close Knowledge panel"
          >
            <CIcon icon={cilX} />
          </CButton>
        </CCardHeader>

        <div className="knowledge-side-panel-search">
          <div className="position-relative">
            <CIcon icon={cilSearch} className="knowledge-side-panel-search-icon" />
            <CFormInput
              size="sm"
              value={search}
              placeholder="Search Knowledge"
              className="knowledge-side-panel-search-input"
              onChange={(event) => setKnowledgeSearch(event.target.value)}
            />
          </div>
        </div>

        <CCardBody className="knowledge-side-panel-body">
          {error && <CAlert color="danger">{error}</CAlert>}

          {hasSearch && (
            <div className="knowledge-side-panel-results">
              {loadingArticles && (
                <div className="small text-body-secondary d-flex align-items-center gap-2">
                  <CSpinner size="sm" /> Loading articles...
                </div>
              )}
              {!loadingArticles && filteredArticles.length === 0 && (
                <div className="knowledge-side-panel-empty">
                  No matching guides found. Try a module name, action, or keyword.
                </div>
              )}
              {!loadingArticles &&
                filteredArticles.map((item) => (
                  <button
                    type="button"
                    className="knowledge-side-panel-result"
                    key={item.id || item.slug}
                    onClick={() => openArticleFromSearch(item.slug || item.id)}
                  >
                    <span className="fw-semibold">{item.title}</span>
                    <span className="small text-body-secondary">
                      {[item.category, item.summary].filter(Boolean).join(' | ')}
                    </span>
                  </button>
                ))}
            </div>
          )}

          {!hasSearch && loadingArticle && (
            <div className="knowledge-side-panel-loading">
              <CSpinner size="sm" />
              <span>Loading article...</span>
            </div>
          )}

          {!hasSearch && !loadingArticle && !article && (
            <>
              {loadingArticles && (
                <div className="knowledge-side-panel-loading">
                  <CSpinner size="sm" />
                  <span>Loading guides...</span>
                </div>
              )}
              {!loadingArticles && overviewArticles.length > 0 && (
                <div className="knowledge-side-panel-overview">
                  {overviewArticles.map((item) => (
                    <button
                      type="button"
                      className="knowledge-side-panel-overview-card"
                      key={item.id || item.slug}
                      onClick={() => loadKnowledgeArticle(item.slug || item.id)}
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
          )}

          {!hasSearch && !loadingArticle && article && (
            <article className="knowledge-side-panel-article">
              <h2>{article.title}</h2>

              {article.images?.length > 0 && (
                <div className="knowledge-side-panel-images">
                  {article.images.map((image) => (
                    <figure key={image.id}>
                      <img src={image.url} alt={image.description} />
                      <figcaption>{image.description}</figcaption>
                    </figure>
                  ))}
                </div>
              )}

              <div
                className="knowledge-article-body"
                dangerouslySetInnerHTML={{ __html: sanitizeKnowledgeHtml(article.body_html) }}
              />

              <div className="knowledge-side-panel-meta">
                {article.related_route && (
                  <div className="knowledge-side-panel-route">
                    Module page: <strong>{article.related_route}</strong>
                  </div>
                )}
                <div>
                  <CBadge color="secondary" className="me-2">
                    {article.category}
                  </CBadge>
                  {article.published_at && (
                    <span>Published {formatDateTime(article.published_at)}</span>
                  )}
                </div>
                {article.latest_edit_log && (
                  <div>
                    Latest contribution by {article.latest_edit_log.name_code || 'Unknown'}
                    {article.latest_edit_log.created_at
                      ? ` on ${formatDateTime(article.latest_edit_log.created_at)}`
                      : ''}
                    {article.latest_edit_log.remarks ? `: ${article.latest_edit_log.remarks}` : ''}
                  </div>
                )}
              </div>
            </article>
          )}
        </CCardBody>
      </CCard>
    </aside>
  )
}

export default KnowledgeSidePanel
