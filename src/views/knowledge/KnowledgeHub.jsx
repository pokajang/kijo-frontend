import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../components/datatable'
import KnowledgeHubArticleGrid from './hub/KnowledgeHubArticleGrid'
import KnowledgeHubFilters from './hub/KnowledgeHubFilters'
import useKnowledgeHubArticles from './hub/useKnowledgeHubArticles'

const KnowledgeHub = () => {
  const navigate = useNavigate()
  const {
    actionId,
    category,
    error,
    filteredArticles,
    loadArticles,
    loading,
    meta,
    runAction,
    search,
    setCategory,
    setSearch,
    setStatus,
    setTag,
    status,
    tag,
    tags,
  } = useKnowledgeHubArticles()

  useEffect(() => {
    const controller = new AbortController()
    loadArticles({ signal: controller.signal })

    return () => controller.abort()
  }, [loadArticles])

  const canManage = Boolean(meta.staff_id || meta.can_moderate)

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
            <KnowledgeHubFilters
              category={category}
              categories={meta.categories || []}
              search={search}
              setCategory={setCategory}
              setSearch={setSearch}
              setStatus={setStatus}
              setTag={setTag}
              status={status}
              tag={tag}
              tags={tags}
            />

            {loading ? (
              <DataTableLoadingState message="Loading knowledge articles..." />
            ) : filteredArticles.length === 0 ? (
              <p className="text-body-secondary mb-0">No knowledge articles match your filters.</p>
            ) : (
              <KnowledgeHubArticleGrid
                actionId={actionId}
                articles={filteredArticles}
                canManage={canManage}
                onRunAction={runAction}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default KnowledgeHub
