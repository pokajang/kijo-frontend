import React from 'react'
import {
  CAccordion,
  CAccordionBody,
  CAccordionHeader,
  CAccordionItem,
  CBadge,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CTooltip,
} from '@coreui/react'
import {
  formatLegalGroupTitle,
  getClauseFields,
  getSectionProgress,
} from '../../utils/templateContent'

export const getComplyBadgeColor = ({ comply, total }) => {
  if (total === 0) return 'secondary'
  if (comply === total) return 'success'
  if (comply > 0) return 'warning'
  return 'secondary'
}

const AssessmentClauseAccordion = ({
  sections,
  clauseResponses,
  accordionState,
  onFieldChange,
}) => {
  const renderClauseField = (field, clause, response) => {
    const fieldId = `${clause.id}-${field.key}`
    const value = response[field.key] || ''

    if (field.type === 'radio') {
      return (
        <div className="mb-2 d-flex align-items-center gap-3 flex-wrap" key={field.key}>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            {(field.options || []).map((option) => (
              <CFormCheck
                inline
                type="radio"
                name={fieldId}
                id={`${fieldId}-${option.value}`}
                label={option.label}
                checked={value === option.value}
                onChange={() => onFieldChange(clause.id, field.key, option.value)}
                key={option.value}
              />
            ))}
          </div>
        </div>
      )
    }

    if (field.type === 'textarea') {
      return (
        <div className="mb-2" key={field.key}>
          <CFormTextarea
            id={fieldId}
            rows={1}
            value={value}
            placeholder="Write the finding for this clause, either comply or non comply."
            onChange={(event) => onFieldChange(clause.id, field.key, event.target.value)}
          />
        </div>
      )
    }

    return (
      <div className="mb-2" key={field.key}>
        <CFormLabel htmlFor={fieldId}>{field.label}</CFormLabel>
        <CFormInput
          id={fieldId}
          type={field.type === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(event) => onFieldChange(clause.id, field.key, event.target.value)}
        />
      </div>
    )
  }

  return (
    <CAccordion
      key={accordionState.key}
      className="handbook-accordion legal-compliance-accordion"
      activeItemKey={accordionState.activeItemKey}
    >
      {sections.map((section, sectionIndex) => {
        const progress = getSectionProgress(section, clauseResponses)
        const complyBadgeColor = getComplyBadgeColor(progress)
        const groupTitle = formatLegalGroupTitle(section, sectionIndex)

        return (
          <CAccordionItem
            itemKey={section.id}
            key={section.id}
            className={
              progress.total > 0 && progress.completed === progress.total
                ? 'legal-compliance-accordion-item--complete'
                : undefined
            }
          >
            <CAccordionHeader>
              <span className="legal-compliance-accordion-title-row">
                <CTooltip content={groupTitle} placement="top">
                  <strong className="legal-compliance-accordion-title">{groupTitle}</strong>
                </CTooltip>
                <span className="legal-compliance-accordion-summary">
                  <CBadge color={complyBadgeColor}>
                    {progress.completed}/{progress.total} completed
                  </CBadge>
                  <CBadge color="success" className="ms-1">
                    {progress.comply} comply
                  </CBadge>
                </span>
              </span>
            </CAccordionHeader>
            <CAccordionBody>
              <CRow className="g-3">
                {section.clauses.map((clause) => {
                  const response = clauseResponses[clause.id] || { finding: '' }
                  return (
                    <CCol xs={12} className="legal-compliance-assessment-clause" key={clause.id}>
                      <div>
                        <div className="mb-1">
                          {clause.reference && (
                            <>
                              <span className="fw-semibold">{clause.reference}</span>
                              {' - '}
                            </>
                          )}
                          <strong>{clause.title}</strong>
                        </div>
                        <p className="mb-2">{clause.excerpt}</p>
                        {getClauseFields(clause).map((field) =>
                          renderClauseField(field, clause, response),
                        )}
                      </div>
                    </CCol>
                  )
                })}
              </CRow>
            </CAccordionBody>
          </CAccordionItem>
        )
      })}
    </CAccordion>
  )
}

export default AssessmentClauseAccordion
