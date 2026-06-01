import React from 'react'
import { CButton, CCardBody, CCardFooter } from '@coreui/react'

const JD14SuccessStep = ({ result, onReturnToList, onManageProject, onViewJD14 }) => (
  <>
    <CCardBody>
      <h5>JD14 Created</h5>
      <p className="text-body-secondary mb-0">JD14 {result?.form_number || ''} has been created.</p>
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end gap-2 flex-wrap">
      <CButton color="secondary" size="sm" variant="outline" onClick={onReturnToList}>
        Return to JD14 List
      </CButton>
      <CButton color="secondary" size="sm" variant="outline" onClick={onManageProject}>
        Manage Project
      </CButton>
      {result?.form_number ? (
        <CButton color="primary" size="sm" onClick={onViewJD14}>
          View JD14
        </CButton>
      ) : null}
    </CCardFooter>
  </>
)

export default JD14SuccessStep
