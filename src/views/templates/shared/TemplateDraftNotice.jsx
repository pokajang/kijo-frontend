import React from 'react'
import { CAlert } from '@coreui/react'

const TemplateDraftNotice = ({ restored = false, includesFiles = true }) => {
  if (!restored) return null

  return (
    <CAlert color="info" className="py-2" role="status">
      <strong>Local draft restored.</strong> Continue where you left off or use Reset to start
      again.
      {!includesFiles && ' Previously selected files must be added again.'}
    </CAlert>
  )
}

export default TemplateDraftNotice
