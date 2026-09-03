import React from 'react'
import { CBadge, CCol, CRow } from '@coreui/react'

const OPTIONS = [
  {
    value: 'write',
    title: 'Write full proposal',
    description:
      'Create the complete customer-facing proposal here. KIJO will render it into quotation and proposal exports.',
    recommended: true,
  },
  {
    value: 'upload',
    title: 'Upload a completed proposal PDF',
    description:
      'Choose this only when the complete proposal already exists as a PDF. Upload all customer-facing pages below.',
  },
]

export default function ProposalModeSelector({ value, onChange, validationError = '' }) {
  const errorId = validationError ? 'special-proposal-mode-error' : undefined

  return (
    <fieldset
      className="border-0 p-0 mb-4"
      data-template-field="proposalMode"
      aria-describedby={errorId}
    >
      <legend className="form-label fw-semibold mb-1">How will this proposal be created?</legend>
      <div className="small text-muted mb-3">
        Choose the source of the customer-facing proposal included with quotations.
      </div>
      <CRow className="g-3">
        {OPTIONS.map((option) => {
          const id = `special-proposal-mode-${option.value}`
          const selected = value === option.value

          return (
            <CCol xs={12} lg={6} key={option.value}>
              <label
                htmlFor={id}
                className={`d-flex align-items-start gap-3 h-100 rounded-3 border p-3 ${
                  selected ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'bg-body'
                }`}
                style={{ cursor: 'pointer' }}
              >
                <input
                  id={id}
                  className="form-check-input flex-shrink-0 mt-1"
                  type="radio"
                  name="proposalMode"
                  value={option.value}
                  checked={selected}
                  onChange={onChange}
                  aria-invalid={Boolean(validationError) || undefined}
                />
                <span className="d-block">
                  <span className="d-flex flex-wrap align-items-center gap-2 fw-semibold">
                    {option.title}
                    {option.recommended && <CBadge color="primary">Recommended</CBadge>}
                  </span>
                  <span className="small text-body-secondary d-block mt-1">
                    {option.description}
                  </span>
                </span>
              </label>
            </CCol>
          )
        })}
      </CRow>
      {validationError && (
        <div id={errorId} className="invalid-feedback d-block mt-2">
          {validationError}
        </div>
      )}
    </fieldset>
  )
}
