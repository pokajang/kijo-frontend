import React from 'react'
import { CBadge } from '@coreui/react'

const toneColor = {
  success: 'success',
  danger: 'danger',
  info: 'info',
  secondary: 'secondary',
}

const AssessmentActionBar = ({
  children,
  sticky = false,
  statusText = '',
  statusTone = 'secondary',
}) => (
  <div
    className={`d-flex align-items-center justify-content-end gap-2 flex-wrap ${
      sticky ? 'position-sticky bottom-0 bg-body py-3' : ''
    }`.trim()}
    style={sticky ? { zIndex: 1020 } : undefined}
  >
    {statusText && (
      <CBadge color={toneColor[statusTone] || 'secondary'} className="me-auto">
        {statusText}
      </CBadge>
    )}
    {children}
  </div>
)

export default AssessmentActionBar
