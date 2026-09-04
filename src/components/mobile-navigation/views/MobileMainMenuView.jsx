import React, { useMemo } from 'react'

import navigation from '../../../_nav'
import { useAuth } from '../../../auth/AuthProvider'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import { useWorkflowSetupStatus } from '../../../workflows/WorkflowSetupStatusProvider'
import { extractRolesFromSession } from '../../../utils/roles'
import { buildAppNavigation } from '../../navigation/buildAppNavigation'
import MobileMenuGrid from '../MobileMenuGrid'
import { useMobileNavSheet } from '../MobileNavSheetContext'
import { MOBILE_NAV_VIEWS } from '../mobileNavSheetViews'

const MobileMainMenuView = () => {
  const { user } = useAuth()
  const { getRouteGroupCount } = useAppNotifications()
  const { getWorkflowSetupTotal } = useWorkflowSetupStatus()
  const { pushView, resetAfterRoute } = useMobileNavSheet()
  const roles = useMemo(() => extractRolesFromSession({ user }), [user])
  const items = buildAppNavigation({
    navigation,
    roles,
    getRouteGroupCount,
    getWorkflowSetupTotal,
  })

  const handleNavigate = () => {
    resetAfterRoute()
  }

  const openGroup = (item) => {
    pushView({ id: MOBILE_NAV_VIEWS.menuGroup, title: item.name, items: item.items })
  }

  return (
    <MobileMenuGrid
      items={items}
      onNavigate={handleNavigate}
      onOpenGroup={openGroup}
      primaryItemFullWidth
    />
  )
}

export default MobileMainMenuView
