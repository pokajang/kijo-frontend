import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CCard, CCardBody, CCol } from '@coreui/react'
import { formatDateTime } from '../knowledgeUtils'
import KnowledgeArticleActions from './KnowledgeArticleActions'

const KnowledgeArticleCard = ({ article, canManage, busy, onRunAction }) => {
  const navigate = useNavigate()
  const image =
    Array.isArray(article.images) && article.images.length > 0 ? article.images[0] : null
  const articlePath = `/knowledge/${article.status === 'published' ? article.slug : article.id}`

  return (
    <CCol sm={6} lg={4} key={article.id}>
      <CCard className="h-100 position-relative">
        <KnowledgeArticleActions
          article={article}
          canManage={canManage}
          busy={busy}
          variant="card"
          onRunAction={onRunAction}
        />
        {image && (
          <div className="bg-body-tertiary border-bottom" style={{ aspectRatio: '16 / 9' }}>
            <button
              type="button"
              className="border-0 bg-transparent p-0 w-100 h-100 text-start"
              onClick={() => navigate(articlePath)}
              aria-label={`Open ${article.title}`}
            >
              <img
                src={image.url}
                alt={image.description || article.title}
                className="w-100 h-100"
                style={{ objectFit: 'cover' }}
              />
            </button>
          </div>
        )}
        <CCardBody>
          <div className="text-body-secondary small mb-2">
            {article.category}
            {article.published_at ? ` | ${formatDateTime(article.published_at)}` : ''}
            {article.status !== 'published' ? ` | ${article.status}` : ''}
          </div>
          <button
            type="button"
            className="btn btn-link p-0 text-start fw-semibold text-decoration-none"
            onClick={() => navigate(articlePath)}
          >
            {article.title}
          </button>
          <button
            type="button"
            className="border-0 bg-transparent p-0 text-start text-body-secondary mt-2 d-block w-100"
            onClick={() => navigate(articlePath)}
          >
            {article.summary}
          </button>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default KnowledgeArticleCard
