import React from 'react'
import { CAlert } from '@coreui/react'

const TemplateFormStatus = ({
  loading = false,
  loadingMessage = 'Loading template...',
  loadError = '',
  saveError = '',
  onClearSaveError,
}) => (
  <>
    {loading && (
      <CAlert color="info" className="mb-3">
        {loadingMessage}
      </CAlert>
    )}
    {loadError && (
      <CAlert color="danger" className="mb-3">
        {loadError}
      </CAlert>
    )}
    {saveError && (
      <CAlert
        color="danger"
        dismissible
        onClose={onClearSaveError}
        className="mb-3"
        style={{ whiteSpace: 'pre-line' }}
      >
        {saveError}
      </CAlert>
    )}
  </>
)

export default TemplateFormStatus
