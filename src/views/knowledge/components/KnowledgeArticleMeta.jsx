import React from 'react'
import { NavLink } from 'react-router-dom'
import { CBadge } from '@coreui/react'
import { relatedRouteOptions } from '../constants'
import { formatDateTime } from '../knowledgeUtils'

const LatestEditLog = ({ log, className = '' }) => {
  if (!log) return null

  return (
    <div className={className}>
      Latest contribution by {log.name_code || 'Unknown'}
      {log.created_at ? ` on ${formatDateTime(log.created_at)}` : ''}
      {log.remarks ? `: ${log.remarks}` : ''}
    </div>
  )
}

const KnowledgeArticleMeta = ({ article, variant = 'detail' }) => {
  if (!article) return null

  if (variant === 'side-panel') {
    return (
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
          {article.published_at && <span>Published {formatDateTime(article.published_at)}</span>}
        </div>
        <LatestEditLog log={article.latest_edit_log} />
      </div>
    )
  }

  const relatedRouteLabel =
    relatedRouteOptions.find((option) => option.path === article.related_route)?.label ||
    'Go to page'

  return (
    <>
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
          {article.published_at ? ` | Published ${formatDateTime(article.published_at)}` : ''}
          {article.status !== 'published' ? ` | ${article.status}` : ''}
        </div>
      </div>
      <LatestEditLog log={article.latest_edit_log} className="small text-body-secondary mt-3" />
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
  )
}

export default KnowledgeArticleMeta
