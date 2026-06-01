import React from 'react'
import { CCardBody, CCardHeader } from '@coreui/react'
import { formatLegalGroupTitle } from '../utils/templateContent'

const TemplateContentView = ({
  groups = [],
  emptyMessage = 'No legislation added yet.',
  renderClausePrefix,
  renderClauseExtra,
  useCardHeaders = false,
}) => {
  if (groups.length === 0) {
    return (
      <div className="border rounded p-3">
        <strong>{emptyMessage}</strong>
      </div>
    )
  }

  const content = groups.map((group, groupIndex) => {
    const clauses = group.clauses || []
    const groupTitle = formatLegalGroupTitle(group, groupIndex)
    const groupContent = (
      <>
        {clauses.length === 0 ? (
          <p className="text-body-secondary mb-0">No clauses added yet.</p>
        ) : (
          clauses.map((clause, clauseIndex) => (
            <div className={clauseIndex === clauses.length - 1 ? '' : 'mb-3'} key={clause.id}>
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                {renderClausePrefix?.(clause)}
                <strong>{clause.title || 'Clause title not set'}</strong>
              </div>
              {clause.excerpt && <p className="text-body-secondary mb-2">{clause.excerpt}</p>}
              {renderClauseExtra?.(clause)}
            </div>
          ))
        )}
      </>
    )

    if (useCardHeaders) {
      return (
        <React.Fragment key={group.id}>
          <CCardHeader>
            <strong className="text-body-secondary">{groupTitle}</strong>
          </CCardHeader>
          <CCardBody>{groupContent}</CCardBody>
        </React.Fragment>
      )
    }

    return (
      <section className={groupIndex === groups.length - 1 ? '' : 'mb-3'} key={group.id}>
        <div className="fw-bold text-body-secondary mb-2">{groupTitle}</div>
        {groupContent}
      </section>
    )
  })

  return useCardHeaders ? <>{content}</> : <div>{content}</div>
}

export default TemplateContentView
