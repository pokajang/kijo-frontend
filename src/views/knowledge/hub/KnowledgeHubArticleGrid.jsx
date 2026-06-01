import React from 'react'
import { CRow } from '@coreui/react'
import KnowledgeArticleCard from '../components/KnowledgeArticleCard'

const ArticleGrid = ({ actionId, canManage, items, onRunAction }) => (
  <CRow className="g-3">
    {items.map((article) => (
      <KnowledgeArticleCard
        key={article.id}
        article={article}
        canManage={canManage}
        busy={actionId === article.id}
        onRunAction={onRunAction}
      />
    ))}
  </CRow>
)

const KnowledgeHubArticleGrid = ({ actionId, canManage, articles, onRunAction }) => {
  const featuredArticles = articles.slice(0, 3)
  const latestArticles = articles.slice(3)

  return (
    <>
      {featuredArticles.length > 0 && (
        <>
          <div className="fw-semibold mb-2">Featured Guides</div>
          <div className="mb-4">
            <ArticleGrid
              actionId={actionId}
              canManage={canManage}
              items={featuredArticles}
              onRunAction={onRunAction}
            />
          </div>
        </>
      )}
      {latestArticles.length > 0 && (
        <>
          <div className="fw-semibold mb-2">Latest Articles</div>
          <ArticleGrid
            actionId={actionId}
            canManage={canManage}
            items={latestArticles}
            onRunAction={onRunAction}
          />
        </>
      )}
    </>
  )
}

export default KnowledgeHubArticleGrid
