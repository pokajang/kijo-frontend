import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, CDropdown, CDropdownItem, CDropdownMenu, CDropdownToggle } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilOptions } from '@coreui/icons'
import {
  archiveKnowledgeArticle,
  publishKnowledgeArticle,
  unpublishKnowledgeArticle,
} from '../knowledgeApi'

const KnowledgeArticleActions = ({
  article,
  actionLoading = false,
  busy = false,
  canManage = false,
  variant = 'detail',
  onRunAction,
}) => {
  const navigate = useNavigate()
  if (!article || !canManage) return null
  if (variant !== 'card' && article.status === 'archived') return null

  const articlePath = `/knowledge/${article.status === 'published' ? article.slug : article.id}`

  if (variant === 'card') {
    const isArchived = article.status === 'archived'

    return (
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
              <CDropdownItem onClick={() => onRunAction(article, publishKnowledgeArticle)}>
                Publish
              </CDropdownItem>
            )}
            {article.status === 'published' && (
              <CDropdownItem onClick={() => onRunAction(article, unpublishKnowledgeArticle)}>
                Unpublish
              </CDropdownItem>
            )}
            {article.status !== 'archived' && (
              <CDropdownItem
                className="text-danger"
                onClick={() => {
                  if (window.confirm(`Archive "${article.title}"?`)) {
                    onRunAction(article, archiveKnowledgeArticle)
                  }
                }}
              >
                Archive
              </CDropdownItem>
            )}
          </CDropdownMenu>
        </CDropdown>
      </div>
    )
  }

  return (
    <CDropdown alignment="end">
      <CDropdownToggle color="primary" size="sm" disabled={actionLoading}>
        Actions
      </CDropdownToggle>
      <CDropdownMenu>
        <CDropdownItem onClick={() => navigate(`/knowledge/${article.id}/edit`)}>
          Edit
        </CDropdownItem>
        {article.status === 'published' ? (
          <CDropdownItem onClick={() => onRunAction(unpublishKnowledgeArticle)}>
            Unpublish
          </CDropdownItem>
        ) : (
          article.status !== 'archived' && (
            <CDropdownItem onClick={() => onRunAction(publishKnowledgeArticle)}>
              Publish
            </CDropdownItem>
          )
        )}
        {article.status !== 'archived' && (
          <CDropdownItem
            className="text-danger"
            onClick={() => {
              if (window.confirm(`Archive "${article.title}"?`)) {
                onRunAction(archiveKnowledgeArticle)
              }
            }}
          >
            Archive
          </CDropdownItem>
        )}
      </CDropdownMenu>
    </CDropdown>
  )
}

export const KnowledgeBackButton = ({ to = '/knowledge', children = 'Back' }) => {
  const navigate = useNavigate()

  return (
    <CButton color="secondary" variant="outline" size="sm" onClick={() => navigate(to)}>
      {children}
    </CButton>
  )
}

export default KnowledgeArticleActions
