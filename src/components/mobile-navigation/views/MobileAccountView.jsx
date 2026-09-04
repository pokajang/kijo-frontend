import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CButton, useColorModes } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilAccountLogout } from '@coreui/icons'

import { useAuth } from '../../../auth/AuthProvider'
import { useAppNotifications } from '../../../notifications/AppNotificationProvider'
import { getRouteNotificationBadge } from '../../../notifications/notificationRegistry'
import { accountMenuSections, buildAccountUtilitySection } from '../../header/AppHeaderDropdown'
import MobileSheetItemCard from '../MobileSheetItemCard'
import { useMobileNavSheet } from '../MobileNavSheetContext'
import { MOBILE_NAV_VIEWS } from '../mobileNavSheetViews'

const MobileAccountView = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getRouteGroupCount } = useAppNotifications()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')
  const { pushView, resetAfterRoute } = useMobileNavSheet()
  const themeToggleLabel = colorMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  const utilitySection = buildAccountUtilitySection({
    themeToggleLabel,
    whatsNewLabel: "What's New",
  })

  const handleItem = (item) => {
    if (item.action === 'toggleTheme') {
      setColorMode(colorMode === 'dark' ? 'light' : 'dark')
      return
    }
    if (item.action === 'openTicket') {
      pushView({ id: MOBILE_NAV_VIEWS.supportTicket })
      return
    }
    if (item.key === 'appraisalRecords') {
      pushView({ id: MOBILE_NAV_VIEWS.accountAppraisal })
      return
    }
    if (item.to) {
      resetAfterRoute()
      navigate(item.to)
    }
  }

  return (
    <div className="app-mobile-account-view">
      <div className="app-mobile-account-profile">
        <strong>{user?.full_name || 'Account'}</strong>
        <span>{Array.isArray(user?.roles) ? user.roles.join(', ') : user?.roles || ''}</span>
      </div>
      {[utilitySection, ...accountMenuSections].map((section) => (
        <section className="app-mobile-account-section" key={section.title}>
          <h3>{section.title}</h3>
          <div className="app-mobile-account-grid">
            {section.items.map((item) => {
              const count = item.to ? Number(getRouteGroupCount(item.to) || 0) : 0
              const badge = item.to ? getRouteNotificationBadge(item.to) : null
              return (
                <MobileSheetItemCard
                  key={item.key}
                  title={item.label}
                  icon={item.icon ? <CIcon icon={item.icon} aria-hidden="true" /> : null}
                  badge={count > 0 && badge ? { ...badge, text: count } : null}
                  onClick={() => handleItem(item)}
                  ariaLabel={item.tooltip || item.label}
                />
              )
            })}
          </div>
        </section>
      ))}
      <CButton
        type="button"
        color="danger"
        variant="outline"
        className="app-mobile-sheet-sign-out"
        onClick={() => pushView({ id: MOBILE_NAV_VIEWS.signOut })}
      >
        <CIcon icon={cilAccountLogout} aria-hidden="true" /> Sign Out
      </CButton>
    </div>
  )
}

export default MobileAccountView
