import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../../auth/AuthProvider'
import { extractRolesFromSession } from '../../../utils/roles'
import { ModuleSearchBox } from '../../search/AppModuleSearch'
import { useMobileNavSheet } from '../MobileNavSheetContext'

const MobileModuleSearchView = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { resetAfterRoute } = useMobileNavSheet()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])

  const handleNavigate = (item) => {
    resetAfterRoute()
    navigate(item.to)
  }

  return (
    <div className="app-mobile-module-search-view">
      <ModuleSearchBox roles={roles} onNavigate={handleNavigate} autoFocus />
    </div>
  )
}

export default MobileModuleSearchView
