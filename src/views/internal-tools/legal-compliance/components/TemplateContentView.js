import React from 'react'

const TemplateContentView = ({
  groups = [],
  emptyMessage = 'No legislation added yet.',
  renderClausePrefix,
  renderClauseExtra,
}) => {
  if (groups.length === 0) {
    return (
      <div className="border rounded p-3">
        <strong>{emptyMessage}</strong>
      </div>
    )
  }

  return (
    <div>
      {groups.map((group, groupIndex) => {
        const clauses = group.clauses || []

        return (
          <section className={groupIndex === groups.length - 1 ? '' : 'mb-3'} key={group.id}>
            <div className="fw-bold text-body-secondary mb-2">
              {group.title || 'Legislation name not set'}
            </div>
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
          </section>
        )
      })}
    </div>
  )
}

export default TemplateContentView
