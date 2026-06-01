import React from 'react'
import KnowledgeArticleBody from '../components/KnowledgeArticleBody'
import KnowledgeArticleImages from '../components/KnowledgeArticleImages'
import KnowledgeArticleMeta from '../components/KnowledgeArticleMeta'

const KnowledgePanelArticle = ({ article }) => (
  <article className="knowledge-side-panel-article">
    <h2>{article.title}</h2>
    <KnowledgeArticleImages images={article.images} variant="side-panel" />
    <KnowledgeArticleBody bodyHtml={article.body_html} />
    <KnowledgeArticleMeta article={article} variant="side-panel" />
  </article>
)

export default KnowledgePanelArticle
