// src/components/ProtectedRoute.jsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { extractRolesFromSession, hasAnyAllowedRole, hasExplicitAllowedRole } from './utils/roles'

/**
 * Wrap any routes you want to protect.
 * - If the user is not logged in, redirect to /login.
 * - If allowedRoles is provided and none match, redirect to /dashboard.
 * - Otherwise render children.
 *
 * Props:
 *   allowedRoles?: string[]
 *   children: React.ReactNode
 */
const ProtectedRoute = ({ children, allowedRoles, requireExplicitRole = false }) => {
  const location = useLocation()
  const { user, status, isAuthenticated } = useAuth()
  const roles = extractRolesFromSession({ user })

  if (status === 'loading') {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const canAccess = requireExplicitRole
    ? hasExplicitAllowedRole(roles, allowedRoles)
    : hasAnyAllowedRole(roles, allowedRoles)
  if (Array.isArray(allowedRoles) && !canAccess) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
