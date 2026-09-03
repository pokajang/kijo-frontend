import React from 'react'
import { CCol, CFormLabel, CFormTextarea, CRow } from '@coreui/react'
import { SPECIAL_INTERNAL_NOTE_MAX_LENGTH } from '../../shared/specialTemplateConstants'

export default function InternalReferenceNote({ value = '', onChange, validationError = '' }) {
  const length = String(value).length
  const helpId = 'special-service-summary-help'
  const errorId = validationError ? 'special-service-summary-error' : undefined

  return (
    <CRow className="mb-4">
      <CCol>
        <CFormLabel htmlFor="special-service-summary" className="fw-semibold mb-1">
          Internal reference note <span className="text-muted fw-normal">— Optional</span>
        </CFormLabel>
        <CFormTextarea
          id="special-service-summary"
          name="serviceSummary"
          rows={3}
          maxLength={SPECIAL_INTERNAL_NOTE_MAX_LENGTH}
          value={value}
          onChange={onChange}
          placeholder="Add brief scope or context for staff, if needed."
          invalid={Boolean(validationError)}
          aria-invalid={Boolean(validationError) || undefined}
          aria-describedby={`${helpId}${errorId ? ` ${errorId}` : ''}`}
          data-template-field="serviceSummary"
        />
        {validationError && (
          <div id={errorId} className="invalid-feedback d-block">
            {validationError}
          </div>
        )}
        <div id={helpId} className="d-flex flex-wrap justify-content-between gap-2 mt-1 small">
          <span className="text-muted">
            Visible to staff only. This note is not included in the proposal or quotation PDF.
          </span>
          <span
            className={length > SPECIAL_INTERNAL_NOTE_MAX_LENGTH ? 'text-danger' : 'text-muted'}
          >
            {length} / {SPECIAL_INTERNAL_NOTE_MAX_LENGTH}
          </span>
        </div>
      </CCol>
    </CRow>
  )
}
