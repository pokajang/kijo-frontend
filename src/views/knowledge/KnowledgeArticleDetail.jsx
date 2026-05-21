import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CDropdown,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CRow,
} from '@coreui/react'
import { DataTableLoadingState } from '../../components/datatable'
import { relatedRouteOptions } from './constants'
import {
  archiveKnowledgeArticle,
  getKnowledgeArticle,
  publishKnowledgeArticle,
  unpublishKnowledgeArticle,
} from './knowledgeApi'
import { canManageArticle, formatDateTime, sanitizeKnowledgeHtml } from './knowledgeUtils'

const KnowledgeArticleDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [article, setArticle] = useState(null)
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    getKnowledgeArticle({ slugOrId: slug, signal: controller.signal })
      .then((json) => {
        setArticle(json.data || null)
        setMeta(json.meta || {})
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message || 'Failed to load article.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [slug])

  const canEdit = canManageArticle(article, meta)
  const relatedRouteLabel =
    relatedRouteOptions.find((option) => option.path === article?.related_route)?.label ||
    'Go to page'

  const updateArticleStatus = async (action) => {
    if (!article || actionLoading) return

    setActionLoading(true)
    setError('')
    try {
      const json = await action(article.id)
      setArticle(json.data || article)
    } catch (err) {
      setError(err.message || 'Failed to update article.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>{article?.title || 'Knowledge Article'}</strong>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                onClick={() => navigate('/knowledge')}
              >
                Back
              </CButton>
              {!loading && article && canEdit && article.status !== 'archived' && (
                <CDropdown alignment="end">
                  <CDropdownToggle color="primary" size="sm" disabled={actionLoading}>
                    Actions
                  </CDropdownToggle>
                  <CDropdownMenu>
                    <CDropdownItem onClick={() => navigate(`/knowledge/${article.id}/edit`)}>
                      Edit
                    </CDropdownItem>
                    {article.status === 'published' ? (
                      <CDropdownItem onClick={() => updateArticleStatus(unpublishKnowledgeArticle)}>
                        Unpublish
                      </CDropdownItem>
                    ) : (
                      article.status !== 'archived' && (
                        <CDropdownItem onClick={() => updateArticleStatus(publishKnowledgeArticle)}>
                          Publish
                        </CDropdownItem>
                      )
                    )}
                    {article.status !== 'archived' && (
                      <CDropdownItem
                        className="text-danger"
                        onClick={() => {
                          if (window.confirm(`Archive "${article.title}"?`)) {
                            updateArticleStatus(archiveKnowledgeArticle)
                          }
                        }}
                      >
                        Archive
                      </CDropdownItem>
                    )}
                  </CDropdownMenu>
                </CDropdown>
              )}
            </div>
          </CCardHeader>
          <CCardBody>
            {loading && <DataTableLoadingState message="Loading article..." />}
            {error && <CAlert color="danger">{error}</CAlert>}
            {!loading && article && (
              <>
                {article.images?.length > 0 && (
                  <CRow className="g-3 mb-4">
                    {article.images.map((image) => (
                      <CCol md={4} key={image.id}>
                        <img
                          src={image.url}
                          alt={image.description}
                          className="w-100 rounded border"
                          style={{ aspectRatio: '16 / 9', objectFit: 'cover' }}
                        />
                        <div className="small text-body-secondary mt-1">{image.description}</div>
                      </CCol>
                    ))}
                  </CRow>
                )}

                <div
                  className="knowledge-article-body mb-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeKnowledgeHtml(article.body_html) }}
                />
                <div className="d-flex flex-wrap align-items-center gap-3 small text-body-secondary mt-5">
                  {article.related_route && (
                    <div>
                      {relatedRouteLabel}:{' '}
                      <NavLink to={article.related_route}>
                        <strong>{article.related_route}</strong>
                      </NavLink>
                    </div>
                  )}
                  <div>
                    {article.category}
                    {article.published_at
                      ? ` | Published ${formatDateTime(article.published_at)}`
                      : ''}
                    {article.status !== 'published' ? ` | ${article.status}` : ''}
                  </div>
                </div>
                {article.latest_edit_log && (
                  <div className="small text-body-secondary mt-3">
                    Latest contribution by {article.latest_edit_log.name_code || 'Unknown'}
                    {article.latest_edit_log.created_at
                      ? ` on ${formatDateTime(article.latest_edit_log.created_at)}`
                      : ''}
                    {article.latest_edit_log.remarks ? `: ${article.latest_edit_log.remarks}` : ''}
                  </div>
                )}
                {article.edit_logs?.length > 0 && (
                  <div className="mt-4">
                    <div className="fw-semibold small mb-2">Edit Logs</div>
                    <div className="d-grid gap-2">
                      {article.edit_logs.slice(0, 6).map((log) => (
                        <div className="small text-body-secondary" key={log.id}>
                          <strong>{log.name_code || 'Unknown'}</strong>
                          {log.created_at ? ` | ${formatDateTime(log.created_at)}` : ''}
                          {log.action ? ` | ${log.action}` : ''}
                          {log.remarks ? ` | ${log.remarks}` : ''}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default KnowledgeArticleDetail
