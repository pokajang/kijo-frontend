import React from 'react'
import { sanitizeKnowledgeHtml } from '../knowledgeUtils'

const KnowledgeArticleBody = ({ bodyHtml, className = 'knowledge-article-body' }) => (
  <div
    className={className}
    dangerouslySetInnerHTML={{ __html: sanitizeKnowledgeHtml(bodyHtml) }}
  />
)

export default KnowledgeArticleBody
