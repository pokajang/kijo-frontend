import React from 'react'
import { CAlert, CButton } from '@coreui/react'

const QuoteLifecycleRemediation = ({
  color = 'warning',
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}) => (
  <CAlert color={color} className="d-flex flex-column gap-2" role="alert">
    <div>
      <strong>{title}</strong>
      {message && <div className="mt-1">{message}</div>}
    </div>
    <div className="d-flex flex-wrap gap-2">
      {primaryLabel && onPrimary && (
        <CButton type="button" color={color} onClick={onPrimary}>
          {primaryLabel}
        </CButton>
      )}
      {secondaryLabel && onSecondary && (
        <CButton type="button" color="secondary" variant="outline" onClick={onSecondary}>
          {secondaryLabel}
        </CButton>
      )}
    </div>
  </CAlert>
)

export default QuoteLifecycleRemediation
