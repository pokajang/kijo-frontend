import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

import { useAuth } from './AuthProvider'

const RequireAuth = ({ children }) => {
  const { isAuthenticated, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="pt-3 text-center">
        <CSpinner color="primary" variant="grow" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

export default RequireAuth
