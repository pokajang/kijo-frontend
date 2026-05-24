import React from 'react'
import { CButton, CListGroup, CListGroupItem } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'

const ClauseList = ({
  clauses,
  activeClauseForm,
  isSaving,
  renderClauseForm,
  onEditClause,
  onClauseKeyDown,
  onRemoveClause,
}) => (
  <CListGroup>
    {clauses.map((clause, clauseIndex) => (
      <CListGroupItem className="p-0" key={clause.id}>
        {activeClauseForm === clauseIndex ? (
          <div className="p-3">{renderClauseForm()}</div>
        ) : (
          <div
            className="legal-compliance-clause-tile p-3"
            role="button"
            tabIndex={0}
            onClick={() => {
              if (isSaving) return
              onEditClause(clauseIndex)
            }}
            onKeyDown={(event) => onClauseKeyDown(event, clauseIndex)}
          >
            <div className="legal-compliance-clause-row">
              <div className="legal-compliance-clause-main">
                <strong
                  className="legal-compliance-clause-title"
                  title={clause.title || 'Clause title not set'}
                >
                  {clause.title || 'Clause title not set'}
                </strong>
                {clause.excerpt && (
                  <div className="legal-compliance-clause-excerpt text-body-secondary mt-1">
                    {clause.excerpt}
                  </div>
                )}
              </div>
              <div
                className="legal-compliance-clause-actions"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <CButton
                  color="transparent"
                  size="sm"
                  className="legal-compliance-icon-action"
                  onClick={() => onEditClause(clauseIndex)}
                  disabled={isSaving}
                  aria-label={`Edit ${clause.title || `clause ${clauseIndex + 1}`}`}
                >
                  <CIcon icon={cilPencil} size="sm" />
                </CButton>
                <CButton
                  color="transparent"
                  size="sm"
                  className="legal-compliance-icon-action text-danger"
                  onClick={() => onRemoveClause(clauseIndex)}
                  disabled={isSaving || activeClauseForm !== null}
                  aria-label={`Remove ${clause.title || `clause ${clauseIndex + 1}`}`}
                >
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              </div>
            </div>
          </div>
        )}
      </CListGroupItem>
    ))}
  </CListGroup>
)

export default ClauseList
