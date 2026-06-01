import React from 'react'
import { CAlert, CButton } from '@coreui/react'

const KnowledgeArticleStatusAlerts = ({ error, success, draftNotice, onDismissDraftNotice }) => (
  <>
    {error && <CAlert color="danger">{error}</CAlert>}
    {success && <CAlert color="success">{success}</CAlert>}
    {draftNotice && (
      <CAlert
        color="info"
        className="d-flex flex-wrap align-items-center justify-content-between gap-2"
      >
        <span>{draftNotice}</span>
        <CButton color="info" variant="outline" size="sm" onClick={onDismissDraftNotice}>
          Dismiss
        </CButton>
      </CAlert>
    )}
  </>
)

export default KnowledgeArticleStatusAlerts
