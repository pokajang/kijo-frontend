import React from 'react'
import MobileMenuGrid from '../MobileMenuGrid'
import { useMobileNavSheet } from '../MobileNavSheetContext'
import { MOBILE_NAV_VIEWS } from '../mobileNavSheetViews'

const MobileMenuGroupView = () => {
  const { currentView, pushView, resetAfterRoute } = useMobileNavSheet()

  const handleNavigate = () => {
    resetAfterRoute()
  }

  const openGroup = (item) => {
    pushView({ id: MOBILE_NAV_VIEWS.menuGroup, title: item.name, items: item.items })
  }

  return (
    <MobileMenuGrid
      items={currentView?.items || []}
      onNavigate={handleNavigate}
      onOpenGroup={openGroup}
    />
  )
}

export default MobileMenuGroupView
