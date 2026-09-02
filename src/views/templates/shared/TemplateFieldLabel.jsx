import React from 'react'
import { CFormLabel } from '@coreui/react'

const TemplateFieldLabel = ({ children, htmlFor, optional = false, className = '' }) => (
  <CFormLabel htmlFor={htmlFor} className={className}>
    {children}
    <span className={optional ? 'text-muted fw-normal' : 'text-danger'}>
      {optional ? ' — Optional' : ' *'}
    </span>
  </CFormLabel>
)

export default TemplateFieldLabel
