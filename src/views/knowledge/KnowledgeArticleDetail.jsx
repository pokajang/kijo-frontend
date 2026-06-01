import React from 'react'
import { useParams } from 'react-router-dom'
import { CAlert, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../components/datatable'
import KnowledgeArticleActions, { KnowledgeBackButton } from './components/KnowledgeArticleActions'
import KnowledgeArticleBody from './components/KnowledgeArticleBody'
import KnowledgeArticleImages from './components/KnowledgeArticleImages'
import KnowledgeArticleMeta from './components/KnowledgeArticleMeta'
import useKnowledgeArticleDetail from './detail/useKnowledgeArticleDetail'
import { canManageArticle } from './knowledgeUtils'

const KnowledgeArticleDetail = () => {
  const { slug } = useParams()
  const { actionLoading, article, error, loading, meta, updateArticleStatus } =
    useKnowledgeArticleDetail(slug)
  const canEdit = canManageArticle(article, meta)

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>{article?.title || 'Knowledge Article'}</strong>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <KnowledgeBackButton />
              {!loading && article && canEdit && article.status !== 'archived' && (
                <KnowledgeArticleActions
                  actionLoading={actionLoading}
                  article={article}
                  canManage={canEdit}
                  onRunAction={updateArticleStatus}
                />
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            {loading && <DataTableLoadingState message="Loading article..." />}
            {error && <CAlert color="danger">{error}</CAlert>}
            {!loading && !error && !article && (
              <CAlert color="info" className="mb-0">
                Article not found.
              </CAlert>
            )}
            {!loading && article && (
              <>
                <KnowledgeArticleImages images={article.images} />
                <KnowledgeArticleBody
                  bodyHtml={article.body_html}
                  className="knowledge-article-body mb-5"
                />
                <KnowledgeArticleMeta article={article} />
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default KnowledgeArticleDetail
