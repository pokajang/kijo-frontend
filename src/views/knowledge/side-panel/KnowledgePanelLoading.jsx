import React from 'react'
import { CSpinner } from '@coreui/react'

const KnowledgePanelLoading = ({ children }) => (
  <div className="knowledge-side-panel-loading">
    <CSpinner size="sm" />
    <span>{children}</span>
  </div>
)

export default KnowledgePanelLoading
