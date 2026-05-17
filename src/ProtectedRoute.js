// src/components/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { extractRolesFromSession, hasAnyAllowedRole } from './utils/roles'

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
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation()
  const [state, setState] = useState({
    loading: true,
    isLoggedIn: false,
    roles: [],
  })

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}auth/session`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          const roles = extractRolesFromSession(data)
          setState({ loading: false, isLoggedIn: true, roles })
        } else {
          setState({ loading: false, isLoggedIn: false, roles: [] })
        }
      })
      .catch(() => {
        setState({ loading: false, isLoggedIn: false, roles: [] })
      })
  }, [])

  if (state.loading) {
    // Or return a spinner if you have one
    return null
  }

  if (!state.isLoggedIn) {
    // Not logged in → send to login, preserve where they wanted to go
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (Array.isArray(allowedRoles) && !hasAnyAllowedRole(state.roles, allowedRoles)) {
    // Logged in but lacks the role → send to dashboard
    return <Navigate to="/dashboard" replace />
  }

  // All good → render the protected component(s)
  return <>{children}</>
}

export default ProtectedRoute
