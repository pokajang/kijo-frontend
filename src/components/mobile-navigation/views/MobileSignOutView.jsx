import React, { useState } from 'react'
import { CButton } from '@coreui/react'

import { useAuth } from '../../../auth/AuthProvider'
import dialog from '../../dialog/dialogService'
import { useMobileNavSheet } from '../MobileNavSheetContext'

const MobileSignOutView = () => {
  const { logout } = useAuth()
  const { goBack, resetAfterRoute } = useMobileNavSheet()
  const [signingOut, setSigningOut] = useState(false)

  const confirm = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      resetAfterRoute()
      await logout()
    } catch (error) {
      console.error('Error signing out:', error)
      dialog.alert('Failed to log out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <div className="d-grid gap-3">
      <p className="mb-0">Are you sure you want to sign out?</p>
      <div className="d-flex justify-content-end gap-2">
        <CButton color="secondary" variant="outline" onClick={goBack} disabled={signingOut}>
          Cancel
        </CButton>
        <CButton color="danger" onClick={confirm} disabled={signingOut}>
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </CButton>
      </div>
    </div>
  )
}

export default MobileSignOutView
