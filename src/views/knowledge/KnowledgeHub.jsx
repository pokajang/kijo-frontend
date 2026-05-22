import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  CFormInput,
  CFormSelect,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import { DataTableLoadingState } from '../../components/datatable'
import {
  archiveKnowledgeArticle,
  getKnowledgeArticles,
  getMyKnowledgeArticles,
  publishKnowledgeArticle,
  unpublishKnowledgeArticle,
} from './knowledgeApi'
import { searchKnowledgeArticles } from './knowledgeSearch'
import { formatDateTime } from './knowledgeUtils'

const KnowledgeHub = () => {
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [meta, setMeta] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [actionId, setActionId] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [tag, setTag] = useState('')
  const [status, setStatus] = useState('published')

  const loadArticles = useCallback(async ({ signal, showLoader = true } = {}) => {
    if (showLoader) {
      setLoading(true)
    }
    setError('')

    try {
      let json
      try {
        json = await getMyKnowledgeArticles({ signal })
      } catch (err) {
        if (err.name === 'AbortError') throw err
        if (![401, 403].includes(err.status)) throw err
        json = await getKnowledgeArticles({ signal })
      }
      setArticles(Array.isArray(json.data) ? json.data : [])
      setMeta(json.meta || {})
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Failed to load Knowledge Hub.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadArticles({ signal: controller.signal })

    return () => controller.abort()
  }, [loadArticles])

  const runAction = async (article, action) => {
    setActionId(article.id)
    setError('')
    setSuccess('')
    try {
      const json = await action(article.id)
      setSuccess(json.message || 'Article updated.')
      await loadArticles({ showLoader: false })
    } catch (err) {
      setError(err.message || 'Failed to update article.')
    } finally {
      setActionId(null)
    }
  }

  const tags = useMemo(
    () =>
      Array.from(new Set(articles.flatMap((article) => article.tags || []))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [articles],
  )

  const filteredArticles = useMemo(() => {
    const hardFiltered = articles.filter(
      (article) =>
        (!category || article.category === category) &&
        (!tag || (article.tags || []).includes(tag)) &&
        (!status || article.status === status),
    )

    return search ? searchKnowledgeArticles(hardFiltered, search) : hardFiltered
  }, [articles, category, search, status, tag])

  const featuredArticles = filteredArticles.slice(0, 3)
  const latestArticles = filteredArticles.slice(3)

  const renderArticleCard = (article) => {
    const image =
      Array.isArray(article.images) && article.images.length > 0 ? article.images[0] : null
    const articlePath = `/knowledge/${article.status === 'published' ? article.slug : article.id}`
    const canManage = Boolean(meta.staff_id || meta.can_moderate)
    const busy = actionId === article.id
    const isArchived = article.status === 'archived'

    return (
      <CCol sm={6} lg={4} key={article.id}>
        <CCard className="h-100 position-relative">
          {canManage && (
            <div
              className="position-absolute top-0 end-0 p-2"
              style={{ zIndex: 2 }}
              onClick={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <CDropdown alignment="end">
                <CDropdownToggle
                  size="sm"
                  caret={false}
                  className="border-0 bg-transparent shadow-none p-1 text-body-secondary"
                  style={{ minWidth: '2.25rem', minHeight: '2.25rem' }}
                  disabled={busy}
                  aria-label={`Manage ${article.title}`}
                >
                  <CIcon icon={cilOptions} />
                </CDropdownToggle>
                <CDropdownMenu onClick={(event) => event.stopPropagation()}>
                  <CDropdownItem onClick={() => navigate(articlePath)}>View</CDropdownItem>
                  {!isArchived && (
                    <CDropdownItem onClick={() => navigate(`/knowledge/${article.id}/edit`)}>
                      Edit
                    </CDropdownItem>
                  )}
                  {article.status !== 'published' && article.status !== 'archived' && (
                    <CDropdownItem onClick={() => runAction(article, publishKnowledgeArticle)}>
                      Publish
                    </CDropdownItem>
                  )}
                  {article.status === 'published' && (
                    <CDropdownItem onClick={() => runAction(article, unpublishKnowledgeArticle)}>
                      Unpublish
                    </CDropdownItem>
                  )}
                  {article.status !== 'archived' && (
                    <CDropdownItem
                      className="text-danger"
                      onClick={() => {
                        if (window.confirm(`Archive "${article.title}"?`)) {
                          runAction(article, archiveKnowledgeArticle)
                        }
                      }}
                    >
                      Archive
                    </CDropdownItem>
                  )}
                </CDropdownMenu>
              </CDropdown>
            </div>
          )}
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

  const renderArticleGrid = (items) => (
    <CRow className="g-3">{items.map((article) => renderArticleCard(article))}</CRow>
  )

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <strong>Knowledge Hub</strong>
            <div className="d-flex flex-wrap gap-2">
              <CButton color="primary" size="sm" onClick={() => navigate('/knowledge/create')}>
                Create Article
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger">{error}</CAlert>}
            {success && <CAlert color="success">{success}</CAlert>}
            <CRow className="g-2 mb-4">
              <CCol md={4}>
                <CFormInput
                  value={search}
                  placeholder="Search guides, tags, modules..."
                  onChange={(event) => setSearch(event.target.value)}
                />
              </CCol>
              <CCol md={3}>
                <CFormSelect value={category} onChange={(event) => setCategory(event.target.value)}>
                  <option value="">All Categories</option>
                  {(meta.categories || []).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormSelect value={tag} onChange={(event) => setTag(event.target.value)}>
                  <option value="">All Tags</option>
                  {tags.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                  <option value="">All Statuses</option>
                </CFormSelect>
              </CCol>
            </CRow>

            {loading ? (
              <DataTableLoadingState message="Loading knowledge articles..." />
            ) : filteredArticles.length === 0 ? (
              <p className="text-body-secondary mb-0">No knowledge articles match your filters.</p>
            ) : (
              <>
                {featuredArticles.length > 0 && (
                  <>
                    <div className="fw-semibold mb-2">Featured Guides</div>
                    <div className="mb-4">{renderArticleGrid(featuredArticles)}</div>
                  </>
                )}
                {latestArticles.length > 0 && (
                  <>
                    <div className="fw-semibold mb-2">Latest Articles</div>
                    {renderArticleGrid(latestArticles)}
                  </>
                )}
              </>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default KnowledgeHub
