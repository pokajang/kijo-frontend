import React from 'react'
import { CButton, CCol, CFormInput, CFormLabel, CFormTextarea, CRow } from '@coreui/react'

const ClauseForm = ({
  clauseTitle,
  setClauseTitle,
  clauseExcerpt,
  setClauseExcerpt,
  isSaving,
  onSubmit,
  onCancel,
}) => (
  <form className="border rounded p-3" onSubmit={onSubmit}>
    <CRow className="g-3">
      <CCol xs={12}>
        <CFormLabel htmlFor="legal-template-clause-title">Clause Number and Title</CFormLabel>
        <CFormInput
          id="legal-template-clause-title"
          value={clauseTitle}
          onChange={(event) => setClauseTitle(event.target.value)}
          placeholder="Section 15 (1) - Duty of Employer..."
          disabled={isSaving}
          required
        />
      </CCol>
      <CCol xs={12}>
        <CFormLabel htmlFor="legal-template-clause-excerpt">Description or Legal Text</CFormLabel>
        <CFormTextarea
          id="legal-template-clause-excerpt"
          rows={3}
          value={clauseExcerpt}
          onChange={(event) => setClauseExcerpt(event.target.value)}
          placeholder="Add the legal excerpt or helper text assessors should read"
          disabled={isSaving}
        />
      </CCol>
      <CCol xs={12}>
        <div className="d-flex justify-content-end gap-2 flex-wrap">
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            type="button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </CButton>
          <CButton
            color="primary"
            size="sm"
            type="submit"
            disabled={isSaving || !clauseTitle.trim()}
          >
            Save Clause
          </CButton>
        </div>
      </CCol>
    </CRow>
  </form>
)

export default ClauseForm
