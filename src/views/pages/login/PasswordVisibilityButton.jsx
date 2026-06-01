import React from 'react'
import { CButton } from '@coreui/react'

const PasswordVisibilityIcon = ({ visible }) => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {visible ? (
      <>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A9.4 9.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-2.2 3.1" />
        <path d="M6.6 6.8C4 8.6 2.5 12 2.5 12s3.5 7 9.5 7a9.8 9.8 0 0 0 4.1-.9" />
        <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      </>
    )}
  </svg>
)

const PasswordVisibilityButton = ({ visible, onToggle, showLabel, hideLabel }) => (
  <CButton
    type="button"
    color="secondary"
    variant="outline"
    aria-label={visible ? hideLabel : showLabel}
    aria-pressed={visible}
    onClick={onToggle}
  >
    <PasswordVisibilityIcon visible={visible} />
  </CButton>
)

export default PasswordVisibilityButton
